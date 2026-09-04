import { ExecutionResult, SupportedLanguage } from '../types';

let pyodideInstance: any = null;
let pyodideLoadPromise: Promise<any> | null = null;

/**
 * Dynamically loads and initializes Pyodide WebAssembly runtime in the browser.
 */
export async function getPyodideInstance(onStatusUpdate?: (status: string) => void): Promise<any> {
  if (pyodideInstance) {
    return pyodideInstance;
  }

  if (pyodideLoadPromise) {
    return pyodideLoadPromise;
  }

  pyodideLoadPromise = new Promise(async (resolve, reject) => {
    try {
      if (onStatusUpdate) onStatusUpdate('Loading Python WebAssembly runtime (Pyodide)...');

      if (!(window as any).loadPyodide) {
        await new Promise<void>((res, rej) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
          script.async = true;
          script.onload = () => res();
          script.onerror = () => rej(new Error('Failed to load Pyodide script from CDN.'));
          document.head.appendChild(script);
        });
      }

      if (onStatusUpdate) onStatusUpdate('Initializing Python 3 environment...');
      const pyodide = await (window as any).loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
      });

      pyodideInstance = pyodide;
      if (onStatusUpdate) onStatusUpdate('Python 3 ready!');
      resolve(pyodide);
    } catch (err) {
      pyodideLoadPromise = null;
      reject(err);
    }
  });

  return pyodideLoadPromise;
}

/**
 * Execute Python using Pyodide (WASM) in the browser
 */
export async function runPythonBrowser(
  code: string,
  stdin: string = '',
  onStatusUpdate?: (msg: string) => void
): Promise<ExecutionResult> {
  const startTime = performance.now();
  let stdout = '';
  let stderr = '';

  try {
    const pyodide = await getPyodideInstance(onStatusUpdate);

    pyodide.setStdout({
      batched: (text: string) => {
        stdout += text + '\n';
      },
    });

    pyodide.setStderr({
      batched: (text: string) => {
        stderr += text + '\n';
      },
    });

    if (stdin) {
      pyodide.setStdin({
        stdin: () => stdin,
      });
    }

    if (onStatusUpdate) onStatusUpdate('Executing Python script...');
    const result = await pyodide.runPythonAsync(code);

    if (result !== undefined && stdout.trim() === '') {
      stdout = String(result);
    }

    const durationMs = Math.round(performance.now() - startTime);
    return {
      stdout: stdout.trimEnd(),
      stderr: stderr.trimEnd(),
      exitCode: 0,
      durationMs,
      timestamp: new Date().toISOString(),
      engine: 'pyodide-wasm',
    };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);
    return {
      stdout: stdout.trimEnd(),
      stderr: (err?.message || String(err)).trimEnd(),
      exitCode: 1,
      durationMs,
      timestamp: new Date().toISOString(),
      engine: 'pyodide-wasm',
    };
  }
}

/**
 * Execute JavaScript safely in browser sandbox
 */
export async function runJavaScriptBrowser(code: string): Promise<ExecutionResult> {
  const startTime = performance.now();
  const logs: string[] = [];
  const errors: string[] = [];

  const formatArg = (arg: any) => {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  };

  try {
    const customConsole = {
      log: (...args: any[]) => logs.push(args.map(formatArg).join(' ')),
      info: (...args: any[]) => logs.push('ℹ ' + args.map(formatArg).join(' ')),
      warn: (...args: any[]) => logs.push('⚠ ' + args.map(formatArg).join(' ')),
      error: (...args: any[]) => errors.push('✖ ' + args.map(formatArg).join(' ')),
    };

    const runner = new Function(
      'console',
      `"use strict"; return (async () => { ${code} })();`
    );

    const evalResult = await runner(customConsole);
    if (evalResult !== undefined && logs.length === 0) {
      logs.push(formatArg(evalResult));
    }

    const durationMs = Math.round(performance.now() - startTime);
    return {
      stdout: logs.join('\n'),
      stderr: errors.join('\n'),
      exitCode: errors.length > 0 ? 1 : 0,
      durationMs,
      timestamp: new Date().toISOString(),
      engine: 'js-sandbox',
    };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);
    return {
      stdout: logs.join('\n'),
      stderr: (errors.join('\n') + (errors.length ? '\n' : '') + (err?.stack || err?.message || String(err))),
      exitCode: 1,
      durationMs,
      timestamp: new Date().toISOString(),
      engine: 'js-sandbox',
    };
  }
}

/**
 * Execute code on server runner (/api/run-code) with fallback to browser
 */
export async function runCodeServer(
  language: string,
  code: string,
  stdin: string = ''
): Promise<ExecutionResult> {
  const startTime = performance.now();
  try {
    const resp = await fetch('/api/run-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, code, stdin }),
    });

    if (resp.ok) {
      const data = await resp.json();
      return {
        stdout: data.stdout || '',
        stderr: data.stderr || '',
        exitCode: data.exitCode ?? 0,
        durationMs: data.durationMs ?? Math.round(performance.now() - startTime),
        timestamp: new Date().toISOString(),
        engine: 'server-native',
      };
    }
    
    const errData = await resp.json().catch(() => ({}));
    throw new Error(errData.error || `Server runner returned status ${resp.status}`);
  } catch (err: any) {
    console.warn('Server runner not available, using client-side execution:', err);
    if (language === 'python' || language === 'py') {
      return runPythonBrowser(code, stdin);
    } else {
      return runJavaScriptBrowser(code);
    }
  }
}

/**
 * Universal runner that picks the best engine
 */
export async function executeCode(
  language: SupportedLanguage | string,
  code: string,
  stdin: string = '',
  preferredEngine: 'auto' | 'browser' | 'server' = 'auto',
  onStatusUpdate?: (status: string) => void
): Promise<ExecutionResult> {
  const lang = (language || 'python').toLowerCase();

  if (lang === 'html') {
    return {
      stdout: 'HTML preview is rendered directly in the Live Preview tab.',
      stderr: '',
      exitCode: 0,
      durationMs: 5,
      timestamp: new Date().toISOString(),
      engine: 'html-preview',
    };
  }

  if (preferredEngine === 'server') {
    return runCodeServer(lang, code, stdin);
  }

  if (preferredEngine === 'browser') {
    if (lang === 'python') {
      return runPythonBrowser(code, stdin, onStatusUpdate);
    }
    return runJavaScriptBrowser(code);
  }

  if (lang === 'python') {
    try {
      return await runPythonBrowser(code, stdin, onStatusUpdate);
    } catch (err) {
      return await runCodeServer(lang, code, stdin);
    }
  }

  if (lang === 'javascript' || lang === 'typescript') {
    return runJavaScriptBrowser(code);
  }

  return runCodeServer(lang, code, stdin);
}

export function detectLanguageFromFilename(filename: string): SupportedLanguage {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'py':
    case 'python':
      return 'python';
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'html':
    case 'htm':
      return 'html';
    case 'json':
      return 'json';
    case 'c':
      return 'c';
    case 'cpp':
    case 'cc':
    case 'cxx':
      return 'cpp';
    case 'sh':
    case 'bash':
      return 'bash';
    default:
      return 'python';
  }
}

export const CODE_PRESETS: Record<string, { label: string; language: SupportedLanguage; code: string; stdin?: string }> = {
  python_stats: {
    label: 'Python: Statistics & Math',
    language: 'python',
    code: `# Python 3 Online Runner
import math
import statistics

data = [12, 45, 67, 89, 34, 23, 78, 90, 11, 44, 55, 68]

mean = statistics.mean(data)
median = statistics.median(data)
stdev = statistics.stdev(data)

print("=" * 40)
print("📊 DATA ANALYSIS SUMMARY")
print("=" * 40)
print(f"Sample items ({len(data)}): {data}")
print(f"Min value:     {min(data)}")
print(f"Max value:     {max(data)}")
print(f"Mean average:  {mean:.2f}")
print(f"Median value:  {median}")
print(f"Std Deviation: {stdev:.2f}")
print("=" * 40)
print("Computation successful!")
`,
  },
  python_fibonacci: {
    label: 'Python: Fibonacci & Prime Checker',
    language: 'python',
    code: `# Fibonacci generator and prime number validator
def is_prime(n):
    if n <= 1:
        return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True

def fibonacci(limit):
    a, b = 0, 1
    fib_list = []
    while a < limit:
        fib_list.append(a)
        a, b = b, a + b
    return fib_list

print("✨ Computing Fibonacci Sequence below 100:")
fibs = fibonacci(100)
for num in fibs:
    prime_tag = " [PRIME ⭐]" if is_prime(num) else ""
    print(f"  • {num:3d}{prime_tag}")

primes_count = sum(1 for x in fibs if is_prime(x))
print(f"\\nTotal Fibonacci numbers: {len(fibs)}")
print(f"Prime Fibonacci numbers: {primes_count}")
`,
  },
  js_algorithms: {
    label: 'JavaScript: Array Pipelines',
    language: 'javascript',
    code: `// Modern JavaScript Pipeline
const items = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  name: \`Task #\${i + 1}\`,
  score: Math.floor(Math.random() * 100),
  category: i % 2 === 0 ? 'Engineering' : 'Design'
}));

console.log("Original Item Count:", items.length);

const highScorers = items
  .filter(item => item.score >= 50)
  .sort((a, b) => b.score - a.score);

console.log("High Scoring Tasks (>= 50):");
highScorers.forEach(item => {
  console.log(\`  [\${item.category}] \${item.name} -> Score: \${item.score}\`);
});
`,
  },
};
