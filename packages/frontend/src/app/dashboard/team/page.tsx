'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-amber-100 text-amber-700',
  admin: 'bg-purple-100 text-purple-700',
  member: 'bg-blue-100 text-blue-700',
  viewer: 'bg-slate-100 text-slate-600',
};

export default function TeamPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const data = await api.getTeams();
      setTeams(data || []);
    } catch { setTeams([]); }
    finally { setLoading(false); }
  };

  const loadTeam = async (id: string) => {
    try {
      const [team, mems] = await Promise.all([
        api.getTeam(id),
        api.getTeamMembers(id),
      ]);
      setSelectedTeam(team);
      setMembers(mems || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadTeams(); }, []);

  const handleCreate = async () => {
    if (!newName.trim() || !newSlug.trim()) return;
    setCreating(true);
    try {
      const team = await api.createTeam({ name: newName, slug: newSlug, description: newDesc });
      setShowCreate(false);
      setNewName(''); setNewSlug(''); setNewDesc('');
      await loadTeams();
      loadTeam(team.id);
    } catch (err: any) { alert(err.message); }
    finally { setCreating(false); }
  };

  const handleInvite = async () => {
    if (!selectedTeam || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      await api.inviteTeamMember(selectedTeam.id, inviteEmail, inviteRole);
      setInviteEmail('');
      await loadTeam(selectedTeam.id);
    } catch (err: any) { alert(err.message); }
    finally { setInviting(false); }
  };

  const handleRemove = async (memberId: string) => {
    if (!selectedTeam || !confirm('Remove this member?')) return;
    try {
      await api.removeTeamMember(selectedTeam.id, memberId);
      await loadTeam(selectedTeam.id);
    } catch (err: any) { alert(err.message); }
  };

  const handleRoleChange = async (memberId: string, role: string) => {
    if (!selectedTeam) return;
    try {
      await api.updateMemberRole(selectedTeam.id, memberId, role);
      await loadTeam(selectedTeam.id);
    } catch (err: any) { alert(err.message); }
  };

  const handleDelete = async () => {
    if (!selectedTeam || !confirm(`Delete team "${selectedTeam.name}"? This cannot be undone.`)) return;
    try {
      await api.deleteTeam(selectedTeam.id);
      setSelectedTeam(null);
      setMembers([]);
      await loadTeams();
    } catch (err: any) { alert(err.message); }
  };

  const isOwnerOrAdmin = selectedTeam?.currentUserRole === 'owner' || selectedTeam?.currentUserRole === 'admin';
  const isOwner = selectedTeam?.currentUserRole === 'owner';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Teams</h1>
          <p className="text-sm text-slate-500 mt-1">Collaborate with your team on AI applications</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 font-medium">
          + Create Team
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white border rounded-xl p-5 mb-6">
          <h3 className="font-medium text-slate-900 mb-3">New Team</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Team Name</label>
              <input value={newName} onChange={e => { setNewName(e.target.value); setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')); }} placeholder="My AI Team" className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Slug</label>
              <input value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="my-ai-team" className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 font-mono" />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Description (optional)</label>
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What this team works on..." className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={!newName.trim() || !newSlug.trim() || creating} className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium text-sm">
              {creating ? 'Creating...' : 'Create Team'}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Team List */}
        <div>
          {loading ? (
            <div className="animate-pulse text-slate-400 py-8 text-center text-sm">Loading teams...</div>
          ) : teams.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <span className="text-4xl block mb-2">👥</span>
              <p className="text-sm">No teams yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {teams.map(team => (
                <button
                  key={team.id}
                  onClick={() => loadTeam(team.id)}
                  className={`w-full text-left bg-white border rounded-xl p-4 hover:shadow-sm transition-shadow ${
                    selectedTeam?.id === team.id ? 'ring-2 ring-brand-500 border-brand-300' : ''
                  }`}
                >
                  <h4 className="font-medium text-slate-900 text-sm">{team.name}</h4>
                  <p className="text-xs text-slate-400 font-mono">/{team.slug}</p>
                  {team.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{team.description}</p>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Team Detail */}
        <div className="md:col-span-2">
          {!selectedTeam ? (
            <div className="text-center py-20 text-slate-400">
              <span className="text-5xl block mb-3">👈</span>
              <p className="text-sm">Select a team to view details</p>
            </div>
          ) : (
            <div>
              {/* Header */}
              <div className="bg-white border rounded-xl p-5 mb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{selectedTeam.name}</h2>
                    <p className="text-xs text-slate-400 font-mono">/{selectedTeam.slug}</p>
                    {selectedTeam.description && <p className="text-sm text-slate-500 mt-2">{selectedTeam.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[selectedTeam.currentUserRole] || 'bg-slate-100 text-slate-600'}`}>
                      {selectedTeam.currentUserRole}
                    </span>
                    {isOwner && (
                      <button onClick={handleDelete} className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                        Delete Team
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Invite */}
              {isOwnerOrAdmin && (
                <div className="bg-white border rounded-xl p-4 mb-4">
                  <h4 className="text-sm font-medium text-slate-900 mb-2">Invite Member</h4>
                  <div className="flex gap-2">
                    <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@example.com" className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500" />
                    <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="px-3 py-2 border rounded-lg text-sm outline-none bg-white">
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button onClick={handleInvite} disabled={!inviteEmail.trim() || inviting} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50">
                      {inviting ? 'Inviting...' : 'Invite'}
                    </button>
                  </div>
                </div>
              )}

              {/* Members */}
              <div className="bg-white border rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b bg-slate-50">
                  <h4 className="text-sm font-medium text-slate-700">Members ({members.length})</h4>
                </div>
                <div className="divide-y">
                  {members.map(m => (
                    <div key={m.id} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-medium text-slate-600">
                          {(m.displayName || m.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{m.displayName || m.email}</p>
                          {m.displayName && <p className="text-xs text-slate-400">{m.email}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOwner && m.role !== 'owner' ? (
                          <select
                            value={m.role}
                            onChange={e => handleRoleChange(m.id, e.target.value)}
                            className="text-xs px-2 py-1 border rounded-lg bg-white outline-none"
                          >
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        ) : (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[m.role]}`}>
                            {m.role}
                          </span>
                        )}
                        {isOwnerOrAdmin && m.role !== 'owner' && (
                          <button onClick={() => handleRemove(m.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
