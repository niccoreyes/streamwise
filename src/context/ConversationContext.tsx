
import React, { createContext, useState, useContext, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { LocalStorage } from '@/lib/localStorage';
import { Conversation, Message, ModelSettings } from '@/types';
import { streamChatCompletion, ChatMessage } from '@/lib/openaiStreaming';
import { useSettings } from './SettingsContext';

type ConversationContextType = {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  isLoading: boolean;
  setCurrentConversationById: (id: string) => Promise<void>;
  createNewConversation: (modelId: string, modelSettings: ModelSettings) => Promise<Conversation>;
  updateConversation: (conversation: Conversation) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => Promise<void>;
  updateMessage: (message: Message) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  sendMessageAndStream: (message: Omit<Message, 'id' | 'timestamp'>) => Promise<void>;
};

const defaultModelSettings: ModelSettings = {
  temperature: 0.7,
  maxTokens: 1000,
};

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const ConversationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const settings = useSettings();
  // Load conversations on mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        // Try to load from IndexedDB first
        let dbConversations: Conversation[] = [];
        try {
          dbConversations = await db.getConversations();
        } catch (error) {
          console.error('Failed to load conversations from IndexedDB:', error);
        }
        
        // If IndexedDB fails, fall back to localStorage
        if (dbConversations.length === 0) {
          dbConversations = LocalStorage.getConversations();
        }
        
        // Ensure every conversation has a systemMessage and web search fields
        let updated = false;
        const defaultSystemMessage = settings.systemMessage || "";
        const defaultWebSearchConfig = settings.webSearchConfig || {
          enabled: false,
          contextSize: "medium",
          location: {
            type: "approximate",
            country: "",
            city: "",
            region: "",
            timezone: "",
          },
        };
        const fixedConversations = dbConversations.map(conv => {
          let changed = false;
          let newConv = { ...conv };

          // Ensure systemMessage
          if (typeof newConv.systemMessage === "undefined") {
            newConv.systemMessage = defaultSystemMessage;
            changed = true;
          }

          // Ensure webSearchEnabled
          if (typeof newConv.webSearchEnabled === "undefined") {
            newConv.webSearchEnabled = defaultWebSearchConfig.enabled;
            changed = true;
          }

          // Ensure modelSettings.webSearchSettings
          if (!newConv.modelSettings) newConv.modelSettings = { temperature: 0.7, maxTokens: 1000 };
          if (typeof newConv.modelSettings.webSearchSettings === "undefined") {
            newConv.modelSettings.webSearchSettings = {
              contextSize: defaultWebSearchConfig.contextSize,
              location: { ...defaultWebSearchConfig.location },
            };
            changed = true;
          } else {
            // Ensure all webSearchSettings fields
            if (typeof newConv.modelSettings.webSearchSettings.contextSize === "undefined") {
              newConv.modelSettings.webSearchSettings.contextSize = defaultWebSearchConfig.contextSize;
              changed = true;
            }
            if (typeof newConv.modelSettings.webSearchSettings.location === "undefined") {
              newConv.modelSettings.webSearchSettings.location = { ...defaultWebSearchConfig.location };
              changed = true;
            } else {
              const loc = newConv.modelSettings.webSearchSettings.location;
              for (const key of ["type", "country", "city", "region", "timezone"]) {
                if (typeof loc[key] === "undefined") {
                  loc[key] = defaultWebSearchConfig.location[key];
                  changed = true;
                }
              }
            }
          }

          if (changed) updated = true;
          return newConv;
        });
        if (updated) {
          for (const conv of fixedConversations) {
            await saveConversationToStorage(conv);
          }
        }
        setConversations(fixedConversations);

        // Load last active conversation if any
        const config = await db.getConfig();
        if (config?.activeConversationId) {
          try {
            const activeConversation = await db.getConversation(config.activeConversationId);
            if (activeConversation) {
              setCurrentConversation(activeConversation);
            }
          } catch (error) {
            console.error('Failed to load active conversation:', error);
          }
        }

        // If no conversations exist, create a default one
        if (fixedConversations.length === 0) {
          const defaultConversation = await createNewConversation('gpt-4o', defaultModelSettings);
          setCurrentConversation(defaultConversation);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadConversations();
  }, []);

  const saveConversationToStorage = async (conversation: Conversation): Promise<void> => {
    try {
      // Save to IndexedDB
      await db.saveConversation(conversation);
    } catch (error) {
      console.error('Failed to save conversation to IndexedDB:', error);
      // Fall back to localStorage
      LocalStorage.saveConversation(conversation);
    }
  };

  const setCurrentConversationById = async (id: string): Promise<void> => {
    const conversation = conversations.find((conv) => conv.id === id);
    if (conversation) {
      setCurrentConversation(conversation);
      
      try {
        const config = await db.getConfig();
        if (config) {
          config.activeConversationId = id;
          await db.saveConfig(config);
        }
      } catch (error) {
        console.error('Failed to update active conversation in config:', error);
      }
    }
  };

  const createNewConversation = async (
    modelId: string,
    modelSettings: ModelSettings
  ): Promise<Conversation> => {
    const newConversation: Conversation = {
      id: uuidv4(),
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      modelId,
      modelSettings,
      webSearchEnabled: false,
    };
    
    await saveConversationToStorage(newConversation);
    
    setConversations((prevConversations) => [...prevConversations, newConversation]);
    setCurrentConversation(newConversation);
    
    try {
      const config = await db.getConfig();
      if (config) {
        config.activeConversationId = newConversation.id;
        await db.saveConfig(config);
      }
    } catch (error) {
      console.error('Failed to update active conversation in config:', error);
    }
    
    return newConversation;
  };

  const updateConversation = async (conversation: Conversation): Promise<void> => {
    await saveConversationToStorage(conversation);
    
    setConversations((prevConversations) =>
      prevConversations.map((conv) =>
        conv.id === conversation.id ? conversation : conv
      )
    );
    
    if (currentConversation?.id === conversation.id) {
      setCurrentConversation(conversation);
    }
  };

  const deleteConversation = async (id: string): Promise<void> => {
    try {
      // Delete from IndexedDB
      await db.deleteConversation(id);
    } catch (error) {
      console.error('Failed to delete conversation from IndexedDB:', error);
      // Fall back to localStorage
      LocalStorage.deleteConversation(id);
    }
    
    setConversations((prevConversations) =>
      prevConversations.filter((conv) => conv.id !== id)
    );
    
    if (currentConversation?.id === id) {
      if (conversations.length > 1) {
        // Set current to another conversation
        const nextConversation = conversations.find((conv) => conv.id !== id);
        if (nextConversation) setCurrentConversation(nextConversation);
      } else {
        // Create a new conversation if this was the last one
        const newConversation = await createNewConversation('gpt-4o', defaultModelSettings);
        setCurrentConversation(newConversation);
      }
    }
  };

  const addMessage = async (message: Omit<Message, 'id' | 'timestamp'>): Promise<void> => {
    if (!currentConversation) return;
    
    const newMessage: Message = {
      ...message,
      id: uuidv4(),
      timestamp: Date.now(),
    };
    
    const updatedConversation: Conversation = {
      ...currentConversation,
      messages: [...currentConversation.messages, newMessage],
      updatedAt: Date.now(),
    };
    
    await updateConversation(updatedConversation);
  };

  const updateMessage = async (message: Message): Promise<void> => {
    if (!currentConversation) return;
    
    const updatedMessages = currentConversation.messages.map((msg) =>
      msg.id === message.id ? message : msg
    );
    
    const updatedConversation: Conversation = {
      ...currentConversation,
      messages: updatedMessages,
      updatedAt: Date.now(),
    };
    
    await updateConversation(updatedConversation);
  };

  const deleteMessage = async (id: string): Promise<void> => {
    if (!currentConversation) return;
    
    const updatedMessages = currentConversation.messages.filter((msg) => msg.id !== id);
    
    const updatedConversation: Conversation = {
      ...currentConversation,
      messages: updatedMessages,
      updatedAt: Date.now(),
    };
    
    await updateConversation(updatedConversation);
  };

  // New: Send message and stream assistant response
  const sendMessageAndStream = async (message: Omit<Message, 'id' | 'timestamp'>): Promise<void> => {
    if (!currentConversation) return;
    // 1. Add user message
    const userMessage: Message = {
      ...message,
      id: uuidv4(),
      timestamp: Date.now(),
    };
    let updatedConversation: Conversation = {
      ...currentConversation,
      messages: [...currentConversation.messages, userMessage],
      updatedAt: Date.now(),
    };
    await updateConversation(updatedConversation);

    // 2. Add placeholder assistant message (in-memory only for streaming)
    const assistantMessage: Message = {
      id: uuidv4(),
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    updatedConversation = {
      ...updatedConversation,
      messages: [...updatedConversation.messages, assistantMessage],
      updatedAt: Date.now(),
    };
    // Do NOT persist yet; will persist after streaming

    // 3. Extract OpenAI params
    const apiKey = settings.currentApiKey?.key;
    // Use the modelId from the current conversation, not the global selectedModel
    const model = updatedConversation.modelId;
    const temperature = updatedConversation.modelSettings.temperature;
    const maxTokens = updatedConversation.modelSettings.maxTokens;
    const messages: ChatMessage[] = updatedConversation.messages
      .map(({ role, content }) => ({ role, content }));
    if (!apiKey) {
      // Optionally update assistant message with error
      assistantMessage.content = "No API key configured.";
      updatedConversation = {
        ...updatedConversation,
        messages: updatedConversation.messages.map((msg) =>
          msg.id === assistantMessage.id ? { ...assistantMessage } : msg
        ),
        updatedAt: Date.now(),
      };
      await updateConversation(updatedConversation);
      return;
    }

    // 4. Stream response and update assistant message in real time (in-memory)
    try {
      // Determine if web search should be enabled for this request
      const modelObj = settings.availableModels.find(m => m.id === model);
      const enableWebSearch = !!(
        updatedConversation.webSearchEnabled &&
        modelObj &&
        modelObj.supportsWebSearch
      );
      const tools = enableWebSearch ? [{ type: "web_search_preview" }] : undefined;

      let fullContent = "";
      // Use a local state update for streaming
      setCurrentConversation({
        ...updatedConversation,
        messages: updatedConversation.messages.map((msg) =>
          msg.id === assistantMessage.id ? { ...assistantMessage } : msg
        ),
        updatedAt: Date.now(),
      });
      for await (const event of streamChatCompletion({
        apiKey,
        model,
        temperature,
        maxTokens,
        messages,
        ...(tools ? { tools } : {}),
        systemMessage: updatedConversation.systemMessage,
      })) {
        if (event.type === "final") {
          // On "final", immediately set the assistant message to the full/final text
          fullContent = event.text;
          const newAssistantMessage = { ...assistantMessage, content: fullContent };
          setCurrentConversation((prev) => prev
            ? {
                ...prev,
                messages: prev.messages.map((msg) =>
                  msg.id === assistantMessage.id ? newAssistantMessage : msg
                ),
                updatedAt: Date.now(),
              }
            : null
          );
        } else {
          // Overwrite the previous content with the new state after each delta
          fullContent += event.text;
          const newAssistantMessage = { ...assistantMessage, content: fullContent };
          setCurrentConversation((prev) => prev
            ? {
                ...prev,
                messages: prev.messages.map((msg) =>
                  msg.id === assistantMessage.id ? newAssistantMessage : msg
                ),
                updatedAt: Date.now(),
              }
            : null
          );
        }
      }
      // After streaming, persist the final assistant message
      updatedConversation = {
        ...updatedConversation,
        messages: updatedConversation.messages.map((msg) =>
          msg.id === assistantMessage.id ? { ...assistantMessage, content: fullContent } : msg
        ),
        updatedAt: Date.now(),
      };
      await updateConversation(updatedConversation);
    } catch (err) {
      assistantMessage.content = "Error streaming response from OpenAI.";
      updatedConversation = {
        ...updatedConversation,
        messages: updatedConversation.messages.map((msg) =>
          msg.id === assistantMessage.id ? { ...assistantMessage } : msg
        ),
        updatedAt: Date.now(),
      };
      await updateConversation(updatedConversation);
    }
  };
  const value = {
    conversations,
    currentConversation,
    isLoading,
    setCurrentConversationById,
    createNewConversation,
    updateConversation,
    deleteConversation,
    addMessage,
    updateMessage,
    deleteMessage,
    sendMessageAndStream,
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
};

export const useConversation = (): ConversationContextType => {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
};
