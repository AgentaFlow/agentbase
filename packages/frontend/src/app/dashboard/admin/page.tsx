'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import api from '@/lib/api';

export default function AdminPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview');

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, usersData] = await Promise.all([
          (api as any).getAdminStats().catch(() => null),
          (api as any).getAdminUsers().catch(() => ({ users: [] })),
        ]);
        setStats(statsData);
        setUsers(usersData?.users || []);
      } catch { /* admin endpoints may not be available for non-admin users */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await (api as any).updateUserRole(userId, role);
      setUsers(users.map(u => u.id === userId ? { ...u, role } : u));
    } catch (err: any) { alert(err.message); }
  };

  const handleStatusToggle = async (userId: string, isActive: boolean) => {
    try {
      await (api as any).updateUserStatus(userId, isActive);
      setUsers(users.map(u => u.id === userId ? { ...u, isActive } : u));
    } catch (err: any) { alert(err.message); }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-16">
        <span className="text-5xl block mb-4">🔒</span>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Admin Access Required</h2>
        <p className="text-slate-500 text-sm">You need admin privileges to access this page.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        <button onClick={() => setActiveTab('overview')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'}`}>
          Overview
        </button>
        <button onClick={() => setActiveTab('users')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'users' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'}`}>
          Users ({users.length})
        </button>
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl border p-5 h-24 animate-pulse" />)}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Users</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalUsers}</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Applications</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalApplications}</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Active Apps</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeApplications}</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Plugins</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalPlugins}</p>
            </div>
          </div>
        ) : (
          <p className="text-slate-500 text-sm">Failed to load admin stats</p>
        )
      )}

      {/* Users */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">User</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Role</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Joined</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">{u.displayName || 'No name'}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="text-xs border rounded px-2 py-1 bg-white outline-none"
                      disabled={u.id === user?.id}
                    >
                      <option value="user">User</option>
                      <option value="developer">Developer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.isActive !== false ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {u.id !== user?.id && (
                      <button
                        onClick={() => handleStatusToggle(u.id, u.isActive === false)}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        {u.isActive !== false ? 'Disable' : 'Enable'}
                      </button>
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
