const ERROR_MARKER = '__PIP_ERROR__';
const REPORT_MARKER = '__REPORT__';

/** Read the same response protocol on the full page and in the floating widget. */
export async function readPipStream(response: Response, signal: AbortSignal, onUpdate: (text: string, isReport: boolean) => void) {
  if (!response.body) throw new Error('Pip returned an empty response. Please try again.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', text = '', isReport = false;
  const consume = (final = false) => {
    while (buffer) {
      if (buffer.startsWith(ERROR_MARKER)) {
        const end = buffer.indexOf(ERROR_MARKER, ERROR_MARKER.length);
        if (end < 0 && !final) return;
        if (end < 0) throw new Error('Pip couldn’t complete that response. Please try again.');
        const payload = JSON.parse(buffer.slice(ERROR_MARKER.length, end)) as { message?: string };
        throw new Error(payload.message || 'Pip couldn’t complete that response. Please try again.');
      }
      if (buffer.startsWith(REPORT_MARKER)) {
        isReport = true;
        buffer = buffer.slice(REPORT_MARKER.length);
        continue;
      }
      const positions = [buffer.indexOf(ERROR_MARKER), buffer.indexOf(REPORT_MARKER)].filter((index) => index >= 0);
      let count = positions.length ? Math.min(...positions) : buffer.length;
      if (!positions.length && !final) {
        for (const marker of [ERROR_MARKER, REPORT_MARKER]) {
          for (let length = Math.min(marker.length - 1, buffer.length); length > 0; length--) {
            if (buffer.endsWith(marker.slice(0, length))) { count = Math.min(count, buffer.length - length); break; }
          }
        }
      }
      if (!count) return;
      text += buffer.slice(0, count);
      buffer = buffer.slice(count);
      onUpdate(text, isReport);
    }
  };
  try {
    while (true) {
      if (signal.aborted) { await reader.cancel(); throw new DOMException('Response stopped', 'AbortError'); }
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      consume(done);
      if (done) break;
    }
    if (!text.trim()) throw new Error('Pip returned an empty response. Please try again.');
    return { text, isReport };
  } finally {
    reader.releaseLock();
  }
}
