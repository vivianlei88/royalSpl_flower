import ky, { type AfterResponseHook } from 'ky';
import { createParser } from 'eventsource-parser';

export interface SSEOptions {
  onData: (data: string) => void;
  onCompleted?: (error?: Error) => void;
  onAborted?: () => void;
}

function createSSEHook(options: SSEOptions): AfterResponseHook {
  return async (request, _opts, response) => {
    if (!response.ok || !response.body) return;

    let done = false;
    const finish = (err?: Error) => {
      if (!done) { done = true; options.onCompleted?.(err); }
    };

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf8');
    const parser = createParser({
      onEvent: (event) => {
        if (!event.data) return;
        options.onData(event.data);
      },
    });

    const read = (): void => {
      reader.read().then(({ done: streamDone, value }) => {
        if (streamDone) { finish(); return; }
        parser.feed(decoder.decode(value, { stream: true }));
        read();
      }).catch((err) => {
        if (request.signal.aborted) { options.onAborted?.(); return; }
        finish(err as Error);
      });
    };
    read();
    return response;
  };
}

export interface StreamChatOptions {
  supabaseUrl: string;
  supabaseAnonKey: string;
  messages: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  productContext?: string;
  cartContext?: string;
  onChunk: (text: string) => void;
  onComplete: () => void;
  onError: (err: Error) => void;
  signal?: AbortSignal;
}

export async function streamChat(options: StreamChatOptions): Promise<void> {
  const {
    supabaseUrl, supabaseAnonKey, messages,
    productContext, cartContext,
    onChunk, onComplete, onError, signal,
  } = options;

  const sseHook = createSSEHook({
    onData: (data) => {
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        if (text) onChunk(text);
      } catch { /* incomplete chunk */ }
    },
    onCompleted: (err) => err ? onError(err) : onComplete(),
    onAborted: () => { /* cancelled by user */ },
  });

  try {
    await ky.post(`${supabaseUrl}/functions/v1/ai-chat`, {
      json: { messages, productContext, cartContext },
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      },
      signal,
      timeout: 90_000,
      hooks: { afterResponse: [sseHook] },
    });
  } catch (err) {
    if (!signal?.aborted) onError(err as Error);
  }
}
