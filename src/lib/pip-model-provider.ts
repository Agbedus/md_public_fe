import { PipServiceError } from '@/lib/pip-errors';

type ChatPayload = Record<string, unknown>;

interface PipProvider {
  name: 'nvidia';
  model: string;
  endpoint: string;
  apiKey: string;
}

export interface PipCompletion {
  response: Response;
  provider: PipProvider['name'];
  model: string;
}

const RETRIABLE_STATUSES = new Set([404, 408, 410, 422, 425, 429, 500, 502, 503, 504]);
const RETIRED_NVIDIA_MODELS = new Set([
  'deepseek-ai/deepseek-v4-flash',
]);
const DEFAULT_NVIDIA_MODELS = [
  'nvidia/nemotron-3-ultra-550b-a55b',
  'nvidia/nemotron-3-super-120b-a12b',
  'z-ai/glm-5.2',
  'minimaxai/minimax-m3',
  'deepseek-ai/deepseek-v4-pro',
];

class ProviderResponseError extends Error {
  readonly mayFallback: boolean;
  readonly status: number;

  constructor(message: string, status: number, mayFallback: boolean) {
    super(message);
    this.name = 'ProviderResponseError';
    this.status = status;
    this.mayFallback = mayFallback;
  }
}

function configuredProviders(): PipProvider[] {
  const nvidiaKey = process.env.NVIDIA_BUILD_API_KEY?.trim();
  if (!nvidiaKey) return [];

  const configuredModels = process.env.PIP_NVIDIA_MODELS
    ?.split(',')
    .map((model) => model.trim())
    .filter((model) => model && !RETIRED_NVIDIA_MODELS.has(model));
  const models = configuredModels?.length ? configuredModels : DEFAULT_NVIDIA_MODELS;
  const endpoint = process.env.NVIDIA_AI_API_URL?.trim() || 'https://integrate.api.nvidia.com/v1/chat/completions';

  return models.map((model) => ({
    name: 'nvidia',
    model,
    endpoint,
    apiKey: nvidiaKey,
  }));
}

function connectionSignal(parentSignal?: AbortSignal): {
  signal: AbortSignal;
  clearConnectionTimeout: () => void;
} {
  const configured = Number(process.env.PIP_CONNECT_TIMEOUT_MS || 20_000);
  const timeoutMs = Number.isFinite(configured) ? Math.max(5_000, configured) : 20_000;
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort(new DOMException('NVIDIA connection timed out.', 'TimeoutError'));
  }, timeoutMs);

  return {
    signal: parentSignal
      ? AbortSignal.any([parentSignal, timeoutController.signal])
      : timeoutController.signal,
    clearConnectionTimeout: () => clearTimeout(timeoutId),
  };
}

async function readProviderError(response: Response): Promise<string> {
  const raw = await response.text().catch(() => '');
  try {
    const payload = JSON.parse(raw);
    return payload?.error?.message || payload?.error || raw || `HTTP ${response.status}`;
  } catch {
    return raw || `HTTP ${response.status}`;
  }
}

function streamErrorDetail(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.error === 'string') return record.error;
  if (record.error && typeof record.error === 'object') {
    const message = (record.error as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
  }
  if (typeof record.detail === 'string' && !Array.isArray(record.choices)) return record.detail;
  return null;
}

async function readWithTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs: number,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new DOMException('NVIDIA did not start streaming in time.', 'TimeoutError')),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function requireValidStream(response: Response): Promise<Response> {
  if (!response.body) throw new ProviderResponseError('NVIDIA returned no response stream.', 502, true);

  const configured = Number(process.env.PIP_FIRST_TOKEN_TIMEOUT_MS || 25_000);
  const timeoutMs = Number.isFinite(configured) ? Math.max(5_000, configured) : 25_000;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const replayChunks: Uint8Array[] = [];
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await readWithTimeout(reader, timeoutMs);
      if (done) throw new ProviderResponseError('NVIDIA ended the stream before returning a response.', 502, true);
      replayChunks.push(value);
      buffer += decoder.decode(value, { stream: true });
      if (buffer.length > 131_072) throw new ProviderResponseError('NVIDIA returned an invalid stream.', 502, true);

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const payload = JSON.parse(data) as Record<string, unknown>;
          const detail = streamErrorDetail(payload);
          if (detail) throw new ProviderResponseError(detail, 502, true);
          if (Array.isArray(payload.choices)) {
            const replayStream = new ReadableStream<Uint8Array>({
              async start(controller) {
                for (const chunk of replayChunks) controller.enqueue(chunk);
                try {
                  while (true) {
                    const next = await reader.read();
                    if (next.done) break;
                    controller.enqueue(next.value);
                  }
                  controller.close();
                } catch (error) {
                  controller.error(error);
                }
              },
              cancel(reason) {
                return reader.cancel(reason);
              },
            });
            return new Response(replayStream, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            });
          }
        } catch (error) {
          if (error instanceof ProviderResponseError) throw error;
          // A partial or non-JSON event is not a valid first completion event.
        }
      }
    }
  } catch (error) {
    await reader.cancel(error).catch(() => undefined);
    if (error instanceof ProviderResponseError) throw error;
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ProviderResponseError(error.message, 504, true);
    }
    throw error;
  }
}

/**
 * Starts an OpenAI-compatible streaming completion through NVIDIA NIM. Models
 * are tried in configured order, beginning with the verified Nemotron Ultra
 * default, when a model is
 * unavailable, rate limited, rejects a model-specific request, or has a
 * transient server/connection failure.
 */
export async function startPipCompletion(
  payload: ChatPayload,
  parentSignal?: AbortSignal,
): Promise<PipCompletion> {
  const providers = configuredProviders();
  if (providers.length === 0) {
    console.error('Pip is not configured: NVIDIA_BUILD_API_KEY is missing.');
    throw new PipServiceError('configuration', { retryable: false });
  }

  const failures: string[] = [];
  for (let index = 0; index < providers.length; index += 1) {
    const provider = providers[index];
    const hasFallback = index < providers.length - 1;

    try {
      const providerPayload: ChatPayload = { ...payload, model: provider.model };
      const requestSignal = connectionSignal(parentSignal);
      let response: Response;
      try {
        response = await fetch(provider.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${provider.apiKey}`,
          },
          body: JSON.stringify(providerPayload),
          signal: requestSignal.signal,
        });
      } finally {
        // The timeout guards only the initial NVIDIA connection. Clearing it
        // after headers arrive prevents long, healthy streams from being
        // aborted while the model is still generating.
        requestSignal.clearConnectionTimeout();
      }

      if (response.ok) {
        const validatedResponse = payload.stream === true ? await requireValidStream(response) : response;
        return { response: validatedResponse, provider: provider.name, model: provider.model };
      }

      const detail = await readProviderError(response);
      failures.push(`${provider.model} (${response.status}): ${detail}`);
      // NVIDIA rate limits are applied to the API key/account rather than a
      // single model. Trying every fallback would multiply requests while the
      // account is already throttled.
      if (response.status === 429) {
        throw new ProviderResponseError(detail, response.status, false);
      }
      if (!hasFallback || !RETRIABLE_STATUSES.has(response.status)) {
        throw new ProviderResponseError(detail, response.status, false);
      }
      console.warn(`Pip model ${provider.model} returned ${response.status}; trying fallback.`);
    } catch (error) {
      if (parentSignal?.aborted) throw error;
      const detail = error instanceof Error ? error.message : 'Connection failed';
      if (error instanceof ProviderResponseError && !error.mayFallback) {
        if (error.status === 429) {
          console.warn('NVIDIA rate-limited the Pip request; entering cooldown.');
          throw new PipServiceError('rate_limited', { cause: error, status: 429 });
        }
        console.error(`NVIDIA rejected the Pip request (${error.status}): ${detail}`);
        if (error.status === 401 || error.status === 403) {
          throw new PipServiceError('configuration', { cause: error, retryable: false });
        }
        throw new PipServiceError('unavailable', { cause: error });
      }
      failures.push(`${provider.model}: ${detail}`);
      if (!hasFallback) {
        console.warn(`Pip exhausted all configured NVIDIA models: ${failures.join(' | ')}`);
        if (error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
          throw new PipServiceError('timeout', { cause: error, status: 504 });
        }
        if (error instanceof ProviderResponseError && error.status === 429) {
          throw new PipServiceError('rate_limited', { cause: error, status: 429 });
        }
        throw new PipServiceError('unavailable', { cause: error });
      }
      console.warn(`Pip could not connect with ${provider.model}; trying fallback.`);
    }
  }

  console.warn(`Pip exhausted all configured NVIDIA models: ${failures.join(' | ')}`);
  throw new PipServiceError('unavailable');
}
