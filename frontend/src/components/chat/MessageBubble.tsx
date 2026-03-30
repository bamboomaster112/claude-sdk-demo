import { User, Bot, Wrench } from 'lucide-react';
import CodeBlock from './CodeBlock';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  toolName?: string;
}

function parseMarkdownCodeBlocks(text: string) {
  const parts: { type: 'text' | 'code'; content: string; language?: string }[] = [];
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', content: match[2].trim(), language: match[1] || 'text' });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts;
}

export default function MessageBubble({
  role,
  content,
  isStreaming = false,
  toolName,
}: MessageBubbleProps) {
  if (toolName) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500">
        <Wrench className="w-4 h-4 animate-spin" />
        <span>Using tool: {toolName}</span>
      </div>
    );
  }

  const isUser = role === 'user';
  const parts = parseMarkdownCodeBlocks(content);

  return (
    <div className={`flex gap-3 px-4 py-4 ${isUser ? 'bg-gray-900/50' : ''}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-600' : 'bg-purple-600'
        }`}
      >
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500 mb-1">{isUser ? 'You' : 'Migration Agent'}</div>
        <div className="text-gray-200 text-sm leading-relaxed space-y-2">
          {parts.map((part, i) =>
            part.type === 'code' ? (
              <CodeBlock key={i} code={part.content} language={part.language} />
            ) : (
              <div key={i} className="whitespace-pre-wrap">
                {part.content}
              </div>
            )
          )}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />
          )}
        </div>
      </div>
    </div>
  );
}
