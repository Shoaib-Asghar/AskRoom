import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Source } from '../types/socket';
import SourceCitation from './SourceCitation';

interface AIStreamMessageProps {
  questionId: string;
  initialText?: string;
  isStreaming: boolean;
  sources?: Source[];
  socket: any;
}

export default function AIStreamMessage({ 
  questionId, 
  initialText = '', 
  isStreaming, 
  sources: initialSources, 
  socket 
}: AIStreamMessageProps) {
  const [text, setText] = useState(initialText);
  const [streaming, setStreaming] = useState(isStreaming);
  const [sources, setSources] = useState<Source[] | undefined>(initialSources);
  const [showInspector, setShowInspector] = useState(false);

  useEffect(() => {
    if (!socket || !streaming) return;

    const onToken = (payload: { questionId: string; token: string }) => {
      if (payload.questionId === questionId) {
        setText((prev) => prev + payload.token);
      }
    };

    const onDone = (payload: { questionId: string; sources: Source[] }) => {
      if (payload.questionId === questionId) {
        setStreaming(false);
        setSources(payload.sources);
      }
    };

    const onError = (payload: { questionId: string; error: string }) => {
      if (payload.questionId === questionId) {
        setText((prev) => prev + '\n\n**[Error]** ' + payload.error);
        setStreaming(false);
      }
    };

    socket.on('ai:token', onToken);
    socket.on('ai:done', onDone);
    socket.on('ai:error', onError);

    return () => {
      socket.off('ai:token', onToken);
      socket.off('ai:done', onDone);
      socket.off('ai:error', onError);
    };
  }, [socket, questionId, streaming]);

  return (
    <div className="flex flex-col items-start w-full">
      <div className="px-5 py-4 prose prose-sm max-w-none text-gray-800">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {text}
        </ReactMarkdown>
      </div>
      
      {!streaming && sources && sources.length > 0 && (
        <div className="w-full border-t border-gray-200 bg-gray-50/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-[11px] text-gray-500 uppercase tracking-wider">
              Retrieved Context
            </div>
            <button 
              onClick={() => setShowInspector(!showInspector)}
              className="text-xs bg-white border border-gray-200 px-2.5 py-1.5 rounded shadow-sm hover:bg-gray-50 hover:border-gray-300 text-gray-600 transition-colors flex items-center gap-1.5 font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              {showInspector ? 'Hide Inspector' : 'Retrieval Inspector'}
            </button>
          </div>
          
          {showInspector && (
            <div className="space-y-2 mt-2">
              {sources.map((source, idx) => (
                <SourceCitation key={source.id || idx} source={source} index={idx} />
              ))}
            </div>
          )}
          
          {!showInspector && (
            <div className="flex flex-wrap gap-2">
              {sources.map((source, idx) => (
                <div key={source.id || idx} className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-md shadow-sm truncate max-w-[200px]" title={source.doc_title}>
                  [{idx + 1}] {source.doc_title}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
