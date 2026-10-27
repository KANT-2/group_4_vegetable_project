export class RequestBodyError extends Error {
  readonly status: 400 | 413;
  constructor(status: 400 | 413) {
    super(
      status === 413
        ? "요청 용량이 너무 큽니다."
        : "요청 내용을 확인해 주세요.",
    );
    this.status = status;
  }
}

export async function readBoundedText(request: Request, limit: number) {
  if (Number(request.headers.get("content-length")) > limit)
    throw new RequestBodyError(413);
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let size = 0;
  let result = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new RequestBodyError(413);
      }
      result += decoder.decode(value, { stream: true });
    }
    return result + decoder.decode();
  } catch (error) {
    if (error instanceof RequestBodyError) throw error;
    throw new RequestBodyError(400);
  } finally {
    reader.releaseLock();
  }
}
