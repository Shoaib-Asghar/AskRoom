export interface Message {
  id?: number;
  roomId: string;
  displayName: string;
  content: string;
  messageType: 'user' | 'ai' | 'system';
  createdAt: string;
  sources?: string;
}

export interface JoinPayload {
  roomId: string;
  displayName: string;
}

export interface MessagePayload {
  roomId: string;
  content: string;
}

export interface RoomJoinedPayload {
  roomId: string;
  members: string[];
  history: Message[];
}

export interface Source {
  id: number;
  doc_file: string;
  doc_title: string;
  breadcrumb: string;
  score: number;
}

export interface ServerToClientEvents {
  'room:joined': (payload: RoomJoinedPayload) => void;
  'room:user_joined': (payload: { displayName: string }) => void;
  'room:user_left': (payload: { displayName: string }) => void;
  'message': (payload: { message: Message }) => void;
  'ai:thinking': (payload: { questionId: string }) => void;
  'ai:token': (payload: { questionId: string; token: string }) => void;
  'ai:done': (payload: { questionId: string; sources: Source[] }) => void;
  'ai:error': (payload: { questionId: string; error: string }) => void;
  'error': (payload: { message: string }) => void;
}

export interface ClientToServerEvents {
  'join': (payload: JoinPayload) => void;
  'message': (payload: MessagePayload) => void;
}
