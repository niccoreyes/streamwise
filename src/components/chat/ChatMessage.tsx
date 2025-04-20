
import React, { useState } from "react";
import { Message } from "@/types";
import ReactMarkdown from "react-markdown";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConversation } from "@/context/ConversationContext";
import type { MessageContentPart } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ChatMessageProps {
  message: Message;
}

function isInputImage(part: MessageContentPart): part is MessageContentPart & { image_data: string } {
  return part.type === "input_image" && "image_data" in part && typeof (part as { image_data?: unknown }).image_data === "string";
}

// Custom hook to convert base64 to blob URL
function useBase64ToBlobUrls(content: MessageContentPart[] | string): (string | undefined)[] {
  const [blobUrls, setBlobUrls] = React.useState<(string | undefined)[]>([]);
  React.useEffect(() => {
    if (typeof content === "string") {
      setBlobUrls([]);
      return;
    }
    const urls: (string | undefined)[] = [];
    content.forEach((part) => {
      if (isInputImage(part)) {
        try {
          const base64 = part.image_data;
          const arr = base64.split(",");
          const mime = arr[0].match(/:(.*?);/)[1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) u8arr[n] = bstr.charCodeAt(n);
          const blob = new Blob([u8arr], { type: mime });
          const url = URL.createObjectURL(blob);
          urls.push(url);
        } catch {
          urls.push(undefined);
        }
      } else {
        urls.push(undefined);
      }
    });
    setBlobUrls(urls);
    return () => {
      urls.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [content]);
  return blobUrls;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { deleteMessage, updateMessage } = useConversation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(typeof message.content === "string" ? message.content : "");
  const isUser = message.role === "user";
  const contentArr = Array.isArray(message.content) ? message.content : null;
  const blobUrls = useBase64ToBlobUrls(message.content);

  const handleDelete = async () => {
    await deleteMessage(message.id);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(typeof message.content === "string" ? message.content : "");
  };

  const handleSaveEdit = async () => {
    await updateMessage({
      ...message,
      content: editedContent,
    });
    setIsEditing(false);
  };

  function renderContent(content: string | MessageContentPart[]): React.ReactNode {
    if (typeof content === "string") {
      if (isEditing) {
        return (
          <div className="flex flex-col gap-2">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={4}
              className="min-w-[200px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit}>Save</Button>
            </div>
          </div>
        );
      }
      return <ReactMarkdown>{content}</ReactMarkdown>;
    }
    return content.map((part, idx) => {
      if (
        part.type === "input_text" ||
        part.type === "output_text"
      ) {
        return <span key={idx}>{part.text}</span>;
      }
      if (isInputImage(part)) {
        const blobUrl = blobUrls[idx];
        if (blobUrl) {
          return (
            <img
              key={idx}
              src={blobUrl}
              alt="User uploaded"
              style={{ maxWidth: "100%", maxHeight: 320, borderRadius: 8, display: "block", margin: "8px 0" }}
            />
          );
        }
        return <span key={idx} style={{ color: "red" }}>Image unavailable</span>;
      }
      return null;
    });
  }

  return (
    <div
      className={cn(
        "flex w-full mb-4 animate-fade-in group",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "flex max-w-[80%]",
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        <Avatar className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium",
          isUser 
            ? "bg-streamwise-500 text-white ml-2" 
            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 mr-2"
        )}>
          <span>{isUser ? "You" : "AI"}</span>
        </Avatar>

        <div className="relative group">
          <div
            className={cn(
              "px-4 py-2 rounded-lg",
              isUser
                ? "bg-streamwise-500 text-white"
                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
            )}
          >
            <div className={cn(
              "prose prose-sm max-w-none",
              isUser 
                ? "prose-invert" 
                : "prose-gray dark:prose-invert"
            )}>
              {renderContent(message.content)}
            </div>
          </div>

          {/* Edit/Delete buttons */}
          <div className={cn(
            "absolute top-2 opacity-0 group-hover:opacity-100 transition-opacity",
            isUser ? "-left-20" : "-right-20"
          )}>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleEdit}
                className="h-8 w-8"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleDelete}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
