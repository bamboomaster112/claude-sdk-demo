import ModelSelector from '../components/admin/ModelSelector';
import UserManagement from '../components/admin/UserManagement';
import UsageAnalytics from '../components/admin/UsageAnalytics';
import { Settings } from 'lucide-react';

interface AdminPageProps {
  token: string;
  userId: string;
}

export default function AdminPage({ token, userId }: AdminPageProps) {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Settings className="w-6 h-6" /> Admin Panel
        </h2>
        <p className="text-gray-400">Manage models, users, and view usage analytics</p>
      </div>

      <div className="space-y-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <ModelSelector token={token} />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <UserManagement token={token} currentUserId={userId} />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <UsageAnalytics token={token} />
        </div>
      </div>
    </div>
  );
}
