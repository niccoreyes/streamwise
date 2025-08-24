
import { Conversation, Message, ApiKey, AppConfig } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const KEYS = {
  CONVERSATIONS: 'streamwise_conversations',
  MESSAGES: 'streamwise_messages',
  API_KEYS: 'streamwise_api_keys',
  CONFIG: 'streamwise_config',
};

export const LocalStorage = {
  getItem<T>(key: string, defaultValue: T): T {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
      console.error(`Error getting item from localStorage: ${key}`, error);
      return defaultValue;
    }
  },

  setItem(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting item to localStorage: ${key}`, error);
    }
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item from localStorage: ${key}`, error);
    }
  },

  getConversations(): Conversation[] {
    return this.getItem(KEYS.CONVERSATIONS, [] as Conversation[]);
  },

  getConversation(id: string): Conversation | undefined {
    return this.getConversations().find((conv) => conv.id === id);
  },

  saveConversation(conversation: Conversation, preserveTimestamp = false): string {
    const now = Date.now();
    const conversations = this.getConversations();
    
    if (!conversation.id) {
      conversation.id = uuidv4();
      conversation.createdAt = now;
      conversation.updatedAt = now;
      conversations.push(conversation);
    } else {
      if (!preserveTimestamp) {
        conversation.updatedAt = now;
      }
      // If preserveTimestamp is true, keep existing updatedAt
      const index = conversations.findIndex((conv) => conv.id === conversation.id);
      
      if (index !== -1) {
        conversations[index] = conversation;
      } else {
        conversations.push(conversation);
      }
    }
    
    this.setItem(KEYS.CONVERSATIONS, conversations);
    return conversation.id;
  },

  deleteConversation(id: string): void {
    const conversations = this.getConversations().filter(
      (conv) => conv.id !== id
    );
    this.setItem(KEYS.CONVERSATIONS, conversations);
  },

  getApiKeys(): ApiKey[] {
    return this.getItem(KEYS.API_KEYS, [] as ApiKey[]);
  },

  saveApiKey(apiKey: ApiKey): string {
    const apiKeys = this.getApiKeys();
    
    if (!apiKey.id) {
      apiKey.id = uuidv4();
      apiKey.createdAt = Date.now();
      apiKeys.push(apiKey);
    } else {
      const index = apiKeys.findIndex((key) => key.id === apiKey.id);
      
      if (index !== -1) {
        apiKeys[index] = apiKey;
      } else {
        apiKeys.push(apiKey);
      }
    }
    
    this.setItem(KEYS.API_KEYS, apiKeys);
    return apiKey.id;
  },

  deleteApiKey(id: string): void {
    const apiKeys = this.getApiKeys().filter((key) => key.id !== id);
    this.setItem(KEYS.API_KEYS, apiKeys);
  },

  getConfig(): AppConfig | null {
    return this.getItem(KEYS.CONFIG, null as AppConfig | null);
  },

  saveConfig(config: AppConfig): void {
    this.setItem(KEYS.CONFIG, config);
  },

  initialize(): AppConfig {
    // Check if config exists, if not create default config
    let config = this.getConfig();
    
    if (!config) {
      config = {
        activeConversationId: null,
        apiKeys: [],
        defaultModelId: 'gpt-4o',
      };
      
      this.saveConfig(config);
    }
    
    return config;
  }
};

// Initialize localStorage
LocalStorage.initialize();
