import React, { useState } from "react";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/context/useSettings";
import { useConversation } from "@/context/ConversationContext";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    apiKeys,
    currentApiKey,
    saveApiKey,
    deleteApiKey,
    setCurrentApiKey,
    availableModels,
    selectedModel,
    setSelectedModel,
  } = useSettings();

  const { currentConversation, updateConversation } = useConversation();

  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [newKeyProvider, setNewKeyProvider] = useState<"openai" | "custom">(
    "openai"
  );
  const [showAddKey, setShowAddKey] = useState(false);
  const { webSearchConfig, setWebSearchConfig, systemMessage, setSystemMessage, resetSettings } = useSettings();
  const [localSystemMessage, setLocalSystemMessage] = useState(currentConversation?.systemMessage ?? "");

  // Local state for web search fields
  const [localWebSearchEnabled, setLocalWebSearchEnabled] = useState(currentConversation?.webSearchEnabled ?? false);
  const [localContextSize, setLocalContextSize] = useState(currentConversation?.modelSettings?.webSearchSettings?.contextSize ?? "medium");
  const [localCountry, setLocalCountry] = useState(currentConversation?.modelSettings?.webSearchSettings?.location?.country ?? "");
  const [localCity, setLocalCity] = useState(currentConversation?.modelSettings?.webSearchSettings?.location?.city ?? "");
  const [localRegion, setLocalRegion] = useState(currentConversation?.modelSettings?.webSearchSettings?.location?.region ?? "");
  const [localTimezone, setLocalTimezone] = useState(currentConversation?.modelSettings?.webSearchSettings?.location?.timezone ?? "");

  // Sync local state with currentConversation when drawer opens or conversation changes
  React.useEffect(() => {
    if (isOpen && currentConversation) {
      setLocalSystemMessage(currentConversation.systemMessage ?? "");
      setLocalWebSearchEnabled(currentConversation.webSearchEnabled ?? false);
      setLocalContextSize(currentConversation.modelSettings?.webSearchSettings?.contextSize ?? "medium");
      setLocalCountry(currentConversation.modelSettings?.webSearchSettings?.location?.country ?? "");
      setLocalCity(currentConversation.modelSettings?.webSearchSettings?.location?.city ?? "");
      setLocalRegion(currentConversation.modelSettings?.webSearchSettings?.location?.region ?? "");
      setLocalTimezone(currentConversation.modelSettings?.webSearchSettings?.location?.timezone ?? "");
    }
  }, [isOpen, currentConversation]);

  // On drawer close, commit localSystemMessage to context/IndexedDB
  const handleDrawerClose = () => {
    setSystemMessage(localSystemMessage);
    setWebSearchConfig({
      ...webSearchConfig,
      enabled: localWebSearchEnabled,
      contextSize: localContextSize,
      location: {
        ...webSearchConfig.location,
        country: localCountry,
        city: localCity,
        region: localRegion,
        timezone: localTimezone,
        type: "approximate"
      }
    });
    if (currentConversation) {
      const updatedConversation = {
        ...currentConversation,
        systemMessage: localSystemMessage,
      };
      updateConversation(updatedConversation);
    }
    onClose();
  };

  const handleSaveKey = async () => {
    if (newKeyName.trim() && newKeyValue.trim()) {
      await saveApiKey({
        name: newKeyName.trim(),
        key: newKeyValue.trim(),
        provider: newKeyProvider,
      });
      setNewKeyName("");
      setNewKeyValue("");
      setShowAddKey(false);
    }
  };

  const handleModelChange = async (modelId: string) => {
    await setSelectedModel(modelId);

    if (currentConversation) {
      const model = availableModels.find((m) => m.id === modelId);
      if (model) {
        // Determine web search state based on model capability
        const webSearchEnabled = !!model.supportsWebSearch;
        setLocalWebSearchEnabled(webSearchEnabled);
        let webSearchSettings = undefined;
        if (webSearchEnabled) {
          // Use previous settings if available, else initialize
          webSearchSettings =
            currentConversation.modelSettings?.webSearchSettings ?? {
              contextSize: "medium",
              location: {
                type: "approximate",
                country: "PH",
                city: "Manila",
                region: "",
                timezone: "",
              },
            };
        }
        const updatedConversation = {
          ...currentConversation,
          modelId,
          webSearchEnabled,
          modelSettings: {
            ...currentConversation.modelSettings,
            temperature: model.defaultTemperature,
            maxTokens: model.maxTokens,
            webSearchSettings,
          },
        };
        await updateConversation(updatedConversation);
      }
    }
  };

  const handleTemperatureChange = (value: number) => {
    if (!currentConversation) return;

    const updatedConversation = {
      ...currentConversation,
      modelSettings: {
        ...currentConversation.modelSettings,
        temperature: value,
      },
    };

    updateConversation(updatedConversation);
  };

  const handleMaxTokensChange = (value: number) => {
    if (!currentConversation) return;

    const updatedConversation = {
      ...currentConversation,
      modelSettings: {
        ...currentConversation.modelSettings,
        maxTokens: value,
      },
    };

    updateConversation(updatedConversation);
  };

  const handleWebSearchToggle = (enabled: boolean) => {
    setLocalWebSearchEnabled(enabled);
    if (!currentConversation) return;

    const updatedConversation = {
      ...currentConversation,
      webSearchEnabled: enabled,
      modelSettings: {
        ...currentConversation.modelSettings,
        webSearchSettings: enabled
          ? {
              contextSize: localContextSize,
              location: {
                type: "approximate" as const,
                country: localCountry,
                city: localCity,
                region: localRegion,
                timezone: localTimezone,
              },
            }
          : undefined,
      },
    };

    updateConversation(updatedConversation);
  };

  const handleSystemMessageChange = (value: string) => {
    setSystemMessage(value);
    if (currentConversation) {
      const updatedConversation = {
        ...currentConversation,
        systemMessage: value,
      };
      updateConversation(updatedConversation);
    }
  };

  // Individual handlers for each web search field
  const handleContextSizeChange = (value: "low" | "medium" | "high") => {
    setLocalContextSize(value);
    if (currentConversation) {
      const updatedConversation = {
        ...currentConversation,
        modelSettings: {
          ...currentConversation.modelSettings,
          webSearchSettings: {
            ...currentConversation.modelSettings.webSearchSettings,
            contextSize: value,
            location: {
              ...currentConversation.modelSettings.webSearchSettings?.location,
              country: localCountry,
              city: localCity,
              region: localRegion,
              timezone: localTimezone,
              type: "approximate" as const,
            },
          },
        },
      };
      updateConversation(updatedConversation);
    }
  };

  const handleCountryChange = (value: string) => {
    setLocalCountry(value);
    if (currentConversation) {
      const updatedConversation = {
        ...currentConversation,
        modelSettings: {
          ...currentConversation.modelSettings,
          webSearchSettings: {
            ...currentConversation.modelSettings.webSearchSettings,
            contextSize: localContextSize,
            location: {
              ...currentConversation.modelSettings.webSearchSettings?.location,
              country: value,
              city: localCity,
              region: localRegion,
              timezone: localTimezone,
              type: "approximate" as const,
            },
          },
        },
      };
      updateConversation(updatedConversation);
    }
  };

  const handleCityChange = (value: string) => {
    setLocalCity(value);
    if (currentConversation) {
      const updatedConversation = {
        ...currentConversation,
        modelSettings: {
          ...currentConversation.modelSettings,
          webSearchSettings: {
            ...currentConversation.modelSettings.webSearchSettings,
            contextSize: localContextSize,
            location: {
              ...currentConversation.modelSettings.webSearchSettings?.location,
              country: localCountry,
              city: value,
              region: localRegion,
              timezone: localTimezone,
              type: "approximate" as const,
            },
          },
        },
      };
      updateConversation(updatedConversation);
    }
  };

  const handleRegionChange = (value: string) => {
    setLocalRegion(value);
    if (currentConversation) {
      const updatedConversation = {
        ...currentConversation,
        modelSettings: {
          ...currentConversation.modelSettings,
          webSearchSettings: {
            ...currentConversation.modelSettings.webSearchSettings,
            contextSize: localContextSize,
            location: {
              ...currentConversation.modelSettings.webSearchSettings?.location,
              country: localCountry,
              city: localCity,
              region: value,
              timezone: localTimezone,
              type: "approximate" as const,
            },
          },
        },
      };
      updateConversation(updatedConversation);
    }
  };

  const handleTimezoneChange = (value: string) => {
    setLocalTimezone(value);
    if (currentConversation) {
      const updatedConversation = {
        ...currentConversation,
        modelSettings: {
          ...currentConversation.modelSettings,
          webSearchSettings: {
            ...currentConversation.modelSettings.webSearchSettings,
            contextSize: localContextSize,
            location: {
              ...currentConversation.modelSettings.webSearchSettings?.location,
              country: localCountry,
              city: localCity,
              region: localRegion,
              timezone: value,
              type: "approximate" as const,
            },
          },
        },
      };
      updateConversation(updatedConversation);
    }
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-black/30 z-40 transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={handleDrawerClose}
      />

      <div
        className={cn(
          "fixed top-0 bottom-0 right-0 z-50 w-full sm:w-96 bg-white dark:bg-gray-900 shadow-lg transform transition-transform duration-300 ease-in-out overflow-y-auto",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-medium">Settings</h3>
          <Button variant="ghost" size="icon" onClick={handleDrawerClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-3">API Keys</h4>

            {apiKeys.length === 0 && !showAddKey ? (
              <div className="text-center py-6 border rounded-md border-dashed border-gray-300 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  No API keys added yet
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddKey(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add API Key
                </Button>
              </div>
            ) : (
              <>
                {!showAddKey && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mb-3"
                    onClick={() => setShowAddKey(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add API Key
                  </Button>
                )}

                {showAddKey && (
                  <div className="p-3 border rounded-md border-gray-200 dark:border-gray-800 mb-3 space-y-2">
                    <div className="space-y-2">
                      <Label htmlFor="keyName">Key Name</Label>
                      <Input
                        id="keyName"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="e.g. Personal OpenAI Key"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="keyValue">API Key</Label>
                      <Input
                        id="keyValue"
                        type="password"
                        value={newKeyValue}
                        onChange={(e) => setNewKeyValue(e.target.value)}
                        placeholder="sk-..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Provider</Label>
                      <RadioGroup
                        defaultValue="openai"
                        value={newKeyProvider}
                        onValueChange={(value) =>
                          setNewKeyProvider(value as "openai" | "custom")
                        }
                        className="flex space-x-2"
                      >
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="openai" id="openai" />
                          <Label htmlFor="openai">OpenAI</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="custom" id="custom" />
                          <Label htmlFor="custom">Custom</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="flex space-x-2 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAddKey(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-streamwise-500 hover:bg-streamwise-600"
                        onClick={handleSaveKey}
                      >
                        Save Key
                      </Button>
                    </div>
                  </div>
                )}

                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className={cn(
                      "p-3 border rounded-md mb-2 flex justify-between items-center",
                      currentApiKey?.id === key.id
                        ? "border-streamwise-500 bg-streamwise-50 dark:bg-streamwise-950/20"
                        : "border-gray-200 dark:border-gray-800"
                    )}
                  >
                    <div>
                      <p className="font-medium text-sm">{key.name}</p>
                      <p className="text-xs text-gray-500">
                        {key.provider === "openai"
                          ? "OpenAI"
                          : "Custom Provider"}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={
                          currentApiKey?.id === key.id
                            ? "text-streamwise-500"
                            : ""
                        }
                        onClick={() => {
                          setCurrentApiKey(key.id);
                        }}
                      >
                        {currentApiKey?.id === key.id ? "Selected" : "Select"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => deleteApiKey(key.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-3">AI Model</h4>
            <RadioGroup
              value={selectedModel.id}
              onValueChange={handleModelChange}
              className="space-y-2"
            >
              {availableModels.map((model) => (
                <div
                  key={model.id}
                  className={cn(
                    "flex items-center p-3 border rounded-md transition-colors cursor-pointer",
                    selectedModel.id === model.id
                      ? "border-streamwise-500 bg-streamwise-50 dark:bg-streamwise-950/20"
                      : "border-gray-200 dark:border-gray-800"
                  )}
                  onClick={() => handleModelChange(model.id)}
                >
                  <RadioGroupItem
                    value={model.id}
                    id={model.id}
                    className="mr-3"
                  />
                  <div className="flex-grow">
                    <Label
                      htmlFor={model.id}
                      className="font-medium cursor-pointer"
                    >
                      {model.name}
                    </Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {model.description}
                    </p>
                    {model.supportsWebSearch && (
                      <span className="inline-block text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full mt-1">
                        Web Search
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          {currentConversation && (
            <div>
              <h4 className="text-sm font-medium mb-3">Model Parameters</h4>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="temperature">
                      Temperature:{" "}
                      {currentConversation.modelSettings.temperature.toFixed(1)}
                    </Label>
                  </div>
                  <input
                    id="temperature"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={currentConversation.modelSettings.temperature}
                    onChange={(e) =>
                      handleTemperatureChange(parseFloat(e.target.value))
                    }
                    className="w-full accent-streamwise-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Precise</span>
                    <span>Creative</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="maxTokens">
                      Max Tokens: {currentConversation.modelSettings.maxTokens}
                    </Label>
                  </div>
                  <input
                    id="maxTokens"
                    type="range"
                    min="256"
                    max={selectedModel.maxTokens}
                    step="256"
                    value={currentConversation.modelSettings.maxTokens}
                    onChange={(e) =>
                      handleMaxTokensChange(parseInt(e.target.value))
                    }
                    className="w-full accent-streamwise-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>256</span>
                    <span>{selectedModel.maxTokens}</span>
                  </div>
                </div>
              </div>
            </div>
          )}


          {currentConversation && selectedModel.supportsWebSearch && (
            <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3">
                Web Search Configuration
              </h4>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="webSearchEnabled">Enable web search</Label>
                  <Switch
                    id="webSearchEnabled"
                    checked={localWebSearchEnabled}
                    onCheckedChange={handleWebSearchToggle}
                  />
                </div>

                {localWebSearchEnabled && (
                  <>
                    <div className="space-y-2">
                      <Label>Search Context Size</Label>
                      <Select
                        value={localContextSize}
                        onValueChange={handleContextSizeChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low (Fastest)</SelectItem>
                          <SelectItem value="medium">
                            Medium (Balanced)
                          </SelectItem>
                          <SelectItem value="high">
                            High (Most comprehensive)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Location Settings</Label>
                      <div className="grid gap-2">
                        <Input
                          placeholder="Country (e.g., US, GB)"
                          value={localCountry}
                          onChange={(e) => handleCountryChange(e.target.value)}
                          maxLength={2}
                          className="uppercase"
                        />
                        <Input
                          placeholder="City"
                          value={localCity}
                          onChange={(e) => handleCityChange(e.target.value)}
                        />
                        <Input
                          placeholder="Region/State"
                          value={localRegion}
                          onChange={(e) => handleRegionChange(e.target.value)}
                        />
                        <Input
                          placeholder="Timezone (e.g., America/New_York)"
                          value={localTimezone}
                          onChange={(e) => handleTimezoneChange(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            </>
          )}

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-3">System Message</h4>
            <Textarea
              placeholder="Describe desired model behavior (tone, tool usage, response style)"
              value={localSystemMessage}
              onChange={(e) => {
                setLocalSystemMessage(e.target.value);
                setSystemMessage(e.target.value);
              }}
              className="min-h-[150px] resize-y"
            />
          </div>
        </div>
        <div className="p-6 pt-0">
          <Separator className="mb-4" />
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => {
              if (window.confirm("Are you sure you want to reset all settings to their default values? This will remove all API keys and customizations.")) {
                resetSettings();
              }
            }}
          >
            Reset All Settings to Defaults
          </Button>
        </div>
      </div>
    </>
  );
};
