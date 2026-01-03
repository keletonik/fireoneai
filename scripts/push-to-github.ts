import { getUncachableGitHubClient } from '../server/lib/github';
import * as fs from 'fs';
import * as path from 'path';

const REPO_OWNER = 'keletonik';
const REPO_NAME = 'fireoneai';
const BRANCH = 'main';

async function getAllFiles(dir: string, baseDir: string = dir): Promise<{ path: string; content: string }[]> {
  const files: { path: string; content: string }[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  const ignoreDirs = ['node_modules', '.git', '.cache', 'dist', '.expo', '.replit'];
  const ignoreFiles = ['.DS_Store', 'package-lock.json'];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (ignoreDirs.includes(entry.name)) continue;
    if (ignoreFiles.includes(entry.name)) continue;

    if (entry.isDirectory()) {
      const subFiles = await getAllFiles(fullPath, baseDir);
      files.push(...subFiles);
    } else {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        files.push({ path: relativePath, content });
      } catch (e) {
        console.log(`Skipping binary file: ${relativePath}`);
      }
    }
  }

  return files;
}

async function pushToGitHub() {
  console.log('Getting GitHub client...');
  const octokit = await getUncachableGitHubClient();

  console.log('Getting current user...');
  const { data: user } = await octokit.users.getAuthenticated();
  console.log(`Authenticated as: ${user.login}`);

  console.log(`Checking if repo ${REPO_OWNER}/${REPO_NAME} exists...`);
  try {
    await octokit.repos.get({ owner: REPO_OWNER, repo: REPO_NAME });
    console.log('Repository exists!');
  } catch (e: any) {
    if (e.status === 404) {
      console.log('Repository not found. Creating...');
      await octokit.repos.createForAuthenticatedUser({
        name: REPO_NAME,
        private: true,
        auto_init: true,
      });
      console.log('Repository created!');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      throw e;
    }
  }

  console.log('Getting all files...');
  const files = await getAllFiles('/home/runner/workspace');
  console.log(`Found ${files.length} files to push`);

  console.log('Getting current commit SHA...');
  let baseSha: string | null = null;
  let baseTreeSha: string | null = null;
  
  try {
    const { data: ref } = await octokit.git.getRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `heads/${BRANCH}`,
    });
    baseSha = ref.object.sha;
    
    const { data: commit } = await octokit.git.getCommit({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      commit_sha: baseSha,
    });
    baseTreeSha = commit.tree.sha;
    console.log(`Base commit: ${baseSha}`);
  } catch (e: any) {
    if (e.status === 404) {
      console.log('No existing commits, will create initial commit');
    } else {
      throw e;
    }
  }

  console.log('Creating blobs for files...');
  const treeItems: any[] = [];
  
  for (const file of files) {
    try {
      const { data: blob } = await octokit.git.createBlob({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        content: Buffer.from(file.content).toString('base64'),
        encoding: 'base64',
      });
      
      treeItems.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      });
    } catch (e) {
      console.log(`Failed to create blob for ${file.path}`);
    }
  }

  console.log(`Created ${treeItems.length} blobs`);

  console.log('Creating tree...');
  const { data: tree } = await octokit.git.createTree({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    tree: treeItems,
    base_tree: baseTreeSha || undefined,
  });

  console.log('Creating commit...');
  const { data: commit } = await octokit.git.createCommit({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    message: 'FyreOne AI - UI fixes and custom Toggle component\n\n- Replace native Switch with custom Toggle for consistent orange branding\n- Fix New Project modal focus/keyboard issues\n- Add KeyboardAvoidingView for proper modal behavior',
    tree: tree.sha,
    parents: baseSha ? [baseSha] : [],
  });

  console.log('Updating branch reference...');
  try {
    await octokit.git.updateRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `heads/${BRANCH}`,
      sha: commit.sha,
      force: true,
    });
  } catch (e: any) {
    if (e.status === 422) {
      await octokit.git.createRef({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        ref: `refs/heads/${BRANCH}`,
        sha: commit.sha,
      });
    } else {
      throw e;
    }
  }

  console.log(`\nSuccess! Code pushed to https://github.com/${REPO_OWNER}/${REPO_NAME}`);
}

pushToGitHub().catch(console.error);
