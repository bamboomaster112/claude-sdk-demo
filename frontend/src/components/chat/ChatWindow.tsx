import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import InputArea from './InputArea';
import { WSMessage } from '../../types';
import { Bot } from 'lucide-react';

interface ChatWindowProps {
  messages: WSMessage[];
  streaming: boolean;
  connected: boolean;
  onSend: (message: string, attachments?: { type: string; data: string }[]) => void;
  userMessages: { role: 'user'; content: string }[];
}

export default function ChatWindow({
  messages,
  streaming,
  connected,
  onSend,
  userMessages,
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, userMessages]);

  // Interleave user messages and WS messages
  const allMessages: { role: 'user' | 'assistant'; content: string; isStreaming?: boolean; toolName?: string }[] = [];
  let userIdx = 0;

  for (const msg of messages) {
    if (msg.type === 'connected' && msg.content) {
      allMessages.push({ role: 'user', content: msg.content });
      userIdx++;
    } else if (msg.type === 'assistant_chunk') {
      allMessages.push({ role: 'assistant', content: msg.content || '', isStreaming: true });
    } else if (msg.type === 'assistant_complete') {
      allMessages.push({ role: 'assistant', content: msg.content || '' });
    } else if (msg.type === 'tool_use') {
      allMessages.push({ role: 'assistant', content: '', toolName: msg.tool });
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {allMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Bot className="w-16 h-16 mb-4 text-gray-700" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">
              Ready to migrate your pipeline
            </h3>
            <p className="text-sm text-center max-w-md">
              Paste your TeamCity or Jenkins configuration, upload a file, or share a
              screenshot to get started.
            </p>
          </div>
        )}
        {allMessages.map((msg, i) => (
          <MessageBubble
            key={i}
            role={msg.role}
            content={msg.content}
            isStreaming={msg.isStreaming}
            toolName={msg.toolName}
          />
        ))}
      </div>
      <InputArea onSend={onSend} disabled={!connected} streaming={streaming} />
    </div>
  );
}
