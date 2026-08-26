import React, { useState, useEffect } from 'react';
import { Comment } from '../types';
import { DataService } from '../lib/dataService';
import { MessageSquare, Send, User, Trash2, MessageCircle } from 'lucide-react';

interface CommentsSectionProps {
  postId: string;
  user?: { id?: string; name?: string; email?: string } | null;
  onCommentCountChange?: (count: number) => void;
}

export function CommentsSection({ postId, user, onCommentCountChange }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    DataService.fetchComments(postId)
      .then((data) => {
        setComments(data);
        onCommentCountChange?.(data.length);
      })
      .finally(() => setLoading(false));
  }, [postId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const newComment = await DataService.addComment({
        postId,
        content: content.trim(),
        user: user || (guestName.trim() ? { name: guestName.trim() } : null),
      });

      const updated = [...comments, newComment];
      setComments(updated);
      setContent('');
      onCommentCountChange?.(updated.length);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    await DataService.deleteComment(commentId, postId);
    const updated = comments.filter((c) => c.id !== commentId);
    setComments(updated);
    onCommentCountChange?.(updated.length);
  };

  const formatRelativeTime = (isoDate: string) => {
    try {
      const diff = (Date.now() - new Date(isoDate).getTime()) / 1000;
      if (diff < 60) return 'just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return new Date(isoDate).toLocaleDateString();
    } catch {
      return 'recently';
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Discussion ({comments.length})
          </span>
        </div>
      </div>

      <form onSubmit={handleAddComment} className="space-y-2">
        {!user && (
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Your name (optional)"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-44"
            />
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={user ? `Comment as ${user.name || user.email}...` : 'Write a comment...'}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition"
          >
            {isSubmitting ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
          </button>
        </div>
      </form>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {loading ? (
          <p className="text-[11px] text-slate-500 text-center py-2">Loading comments...</p>
        ) : comments.length === 0 ? (
          <div className="text-center py-2 text-slate-500 text-[11px] flex items-center justify-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-slate-600" />
            <span>No comments yet. Be the first!</span>
          </div>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800 text-xs flex justify-between items-start group"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-300 text-[11px]">{c.user_name}</span>
                  <span className="text-[10px] text-slate-500">{formatRelativeTime(c.created_at)}</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-xs">{c.content}</p>
              </div>
              <button
                onClick={() => handleDeleteComment(c.id)}
                className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition rounded"
                title="Delete comment"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
