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
  tools?: any[]; // For web search and other tool integrations
  systemMessage?: string; // Optional system message to prepend
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

  // Prepare messages with systemMessage if provided and not already present
  let messages: ChatMessage[] = opts.messages || [];
  if (opts.systemMessage) {
    // Only prepend if the first message is not already a system message with the same content
    if (
      messages.length === 0 ||
      messages[0].role !== "system" ||
      messages[0].content !== opts.systemMessage
    ) {
      messages = [{ role: "system", content: opts.systemMessage }, ...messages];
    }
  }

  // If using the web search tool, use the Responses API
  const isWebSearch = opts.tools && opts.tools.some(t => t.type === "web_search_preview");
  if (isWebSearch) {
    // Use the last user message as input for web search
    const lastUserMsg = messages?.slice().reverse().find(m => m.role === "user")?.content || "";
    const payload: any = {
      model: opts.model,
      tools: opts.tools,
      input: lastUserMsg,
      stream: true,
      // Optionally pass system prompt if supported by Responses API
      ...(opts.systemMessage ? { system: opts.systemMessage } : {}),
    };
    // Do NOT add temperature or max_tokens: Responses API does not support them

    // Use the OpenAI SDK's responses.create for streaming
    const stream = await (client as any).responses.create(payload);

    // The SDK's stream is an async iterable of objects with a 'data' property containing text
    for await (const chunk of stream) {
      // The streaming format for responses API is not always well-documented; fallback to output_text or text
      const text = (chunk as any).output_text || (chunk as any).text || "";
      if (text) {
        yield text;
      }
    }
    return;
  }

  // Otherwise, use Chat Completions API
  const payload: any = {
    model: opts.model,
    messages,
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
    stream: true,
  };
  if (opts.tools) {
    payload.tools = opts.tools;
  }
  const stream = await client.chat.completions.create(payload);

  for await (const chunk of stream) {
    const delta = (chunk as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content;
    if (delta) {
      yield delta;
    }
  }
}
