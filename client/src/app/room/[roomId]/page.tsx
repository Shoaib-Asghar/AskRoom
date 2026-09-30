"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSocket } from "../../../hooks/useSocket";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { socket } from '../../../lib/socket';
import AIStreamMessage from '../../../components/AIStreamMessage';

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.roomId;
  
  const searchParams = useSearchParams();
  const displayName = searchParams.get("name");
  const router = useRouter();
  
  // Ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [inputValue, setInputValue] = useState("");
  
  // If no display name is provided, kick them back to the join screen
  useEffect(() => {
    if (!displayName) {
      router.push("/");
    }
  }, [displayName, router]);

  const { isConnected, members, messages, error, activeAiStream, sendMessage } = useSocket(
    roomId, 
    displayName || "Anonymous"
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeAiStream]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      sendMessage(inputValue);
      setInputValue("");
    }
  };

  if (!displayName) return null;

  return (
    <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Sidebar - Members List */}
      <div className="w-64 border-r border-[var(--foreground)] p-4 flex flex-col hidden md:flex">
        <h2 className="text-xl font-bold mb-4">Room: {roomId}</h2>
        
        <div className="flex items-center mb-6">
          <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm opacity-70">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <h3 className="font-semibold mb-2">Members ({members.length})</h3>
        <ul className="flex-1 overflow-y-auto space-y-1">
          {members.map((member, i) => (
            <li key={i} className="flex items-center text-sm">
              <span className="mr-2">👤</span> 
              {member} {member === displayName && "(You)"}
            </li>
          ))}
        </ul>
        
        <button 
          onClick={() => router.push('/')}
          className="mt-auto py-2 px-4 border border-[var(--foreground)] rounded-md hover:bg-[var(--foreground)] hover:text-[var(--background)] transition-colors text-sm"
        >
          Leave Room
        </button>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {error && (
          <div className="bg-red-900 text-white p-2 text-center text-sm">
            {error}
          </div>
        )}
        
        <div className="md:hidden border-b p-3 flex justify-between items-center">
          <h2 className="font-bold">#{roomId}</h2>
          <span className="text-sm opacity-70">{members.length} members</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => {
            const isMe = msg.displayName === displayName && msg.messageType === 'user';
            const isSystem = msg.messageType === 'system';
            const isAi = msg.messageType === 'ai';
            
            if (isSystem) {
              return (
                <div key={msg.id || i} className="text-center text-xs opacity-50 my-2">
                  {msg.content}
                </div>
              );
            }

            if (isAi) {
              let parsedSources: any[] = [];
              try {
                parsedSources = msg.sources ? JSON.parse(msg.sources) : [];
              } catch (e) {
                // ignore
              }
              
              return (
                <div key={msg.id || i} className="flex flex-col items-start w-full">
                  <span className="text-xs opacity-70 mb-1 mx-1 font-bold text-blue-400">🤖 {msg.displayName}</span>
                  <div className="px-5 py-3 rounded-2xl max-w-[90%] border border-blue-500/30 bg-blue-500/10 rounded-tl-none prose prose-invert prose-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                    {parsedSources && parsedSources.length > 0 && (
                      <div className="mt-4 pt-2 border-t border-blue-500/20 text-xs text-blue-300">
                        <div className="font-semibold mb-1">Sources:</div>
                        <ul className="list-disc pl-4 space-y-1">
                          {parsedSources.map((source, idx) => (
                            <li key={idx}>
                              [{source.doc_title} § {source.breadcrumb.split(' > ').pop()}]
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-xs opacity-70 mb-1 mx-1">{msg.displayName}</span>
                <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${
                  isMe 
                    ? 'bg-[var(--foreground)] text-[var(--background)] rounded-tr-none' 
                    : 'border border-[var(--foreground)] rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            );
          })}
          
          {/* Active AI Stream */}
          {activeAiStream && (
            <div className="flex flex-col items-start w-full mt-4">
               <span className="text-xs opacity-70 mb-1 mx-1 font-bold text-blue-400 animate-pulse">🤖 AskRoom AI is thinking...</span>
               <div className="w-full max-w-[90%] border border-blue-500/50 bg-blue-500/20 rounded-2xl rounded-tl-none p-0 overflow-hidden">
                 <AIStreamMessage 
                   questionId={activeAiStream.questionId}
                   isStreaming={true}
                   socket={socket}
                 />
               </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-[var(--foreground)]">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message or @ai for AskRoom AI..."
              className="flex-1 px-4 py-2 border border-[var(--foreground)] rounded-full bg-transparent focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
              disabled={!isConnected}
            />
            <button
              type="submit"
              disabled={!isConnected || !inputValue.trim()}
              className="px-6 py-2 rounded-full border border-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)] transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[var(--foreground)]"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
