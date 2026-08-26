import React, { useState, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  FolderGit2, 
  Globe,
  Gamepad2,
  Link2, 
  CheckCircle2, 
  AlertCircle, 
  Upload,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { PostType, Post } from '../types';
import { useAuth } from '../context/AuthContext';
import { DataService } from '../lib/dataService';

interface NewSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (post: Post) => void;
}

const PRESET_TAGS: Record<PostType, string[]> = {
  game: ['Arcade', 'Action', 'Puzzle', 'WebGL', 'Retro', 'Strategy', 'Multiplayer', 'Casual', 'Canvas', '3D'],
  project: ['Fullstack', 'React', 'NextJS', 'Vite', 'Mobile', 'OpenSource', 'SaaS', 'Frontend', 'Backend', 'TypeScript', 'Tailwind'],
  link: ['Guide', 'Resource', 'Snippet', 'Inspiration', 'Tool', 'Article', 'Documentation', 'API'],
};

export function NewSubmissionModal({
  isOpen,
  onClose,
  onPostCreated,
}: NewSubmissionModalProps) {
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<PostType>('game');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>(['Game', 'Arcade']);
  const [tagInput, setTagInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrlDirect, setImageUrlDirect] = useState('');
  const [useUrlForImage, setUseUrlForImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Image size exceeds 5MB limit.');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setImageUrlDirect('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTag = (tagToAdd: string) => {
    const clean = tagToAdd.trim().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (tagInput.trim()) {
        handleAddTag(tagInput);
      }
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrlDirect('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!title.trim()) {
      setErrorMsg('Please provide a title');
      return;
    }

    if (!url.trim()) {
      setErrorMsg('Please enter a valid URL');
      return;
    }

    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    setIsSubmitting(true);

    try {
      let finalImageUrl: string | null = imagePreview;

      if (useUrlForImage) {
        finalImageUrl = imageUrlDirect.trim() || null;
      } else if (imageFile) {
        finalImageUrl = await DataService.uploadImage(imageFile);
      }

      const { post: createdPost, error: subError } = await DataService.createPost(
        {
          title: title.trim(),
          url: formattedUrl,
          type,
          description: description.trim(),
          image_url: finalImageUrl,
          tags: tags.length > 0 ? tags : ['General'],
          user_id: user?.id,
          user_name: user?.name,
          user_email: user?.email,
        },
        user
      );

      if (subError) {
        console.warn('Backend sync notice:', subError);
      }

      setSuccessMsg('Submitted successfully!');
      onPostCreated(createdPost);

      setTimeout(() => {
        onClose();
        setTitle('');
        setUrl('');
        setDescription('');
        setImagePreview(null);
        setImageFile(null);
      }, 400);
    } catch (err: any) {
      console.error('Submission failed:', err);
      setErrorMsg(err?.message || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[#0e1015] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-10 my-8">
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/[0.06] bg-[#12141c]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100 text-base">Add New Resource</h3>
              <p className="text-xs text-zinc-400">Share games, interactive apps, tools, or guides</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Resource Category
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(
                [
                  { id: 'game', label: 'Playable Game', icon: Gamepad2, color: 'text-purple-400' },
                  { id: 'project', label: 'App / Project', icon: FolderGit2, color: 'text-blue-400' },
                  { id: 'link', label: 'Link / Guide', icon: Globe, color: 'text-emerald-400' },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const active = type === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setType(item.id as PostType);
                      const presets = PRESET_TAGS[item.id as PostType];
                      if (presets && presets[0]) {
                        setTags([presets[0], presets[1] || 'Web']);
                      }
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      active
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-white font-semibold'
                        : 'bg-zinc-900/60 border-white/[0.05] text-zinc-400'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${item.color}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Cyberpunk Runner 3D"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/[0.08] text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Live URL / Game Link <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <Link2 className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full pl-9.5 pr-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/[0.08] text-sm text-zinc-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe gameplay or features..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/[0.08] text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono bg-indigo-950/60 border border-indigo-500/30 text-indigo-300"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-rose-400 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add custom tag..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-white/[0.08] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (tagInput.trim()) handleAddTag(tagInput);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 text-zinc-200 border border-white/[0.08] cursor-pointer"
              >
                Add Tag
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Preview Thumbnail
              </label>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setUseUrlForImage(false)}
                  className={`cursor-pointer ${!useUrlForImage ? 'text-indigo-400 font-semibold' : 'text-zinc-400'}`}
                >
                  Upload File
                </button>
                <span className="text-zinc-600">|</span>
                <button
                  type="button"
                  onClick={() => setUseUrlForImage(true)}
                  className={`cursor-pointer ${useUrlForImage ? 'text-indigo-400 font-semibold' : 'text-zinc-400'}`}
                >
                  Image URL
                </button>
              </div>
            </div>

            {useUrlForImage ? (
              <input
                type="text"
                value={imageUrlDirect}
                onChange={(e) => {
                  setImageUrlDirect(e.target.value);
                  setImagePreview(e.target.value.trim() || null);
                }}
                placeholder="https://..."
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900/80 border border-white/[0.08] text-xs font-mono text-zinc-100 focus:outline-none focus:border-indigo-500"
              />
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {!imagePreview ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 border border-dashed border-white/[0.12] hover:border-indigo-500/40 rounded-xl bg-zinc-900/40 text-zinc-400 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Upload className="w-4 h-4 text-indigo-400" />
                    <span>Click to select thumbnail image</span>
                  </button>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-white/[0.1] max-h-36 group">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-36 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 text-xs text-zinc-200"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="p-1 rounded-lg bg-rose-950/80 text-rose-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-white/[0.06] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Publish Resource</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
