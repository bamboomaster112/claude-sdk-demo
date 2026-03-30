import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { UsageStats } from '../../types';
import { BarChart3, Zap, Users, MessageSquare } from 'lucide-react';

interface UsageAnalyticsProps {
  token: string;
}

export default function UsageAnalytics({ token }: UsageAnalyticsProps) {
  const [stats, setStats] = useState<UsageStats | null>(null);

  useEffect(() => {
    api.getAnalytics(token).then((data) => setStats(data as UsageStats));
  }, [token]);

  if (!stats) return <div className="text-gray-500 text-sm">Loading analytics...</div>;

  const cards = [
    { label: 'Total Sessions', value: stats.total_sessions, icon: MessageSquare, color: 'blue' },
    { label: 'Active Users', value: stats.active_users, icon: Users, color: 'green' },
    { label: 'Input Tokens', value: stats.total_tokens_in.toLocaleString(), icon: Zap, color: 'purple' },
    { label: 'Output Tokens', value: stats.total_tokens_out.toLocaleString(), icon: BarChart3, color: 'orange' },
  ];

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5" /> Usage Analytics
      </h3>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <Icon className={`w-4 h-4 text-${color}-400`} />
              {label}
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      {Object.keys(stats.model_breakdown).length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-3">Model Usage</h4>
          <div className="space-y-2">
            {Object.entries(stats.model_breakdown).map(([model, count]) => {
              const total = Object.values(stats.model_breakdown).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={model}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{model}</span>
                    <span className="text-gray-500">{count} requests ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
