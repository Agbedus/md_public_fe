export type PipErrorCode = 'configuration' | 'rate_limited' | 'timeout' | 'unavailable' | 'invalid_response';

export interface PipPublicError {
  code: PipErrorCode;
  message: string;
  retryable: boolean;
}

const PUBLIC_MESSAGES: Record<PipErrorCode, string> = {
  configuration: 'Pip is temporarily unavailable. Please try again shortly.',
  rate_limited: 'Pip is receiving a lot of requests right now. Please wait a moment and try again.',
  timeout: 'Pip took too long to respond. Please try again.',
  unavailable: 'Pip couldn’t connect right now. Please try again in a moment.',
  invalid_response: 'Pip received an unexpected response. Please try again.',
};

export class PipServiceError extends Error {
  readonly code: PipErrorCode;
  readonly status: number;
  readonly retryable: boolean;

  constructor(code: PipErrorCode, options: { cause?: unknown; status?: number; retryable?: boolean } = {}) {
    super(PUBLIC_MESSAGES[code], { cause: options.cause });
    this.name = 'PipServiceError';
    this.code = code;
    this.status = options.status ?? 503;
    this.retryable = options.retryable ?? code !== 'configuration';
  }
}

export function toPipPublicError(error: unknown): PipPublicError {
  if (error instanceof PipServiceError) {
    return { code: error.code, message: error.message, retryable: error.retryable };
  }

  if (error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
    return { code: 'timeout', message: PUBLIC_MESSAGES.timeout, retryable: true };
  }

  return { code: 'unavailable', message: PUBLIC_MESSAGES.unavailable, retryable: true };
}

export function pipStreamErrorFrame(error: unknown): string {
  return `__PIP_ERROR__${JSON.stringify(toPipPublicError(error))}__PIP_ERROR__`;
}
