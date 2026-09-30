import React from 'react';

interface MembersListProps {
  roomId: string;
  members: string[];
  displayName: string;
  isConnected: boolean;
  onLeave: () => void;
}

export default function MembersList({ roomId, members, displayName, isConnected, onLeave }: MembersListProps) {
  return (
    <div className="w-64 border-r border-gray-200 bg-gray-50 p-4 flex-col hidden md:flex">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 tracking-tight">
        Room: {roomId}
      </h2>
      
      <div className="flex items-center mb-6 bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm">
        <div className={`w-2.5 h-2.5 rounded-full mr-3 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
        <span className="text-sm text-gray-700 font-medium">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-500 uppercase tracking-wider text-xs">Members</h3>
        <span className="bg-gray-200 text-gray-600 text-xs py-0.5 px-2 rounded-full font-medium">{members.length}</span>
      </div>
      
      <ul className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
        {members.map((member, i) => (
          <li key={i} className={`flex items-center text-sm p-2 rounded-md transition-colors ${member === displayName ? 'bg-gray-200 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
            <span className="mr-3 opacity-70">{member === displayName ? '🟢' : '👤'}</span> 
            <span className="truncate flex-1">{member}</span>
            {member === displayName && <span className="text-xs text-gray-500 ml-2">(You)</span>}
          </li>
        ))}
      </ul>
      
      <button 
        onClick={onLeave}
        className="mt-auto py-2 px-4 w-full bg-white border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-gray-900 text-gray-700 transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2 shadow-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        Leave Room
      </button>
    </div>
  );
}
