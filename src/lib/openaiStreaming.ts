import OpenAI from "openai";
import { stringify } from "querystring";

/**
 * A single message in a chat conversation.
 */
import type { MessageContentPart } from "@/types";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | MessageContentPart[];
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
// StreamEvent type: { type: "delta" | "final", text: string }
export type StreamEvent = { type: "delta" | "final"; text: string };

export async function* streamChatCompletion(
  opts: StreamOptions,
  onResponseId?: (responseId: string) => void
): AsyncGenerator<StreamEvent> {
  const client = new OpenAI({
    apiKey: opts.apiKey,
    dangerouslyAllowBrowser: true,
  });

  if (!opts.systemMessage) {
    console.warn(
      "[openaiStreaming] systemMessage (system prompt) is missing from API call. The system prompt will not be included in the request. Ensure it is set in context/settings before calling streamChatCompletion."
    );
  }

  // Build input for Responses API according to OpenAI docs
  // https://platform.openai.com/docs/api-reference/responses/create
  // - For the first turn, input is the full conversation as an array of message objects or strings.
  // - For subsequent turns, input is just the new user message, and previous_response_id is set.

  // Convert messages to the format expected by the Responses API
  // Each message: { role: "user" | "assistant", content: string }
  // We'll use the "input" field as an array of message objects (excluding system messages)
  const inputMessages = opts.messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => {
      let contentArr: any[] = [];
      if (typeof m.content === "string") {
        // Default to input_text for user, output_text for assistant
        contentArr = [
          {
            type: m.role === "user" ? "input_text" : "output_text",
            text: m.content,
          },
        ];
      } else if (Array.isArray(m.content)) {
        contentArr = m.content.map((part) => {
          if (part.type === "input_text" || part.type === "output_text") {
            return {
              type: part.type,
              text: (part as any).text || (part as any).value || "",
            };
          }
          if (part.type === "input_image" || part.type === "image") {
            return {
              type: "input_image",
              image_url:
                (part as any).image_url ||
                (part as any).image_data ||
                (part as any).value ||
                "",
            };
          }
          // fallback: treat as text
          return {
            type: "input_text",
            text: (part as any).text || (part as any).value || "",
          };
        });
      }
      return {
        role: m.role,
        content: contentArr,
      };
    });

  // If this is the first turn (no previousResponseId), send the full conversation as input
  // Otherwise, send only the latest user message as input, and set previous_response_id
  let input: any;
  const previous_response_id: string | undefined = opts.previousResponseId;

  if (!previous_response_id) {
    input = inputMessages;
  } else {
    // Find the last user message
    const lastUser = [...inputMessages]
      .reverse()
      .find((m) => m.role === "user");
    input = lastUser ? [lastUser] : [];
  }

  // Build the payload for the Responses API
  // Only include temperature if model is NOT an "o" series reasoning model (e.g., o3, o4)
  const isOReasoningModel = /^o\d/i.test(opts.model);

  // Clean tools: remove empty string fields from user_location
  let cleanedTools = undefined;
  if (Array.isArray(opts.tools)) {
    cleanedTools = opts.tools.map((tool) => {
      if (
        tool &&
        typeof tool === "object" &&
        tool.user_location &&
        typeof tool.user_location === "object"
      ) {
        // Remove keys with empty string values
        const cleanedLocation: any = {};
        Object.entries(tool.user_location).forEach(([k, v]) => {
          if (v !== "") cleanedLocation[k] = v;
        });
        return { ...tool, user_location: cleanedLocation };
      }
      return tool;
    });
  }
  const payload: any = {
    model: opts.model,
    input,
    stream: true,
    max_output_tokens: opts.maxTokens,
    instructions: opts.systemMessage || undefined,
    tools: cleanedTools || undefined,
    previous_response_id: previous_response_id || undefined,
  };

  if (!isOReasoningModel) {
    payload.temperature = opts.temperature;
  }

  // Remove undefined fields
  Object.keys(payload).forEach(
    (key) => payload[key] === undefined && delete payload[key]
  );

  // Debug log: Output the payload being sent to OpenAI
  //  console.debug("[openaiStreaming] OpenAI responses.create payload:", JSON.stringify(payload, null, 2));
  //  console.debug("[openaiStreaming] instructions:", payload.systemMessage);
  // Use the OpenAI SDK's responses.create for streaming
  const stream = await (client as any).responses.create(payload);

  // The SDK's stream is an async iterable of events (see OpenAI docs)
  let responseIdCaptured = false;
  for await (const chunk of stream) {
    // If the event contains a response object with an id, call the callback
    if (
      !responseIdCaptured &&
      chunk &&
      typeof chunk === "object" &&
      "response" in chunk &&
      chunk.response?.id
    ) {
      responseIdCaptured = true;
      if (onResponseId) onResponseId(chunk.response.id);
    }
    // Always yield deltas as they arrive, and yield "final" only at the end
    let isFinal = false;
    let text = "";
    // Chat Completions API (OpenAI): choices[0].delta.content
    if (
      chunk &&
      Array.isArray(chunk.choices) &&
      chunk.choices[0]?.delta !== undefined
    ) {
      text = chunk.choices[0].delta;
      yield { type: "delta", text };
      continue;
    }
    // Responses API: delta.content or content
    if (chunk && chunk.delta !== undefined) {
      text = chunk.delta;
      yield { type: "delta", text };
      continue;
    }
    if (chunk && chunk.content !== undefined) {
      text = chunk.content;
      yield { type: "delta", text };
      continue;
    }
    // Fallbacks
    if ((chunk as any).output_text !== undefined) {
      text = (chunk as any).output_text;
      yield { type: "delta", text };
      continue;
    }
    if ((chunk as any).text !== undefined) {
      text = (chunk as any).text;
      yield { type: "final", text };
      continue;
    }
    // Detect "done" events with full/final text
    // OpenAI Responses API: response.output_text.done, response.content_part.done, response.completed
    if (
      (chunk && chunk.response?.output_text?.done !== undefined) ||
      (chunk && chunk.response?.content_part?.done !== undefined) ||
      (chunk && chunk.response?.completed !== undefined)
    ) {
      isFinal = true;
      if (chunk.response?.output_text?.done !== undefined) {
        text = chunk.response.output_text.done;
      } else if (chunk.response?.content_part?.done !== undefined) {
        text = chunk.response.content_part.done;
      } else if (chunk.response?.completed !== undefined) {
        text = chunk.response.completed;
      }
      yield { type: "final", text };
    }
  }
}
