import React, { useState } from 'react';
import type { Source } from '../types/socket';

interface SourceCitationProps {
  source: Source;
  index: number;
}

export default function SourceCitation({ source, index }: SourceCitationProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-2 last:mb-0">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`text-left text-xs px-3 py-2 rounded-lg transition-all duration-200 border flex items-center justify-between w-full
          ${isExpanded 
            ? 'bg-blue-50 border-blue-200 text-blue-900' 
            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
          }`}
      >
        <div className="flex items-center gap-2 truncate">
          <span className="bg-blue-100 text-blue-800 rounded px-1.5 py-0.5 text-[10px] font-bold">[{index + 1}]</span>
          <span className="font-semibold truncate text-gray-900">{source.doc_title}</span>
          <span className="opacity-40 text-gray-900">§</span>
          <span className="truncate text-gray-700">{source.breadcrumb.split(' > ').pop()}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {source.usedReranker && (
            <span className="text-[9px] uppercase tracking-wider bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold" title="Score provided by Cohere Rerank API">
              Reranked
            </span>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${source.score > 0.8 ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {(source.score * 100).toFixed(1)}% match
          </span>
          <svg className={`w-3.5 h-3.5 transition-transform duration-200 text-gray-400 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="mt-1.5 ml-4 pl-3 border-l-2 border-blue-200 text-xs text-gray-600 p-2.5 bg-gray-50 rounded-r-lg shadow-inner">
          <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200">
            <span className="font-mono text-[10px] text-gray-500">{source.doc_file}</span>
            <span className="font-mono text-[10px] text-gray-500">Chunk ID: {source.id}</span>
          </div>
          <div className="whitespace-pre-wrap font-serif leading-relaxed text-gray-800">
            {source.content || "Chunk text not provided in payload. Ensure backend sends chunk.content."}
          </div>
        </div>
      )}
    </div>
  );
}
