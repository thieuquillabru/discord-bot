const https = require('https');
const fs = require('fs');

// ── Config from environment variables ─────────────────────────────
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPO  = process.env.GITHUB_REPO  || 'thieuquillabru/discord-bot';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

let _pending = null;
let _timer   = null;
const DEBOUNCE_MS = 4000;

// ── Low-level GitHub API request (native https, no deps) ─────────
function _request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const opts = {
      hostname: 'api.github.com',
      path: urlPath,
      method,
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'gamer-mg-bot-sync',
        'Accept': 'application/vnd.github.v3+json',
        ...(payload ? { 'Content-Type': 'application/json' } : {}),
      },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Get current file SHA from GitHub (needed for updates) ────────
async function _getFileSha(repoPath) {
  const { status, data } = await _request(
    'GET',
    `/repos/${GITHUB_REPO}/contents/${repoPath}?ref=${GITHUB_BRANCH}`,
  );
  if (status === 200 && data?.sha) return data.sha;
  if (status === 404) return null;               // file doesn't exist yet
  throw new Error(`GitHub API ${status}: ${JSON.stringify(data)}`);
}

// ── Core: push file content to GitHub ─────────────────────────────
async function pushToGitHub(localFilePath, repoPath, commitMsg) {
  if (!GITHUB_TOKEN) {
    console.log('[GITHUB_SYNC] GITHUB_TOKEN non configuré, sync désactivée');
    return false;
  }

  try {
    const content = fs.readFileSync(localFilePath, 'utf8');
    const sha = await _getFileSha(repoPath);

    const body = {
      message: commitMsg,
      content: Buffer.from(content).toString('base64'),
      branch: GITHUB_BRANCH,
    };
    if (sha) body.sha = sha;   // omit sha to create new file

    const { status, data } = await _request(
      'PUT',
      `/repos/${GITHUB_REPO}/contents/${repoPath}`,
      body,
    );

    if (status === 200 || status === 201) {
      const sha7 = data?.commit?.sha?.slice(0, 7) || '?';
      console.log(`[GITHUB_SYNC] ✓ ${repoPath} → ${sha7}`);
      return true;
    }
    console.error('[GITHUB_SYNC] Échec:', status, JSON.stringify(data));
    return false;
  } catch (err) {
    console.error('[GITHUB_SYNC] Erreur:', err.message);
    return false;
  }
}

// ── Debounced sync: coalesces rapid changes into one push ────────
function scheduleSync(localFilePath, repoPath, commitMsg) {
  _pending = { localFilePath, repoPath, commitMsg };
  if (_timer) return;
  _timer = setTimeout(() => {
    _timer = null;
    const task = _pending;
    _pending = null;
    if (task) pushToGitHub(task.localFilePath, task.repoPath, task.commitMsg);
  }, DEBOUNCE_MS);
}

// ── Immediate sync (for shutdown) ─────────────────────────────────
async function flushSync(localFilePath, repoPath, commitMsg) {
  if (_timer) { clearTimeout(_timer); _timer = null; }
  _pending = null;
  return pushToGitHub(localFilePath, repoPath, commitMsg);
}

module.exports = { pushToGitHub, scheduleSync, flushSync };
