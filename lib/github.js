import { GITHUB_API } from './constants.js';

/**
 * Fetch repo info from GitHub API.
 */
export async function getRepoInfo(repo) {
  const res = await fetch(`${GITHUB_API}/repos/${repo}`, {
    headers: ghHeaders()
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error(`Repository not found: ${repo}`);
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Check if a file exists at the repo root.
 */
export async function getFileContent(repo, path, ref = 'HEAD') {
  const res = await fetch(`${GITHUB_API}/repos/${repo}/contents/${path}`, {
    headers: ghHeaders()
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.encoding === 'base64' && data.content) {
    return Buffer.from(data.content, 'base64').toString('utf8');
  }
  return null;
}

/**
 * Get the default branch and latest commit SHA.
 */
export async function getDefaultBranchInfo(repo) {
  const info = await getRepoInfo(repo);
  return {
    branch: info.default_branch,
    fullName: info.full_name
  };
}

/**
 * Download repo tarball and return the buffer.
 */
export async function downloadTarball(repo, ref = 'HEAD') {
  const url = `${GITHUB_API}/repos/${repo}/tarball/${ref}`;
  const res = await fetch(url, {
    headers: ghHeaders(),
    redirect: 'follow'
  });
  if (!res.ok) {
    throw new Error(`Failed to download tarball: ${res.status} ${res.statusText}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Get latest commit SHA for a ref.
 */
export async function getLatestSha(repo, ref = 'HEAD') {
  const res = await fetch(`${GITHUB_API}/repos/${repo}/commits/${ref}`, {
    headers: ghHeaders()
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.sha;
}

function ghHeaders() {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'bananahub-cli/0.1.0'
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}
