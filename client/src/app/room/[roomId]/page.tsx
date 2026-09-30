"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSocket } from "../../../hooks/useSocket";

import { socket } from '../../../lib/socket';
import AIStreamMessage from '../../../components/AIStreamMessage';
import MembersList from '../../../components/MembersList';

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.roomId;
  
  const searchParams = useSearchParams();
  const displayName = searchParams.get("name");
  const router = useRouter();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");
  
  useEffect(() => {
    if (!displayName) {
      router.push("/");
    }
  }, [displayName, router]);

  const { isConnected, members, messages, error, activeAiStream, sendMessage } = useSocket(
    roomId, 
    displayName || "Anonymous"
  );

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
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      <MembersList 
        roomId={roomId}
        members={members}
        displayName={displayName}
        isConnected={isConnected}
        onLeave={() => router.push('/')}
      />

      <div className="flex-1 flex flex-col h-full bg-white relative">
        {error && (
          <div className="bg-rose-50 border-b border-rose-100 text-rose-600 p-2 text-center text-sm font-medium z-10">
            {error}
          </div>
        )}
        
        <div className="md:hidden border-b border-gray-200 bg-white/80 backdrop-blur-md p-3 flex justify-between items-center sticky top-0 z-10">
          <h2 className="font-semibold text-gray-900">#{roomId}</h2>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{members.length} members</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar scroll-smooth bg-gray-50/50">
          {messages.map((msg, i) => {
            const isMe = msg.displayName === displayName && msg.messageType === 'user';
            const isSystem = msg.messageType === 'system';
            const isAi = msg.messageType === 'ai';
            
            if (isSystem) {
              return (
                <div key={msg.id || i} className="flex justify-center my-4">
                  <span className="text-[11px] font-medium uppercase tracking-wider bg-gray-100 border border-gray-200 text-gray-500 px-3 py-1 rounded-full">
                    {msg.content}
                  </span>
                </div>
              );
            }

            if (isAi) {
              let parsedSources = [];
              try {
                parsedSources = msg.sources ? (typeof msg.sources === 'string' ? JSON.parse(msg.sources) : msg.sources) : [];
              } catch (e) {
                // ignore
              }
              
              return (
                <div key={msg.id || i} className="flex flex-col items-start w-full group">
                  <span className="text-xs font-semibold text-blue-600 mb-1.5 ml-2 flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    <span className="bg-blue-100 p-1 rounded-md">🤖</span>
                    {msg.displayName}
                  </span>
                  <div className="w-full max-w-[90%] md:max-w-[85%] border border-gray-200 bg-white rounded-2xl rounded-tl-none overflow-hidden shadow-sm">
                    <AIStreamMessage 
                      questionId={msg.id?.toString() || `msg-${i}`}
                      initialText={msg.content}
                      isStreaming={false}
                      sources={parsedSources}
                      socket={null}
                    />
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
                <span className={`text-xs font-medium mb-1.5 mx-2 opacity-60 group-hover:opacity-100 transition-opacity ${isMe ? 'text-gray-500' : 'text-gray-500'}`}>
                  {msg.displayName}
                </span>
                <div className={`px-4.5 py-2.5 rounded-2xl max-w-[80%] text-sm leading-relaxed shadow-sm ${
                  isMe 
                    ? 'bg-gray-900 text-white rounded-tr-none' 
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            );
          })}
          
          {activeAiStream && (
            <div className="flex flex-col items-start w-full mt-4">
               <span className="text-xs font-semibold text-blue-600 mb-1.5 ml-2 flex items-center gap-2">
                 <span className="bg-blue-100 p-1 rounded-md animate-pulse">🤖</span>
                 AskRoom AI is thinking<span className="animate-[bounce_1s_infinite]">...</span>
               </span>
               <div className="w-full max-w-[90%] md:max-w-[85%] border border-blue-200 bg-blue-50/30 rounded-2xl rounded-tl-none p-0 overflow-hidden shadow-sm">
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

        <div className="p-4 md:p-6 bg-white border-t border-gray-200">
          <form onSubmit={handleSend} className="flex gap-3 max-w-4xl mx-auto relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message or @ai to ask the Handbook..."
              className="flex-1 pl-5 pr-14 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900 placeholder-gray-400 transition-all sm:text-sm"
              disabled={!isConnected}
            />
            <button
              type="submit"
              disabled={!isConnected || !inputValue.trim()}
              className="absolute right-2 top-2 bottom-2 px-3.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white transition-all disabled:opacity-30 disabled:hover:bg-gray-900 flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
