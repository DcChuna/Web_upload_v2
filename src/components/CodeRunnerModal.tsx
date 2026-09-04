import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Play, 
  Square, 
  RotateCcw, 
  Upload, 
  Download, 
  Copy, 
  Check, 
  Terminal, 
  FileCode, 
  Layers, 
  Maximize2, 
  Minimize2, 
  Loader2, 
  Sparkles, 
  Share2, 
  Eye, 
  Code2
} from 'lucide-react';
import { Post, SupportedLanguage, ExecutionResult } from '../types';
import { 
  executeCode, 
  detectLanguageFromFilename, 
  CODE_PRESETS 
} from '../lib/codeRunnerService';
import { useAuth } from '../context/AuthContext';
import { DataService } from '../lib/dataService';

interface CodeRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPost?: Post | null;
  onPostCreated?: (newPost: Post) => void;
}

export const CodeRunnerModal: React.FC<CodeRunnerModalProps> = ({
  isOpen,
  onClose,
  initialPost,
  onPostCreated,
}) => {
  const { user, profile } = useAuth();
  const [code, setCode] = useState<string>(CODE_PRESETS.python_stats.code);
  const [language, setLanguage] = useState<SupportedLanguage>('python');
  const [filename, setFilename] = useState<string>('script.py');
  const [stdin, setStdin] = useState<string>('');
  const [showStdin, setShowStdin] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [activeTab, setActiveTab] = useState<'console' | 'preview' | 'stdin'>('console');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [engineMode, setEngineMode] = useState<'auto' | 'browser' | 'server'>('auto');
  const [fontSize, setFontSize] = useState<number>(13);

  // Publish Dialog
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState<boolean>(false);
  const [publishTitle, setPublishTitle] = useState<string>('');
  const [publishDesc, setPublishDesc] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialPost && initialPost.code_snippet) {
      setCode(initialPost.code_snippet);
      if (initialPost.code_language) {
        setLanguage(initialPost.code_language as SupportedLanguage);
      }
      if (initialPost.file_name) {
        setFilename(initialPost.file_name);
      }
      setPublishTitle(initialPost.title);
    }
  }, [initialPost]);

  if (!isOpen) return null;

  const handleRun = async () => {
    setIsRunning(true);
    setStatusMessage('Compiling & preparing execution...');
    setActiveTab(language === 'html' ? 'preview' : 'console');

    try {
      const execRes = await executeCode(
        language,
        code,
        stdin,
        engineMode,
        (status) => setStatusMessage(status)
      );
      setResult(execRes);
    } catch (err: any) {
      setResult({
        stdout: '',
        stderr: err?.message || 'Execution error occurred.',
        exitCode: 1,
        durationMs: 0,
        timestamp: new Date().toISOString(),
        engine: 'server-native',
      });
    } finally {
      setIsRunning(false);
      setStatusMessage('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const detectedLang = detectLanguageFromFilename(file.name);
    setFilename(file.name);
    setLanguage(detectedLang);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCode(content);
        setPublishTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'script.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishTitle.trim()) return;

    setIsPublishing(true);
    try {
      const newPost: Post = {
        id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: publishTitle.trim(),
        url: window.location.origin + `/#code-${filename}`,
        type: 'code',
        description: publishDesc.trim() || `Runnable ${language.toUpperCase()} script (${filename})`,
        tags: [language.charAt(0).toUpperCase() + language.slice(1), 'Code', 'Script'],
        user_name: profile?.display_name || user?.email?.split('@')[0] || 'Developer',
        user_email: user?.email || 'admin@gmail.com',
        user_id: user?.id || 'demo_user',
        created_at: new Date().toISOString(),
        avg_rating: 5,
        ratings_count: 1,
        user_rating: 5,
        views_count: 0,
        code_snippet: code,
        code_language: language,
        file_name: filename,
      };

      await DataService.createPost({
        title: newPost.title,
        url: newPost.url,
        type: 'code',
        description: newPost.description,
        tags: newPost.tags,
        user_id: newPost.user_id,
        user_email: newPost.user_email,
        user_name: newPost.user_name,
        code_snippet: code,
        code_language: language,
        file_name: filename,
      });

      if (onPostCreated) {
        onPostCreated(newPost);
      }
      setIsPublishDialogOpen(false);
      onClose();
    } catch (err) {
      console.error('Failed to publish code snippet:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  const lineCount = code.split('\n').length;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md transition-all ${isFullscreen ? 'p-0' : ''}`}>
      <div 
        id="code-runner-modal"
        className={`relative flex flex-col bg-[#0b0c10] border border-white/[0.12] shadow-2xl overflow-hidden rounded-2xl w-full max-w-6xl transition-all duration-200 ${
          isFullscreen ? 'w-screen h-screen rounded-none border-none' : 'h-[92vh]'
        }`}
      >
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#12141c] border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">Online Code Compiler & Runner</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                  {language}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsPublishDialogOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/30 transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Publish to Feed</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar: Language, Presets, File Upload, Run button */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-zinc-950/80 border-b border-white/[0.06] text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Language dropdown */}
            <select
              value={language}
              onChange={(e) => {
                const newLang = e.target.value as SupportedLanguage;
                setLanguage(newLang);
                if (newLang === 'python' && !filename.endsWith('.py')) setFilename('script.py');
                if (newLang === 'javascript' && !filename.endsWith('.js')) setFilename('script.js');
                if (newLang === 'html' && !filename.endsWith('.html')) setFilename('index.html');
              }}
              className="px-2.5 py-1.5 bg-zinc-900 border border-white/[0.1] rounded-lg text-zinc-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="python">Python 3 (Pyodide WASM)</option>
              <option value="javascript">JavaScript (Node.js & Sandbox)</option>
              <option value="typescript">TypeScript</option>
              <option value="html">HTML / CSS / JS Canvas</option>
              <option value="cpp">C++ (GCC)</option>
              <option value="bash">Bash / Shell</option>
            </select>

            {/* Presets */}
            <select
              onChange={(e) => {
                const presetKey = e.target.value;
                if (CODE_PRESETS[presetKey]) {
                  setCode(CODE_PRESETS[presetKey].code);
                  setLanguage(CODE_PRESETS[presetKey].language);
                  if (CODE_PRESETS[presetKey].language === 'python') setFilename('script.py');
                  if (CODE_PRESETS[presetKey].language === 'javascript') setFilename('script.js');
                }
              }}
              className="px-2.5 py-1.5 bg-zinc-900 border border-white/[0.1] rounded-lg text-zinc-400 text-xs focus:outline-none focus:border-emerald-500"
              defaultValue=""
            >
              <option value="" disabled>Presets...</option>
              {Object.entries(CODE_PRESETS).map(([key, item]) => (
                <option key={key} value={key}>{item.label}</option>
              ))}
            </select>

            {/* File Upload */}
            <input 
              ref={fileInputRef} 
              type="file" 
              accept=".py,.js,.ts,.html,.htm,.c,.cpp,.cc,.sh,.txt,.json" 
              className="hidden" 
              onChange={handleFileUpload} 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/[0.1] text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload File</span>
            </button>

            <button
              onClick={handleDownloadCode}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/[0.1] text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save</span>
            </button>

            <button
              onClick={handleCopyCode}
              className="p-1.5 rounded-lg bg-zinc-900 border border-white/[0.1] text-zinc-400 hover:text-white transition-colors"
              title="Copy code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStdin(!showStdin)}
              className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
                showStdin ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'text-zinc-400 border-white/[0.08]'
              }`}
            >
              stdin {showStdin ? '▲' : '▼'}
            </button>

            <button
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-semibold text-xs text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Code</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Optional Stdin Bar */}
        {showStdin && (
          <div className="px-4 py-2 bg-zinc-950 border-b border-white/[0.08] flex items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-400 shrink-0">stdin input:</span>
            <input
              type="text"
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="e.g. 42 or hello world (passed to input() in Python)"
              className="w-full px-2.5 py-1 bg-zinc-900 border border-white/[0.1] rounded text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
        )}

        {/* Main Split: Code Editor & Output Console */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Code Editor */}
          <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-white/[0.08] bg-[#0d0e14] relative">
            <div className="flex-1 flex overflow-hidden">
              {/* Line numbers */}
              <div className="w-10 py-3 select-none text-right pr-2 text-zinc-600 font-mono text-xs bg-[#0b0c10] border-r border-white/[0.04]">
                {Array.from({ length: Math.max(lineCount, 15) }, (_, i) => (
                  <div key={i} className="leading-5">{i + 1}</div>
                ))}
              </div>

              {/* Textarea code editor */}
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={{ fontSize: `${fontSize}px` }}
                spellCheck={false}
                className="flex-1 p-3 bg-transparent text-zinc-100 font-mono resize-none focus:outline-none leading-5 selection:bg-indigo-600/40"
              />
            </div>

            {/* Status bar */}
            <div className="px-3 py-1 bg-zinc-950/90 border-t border-white/[0.06] text-[11px] font-mono text-zinc-400 flex items-center justify-between">
              <span>{filename} • {lineCount} lines</span>
              {statusMessage && <span className="text-emerald-400 animate-pulse">{statusMessage}</span>}
            </div>
          </div>

          {/* Right: Output Terminal / HTML Preview */}
          <div className="w-full md:w-[45%] flex flex-col bg-[#0b0c10]">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#12141c] border-b border-white/[0.08] text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('console')}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                    activeTab === 'console' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Terminal Output</span>
                </button>

                {language === 'html' && (
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      activeTab === 'preview' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Live Preview</span>
                  </button>
                )}
              </div>

              {result && (
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className={result.exitCode === 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    exit: {result.exitCode}
                  </span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-zinc-400">{result.durationMs}ms</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto p-3 font-mono text-xs">
              {activeTab === 'preview' && language === 'html' ? (
                <iframe
                  title="HTML Preview"
                  srcDoc={code}
                  sandbox="allow-scripts"
                  className="w-full h-full border-0 bg-white rounded-lg"
                />
              ) : (
                <div className="space-y-2 whitespace-pre-wrap leading-relaxed">
                  {result?.stdout && (
                    <div className="text-emerald-300 selection:bg-emerald-800/50">
                      {result.stdout}
                    </div>
                  )}
                  {result?.stderr && (
                    <div className="text-rose-400 bg-rose-950/20 p-2 rounded border border-rose-500/20">
                      {result.stderr}
                    </div>
                  )}
                  {!result && !isRunning && (
                    <div className="text-zinc-600 italic">
                      Click "Run Code" to compile and execute your script.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Inline Publish Dialog */}
        {isPublishDialogOpen && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#12141c] border border-white/[0.12] rounded-xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">Publish Code to TeamHub</h3>
                </div>
                <button onClick={() => setIsPublishDialogOpen(false)} className="p-1 rounded text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handlePublishSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Post Title</label>
                  <input
                    type="text"
                    required
                    value={publishTitle}
                    onChange={(e) => setPublishTitle(e.target.value)}
                    placeholder="e.g. Python Fibonacci Generator"
                    className="w-full px-3 py-2 bg-zinc-900 border border-white/[0.1] rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Description (Optional)</label>
                  <textarea
                    rows={2}
                    value={publishDesc}
                    onChange={(e) => setPublishDesc(e.target.value)}
                    placeholder="Brief summary of what this code does..."
                    className="w-full px-3 py-2 bg-zinc-900 border border-white/[0.1] rounded-lg text-white resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPublishDialogOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-zinc-300 hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPublishing || !publishTitle.trim()}
                    className="px-4 py-1.5 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5"
                  >
                    {isPublishing ? 'Publishing...' : 'Publish to Feed'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
