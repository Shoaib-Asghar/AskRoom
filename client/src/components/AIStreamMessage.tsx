import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Source } from '../types/socket';

interface AIStreamMessageProps {
  questionId: string;
  initialText?: string;
  isStreaming: boolean;
  sources?: Source[];
  socket: any; // We'll pass the socket instance
}

export default function AIStreamMessage({ 
  questionId, 
  initialText = '', 
  isStreaming, 
  sources, 
  socket 
}: AIStreamMessageProps) {
  const [text, setText] = useState(initialText);
  const [streaming, setStreaming] = useState(isStreaming);

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
      <div className="px-5 py-3 prose prose-invert prose-sm">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {text}
        </ReactMarkdown>
      </div>
      {!streaming && sources && sources.length > 0 && (
        <div className="mt-4 px-5 pb-3 border-t border-blue-500/20 text-xs text-blue-300">
          <div className="font-semibold mb-1">Sources:</div>
          <ul className="list-disc pl-4 space-y-1">
            {sources.map((source, idx) => (
              <li key={idx}>
                [{source.doc_title} § {source.breadcrumb.split(' > ').pop()}]
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
