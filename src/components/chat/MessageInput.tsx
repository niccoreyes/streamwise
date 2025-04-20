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

export const MessageInput: React.FC = () => {
  const { sendMessageAndStream } = useConversation();
  const [message, setMessage] = useState("");
  const [media, setMedia] = useState<{ url: string; type: "image" | "audio" | "video" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showInsertDialog, setShowInsertDialog] = useState(false);
  const [manualMessage, setManualMessage] = useState("");
  const [messageRole, setMessageRole] = useState<"system" | "user" | "assistant">("user");

  const handleSendMessage = async () => {
    if (!message.trim() && !media) return;

    await sendMessageAndStream({
      role: "user",
      content: message,
      ...(media && { mediaUrl: media.url, mediaType: media.type }),
    });

    setMessage("");
    setMedia(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.type.split("/")[0];
    if (!["image", "audio", "video"].includes(fileType)) {
      alert("Unsupported file type. Please upload an image, audio, or video file.");
      return;
    }

    const mediaType = fileType as "image" | "audio" | "video";
    const url = URL.createObjectURL(file);
    setMedia({ url, type: mediaType });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const url = URL.createObjectURL(blob);
          setMedia({ url, type: "image" });
          e.preventDefault();
          return;
        }
      }
    }
  };

  const removeMedia = () => {
    if (media) {
      URL.revokeObjectURL(media.url);
      setMedia(null);
    }
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

  const handleInsertMessage = async () => {
    if (!manualMessage.trim()) return;

    await sendMessageAndStream({
      role: messageRole,
      content: manualMessage,
    });

    setManualMessage("");
    setShowInsertDialog(false);
  };

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-800">
      {media && (
        <div className="mb-2 relative inline-block">
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
            onClick={removeMedia}
          >
            <X className="h-3 w-3" />
          </Button>
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
              media ? "rounded-md" : "rounded-full"
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
          disabled={!message.trim() && !media}
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
      />
    </div>
  );
};
