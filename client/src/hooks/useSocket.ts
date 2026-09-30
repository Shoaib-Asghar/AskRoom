import { useEffect, useState, useCallback, useRef } from 'react';
import { socket } from '../lib/socket';
import type { Message } from '../types/socket';

export function useSocket(roomId: string, displayName: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [members, setMembers] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeAiStream, setActiveAiStream] = useState<{ questionId: string } | null>(null);
  
  // Ref to track if we've already joined to prevent duplicate joins on strict mode double-renders
  const hasJoined = useRef(false);

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setError(null);
      
      // When we connect (or reconnect), we should join the room
      if (!hasJoined.current) {
        hasJoined.current = true;
        socket.emit('join', { roomId, displayName });
      } else {
        // If it's a reconnection, we need to rejoin
        socket.emit('join', { roomId, displayName });
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onRoomJoined = (payload: { roomId: string; members: string[]; history: Message[] }) => {
      setMembers(payload.members);
      setMessages(payload.history);
    };

    const onUserJoined = (payload: { displayName: string }) => {
      setMembers((prev) => {
        if (!prev.includes(payload.displayName)) {
          return [...prev, payload.displayName];
        }
        return prev;
      });
      // Add a system message
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          roomId,
          displayName: 'System',
          content: `${payload.displayName} joined the room`,
          messageType: 'system',
          createdAt: new Date().toISOString(),
        }
      ]);
    };

    const onUserLeft = (payload: { displayName: string }) => {
      setMembers((prev) => prev.filter((m) => m !== payload.displayName));
      // Add a system message
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          roomId,
          displayName: 'System',
          content: `${payload.displayName} left the room`,
          messageType: 'system',
          createdAt: new Date().toISOString(),
        }
      ]);
    };

    const onMessage = (payload: { message: Message }) => {
      setMessages((prev) => [...prev, payload.message]);
    };

    const onError = (payload: { message: string }) => {
      setError(payload.message);
    };

    // Attach listeners first
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:joined', onRoomJoined);
    socket.on('room:user_joined', onUserJoined);
    socket.on('room:user_left', onUserLeft);
    socket.on('message', onMessage);
    socket.on('error', onError);

    const onAiThinking = (payload: { questionId: string }) => {
      setActiveAiStream({ questionId: payload.questionId });
    };
    const onAiDone = () => {
      // The final message is sent via 'message' event, so we just clear the stream state
      setActiveAiStream(null);
    };
    const onAiError = (payload: { questionId: string; error: string }) => {
      setActiveAiStream(null);
      setError(payload.error);
    };

    socket.on('ai:thinking', onAiThinking);
    socket.on('ai:done', onAiDone);
    socket.on('ai:error', onAiError);

    // Connect to the socket server if not already connected
    if (!socket.connected) {
      socket.connect();
    } else {
      // If already connected when hook mounts, trigger onConnect manually
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:joined', onRoomJoined);
      socket.off('room:user_joined', onUserJoined);
      socket.off('room:user_left', onUserLeft);
      socket.off('message', onMessage);
      socket.off('error', onError);
      socket.off('ai:thinking', onAiThinking);
      socket.off('ai:done', onAiDone);
      socket.off('ai:error', onAiError);
      
      // Removed socket.disconnect() to prevent React StrictMode from killing the socket during development.
    };
  }, [roomId, displayName]);

  const sendMessage = useCallback((content: string) => {
    if (content.trim()) {
      socket.emit('message', { roomId, content });
    }
  }, [roomId]);

  return { isConnected, members, messages, error, activeAiStream, sendMessage };
}
