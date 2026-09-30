"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [displayName, setDisplayName] = useState("");
  const [roomId, setRoomId] = useState("");
  const router = useRouter();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.trim() && roomId.trim()) {
      router.push(`/room/${roomId.trim()}?name=${encodeURIComponent(displayName.trim())}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      <div className="max-w-md w-full p-8 sm:p-10 border border-gray-200 rounded-2xl shadow-sm bg-white">
        
        <h1 className="text-2xl font-semibold text-center mb-2 text-gray-900 tracking-tight">
          AskRoom
        </h1>
        <p className="text-center text-sm text-gray-500 mb-8">Shared AI Q&A for the Tidewell Handbook</p>
        
        <form onSubmit={handleJoin} className="space-y-5">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium mb-1.5 text-gray-700">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all sm:text-sm"
              placeholder="e.g. Alice"
              maxLength={30}
            />
          </div>
          
          <div>
            <label htmlFor="roomId" className="block text-sm font-medium mb-1.5 text-gray-700">
              Room ID
            </label>
            <input
              id="roomId"
              type="text"
              required
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all sm:text-sm"
              placeholder="e.g. general"
              pattern="[a-zA-Z0-9-_]+"
              title="Only letters, numbers, dashes, and underscores"
              maxLength={50}
            />
          </div>
          
          <button
            type="submit"
            disabled={!displayName.trim() || !roomId.trim()}
            className="w-full py-2.5 px-4 rounded-lg font-medium bg-gray-900 hover:bg-gray-800 text-white transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none mt-6 sm:text-sm"
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
}
