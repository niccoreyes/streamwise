import React, { useState, useRef, ChangeEvent } from "react";
import { Send, Paperclip, X, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useConversation } from "@/context/ConversationContext";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { Label } from "@/components/ui/label";

import type { MessageContentPart } from "@/types";

export const MessageInput: React.FC = () => {
  const { sendMessageAndStream, addMessage } = useConversation();
  const [message, setMessage] = useState("");
  const [mediaList, setMediaList] = useState<{ url: string; type: "image" | "audio" | "video"; file?: File | Blob }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showInsertDialog, setShowInsertDialog] = useState(false);
  const [manualMessage, setManualMessage] = useState("");
  const [messageRole, setMessageRole] = useState<"system" | "user" | "assistant">("user");

  const handleSendMessage = async () => {
    // Cache current values
    const currentMessage = message;
    const currentMediaList = mediaList;

    // Immediately clear input fields
    setMessage("");
    setMediaList([]);

    if (!currentMessage.trim() && currentMediaList.length === 0) return;

    let content: string | MessageContentPart[] = currentMessage;
    if (currentMediaList.length > 0) {
      const arr: MessageContentPart[] = [];
      if (currentMessage.trim()) {
        arr.push({ type: "input_text", text: currentMessage });
      }
      // For each media, process as input_image/audio/video
      for (const media of currentMediaList) {
        if (media.type === "image" && media.file) {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(media.file as File | Blob);
          });
          arr.push({ type: "input_image", image_data: base64 });
        } else if (media.type === "image") {
          arr.push({ type: "input_image", image_data: media.url });
        } else if (media.type === "audio" && media.file) {
          // Optionally handle audio
        } else if (media.type === "video" && media.file) {
          // Optionally handle video
        }
      }
      content = arr;
    }

    await sendMessageAndStream({
      role: "user",
      content,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newMedia: { url: string; type: "image" | "audio" | "video"; file?: File | Blob }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileType = file.type.split("/")[0];
      if (!["image", "audio", "video"].includes(fileType)) {
        alert("Unsupported file type. Please upload an image, audio, or video file.");
        continue;
      }
      const mediaType = fileType as "image" | "audio" | "video";
      const url = URL.createObjectURL(file);
      newMedia.push({ url, type: mediaType, file });
    }
    setMediaList((prev) => [...prev, ...newMedia]);
    // Reset input so same file can be selected again if needed
    e.target.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const newMedia: { url: string; type: "image"; file: File | Blob }[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const url = URL.createObjectURL(blob);
          newMedia.push({ url, type: "image", file: blob });
        }
      }
    }
    if (newMedia.length > 0) {
      setMediaList((prev) => [...prev, ...newMedia]);
      e.preventDefault();
    }
  };

  const removeMedia = (index: number) => {
    setMediaList((prev) => {
      const toRemove = prev[index];
      if (toRemove) {
        URL.revokeObjectURL(toRemove.url);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleMicClick = () => {
    alert("Speech recognition would be implemented here with OpenAI Whisper API");
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = 
        Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  };

    // Insert a manual message and persist it to IndexedDB/UI without API call
    const handleInsertMessage = async () => {
      if (!manualMessage.trim()) return;
  
      await addMessage({
        role: messageRole,
        content: manualMessage,
      });
  
      setManualMessage("");
      setShowInsertDialog(false);
    };

  return (
    <div className="sticky bottom-0 left-0 w-full z-10 bg-white dark:bg-gray-950 p-4 border-t border-gray-200 dark:border-gray-800 shadow-lg">
      {mediaList.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {mediaList.map((media, idx) => (
            <div key={media.url} className="relative inline-block">
              {media.type === "image" && (
                <img
                  src={media.url}
                  alt="Uploaded preview"
                  className="max-h-32 rounded-md"
                />
              )}
              {media.type === "audio" && (
                <audio src={media.url} controls className="max-w-full" />
              )}
              {media.type === "video" && (
                <video src={media.url} controls className="max-h-32 rounded-md" />
              )}
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={() => removeMedia(idx)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex items-end space-x-2">
        <Dialog open={showInsertDialog} onOpenChange={setShowInsertDialog}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Insert Message</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Message Role</Label>
                <Select value={messageRole} onValueChange={(value: typeof messageRole) => setMessageRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="assistant">Assistant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Message Content</Label>
                <Textarea
                  value={manualMessage}
                  onChange={(e) => setManualMessage(e.target.value)}
                  placeholder="Enter message content..."
                  className="min-h-[100px]"
                />
              </div>
              <Button onClick={handleInsertMessage}>Insert Message</Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Type a message..."
            className={cn(
              "resize-none py-3 pr-10 max-h-32",
              mediaList.length > 0 ? "rounded-md" : "rounded-lg"
            )}
            rows={1}
          />
          
          <div className="absolute bottom-3 right-3 flex space-x-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              onClick={handleMicClick}
            >
              <Mic className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <Button
          type="button"
          size="icon"
          className="rounded-full h-10 w-10 bg-streamwise-500 hover:bg-streamwise-600"
          onClick={handleSendMessage}
          disabled={!message.trim() && mediaList.length === 0}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,audio/*,video/*"
        multiple
      />
    </div>
  );
};
