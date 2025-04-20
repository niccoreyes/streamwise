import OpenAI from "openai";

/**
 * A single message in a chat conversation.
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Options for streaming a chat completion.
 */
export interface StreamOptions {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  messages: ChatMessage[];
}

/**
 * Streams a chat completion from OpenAI as an async generator of text chunks.
 *
 * @param opts - StreamOptions including apiKey, model, temperature, maxTokens, and messages.
 * @returns An async generator that yields each delta.content string as received.
 */
export async function* streamChatCompletion(opts: StreamOptions): AsyncGenerator<string> {
  const client = new OpenAI({
    apiKey: opts.apiKey,
    dangerouslyAllowBrowser: true,
  });

  const stream = await client.chat.completions.create({
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
    stream: true,
  });

  // The OpenAI SDK's stream is an async iterable of objects with a 'choices' array.
  // We'll use a type assertion inside the loop to avoid 'any' on the stream itself.
  for await (const chunk of stream) {
    const delta = (chunk as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content;
    if (delta) {
      yield delta;
    }
  }
}
