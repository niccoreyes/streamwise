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
  previousResponseId?: string; // For maintaining conversation state with Responses API
}

/**
 * Streams a chat completion from OpenAI as an async generator of text chunks.
 *
 * @param opts - StreamOptions including apiKey, model, temperature, maxTokens, and messages.
 */
/**
 * Options for streaming a chat completion.
 * @param opts - StreamOptions including apiKey, model, temperature, maxTokens, and messages.
 * @param onResponseId - Optional callback to receive the response id for multi-turn conversations.
 */
export async function* streamChatCompletion(
  opts: StreamOptions,
  onResponseId?: (responseId: string) => void
): AsyncGenerator<string> {
  const client = new OpenAI({
    apiKey: opts.apiKey,
    dangerouslyAllowBrowser: true,
  });
 
   // Build input for Responses API according to OpenAI docs
   // https://platform.openai.com/docs/api-reference/responses/create
   // - For the first turn, input is the full conversation as an array of message objects or strings.
   // - For subsequent turns, input is just the new user message, and previous_response_id is set.
 
   // Convert messages to the format expected by the Responses API
   // Each message: { role: "user" | "assistant", content: string }
   // We'll use the "input" field as an array of message objects (excluding system messages)
   const inputMessages = opts.messages
     .filter(m => m.role === "user" || m.role === "assistant")
     .map(m => ({
       role: m.role,
       content: [{
         type: m.role === "user" ? "input_text" : "output_text",
         text: m.content
       }]
     }));
 
   // If this is the first turn (no previousResponseId), send the full conversation as input
   // Otherwise, send only the latest user message as input, and set previous_response_id
   let input: any;
   const previous_response_id: string | undefined = opts.previousResponseId;
 
   if (!previous_response_id) {
     input = inputMessages;
   } else {
     // Find the last user message
     const lastUser = [...inputMessages].reverse().find(m => m.role === "user");
     input = lastUser ? [lastUser] : [];
   }
 
   // Build the payload for the Responses API
   const payload: any = {
     model: opts.model,
     input,
     stream: true,
     temperature: opts.temperature,
     max_output_tokens: opts.maxTokens,
     instructions: opts.systemMessage || undefined,
     tools: opts.tools || undefined,
     previous_response_id: previous_response_id || undefined,
   };
 
   // Remove undefined fields
   Object.keys(payload).forEach(
     (key) => payload[key] === undefined && delete payload[key]
   );
 
   // Use the OpenAI SDK's responses.create for streaming
   const stream = await (client as any).responses.create(payload);
 
   // The SDK's stream is an async iterable of events (see OpenAI docs)
   let responseIdCaptured = false;
   for await (const chunk of stream) {
     // If the event contains a response object with an id, call the callback
     if (!responseIdCaptured && chunk && typeof chunk === "object" && "response" in chunk && chunk.response?.id) {
       responseIdCaptured = true;
       if (onResponseId) onResponseId(chunk.response.id);
     }
     // The streaming format for responses API is not always well-documented; fallback to output_text or text
     const text = (chunk as any).output_text || (chunk as any).text || "";
     if (text) {
       yield text;
     }
   }
 }
