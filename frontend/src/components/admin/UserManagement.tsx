import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { User } from '../../types';
import { Users, Shield, ShieldOff, UserX, UserCheck } from 'lucide-react';

interface UserManagementProps {
  token: string;
  currentUserId: string;
}

export default function UserManagement({ token, currentUserId }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = (await api.getUsers(token)) as User[];
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const toggleRole = async (user: User) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    await api.updateUser(token, user.id, { role: newRole });
    fetchUsers();
  };

  const toggleActive = async (user: User) => {
    await api.updateUser(token, user.id, { is_active: !user.is_active });
    fetchUsers();
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Users className="w-5 h-5" /> User Management
      </h3>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading users...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-800">
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Role</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map((user) => (
                <tr key={user.id} className="text-gray-300">
                  <td className="py-3 pr-4">{user.email}</td>
                  <td className="py-3 pr-4">{user.full_name || '-'}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {user.role === 'admin' && <Shield className="w-3 h-3" />}
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        user.is_active ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                    <span className="ml-2">{user.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="py-3">
                    {user.id !== currentUserId && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleRole(user)}
                          className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-yellow-400 transition-colors"
                          title={user.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                        >
                          {user.role === 'admin' ? (
                            <ShieldOff className="w-4 h-4" />
                          ) : (
                            <Shield className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => toggleActive(user)}
                          className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-red-400 transition-colors"
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {user.is_active ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
