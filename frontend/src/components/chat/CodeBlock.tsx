import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Download } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export default function CodeBlock({ code, language = 'yaml' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = language === 'yaml' ? 'yml' : language === 'groovy' ? 'groovy' : 'txt';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden my-2 border border-gray-700">
      <div className="flex items-center justify-between bg-gray-800 px-4 py-1.5 text-xs text-gray-400">
        <span>{language}</span>
        <div className="flex items-center gap-1">
          {language === 'yaml' && (
            <button
              onClick={handleDownload}
              className="p-1 rounded hover:bg-gray-700 transition-colors"
              title="Download as .yml"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-gray-700 transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: '0.85rem',
          background: '#1a1a2e',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
