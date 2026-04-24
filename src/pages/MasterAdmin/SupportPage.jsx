import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import { systemAPI } from '../../services/api';

export default function SupportPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // Announcements
  const [announcements, setAnnouncements] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [posting, setPosting] = useState(false);

  // App versions
  const [versions, setVersions] = useState({ windows: null, android: null, ios: null });
  const [versionForms, setVersionForms] = useState({
    windows: { version_string: '', download_url: '', release_notes: '' },
    android: { version_string: '', download_url: '', release_notes: '' },
    ios:     { version_string: '', download_url: '', release_notes: '' },
  });
  const [savingVersion, setSavingVersion] = useState({ windows: false, android: false, ios: false });

  useEffect(() => {
    fetchAnnouncements();
    fetchVersions();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await systemAPI.getAnnouncements(false);
      setAnnouncements(res.data);
    } catch { toast.error('Failed to load announcements'); }
  };

  const fetchVersions = async () => {
    try {
      const res = await systemAPI.getAppVersions();
      const map = { windows: null, android: null, ios: null };
      res.data.forEach(v => { map[v.platform] = v; });
      setVersions(map);
      ['windows', 'android', 'ios'].forEach(p => {
        if (map[p]) {
          setVersionForms(prev => ({
            ...prev,
            [p]: {
              version_string: map[p].version_string || '',
              download_url: map[p].download_url || '',
              release_notes: map[p].release_notes || '',
            },
          }));
        }
      });
    } catch { /* no versions yet */ }
  };

  const handlePostAnnouncement = async () => {
    if (!newMessage.trim()) { toast.error('Enter a message'); return; }
    setPosting(true);
    try {
      await systemAPI.createAnnouncement({ message: newMessage.trim(), is_active: true });
      setNewMessage('');
      toast.success('Announcement posted');
      fetchAnnouncements();
    } catch { toast.error('Failed to post announcement'); }
    setPosting(false);
  };

  const handleToggle = async (ann) => {
    try {
      await systemAPI.toggleAnnouncement(ann.id, { is_active: !ann.is_active });
      fetchAnnouncements();
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await systemAPI.deleteAnnouncement(id);
      toast.success('Deleted');
      fetchAnnouncements();
    } catch { toast.error('Failed to delete'); }
  };

  const handleSaveVersion = async (platform) => {
    const form = versionForms[platform];
    if (!form.version_string.trim() || !form.download_url.trim()) {
      toast.error('Version and download URL are required');
      return;
    }
    setSavingVersion(prev => ({ ...prev, [platform]: true }));
    try {
      await systemAPI.saveAppVersion(platform, {
        version_string: form.version_string.trim(),
        download_url: form.download_url.trim(),
        release_notes: form.release_notes.trim() || null,
      });
      const cfg = platformConfig[platform];
      toast.success(`${cfg.label} version updated`);
      fetchVersions();
    } catch { toast.error('Failed to save version'); }
    setSavingVersion(prev => ({ ...prev, [platform]: false }));
  };

  const platformConfig = {
    windows: { label: 'Windows', icon: '🖥️', hint: 'Direct link to .exe installer' },
    android: { label: 'Android', icon: '📱', hint: 'Direct link to .apk file' },
    ios:     { label: 'iOS / iPad', icon: '🍎', hint: 'Direct link to .ipa file (sideload via AltStore)' },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/master-admin')}
            className="text-gray-500 hover:text-gray-800 text-sm flex items-center gap-1"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-xl font-bold text-gray-900">Support & App Management</h1>
        </div>
        <button
          onClick={async () => { await logout(); navigate('/login'); }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
        >
          Logout
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-8">

        {/* ── News Ticker Announcements ──────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">📢 News Ticker Announcements</h2>
          <p className="text-sm text-gray-500 mb-5">
            Active announcements scroll across the top of the POS app on all devices.
          </p>

          {/* Post new */}
          <div className="flex gap-3 mb-6">
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePostAnnouncement()}
              placeholder="e.g. Sunday maintenance 10pm–midnight — POS will be offline"
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              maxLength={500}
            />
            <button
              onClick={handlePostAnnouncement}
              disabled={posting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm disabled:opacity-50"
            >
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>

          {/* List */}
          {announcements.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No announcements yet</p>
          ) : (
            <div className="space-y-3">
              {announcements.map(ann => (
                <div
                  key={ann.id}
                  className={`flex items-start justify-between gap-3 p-4 rounded-xl border ${
                    ann.is_active
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${ann.is_active ? 'text-gray-900' : 'text-gray-500 line-through'}`}>
                      {ann.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(ann.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(ann)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        ann.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {ann.is_active ? 'Active' : 'Inactive'}
                    </button>
                    <button
                      onClick={() => handleDelete(ann.id)}
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── App Version Management ─────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">📦 App Version Management</h2>
          <p className="text-sm text-gray-500 mb-6">
            Set the latest version and download link for each platform. The POS app checks this on startup and shows an "Update Available" banner if the installed version is older.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['windows', 'android', 'ios']).map(platform => {
              const cfg = platformConfig[platform];
              const current = versions[platform];
              const form = versionForms[platform];
              return (
                <div key={platform} className="border rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800 text-base">
                      {cfg.icon} {cfg.label} App
                    </h3>
                    {current && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                        Current: v{current.version_string}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Version Number</label>
                    <input
                      type="text"
                      value={form.version_string}
                      onChange={e => setVersionForms(prev => ({ ...prev, [platform]: { ...prev[platform], version_string: e.target.value } }))}
                      placeholder="e.g. 1.0.22"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Download URL <span className="text-gray-400 font-normal">({cfg.hint})</span>
                    </label>
                    <input
                      type="url"
                      value={form.download_url}
                      onChange={e => setVersionForms(prev => ({ ...prev, [platform]: { ...prev[platform], download_url: e.target.value } }))}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Release Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                    <textarea
                      value={form.release_notes}
                      onChange={e => setVersionForms(prev => ({ ...prev, [platform]: { ...prev[platform], release_notes: e.target.value } }))}
                      placeholder="What's new in this version..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                    />
                  </div>

                  {form.download_url && (
                    <a
                      href={form.download_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-xs text-blue-600 hover:underline"
                    >
                      🔗 Test download link
                    </a>
                  )}

                  <button
                    onClick={() => handleSaveVersion(platform)}
                    disabled={savingVersion[platform]}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm disabled:opacity-50"
                  >
                    {savingVersion[platform] ? 'Saving...' : `Save ${cfg.label} Version`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Quick Download Links ───────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">⬇️ App Download Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['windows', 'android', 'ios']).map(platform => {
              const cfg = platformConfig[platform];
              const current = versions[platform];
              return (
                <div key={platform} className={`flex items-center justify-between p-4 rounded-xl border ${current ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div>
                    <p className="font-semibold text-gray-800">{cfg.icon} {cfg.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {current ? `v${current.version_string}` : 'Not configured'}
                    </p>
                  </div>
                  {current ? (
                    <a
                      href={current.download_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg"
                    >
                      Download
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400 italic">No link set</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
