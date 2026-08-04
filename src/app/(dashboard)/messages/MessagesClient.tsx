"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Send, Image as ImageIcon, FileText, CheckCircle2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sendStudentMessage, markMessageAsRead } from "@/app/actions/coaching";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function MessagesClient({ 
  initialMessages,
  studentName 
}: { 
  initialMessages: any[];
  studentName: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    // Mark any unread messages from admin as read
    const unreadIds = messages
      .filter((m) => m.type !== "student_message" && !m.is_read)
      .map((m) => m.id);
    
    if (unreadIds.length > 0) {
      unreadIds.forEach((id) => markMessageAsRead(id));
    }
  }, [messages]);

  // Real-time listener for new messages
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("student_messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "coaching_messages",
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as any]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSend = () => {
    const trimmed = newMessage.trim();
    if (!trimmed) return;

    startTransition(async () => {
      try {
        // Optimistic UI update
        const optimisticMsg = {
          id: Math.random().toString(),
          title: "Message from Student",
          content: trimmed,
          type: "student_message",
          is_read: false,
          created_at: new Date().toISOString()
        };
        setMessages((prev) => [...prev, optimisticMsg]);
        setNewMessage("");
        
        await sendStudentMessage(trimmed);
      } catch (error: any) {
        toast.error("Failed to send message: " + error.message);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col absolute inset-0">
      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-slate-300" />
            </div>
            <p>Send a message to your coach to get started!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isStudent = msg.type === "student_message";
            const showAvatar = index === 0 || messages[index - 1].type !== msg.type;
            
            return (
              <div key={msg.id} className={cn("flex gap-3 max-w-[85%]", isStudent ? "ml-auto flex-row-reverse" : "")}>
                {/* Avatar */}
                {!isStudent && showAvatar ? (
                  <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shrink-0 shadow-sm mt-auto mb-1">
                    <span className="text-white text-xs font-bold">SC</span>
                  </div>
                ) : !isStudent ? (
                  <div className="w-8 shrink-0" /> // Spacer
                ) : null}

                {/* Message Bubble */}
                <div className={cn("flex flex-col", isStudent ? "items-end" : "items-start")}>
                  <div 
                    className={cn(
                      "px-4 py-2.5 rounded-2xl shadow-sm text-sm whitespace-pre-wrap",
                      isStudent 
                        ? "bg-violet-600 text-white rounded-br-sm" 
                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
                    )}
                  >
                    {msg.content}
                  </div>
                  <div className="flex items-center gap-1 mt-1 px-1">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isStudent && msg.is_read && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200 shrink-0">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <div className="flex gap-1 shrink-0 pb-2">
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <ImageIcon className="w-5 h-5" />
            </button>
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <FileText className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-violet-500 transition-all">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message to your coach..."
              className="w-full bg-transparent p-3 max-h-32 min-h-[44px] resize-none focus:outline-none text-sm text-slate-900 placeholder:text-slate-400"
              rows={1}
              style={{
                height: newMessage ? `${Math.min(120, newMessage.split('\n').length * 24 + 20)}px` : '44px'
              }}
            />
          </div>
          
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isPending}
            className="rounded-full w-11 h-11 p-0 shrink-0 bg-violet-600 hover:bg-violet-700 shadow-sm"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </Button>
        </div>
        <div className="text-center mt-2">
          <span className="text-[10px] text-slate-400">Press Enter to send, Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  );
}
