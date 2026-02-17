'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import api from '@/lib/api';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<'profile' | 'security' | 'apikeys'>('profile');

  // Profile
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // API Keys (stored locally for dev — in prod these go to the backend)
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [keysMessage, setKeysMessage] = useState('');

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setAvatarUrl((user as any).avatarUrl || '');
    }
    // Load saved keys from localStorage
    if (typeof window !== 'undefined') {
      setOpenaiKey(localStorage.getItem('agentbase_openai_key') || '');
      setAnthropicKey(localStorage.getItem('agentbase_anthropic_key') || '');
    }
  }, [user]);

  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileMessage('');
    try {
      await api.updateProfile({ displayName, avatarUrl: avatarUrl || undefined });
      setProfileMessage('Profile updated!');
      setTimeout(() => setProfileMessage(''), 3000);
    } catch (err: any) {
      setProfileMessage(`Error: ${err.message}`);
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordMessage('');
    if (newPassword.length < 8) { setPasswordError('New password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return; }

    setPasswordSaving(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setPasswordMessage('Password changed successfully!');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => setPasswordMessage(''), 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSaveKeys = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('agentbase_openai_key', openaiKey);
      localStorage.setItem('agentbase_anthropic_key', anthropicKey);
    }
    setKeysMessage('API keys saved locally!');
    setTimeout(() => setKeysMessage(''), 3000);
  };

  const sections = [
    { key: 'profile' as const, label: 'Profile', icon: '👤' },
    { key: 'security' as const, label: 'Security', icon: '🔒' },
    { key: 'apikeys' as const, label: 'API Keys', icon: '🔑' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {sections.map(s => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeSection === s.key ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-xl">
          {/* Profile Section */}
          {activeSection === 'profile' && (
            <div className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Profile Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" value={user?.email || ''} disabled className="w-full px-3 py-2 border rounded-lg bg-slate-50 text-slate-500 text-sm" />
                  <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
                  <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Avatar URL</label>
                  <div className="flex gap-3 items-start">
                    <input type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" />
                    {avatarUrl && (
                      <img src={avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover border" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button onClick={handleProfileSave} disabled={profileSaving} className="bg-brand-600 text-white px-5 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium text-sm">
                    {profileSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                  {profileMessage && <span className={`text-sm ${profileMessage.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>{profileMessage}</span>}
                </div>
              </div>
            </div>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <div className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Change Password</h2>
              {passwordError && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">{passwordError}</div>}
              {passwordMessage && <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm mb-4">{passwordMessage}</div>}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" placeholder="At least 8 characters" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" />
                </div>
                <button onClick={handlePasswordChange} disabled={passwordSaving || !currentPassword || !newPassword} className="bg-brand-600 text-white px-5 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium text-sm">
                  {passwordSaving ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          )}

          {/* API Keys Section */}
          {activeSection === 'apikeys' && (
            <div className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold text-slate-900 mb-1">AI Provider API Keys</h2>
              <p className="text-sm text-slate-500 mb-4">Keys are stored locally in your browser for development. In production, use environment variables.</p>
              {keysMessage && <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm mb-4">{keysMessage}</div>}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">OpenAI API Key</label>
                  <input type="password" value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} placeholder="sk-..." className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Anthropic API Key</label>
                  <input type="password" value={anthropicKey} onChange={(e) => setAnthropicKey(e.target.value)} placeholder="sk-ant-..." className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm font-mono" />
                </div>
                <button onClick={handleSaveKeys} className="bg-brand-600 text-white px-5 py-2 rounded-lg hover:bg-brand-700 font-medium text-sm">
                  Save API Keys
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
