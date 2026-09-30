export interface RoomMember {
  socketId: string;
  displayName: string;
}

// In-memory store for room presence
// Map<roomId, Map<socketId, displayName>>
const rooms = new Map<string, Map<string, string>>();

export function joinRoom(roomId: string, socketId: string, displayName: string): void {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }
  rooms.get(roomId)!.set(socketId, displayName);
}

export function leaveRoom(roomId: string, socketId: string): void {
  const room = rooms.get(roomId);
  if (room) {
    room.delete(socketId);
    if (room.size === 0) {
      rooms.delete(roomId);
    }
  }
}

export function getRoomMembers(roomId: string): string[] {
  const room = rooms.get(roomId);
  if (!room) return [];
  // Return unique display names
  return Array.from(new Set(room.values()));
}

export function getUserDisplayName(roomId: string, socketId: string): string | undefined {
  return rooms.get(roomId)?.get(socketId);
}

// Remove a socket from all rooms it is in (useful for disconnect)
export function handleDisconnect(socketId: string): { roomId: string; displayName: string }[] {
  const leftRooms: { roomId: string; displayName: string }[] = [];
  
  for (const [roomId, members] of rooms.entries()) {
    if (members.has(socketId)) {
      const displayName = members.get(socketId)!;
      leftRooms.push({ roomId, displayName });
      members.delete(socketId);
      
      if (members.size === 0) {
        rooms.delete(roomId);
      }
    }
  }
  
  return leftRooms;
}
