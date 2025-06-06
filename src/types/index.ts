
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
};

export type ModelSettings = {
  temperature: number;
  maxTokens: number;
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
