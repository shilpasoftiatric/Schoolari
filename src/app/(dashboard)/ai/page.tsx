"use client";

import React, { useState } from "react";
import { Sparkles, Send, Bot, User, ArrowRight, BookOpen, GraduationCap, FileText, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    sender: "ai",
    text: "Hello! I'm Schoolari AI, your dedicated admissions and scholarship advisor. How can I help you today?",
    timestamp: "Just now",
  },
];

const SUGGESTED_PROMPTS = [
  {
    title: "Find Scholarships",
    desc: "Match top scholarships for my profile",
    href: "/scholarships",
    icon: GraduationCap,
  },
  {
    title: "Essay Advice",
    desc: "Brainstorm or review my college essay",
    href: "/essays",
    icon: FileText,
  },
  {
    title: "College Recommendations",
    desc: "Explore colleges matching my major and budget",
    href: "/colleges",
    icon: BookOpen,
  },
];

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: `I understand you're asking about "${userText}". You can use our specialized AI modules in Colleges, Essays, or Scholarships for tailored results, or ask me any quick questions right here!`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider text-white">
            <Sparkles className="w-3.5 h-3.5" /> AI Assistant
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Ask Schoolari AI</h1>
          <p className="text-violet-100 text-base">
            Get instant assistance with college discovery, scholarship searching, essay refinement, and career guidance.
          </p>
        </div>
        <div className="hidden md:flex items-center justify-center w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-2xl">
          <Bot className="w-12 h-12" />
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SUGGESTED_PROMPTS.map((prompt, idx) => {
          const Icon = prompt.icon;
          return (
            <Link key={idx} href={prompt.href}>
              <Card className="p-5 h-full hover:shadow-md transition-all border-slate-200 hover:border-violet-300 group cursor-pointer rounded-2xl">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-violet-600 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="font-bold text-slate-900 mt-4 text-base">{prompt.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{prompt.desc}</p>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Main Interactive Chat Window */}
      <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
        {/* Messages List */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 max-w-2xl ${
                msg.sender === "user" ? "ml-auto flex-row-reverse" : ""
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.sender === "user"
                    ? "bg-slate-900 text-white"
                    : "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm"
                }`}
              >
                {msg.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div>
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-slate-900 text-white rounded-tr-none"
                      : "bg-white border border-slate-200 text-slate-800 shadow-sm rounded-tl-none"
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block px-1">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-start gap-3 max-w-md">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-400 text-sm shadow-sm rounded-tl-none flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about college applications, scholarships, or essays..."
            className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-5 flex items-center gap-2 font-semibold"
          >
            Send <Send className="w-4 h-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
