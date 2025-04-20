
import React, { createContext, useState, useContext, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { LocalStorage } from '@/lib/localStorage';
import { ApiKey, AIModel } from '@/types';

// Define available AI models
const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'OpenAI\'s latest and most capable multimodal model.',
    supportsWebSearch: true,
    maxTokens: 4096,
    defaultTemperature: 0.7,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Smaller, faster, and more cost-effective model.',
    supportsWebSearch: true,
    maxTokens: 4096,
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

type SettingsContextType = {
  apiKeys: ApiKey[];
  currentApiKey: ApiKey | null;
  availableModels: AIModel[];
  selectedModel: AIModel;
  saveApiKey: (apiKey: Omit<ApiKey, 'id' | 'createdAt'>) => Promise<void>;
  deleteApiKey: (id: string) => Promise<void>;
  setCurrentApiKey: (id: string) => void;
  setSelectedModel: (modelId: string) => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [currentApiKey, setCurrentApiKey] = useState<ApiKey | null>(null);
  const [availableModels] = useState<AIModel[]>(AVAILABLE_MODELS);
  const [selectedModel, setSelectedModel] = useState<AIModel>(AVAILABLE_MODELS[0]);

  // Load API keys and settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Try to load from IndexedDB first
        let dbApiKeys: ApiKey[] = [];
        try {
          dbApiKeys = await db.getApiKeys();
        } catch (error) {
          console.error('Failed to load API keys from IndexedDB:', error);
        }
        
        // If IndexedDB fails, fall back to localStorage
        if (dbApiKeys.length === 0) {
          dbApiKeys = LocalStorage.getApiKeys();
        }
        
        setApiKeys(dbApiKeys);
        
        // Set current API key to first one if exists
        if (dbApiKeys.length > 0) {
          setCurrentApiKey(dbApiKeys[0]);
        }
        
        // Load preferred model from config
        const config = await db.getConfig();
        if (config?.defaultModelId) {
          const model = availableModels.find(m => m.id === config.defaultModelId);
          if (model) {
            setSelectedModel(model);
          }
        }
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
      // Save to IndexedDB
      await db.saveApiKey(newApiKey);
    } catch (error) {
      console.error('Failed to save API key to IndexedDB:', error);
      // Fall back to localStorage
      LocalStorage.saveApiKey(newApiKey);
    }
    
    setApiKeys((prevApiKeys) => [...prevApiKeys, newApiKey]);
    
    // If this is the first key, set it as current
    if (apiKeys.length === 0) {
      setCurrentApiKey(newApiKey);
    }
  };

  const deleteApiKey = async (id: string): Promise<void> => {
    try {
      // Delete from IndexedDB
      await db.deleteApiKey(id);
    } catch (error) {
      console.error('Failed to delete API key from IndexedDB:', error);
      // Fall back to localStorage
      LocalStorage.deleteApiKey(id);
    }
    
    setApiKeys((prevApiKeys) => prevApiKeys.filter((key) => key.id !== id));
    
    // If current key is deleted, set to null or first available
    if (currentApiKey?.id === id) {
      const remainingKeys = apiKeys.filter((key) => key.id !== id);
      setCurrentApiKey(remainingKeys.length > 0 ? remainingKeys[0] : null);
    }
  };

  const handleSetCurrentApiKey = (id: string): void => {
    const apiKey = apiKeys.find((key) => key.id === id);
    if (apiKey) {
      setCurrentApiKey(apiKey);
    }
  };

  const handleSetSelectedModel = async (modelId: string): Promise<void> => {
    const model = availableModels.find((m) => m.id === modelId);
    if (model) {
      setSelectedModel(model);
      
      try {
        const config = await db.getConfig();
        if (config) {
          config.defaultModelId = modelId;
          await db.saveConfig(config);
        }
      } catch (error) {
        console.error('Failed to update default model in config:', error);
      }
    }
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
