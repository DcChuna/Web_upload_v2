import React, { useState } from 'react';
import { Database, CheckCircle, AlertTriangle, Copy, Check, RefreshCw, X, Key, UploadCloud, ExternalLink } from 'lucide-react';
import { DataService, getLocalPosts } from '../lib/dataService';
import { SUPABASE_CONFIG, updateSupabaseClient } from '../lib/supabase';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLive: boolean;
  onRefresh: () => Promise<void>;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({
  isOpen,
  onClose,
  isLive,
  onRefresh,
}) => {
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ healthy: boolean; error?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [customKey, setCustomKey] = useState(SUPABASE_CONFIG.anonKey || '');
  const [customUrl, setCustomUrl] = useState(SUPABASE_CONFIG.url || '');
  const [keySaved, setKeySaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const sqlScript = `-- 1. Cleanly recreate posts and ratings tables
DROP TABLE IF EXISTS public.ratings CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;

CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT DEFAULT 'project',
  description TEXT,
  image_url TEXT,
  tags TEXT[] DEFAULT ARRAY['General'],
  user_id TEXT,
  user_email TEXT,
  user_name TEXT,
  views_count INT DEFAULT 0,
  avg_rating NUMERIC DEFAULT 0,
  ratings_count INT DEFAULT 0
);

CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  rating INT NOT NULL,
  UNIQUE(post_id, user_id)
);

-- 2. Open permissions so ANY browser/user can read & post
ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.posts TO anon, authenticated;
GRANT ALL ON TABLE public.ratings TO anon, authenticated;

-- 3. Enable real-time multi-device sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
`;

  const handleTestConnection = async () => {
    setTesting(true);
    setStatus(null);
    try {
      const res = await DataService.checkHealth();
      setStatus(res);
      await onRefresh();
    } catch (err: any) {
      setStatus({ healthy: false, error: err?.message || 'Connection error' });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!customUrl.trim() || !customKey.trim()) return;
    updateSupabaseClient(customUrl.trim(), customKey.trim());
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2500);
    await handleTestConnection();
  };

  const handleSyncLocalToCloud = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const local = getLocalPosts();
      if (local.length === 0) {
        setSyncResult('No local posts found to sync.');
        return;
      }
      let successCount = 0;
      for (const p of local) {
        const { savedToSupabase } = await DataService.createPost({
          title: p.title,
          url: p.url,
          type: p.type,
          description: p.description,
          tags: p.tags,
          image_url: p.image_url,
          user_name: p.user_name,
          user_email: p.user_email,
        });
        if (savedToSupabase) successCount++;
      }
      setSyncResult(`Successfully pushed ${successCount}/${local.length} local posts to Supabase!`);
      await onRefresh();
    } catch (e: any) {
      setSyncResult(`Sync error: ${e?.message || 'Failed'}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-zinc-950/50">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Database & Multi-User Sync Status</h2>
              <p className="text-xs text-zinc-400">Supabase Cloud Database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Status Indicator Banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            isLive 
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
              : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
          }`}>
            {isLive ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs">
              <div className="font-semibold text-sm">
                {isLive ? 'Supabase Connected & Live' : 'Supabase Not Syncing to Cloud'}
              </div>
              <p className="mt-1 text-zinc-300">
                {isLive 
                  ? 'All devices, friends, and incognito sessions will see and sync new posts instantly.'
                  : 'Your posts are saving to your browser only because Supabase cannot accept writes yet.'}
              </p>
              {status?.error && (
                <div className="mt-2 p-2 rounded bg-black/40 font-mono text-[11px] text-rose-300">
                  Supabase returned: {status.error}
                </div>
              )}
            </div>
          </div>

          {/* Key Configuration Check */}
          <div className="p-3.5 bg-zinc-950/70 rounded-xl border border-white/[0.08] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                Supabase API Key (Anon Public JWT)
              </span>
              <a
                href="https://supabase.com/dashboard/project/omakybgrklvehnrfenhc/settings/api"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                Find in Supabase <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="space-y-1.5">
              <input
                type="text"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="Paste your anon public key (starts with eyJ...)"
                className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-white/[0.1] rounded-lg text-zinc-200 font-mono focus:border-indigo-500 focus:outline-none"
              />
              <p className="text-[10px] text-zinc-500">
                Must be the <strong>anon public</strong> key starting with <code className="text-zinc-300">eyJ...</code> from Supabase Settings ➔ API.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={handleSaveCredentials}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-colors cursor-pointer"
              >
                {keySaved ? 'Saved & Tested!' : 'Save & Reconnect'}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs border border-white/[0.08] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Testing Live...' : 'Test Connection'}</span>
            </button>
            <button
              onClick={handleSyncLocalToCloud}
              disabled={syncing}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <UploadCloud className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Pushing to Supabase...' : 'Sync Local Posts to Cloud'}</span>
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-white/[0.08] transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy SQL'}</span>
            </button>
          </div>

          {syncResult && (
            <div className="p-2.5 rounded-lg bg-zinc-950 border border-white/[0.1] text-xs text-emerald-300 font-mono">
              {syncResult}
            </div>
          )}

          {/* Quick SQL Helper */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Fix / Initialization SQL (Run in Supabase SQL Editor):</label>
            <div className="relative">
              <pre className="p-3 bg-zinc-950 rounded-xl border border-white/[0.08] text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-36 leading-relaxed">
                {sqlScript}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/[0.08] bg-zinc-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

