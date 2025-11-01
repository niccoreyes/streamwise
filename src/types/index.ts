
export type AIModel = {
  id: string;
  name: string;
  description: string;
  supportsWebSearch: boolean;
  maxTokens: number;
  defaultTemperature: number;
};
export type MessageContentPart =
  | { type: "input_text" | "output_text"; text: string }
  | { type: "input_image"; image_data: string };

export type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string | MessageContentPart[];
  timestamp: number;
  mediaUrl?: string;
  mediaType?: "image" | "audio" | "video";
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  modelId: string;
  modelSettings: ModelSettings;
  webSearchEnabled: boolean;
  systemMessage?: string;
  // New timestamp fields for priority sorting
  titleUpdatedAt?: number; // When title was last changed
  lastMessageAt?: number;  // When last message was added/updated
  lastResponseId?: string; // OpenAI response ID for prompt caching
};

export type ModelSettings = {
  temperature: number;
  maxTokens: number;
  reasoningEffort?: "minimal" | "low" | "medium" | "high";
  verbosity?: "low" | "medium" | "high";
  webSearchSettings?: WebSearchSettings;
};

export type WebSearchSettings = {
  contextSize: "low" | "medium" | "high";
  location: {
    type: "approximate";
    country: string;
    city: string;
    region: string;
    timezone: string;
  };
};

export type ApiKey = {
  id: string;
  name: string;
  key: string;
  provider: "openai" | "custom";
  createdAt: number;
};

export type AppConfig = {
  id?: number;
  activeConversationId: string | null;
  apiKeys: ApiKey[];
  defaultModelId: string;
};
