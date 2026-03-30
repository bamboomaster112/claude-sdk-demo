import { useState, useRef } from 'react';
import { Send, Paperclip, Image, X, Loader2 } from 'lucide-react';

interface InputAreaProps {
  onSend: (message: string, attachments?: { type: string; data: string }[]) => void;
  disabled?: boolean;
  streaming?: boolean;
}

export default function InputArea({ onSend, disabled, streaming }: InputAreaProps) {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<{ file: File; preview?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachment({ file, preview: reader.result as string });
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        setText((prev) => prev + '\n```\n' + (reader.result as string) + '\n```\n');
      };
      reader.readAsText(file);
    }
  };

  const handleSend = () => {
    if (!text.trim() && !attachment) return;

    const attachments: { type: string; data: string }[] = [];
    if (attachment?.preview) {
      const base64 = attachment.preview.split(',')[1];
      attachments.push({ type: attachment.file.type, data: base64 });
    }

    onSend(text.trim(), attachments.length > 0 ? attachments : undefined);
    setText('');
    setAttachment(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-800 bg-gray-900 p-4">
      {attachment && (
        <div className="mb-3 flex items-center gap-2 bg-gray-800 rounded-lg p-2">
          {attachment.preview ? (
            <img src={attachment.preview} alt="Preview" className="w-16 h-16 rounded object-cover" />
          ) : (
            <span className="text-sm text-gray-400">{attachment.file.name}</span>
          )}
          <button
            onClick={() => setAttachment(null)}
            className="ml-auto p-1 hover:bg-gray-700 rounded"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".kts,.groovy,.json,.yaml,.yml,.txt,.png,.jpg,.jpeg,.gif,.webp"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          title="Attach file"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.accept = 'image/*';
              fileInputRef.current.click();
              fileInputRef.current.accept =
                '.kts,.groovy,.json,.yaml,.yml,.txt,.png,.jpg,.jpeg,.gif,.webp';
            }
          }}
          className="p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          title="Upload screenshot"
        >
          <Image className="w-5 h-5" />
        </button>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Paste your CI/CD config or describe what you need..."
          rows={1}
          className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          style={{ minHeight: '44px', maxHeight: '200px' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 200) + 'px';
          }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || streaming || (!text.trim() && !attachment)}
          className="p-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white transition-colors"
        >
          {streaming ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
      <p className="text-xs text-gray-600 mt-2">
        Press Enter to send, Shift+Enter for new line. Supports file upload and screenshots.
      </p>
    </div>
  );
}
