import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  FolderGit2, 
  Code, 
  Palette, 
  Image, 
  Link2, 
  Tags, 
  Layers, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Upload,
  RefreshCw,
  Trash2,
  Edit3
} from 'lucide-react';
import { PostType, Post } from '../types';
import { DataService } from '../lib/dataService';

interface EditSubmissionModalProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
  onPostUpdated: (updatedPost: Post) => void;
}

const PRESET_TAGS: Record<PostType, string[]> = {
  project: ['Fullstack', 'React', 'NextJS', 'Vite', 'Mobile', 'OpenSource', 'SaaS', 'Frontend', 'Backend', 'TypeScript', 'Tailwind'],
  link: ['Guide', 'Resource', 'Snippet', 'Inspiration', 'Tool', 'Article', 'Documentation', 'API'],
  code: ['Python', 'JavaScript', 'Algorithms', 'Script', 'Automation', 'CLI', 'WebAssembly', 'Backend'],
};

export function EditSubmissionModal({
  post,
  isOpen,
  onClose,
  onPostUpdated,
}: EditSubmissionModalProps) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<PostType>('project');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrlDirect, setImageUrlDirect] = useState('');
  const [useUrlForImage, setUseUrlForImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when post changes or modal opens
  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      setUrl(post.url || '');
      setType(post.type || 'project');
      setDescription(post.description || '');
      setTags(Array.isArray(post.tags) ? [...post.tags] : ['General']);
      setImagePreview(post.image_url || null);
      setImageUrlDirect(post.image_url || '');
      setUseUrlForImage(!!post.image_url && post.image_url.startsWith('http'));
      setImageFile(null);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [post, isOpen]);

  if (!isOpen || !post) return null;

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

    try {
      new URL(formattedUrl);
    } catch {
      setErrorMsg('Invalid URL format. Please include a valid domain (e.g., https://example.com)');
      return;
    }

    setIsSubmitting(true);

    try {
      let finalImageUrl: string | null = imagePreview;

      if (useUrlForImage) {
        finalImageUrl = imageUrlDirect.trim() || null;
      } else if (imageFile) {
        finalImageUrl = await DataService.uploadImage(imageFile);
      }

      const { post: updatedPost, savedToSupabase, error: subError } = await DataService.updatePost(
        post.id,
        {
          title: title.trim(),
          url: formattedUrl,
          type,
          description: description.trim(),
          image_url: finalImageUrl,
          tags: tags.length > 0 ? tags : ['General'],
        }
      );

      if (!savedToSupabase && subError) {
        console.warn('Note: post saved to local cache, Supabase update notice:', subError);
      }

      setSuccessMsg('Project updated successfully!');
      onPostUpdated(updatedPost);

      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Update failed:', err);
      setErrorMsg(err?.message || 'Failed to update project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-[#0e1015] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/80 overflow-hidden z-10 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/[0.06] bg-[#12141c]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100 text-base">Edit Project / Work</h3>
              <p className="text-xs text-zinc-400">Update title, link, description, type, or preview image</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-rose-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Alert */}
          {successMsg && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Submission Type
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  { id: 'project', label: 'Project / App (Interactive Build)', icon: FolderGit2, color: 'text-indigo-400' },
                  { id: 'link', label: 'Link / Resource / Article', icon: Sparkles, color: 'text-emerald-400' },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const active = type === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setType(item.id);
                      const presets = PRESET_TAGS[item.id];
                      if (presets && presets[0] && !tags.includes(presets[0])) {
                        setTags([presets[0], ...tags.slice(0, 2)]);
                      }
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      active
                        ? 'bg-indigo-600/15 border-indigo-500/50 text-white shadow-sm'
                        : 'bg-zinc-900/60 border-white/[0.05] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.1]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${item.color}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Gold Rush Duel, Team Knowledge Base"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/[0.08] text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
            />
          </div>

          {/* URL / Link Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Live URL or Repository Link <span className="text-rose-400">*</span>
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
                placeholder="https://my-app.vercel.app or https://github.com/..."
                className="w-full pl-9.5 pr-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/[0.08] text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-xs"
              />
            </div>
          </div>

          {/* Description (Markdown) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Description &amp; Highlights
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">Markdown supported</span>
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the project rules, features, tech stack, or why you built it..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/[0.08] text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none leading-relaxed"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Tags
            </label>
            
            {/* Tag List */}
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
                    className="hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Tag Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Type tag and press Enter (e.g. NextJS, AI, Tailwind)"
                className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-white/[0.08] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (tagInput.trim()) handleAddTag(tagInput);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/[0.08] transition-colors cursor-pointer"
              >
                Add Tag
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px] text-zinc-400">
              <span>Suggestions:</span>
              {(PRESET_TAGS[type] || PRESET_TAGS.project).slice(0, 5).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAddTag(preset)}
                  className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/[0.04] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  +{preset}
                </button>
              ))}
            </div>
          </div>

          {/* Thumbnail / Image */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Preview Thumbnail (Optional)
              </label>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setUseUrlForImage(false)}
                  className={`cursor-pointer ${!useUrlForImage ? 'text-indigo-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  Upload File
                </button>
                <span className="text-zinc-600">|</span>
                <button
                  type="button"
                  onClick={() => setUseUrlForImage(true)}
                  className={`cursor-pointer ${useUrlForImage ? 'text-indigo-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
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
                placeholder="https://example.com/preview.png"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900/80 border border-white/[0.08] text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
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
                    className="w-full py-4 border border-dashed border-white/[0.12] hover:border-indigo-500/40 rounded-xl bg-zinc-900/40 hover:bg-zinc-900/70 text-zinc-400 hover:text-zinc-200 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Upload className="w-4 h-4 text-indigo-400" />
                    <span>Click to select new image (Max 5MB)</span>
                  </button>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-white/[0.1] max-h-36 group">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-36 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/[0.1] text-xs font-medium text-zinc-200 hover:text-white"
                      >
                        Change Image
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="p-1 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 hover:text-rose-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-white/[0.06] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
