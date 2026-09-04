import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Persistence file location
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'teamhub_data.json');

interface PostRecord {
  id: string;
  created_at: string;
  title: string;
  url: string;
  type: string;
  description: string;
  image_url: string | null;
  tags: string[];
  user_id: string;
  user_email: string;
  user_name: string;
  views_count: number;
  avg_rating: number;
  ratings_count: number;
  code_snippet?: string;
  code_language?: string;
  file_name?: string;
}

interface RatingRecord {
  id: string;
  post_id: string;
  user_id: string;
  rating: number;
  created_at: string;
}

interface StoredData {
  posts: PostRecord[];
  ratings: RatingRecord[];
  views: Record<string, number>;
}

// Initial state
let database: StoredData = {
  posts: [],
  ratings: [],
  views: {},
};

// Ensure data directory exists & load data
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.posts)) {
      database = parsed;
    }
  }
} catch (e) {
  console.warn('Could not read persistent data file, initialized with in-memory DB:', e);
}

function persistData() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(database, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to write to persistent data file:', e);
  }
}

// Helper: recalculate ratings
function recalculateRatingForPost(postId: string) {
  const postRatings = database.ratings.filter(r => r.post_id === postId);
  const count = postRatings.length;
  const avg = count > 0 
    ? Number((postRatings.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1))
    : 0;

  const postIndex = database.posts.findIndex(p => p.id === postId);
  if (postIndex !== -1) {
    database.posts[postIndex].avg_rating = avg;
    database.posts[postIndex].ratings_count = count;
  }
  return { avg, count };
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', postsCount: database.posts.length });
});

// RUN CODE ONLINE (Python / Node server sandbox execution)
app.post('/api/run-code', async (req, res) => {
  try {
    const { language, code, stdin } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Code content is required' });
    }

    if (code.length > 80000) {
      return res.status(400).json({ error: 'Code size limit exceeded (max 80KB)' });
    }

    const lang = (language || 'python').toLowerCase();
    const startTime = Date.now();

    if (lang === 'python' || lang === 'py') {
      const { spawn } = await import('child_process');
      const pyProcess = spawn('python3', ['-u', '-c', code]);

      let stdout = '';
      let stderr = '';
      let isTimedOut = false;

      const timeoutId = setTimeout(() => {
        isTimedOut = true;
        try { pyProcess.kill('SIGKILL'); } catch {}
      }, 8000);

      if (stdin && typeof stdin === 'string') {
        pyProcess.stdin.write(stdin);
        pyProcess.stdin.end();
      } else {
        pyProcess.stdin.end();
      }

      pyProcess.stdout.on('data', (data) => {
        if (stdout.length < 50000) stdout += data.toString();
      });

      pyProcess.stderr.on('data', (data) => {
        if (stderr.length < 50000) stderr += data.toString();
      });

      pyProcess.on('close', (exitCode) => {
        clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;
        if (isTimedOut) {
          return res.json({
            success: false,
            stdout,
            stderr: (stderr ? stderr + '\n' : '') + 'Execution timed out after 8 seconds.',
            exitCode: 124,
            durationMs,
            engine: 'server-native',
          });
        }
        res.json({
          success: exitCode === 0,
          stdout,
          stderr,
          exitCode: exitCode ?? 0,
          durationMs,
          engine: 'server-native',
        });
      });

      pyProcess.on('error', (err) => {
        clearTimeout(timeoutId);
        res.status(500).json({
          error: 'Failed to launch Python engine: ' + err.message,
          engine: 'server-native',
        });
      });
    } else if (lang === 'javascript' || lang === 'js' || lang === 'node') {
      const { spawn } = await import('child_process');
      const nodeProcess = spawn('node', ['-e', code]);

      let stdout = '';
      let stderr = '';
      let isTimedOut = false;

      const timeoutId = setTimeout(() => {
        isTimedOut = true;
        try { nodeProcess.kill('SIGKILL'); } catch {}
      }, 8000);

      if (stdin && typeof stdin === 'string') {
        nodeProcess.stdin.write(stdin);
        nodeProcess.stdin.end();
      } else {
        nodeProcess.stdin.end();
      }

      nodeProcess.stdout.on('data', (data) => {
        if (stdout.length < 50000) stdout += data.toString();
      });

      nodeProcess.stderr.on('data', (data) => {
        if (stderr.length < 50000) stderr += data.toString();
      });

      nodeProcess.on('close', (exitCode) => {
        clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;
        if (isTimedOut) {
          return res.json({
            success: false,
            stdout,
            stderr: (stderr ? stderr + '\n' : '') + 'Execution timed out after 8 seconds.',
            exitCode: 124,
            durationMs,
            engine: 'server-native',
          });
        }
        res.json({
          success: exitCode === 0,
          stdout,
          stderr,
          exitCode: exitCode ?? 0,
          durationMs,
          engine: 'server-native',
        });
      });

      nodeProcess.on('error', (err) => {
        clearTimeout(timeoutId);
        res.status(500).json({
          error: 'Failed to launch Node engine: ' + err.message,
          engine: 'server-native',
        });
      });
    } else {
      res.status(400).json({ error: `Language '${lang}' not supported on server. Use client-side execution.` });
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Execution failed' });
  }
});

// GET all posts
app.get('/api/posts', (req, res) => {
  const currentUserId = req.query.userId as string | undefined;
  
  const postsWithUserRating = database.posts.map(post => {
    let userRating = null;
    if (currentUserId) {
      const userRat = database.ratings.find(r => r.post_id === post.id && r.user_id === currentUserId);
      if (userRat) {
        userRating = userRat.rating;
      }
    }
    return {
      ...post,
      user_rating: userRating,
    };
  });

  // Sort descending by creation date
  postsWithUserRating.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json({
    success: true,
    posts: postsWithUserRating,
  });
});

// CREATE new post
app.post('/api/posts', (req, res) => {
  try {
    const { title, url, type, description, image_url, tags, user_id, user_email, user_name, code_snippet, code_language, file_name } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const newPost: PostRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : `post-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
      title: String(title).trim(),
      url: url ? String(url).trim() : (type === 'code' ? `#code-${Date.now()}` : 'https://teamhub.internal'),
      type: type || 'project',
      description: description ? String(description).trim() : '',
      image_url: image_url || null,
      tags: Array.isArray(tags) ? tags : ['General'],
      user_id: user_id || 'admin-user',
      user_email: user_email || 'admin@gmail.com',
      user_name: user_name || 'Admin',
      views_count: 0,
      avg_rating: 0,
      ratings_count: 0,
      code_snippet: code_snippet || undefined,
      code_language: code_language || undefined,
      file_name: file_name || undefined,
    };

    // Prepend to posts list
    database.posts.unshift(newPost);
    persistData();

    res.status(201).json({
      success: true,
      post: newPost,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to create post' });
  }
});

// SYNC multiple posts (e.g. from local client cache)
app.post('/api/posts/sync', (req, res) => {
  try {
    const { posts } = req.body;
    if (Array.isArray(posts)) {
      let added = 0;
      for (const p of posts) {
        if (!database.posts.some(existing => existing.id === p.id || (existing.title === p.title && existing.url === p.url))) {
          database.posts.unshift({
            id: p.id || (crypto.randomUUID ? crypto.randomUUID() : `sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
            created_at: p.created_at || new Date().toISOString(),
            title: p.title,
            url: p.url,
            type: p.type || 'project',
            description: p.description || '',
            image_url: p.image_url || null,
            tags: Array.isArray(p.tags) ? p.tags : ['General'],
            user_id: p.user_id || 'anonymous',
            user_email: p.user_email || 'admin@gmail.com',
            user_name: p.user_name || 'Team Member',
            views_count: p.views_count || 0,
            avg_rating: p.avg_rating || 0,
            ratings_count: p.ratings_count || 0,
          });
          added++;
        }
      }
      if (added > 0) {
        persistData();
      }
    }
    res.json({ success: true, count: database.posts.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Sync failed' });
  }
});

// DELETE post
app.delete('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  const initialLength = database.posts.length;
  database.posts = database.posts.filter(p => p.id !== id);
  database.ratings = database.ratings.filter(r => r.post_id !== id);

  if (database.posts.length !== initialLength) {
    persistData();
    res.json({ success: true, message: 'Post deleted' });
  } else {
    res.status(404).json({ error: 'Post not found' });
  }
});

// RATE post
app.post('/api/posts/:id/rate', (req, res) => {
  const { id } = req.params;
  const { user_id, rating } = req.body;

  if (!user_id || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Invalid rating parameters' });
  }

  const post = database.posts.find(p => p.id === id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  // Check if existing rating by this user
  const existingIndex = database.ratings.findIndex(r => r.post_id === id && r.user_id === user_id);
  if (existingIndex !== -1) {
    database.ratings[existingIndex].rating = rating;
  } else {
    database.ratings.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `rating-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      post_id: id,
      user_id,
      rating,
      created_at: new Date().toISOString(),
    });
  }

  const { avg, count } = recalculateRatingForPost(id);
  persistData();

  res.json({
    success: true,
    post: {
      ...post,
      avg_rating: avg,
      ratings_count: count,
      user_rating: rating,
    },
  });
});

// INCREMENT view count
app.post('/api/posts/:id/view', (req, res) => {
  const { id } = req.params;
  const post = database.posts.find(p => p.id === id);
  
  if (post) {
    post.views_count = (post.views_count || 0) + 1;
    persistData();
    return res.json({ success: true, views_count: post.views_count });
  }
  res.status(404).json({ error: 'Post not found' });
});

// GET post ratings analytics
app.get('/api/posts/:id/ratings', (req, res) => {
  const { id } = req.params;
  const post = database.posts.find(p => p.id === id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const ratings = database.ratings.filter(r => r.post_id === id);
  const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratings.forEach(r => {
    if (breakdown[r.rating] !== undefined) {
      breakdown[r.rating]++;
    }
  });

  res.json({
    success: true,
    total: ratings.length,
    average: post.avg_rating,
    breakdown,
    views_count: post.views_count,
  });
});

// ----------------------------------------------------
// VITE & STATIC SERVING SETUP
// ----------------------------------------------------
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TeamHub Server active and listening on http://0.0.0.0:${PORT}`);
  });
}

start();
