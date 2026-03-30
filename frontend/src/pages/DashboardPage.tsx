import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ChatSession, SourceType } from '../types';
import { Plus, GitBranch, Clock, ArrowRight } from 'lucide-react';

interface DashboardPageProps {
  token: string;
}

const SOURCE_LABELS: Record<SourceType, string> = {
  teamcity_kotlin: 'TeamCity (Kotlin DSL)',
  teamcity_json: 'TeamCity (JSON API)',
  jenkins_declarative: 'Jenkins (Declarative)',
  jenkins_scripted: 'Jenkins (Scripted)',
};

const SOURCE_COLORS: Record<SourceType, string> = {
  teamcity_kotlin: 'bg-green-500/20 text-green-400',
  teamcity_json: 'bg-green-500/20 text-green-400',
  jenkins_declarative: 'bg-red-500/20 text-red-400',
  jenkins_scripted: 'bg-red-500/20 text-red-400',
};

export default function DashboardPage({ token }: DashboardPageProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.listSessions(token).then((data) => setSessions(data as ChatSession[]));
  }, [token]);

  const startMigration = async (sourceType: SourceType) => {
    const session = (await api.createSession(token, sourceType)) as ChatSession;
    navigate(`/chat/${session.id}`);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Dashboard</h2>
        <p className="text-gray-400">Start a new migration or continue a previous one</p>
      </div>

      {/* Quick Start */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
          New Migration
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.entries(SOURCE_LABELS) as [SourceType, string][]).map(
            ([type, label]) => (
              <button
                key={type}
                onClick={() => startMigration(type)}
                className="flex items-center gap-3 p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 hover:bg-gray-800/50 transition-all text-left group"
              >
                <Plus className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors" />
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                  {label}
                </span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Recent Sessions */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
          Recent Sessions
        </h3>
        {sessions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <GitBranch className="w-12 h-12 mx-auto mb-3 text-gray-700" />
            <p>No migration sessions yet. Start one above!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.slice(0, 10).map((session) => (
              <button
                key={session.id}
                onClick={() => navigate(`/chat/${session.id}`)}
                className="w-full flex items-center justify-between p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-sm font-medium text-gray-200 group-hover:text-white">
                      {session.title || 'Untitled Migration'}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          SOURCE_COLORS[session.source_type]
                        }`}
                      >
                        {SOURCE_LABELS[session.source_type]}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(session.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
