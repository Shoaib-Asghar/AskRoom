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
      // Navigate to the room page, passing the display name as a query param
      router.push(`/room/${roomId.trim()}?name=${encodeURIComponent(displayName.trim())}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="max-w-md w-full p-8 border border-[var(--foreground)] rounded-lg shadow-lg bg-[var(--background)]">
        <h1 className="text-2xl font-bold text-center mb-6">Join AskRoom</h1>
        
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium mb-1">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-transparent text-[var(--foreground)]"
              placeholder="e.g. Alice"
              maxLength={30}
            />
          </div>
          
          <div>
            <label htmlFor="roomId" className="block text-sm font-medium mb-1">
              Room ID
            </label>
            <input
              id="roomId"
              type="text"
              required
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-transparent text-[var(--foreground)]"
              placeholder="e.g. general"
              pattern="[a-zA-Z0-9-_]+"
              title="Only letters, numbers, dashes, and underscores"
              maxLength={50}
            />
          </div>
          
          <button
            type="submit"
            className="w-full py-2 px-4 border border-[var(--foreground)] rounded-md hover:bg-[var(--foreground)] hover:text-[var(--background)] transition-colors"
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
}
