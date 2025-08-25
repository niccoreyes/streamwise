
import Dexie, { Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import type { Conversation, Message, ApiKey, AppConfig } from '@/types';

class StreamwiseDatabase extends Dexie {
  conversations!: Table<Conversation, string>;
  messages!: Table<Message, string>;
  apiKeys!: Table<ApiKey, string>;
  config!: Table<AppConfig, number>;

  constructor() {
    super('streamwiseAI');
    
    // Version 1 - Original schema
    this.version(1).stores({
      conversations: 'id, title, createdAt, updatedAt, modelId',
      messages: 'id, conversationId, role, timestamp',
      apiKeys: 'id, name, provider, createdAt',
      config: 'id'
    });

    // Version 2 - Add new timestamp fields with safe migration
    this.version(2).stores({
      conversations: 'id, title, createdAt, updatedAt, modelId, titleUpdatedAt, lastMessageAt',
      messages: 'id, conversationId, role, timestamp',
      apiKeys: 'id, name, provider, createdAt',
      config: 'id'
    }).upgrade(async (tx) => {
      // Migrate existing conversations by populating lastMessageAt
      const conversations = await tx.table('conversations').toArray();
      
      for (const conv of conversations) {
        if (conv.messages && conv.messages.length > 0) {
          // Find the most recent message timestamp
          const latestMessageTime = Math.max(...conv.messages.map((m: any) => m.timestamp));
          conv.lastMessageAt = latestMessageTime;
        }
        // titleUpdatedAt remains undefined for existing conversations
        await tx.table('conversations').put(conv);
      }
    });
  }

  async getConversations(): Promise<Conversation[]> {
    return await this.conversations.toArray();
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    return await this.conversations.get(id);
  }

  async saveConversation(conversation: Conversation, preserveTimestamp = false): Promise<string> {
    const now = Date.now();
    
    if (!conversation.id) {
      conversation.id = uuidv4();
      conversation.createdAt = now;
      conversation.updatedAt = now;
    } else if (!preserveTimestamp) {
      conversation.updatedAt = now;
    }
    // If preserveTimestamp is true, keep existing updatedAt
    
    await this.conversations.put(conversation);
    return conversation.id;
  }

  async deleteConversation(id: string): Promise<void> {
    await this.conversations.delete(id);
    // Delete associated messages
    await this.messages
      .where('conversationId')
      .equals(id)
      .delete();
  }

  async getApiKeys(): Promise<ApiKey[]> {
    return await this.apiKeys.toArray();
  }

  async saveApiKey(apiKey: ApiKey): Promise<string> {
    if (!apiKey.id) {
      apiKey.id = uuidv4();
      apiKey.createdAt = Date.now();
    }
    
    await this.apiKeys.put(apiKey);
    return apiKey.id;
  }

  async deleteApiKey(id: string): Promise<void> {
    await this.apiKeys.delete(id);
  }

  async getConfig(): Promise<AppConfig | undefined> {
    return await this.config.get(1);
  }

  async saveConfig(config: AppConfig): Promise<void> {
    await this.config.put({ ...config, id: 1 });
  }

  async initialize(): Promise<void> {
    // Check if config exists, if not create default config
    const existingConfig = await this.getConfig();
    
    if (!existingConfig) {
      const defaultConfig: AppConfig = {
        activeConversationId: null,
        apiKeys: [],
        defaultModelId: 'gpt-4o',
      };
      
      await this.saveConfig(defaultConfig);
    }
  }
}

export const db = new StreamwiseDatabase();

// Initialize the database
db.initialize().catch(error => {
  console.error('Failed to initialize database:', error);
});
