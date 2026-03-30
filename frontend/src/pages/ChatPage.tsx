import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../lib/api';
import ChatWindow from '../components/chat/ChatWindow';
import { ChatSession, SourceType } from '../types';
import { Plus, ArrowLeft } from 'lucide-react';

const SOURCE_LABELS: Record<SourceType, string> = {
  teamcity_kotlin: 'TeamCity (Kotlin DSL)',
  teamcity_json: 'TeamCity (JSON API)',
  jenkins_declarative: 'Jenkins (Declarative)',
  jenkins_scripted: 'Jenkins (Scripted)',
};

interface ChatPageProps {
  token: string;
}

export default function ChatPage({ token }: ChatPageProps) {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [showNewSession, setShowNewSession] = useState(!sessionId);
  const [userMessages, setUserMessages] = useState<{ role: 'user'; content: string }[]>([]);

  const { connected, messages, streaming, sendMessage } = useWebSocket(
    sessionId || null,
    token
  );

  useEffect(() => {
    if (sessionId) {
      api.getSession(token, sessionId).then((data: any) => {
        setSession(data.session);
      });
    }
  }, [sessionId, token]);

  const handleNewSession = async (sourceType: SourceType) => {
    const newSession = (await api.createSession(token, sourceType)) as ChatSession;
    navigate(`/chat/${newSession.id}`);
    setShowNewSession(false);
  };

  const handleSend = (message: string, attachments?: { type: string; data: string }[]) => {
    setUserMessages((prev) => [...prev, { role: 'user', content: message }]);
    sendMessage(message, attachments);
  };

  if (!sessionId || showNewSession) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-white mb-4">Start a New Migration</h2>
        <p className="text-gray-400 mb-6">
          Select the source CI/CD system to begin converting your pipeline to GitHub Actions.
        </p>
        <div className="grid gap-3">
          {(Object.entries(SOURCE_LABELS) as [SourceType, string][]).map(
            ([type, label]) => (
              <button
                key={type}
                onClick={() => handleNewSession(type)}
                className="flex items-center gap-3 p-5 bg-gray-900 border border-gray-800 rounded-lg hover:border-blue-500/50 hover:bg-gray-800/50 transition-all text-left"
              >
                <Plus className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="font-medium text-white">{label}</div>
                  <div className="text-sm text-gray-500">
                    Migrate to GitHub Actions workflow
                  </div>
                </div>
              </button>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Session Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900/50">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-1 rounded hover:bg-gray-800 text-gray-400"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="text-sm font-medium text-white">
            {session?.title || 'Migration Session'}
          </div>
          <div className="text-xs text-gray-500">
            {session ? SOURCE_LABELS[session.source_type] : ''} | Model: {session?.model_used || ''}
            {connected ? (
              <span className="ml-2 text-green-400">Connected</span>
            ) : (
              <span className="ml-2 text-yellow-400">Connecting...</span>
            )}
          </div>
        </div>
      </div>

      <ChatWindow
        messages={messages}
        streaming={streaming}
        connected={connected}
        onSend={handleSend}
        userMessages={userMessages}
      />
    </div>
  );
}
