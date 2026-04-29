'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { Send, MessageSquare, X, Bot, User, Loader2, Minimize2, Maximize2 } from 'lucide-react';

export const PanchayatSahayak = ({ onToggle }: { onToggle?: (isOpen: boolean) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: 'Namaste! I am Panchayat Sahayak. How can I help you today? | నమస్కారం! నేను పంచాయితీ సహాయక్. మీకు ఈరోజు ఎలా సహాయపడగలను?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const toggleOpen = (val: boolean) => {
    setIsOpen(val);
    if (onToggle) onToggle(val);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMsg = message;
    setMessage('');
    setHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      // Gemini requires history to start with a user message.
      // We exclude the initial bot welcome message before sending to API.
      const historyForApi = history.filter((_, idx) => idx !== 0 || history[0].role === 'user');
      const res = await api.aiChat(userMsg, historyForApi);
      if (res.success) {
        setHistory(prev => [...prev, { role: 'model', text: res.response }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setHistory(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => toggleOpen(true)}
        className="fixed bottom-32 right-8 w-16 h-16 bg-gradient-to-br from-[#22c55e] to-[#14532d] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all duration-300 z-50 group"
      >
        <Bot className="w-8 h-8 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-12 right-0 bg-white text-emerald-600 px-3 py-1 rounded-lg text-sm font-semibold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Ask Panchayat Sahayak
        </span>
      </button>
    );
  }

  return (
    <div 
      className={`fixed right-6 z-50 transition-all duration-500 ease-in-out ${
        isMinimized ? 'bottom-6 w-72 h-14' : 'bottom-6 w-96 h-[500px] max-h-[80vh]'
      } bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 flex flex-col overflow-hidden`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 flex items-center justify-between text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight">Panchayat Sahayak</h3>
            {!isMinimized && <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-[10px] opacity-80 uppercase font-medium">Online Assistant</span>
            </div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 hover:bg-white/10 rounded-md transition-colors">
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button onClick={() => toggleOpen(false)} className="p-1 hover:bg-white/10 rounded-md transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Chat Body */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
            {history.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-emerald-600 text-white rounded-tr-none shadow-emerald-200 shadow-lg' 
                      : 'bg-white text-gray-800 rounded-tl-none shadow-sm border border-gray-100'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-2 max-w-[85%] flex-row">
                  <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3 rounded-2xl bg-white text-gray-800 rounded-tl-none shadow-sm border border-gray-100 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    <span className="text-xs italic opacity-70">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100/50 backdrop-blur-sm">
            <div className="relative flex items-center group">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask me anything..."
                className="w-full pl-5 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 outline-none shadow-inner"
              />
              <button 
                type="submit"
                disabled={!message.trim() || isLoading}
                className="absolute right-2 p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-30 disabled:grayscale transition-all shadow-md hover:shadow-emerald-200 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-center mt-3 text-gray-400 font-medium">
              Powered by Smart Panchayat AI
            </p>
          </form>
        </>
      )}
    </div>
  );
};
