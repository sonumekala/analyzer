import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AIConfig } from "@shared/schema";

interface CodeAssistantProps {
  fileId: number;
  codeContent: string;
  aiConfig: AIConfig;
}

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function CodeAssistant({ fileId, codeContent, aiConfig }: CodeAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "I'm your COBOL code assistant. Ask me any questions about the code displayed above."
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    // Add user message to the chat
    const userMessage = { role: "user" as const, content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Call API to get AI response
      const response = await fetch("/api/explain/code-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId,
          cobolCode: codeContent,
          userQuery: inputValue,
          aiConfig
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from the code assistant");
      }

      const data = await response.json();
      
      // Check if we got an explanation object or a string
      const explanation = typeof data.explanation === 'object' 
        ? data.explanation.explanation 
        : data.explanation;
      
      // Add AI response to the chat
      setMessages(prev => [
        ...prev,
        { 
          role: "assistant", 
          content: explanation || "Sorry, I couldn't analyze this code. Please try a different question."
        }
      ]);
    } catch (error) {
      console.error("Error getting AI response:", error);
      // Add error message
      setMessages(prev => [
        ...prev,
        { 
          role: "assistant", 
          content: "Sorry, I wasn't able to process your request. Please try again." 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-md">COBOL Code Assistant</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] border rounded-md p-4 mb-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "assistant" ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`rounded-md px-4 py-2 max-w-[80%] text-sm ${
                    message.role === "assistant"
                      ? "bg-primary-100 text-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-md px-4 py-2 max-w-[80%] text-sm bg-primary-100 text-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="flex space-x-2">
          <Textarea
            placeholder="Ask about the COBOL code..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 min-h-[50px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={isLoading || !inputValue.trim()}
            className="h-auto"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}