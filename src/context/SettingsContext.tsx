import React, { createContext, useState, useContext, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { LocalStorage } from '@/lib/localStorage';
import { ApiKey, AIModel } from '@/types';
import { chatDb } from '@/lib/chatDb';

const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    description: 'OpenAI\'s latest model with a 1,000,000 token context window.',
    supportsWebSearch: true,
    maxTokens: 1000000,
    defaultTemperature: 0.7,
  },
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    description: 'Smaller version of GPT-4.1 with a 256,000 token context window.',
    supportsWebSearch: true,
    maxTokens: 256000,
    defaultTemperature: 0.7,
  },
  {
    id: 'gpt-4.1-nano',
    name: 'GPT-4.1 Nano',
    description: 'Fast and cost-effective nano version of GPT-4.1 with a 128,000 token context window.',
    supportsWebSearch: false,
    maxTokens: 128000,
    defaultTemperature: 0.7,
  },
  {
    id: 'o4-mini',
    name: 'o4-mini',
    description: 'OpenAI\'s o4-mini model with a 128,000 token context window.',
    supportsWebSearch: true,
    maxTokens: 128000,
    defaultTemperature: 0.7,
  },
  {
    id: 'o3',
    name: 'o3',
    description: 'OpenAI\'s base reasoning model with a 4,096 token context window.',
    supportsWebSearch: true,
    maxTokens: 4096,
    defaultTemperature: 0.7,
  },
  {
    id: 'o3-mini',
    name: 'o3-mini',
    description: 'OpenAI\'s o3-mini model with a 16,384 token context window.',
    supportsWebSearch: false,
    maxTokens: 16384,
    defaultTemperature: 0.7,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'OpenAI\'s latest and most capable multimodal model.',
    supportsWebSearch: true,
    maxTokens: 16384,
    defaultTemperature: 0.7,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Smaller, faster, and more cost-effective model.',
    supportsWebSearch: true,
    maxTokens: 16384,
    defaultTemperature: 0.7,
  },
  {
    id: 'gpt-4.5-preview',
    name: 'GPT-4.5 Preview',
    description: 'Advanced preview of OpenAI\'s next-gen model.',
    supportsWebSearch: true,
    maxTokens: 8192,
    defaultTemperature: 0.7,
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'Fast and efficient model for most use cases.',
    supportsWebSearch: false,
    maxTokens: 4096,
    defaultTemperature: 0.7,
  }
];

type WebSearchConfig = {
  enabled: boolean;
  contextSize: "low" | "medium" | "high";
  location: {
    type: "approximate";
    country: string;
    city: string;
    region: string;
    timezone: string;
  };
};

type SettingsContextType = {
  apiKeys: ApiKey[];
  currentApiKey: ApiKey | null;
  availableModels: AIModel[];
  selectedModel: AIModel;
  saveApiKey: (apiKey: Omit<ApiKey, 'id' | 'createdAt'>) => Promise<void>;
  deleteApiKey: (id: string) => Promise<void>;
  setCurrentApiKey: (id: string) => void;
  setSelectedModel: (modelId: string) => void;
  webSearchConfig: WebSearchConfig;
  setWebSearchConfig: (config: WebSearchConfig) => void;
  systemMessage: string;
  setSystemMessage: (msg: string) => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [currentApiKey, setCurrentApiKey] = useState<ApiKey | null>(null);
  const [availableModels] = useState<AIModel[]>(AVAILABLE_MODELS);
  const [selectedModel, setSelectedModel] = useState<AIModel>(AVAILABLE_MODELS[0]);
  const [webSearchConfig, setWebSearchConfigState] = useState<WebSearchConfig>({
    enabled: false,
    contextSize: "medium",
    location: {
      type: "approximate",
      country: "",
      city: "",
      region: "",
      timezone: "",
    },
  });
  const [systemMessage, setSystemMessageState] = useState<string>("");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        let dbApiKeys: ApiKey[] = [];
        try {
          dbApiKeys = await db.getApiKeys();
        } catch (error) {
          console.error('Failed to load API keys from IndexedDB:', error);
        }
        
        if (dbApiKeys.length === 0) {
          dbApiKeys = LocalStorage.getApiKeys();
        }
        
        setApiKeys(dbApiKeys);
        
        if (dbApiKeys.length > 0) {
          setCurrentApiKey(dbApiKeys[0]);
        }
        
        const config = await db.getConfig();
        if (config?.defaultModelId) {
          const model = availableModels.find(m => m.id === config.defaultModelId);
          if (model) {
            setSelectedModel(model);
          }
        }

        const wsConfig = await chatDb.getSetting<WebSearchConfig>("webSearchConfig");
        if (wsConfig) setWebSearchConfigState(wsConfig);
        const sysMsg = await chatDb.getSetting<string>("systemMessage");
        if (sysMsg !== undefined) setSystemMessageState(sysMsg);

      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    
    loadSettings();
  }, [availableModels]);

  const saveApiKey = async (apiKeyData: Omit<ApiKey, 'id' | 'createdAt'>): Promise<void> => {
    const newApiKey: ApiKey = {
      ...apiKeyData,
      id: uuidv4(),
      createdAt: Date.now(),
    };
    
    try {
      await db.saveApiKey(newApiKey);
      await chatDb.setSetting("currentApiKey", newApiKey);
    } catch (error) {
      console.error('Failed to save API key:', error);
      LocalStorage.saveApiKey(newApiKey);
    }
    
    setApiKeys((prevApiKeys) => [...prevApiKeys, newApiKey]);
    setCurrentApiKey(newApiKey);
  };

  const deleteApiKey = async (id: string): Promise<void> => {
    try {
      await db.deleteApiKey(id);
    } catch (error) {
      console.error('Failed to delete API key from IndexedDB:', error);
      LocalStorage.deleteApiKey(id);
    }
    
    setApiKeys((prevApiKeys) => prevApiKeys.filter((key) => key.id !== id));
    
    if (currentApiKey?.id === id) {
      const remainingKeys = apiKeys.filter((key) => key.id !== id);
      setCurrentApiKey(remainingKeys.length > 0 ? remainingKeys[0] : null);
    }
  };

  const handleSetCurrentApiKey = async (id: string): Promise<void> => {
    const apiKey = apiKeys.find((key) => key.id === id);
    if (apiKey) {
      setCurrentApiKey(apiKey);
      try {
        await chatDb.setSetting("currentApiKey", apiKey);
      } catch (error) {
        console.error('Failed to sync current API key:', error);
      }
    }
  };

  const handleSetSelectedModel = (modelId: string): void => {
    const model = availableModels.find((m) => m.id === modelId);
    if (model) {
      setSelectedModel(model);
      (async () => {
        try {
          const config = await db.getConfig();
          if (config) {
            config.defaultModelId = modelId;
            await db.saveConfig(config);
          }
        } catch (error) {
          console.error('Failed to update default model in config:', error);
        }
      })();
    }
  };

  useEffect(() => {
    chatDb.setSetting("webSearchConfig", webSearchConfig);
  }, [webSearchConfig]);
  useEffect(() => {
    chatDb.setSetting("systemMessage", systemMessage);
  }, [systemMessage]);

  const setWebSearchConfig = (config: WebSearchConfig) => {
    setWebSearchConfigState(config);
  };
  const setSystemMessage = (msg: string) => {
    setSystemMessageState(msg);
    chatDb.setSetting("systemMessage", msg);
  };

  const value = {
    apiKeys,
    currentApiKey,
    availableModels,
    selectedModel,
    saveApiKey,
    deleteApiKey,
    setCurrentApiKey: handleSetCurrentApiKey,
    setSelectedModel: handleSetSelectedModel,
    webSearchConfig,
    setWebSearchConfig,
    systemMessage,
    setSystemMessage,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
