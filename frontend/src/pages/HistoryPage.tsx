import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ChatSession, SourceType } from '../types';
import { History, Clock, FileText, ArrowRight } from 'lucide-react';

const SOURCE_LABELS: Record<SourceType, string> = {
  teamcity_kotlin: 'TeamCity (Kotlin DSL)',
  teamcity_json: 'TeamCity (JSON API)',
  jenkins_declarative: 'Jenkins (Declarative)',
  jenkins_scripted: 'Jenkins (Scripted)',
};

interface HistoryPageProps {
  token: string;
}

export default function HistoryPage({ token }: HistoryPageProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.listSessions(token)
      .then((data) => setSessions(data as ChatSession[]))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <History className="w-6 h-6" /> Migration History
        </h2>
        <p className="text-gray-400">View and resume your past migration sessions</p>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-700" />
          <p>No migration history yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => navigate(`/chat/${session.id}`)}
              className="w-full flex items-center justify-between p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-all text-left group"
            >
              <div>
                <div className="text-sm font-medium text-gray-200 group-hover:text-white">
                  {session.title || 'Untitled Migration'}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>{SOURCE_LABELS[session.source_type]}</span>
                  <span>|</span>
                  <span>{session.model_used}</span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(session.created_at).toLocaleString()}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      session.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : session.status === 'completed'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {session.status}
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
