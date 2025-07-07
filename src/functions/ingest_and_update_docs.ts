import { GSContext, GSStatus } from '@godspeedsystems/core';
import { ingestChangedFiles, loadRepoUrl } from '../helper/ingestGithubRepo';
import fs from 'fs';
import path from 'path';
import { ChromaClient } from 'chromadb';

// --- Configuration Constants ---
const LAST_SYNC_FILE = path.resolve(__dirname, '../../data/last_sync_time.json');
const LOCK_FILE = path.resolve(__dirname, '../../data/sync.lock');
// The lock is considered "expired" or "stale" if it's older than this value (20 minutes in ms).
const LOCK_TIMEOUT_MS = 20 * 60 * 1000; 
// The time to wait before re-syncing (20 minutes in ms).
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;


// --- ChromaDB Helper ---

/**
 * Checks if the ChromaDB server is available by sending a heartbeat request.
 */
async function isChromaDbAvailable(ctx: GSContext): Promise<boolean> {
  try {
    const client = new ChromaClient({ host: "localhost", port: 10947, ssl: false });
    await client.heartbeat();
    ctx.logger.info('ChromaDB connection check successful.');
    return true;
  } catch (err: any) {
    ctx.logger.warn(
      'ChromaDB is not available, skipping sync. Please ensure the ChromaDB service is running.',
      { errorMessage: err.message }
    );
    return false;
  }
}

// --- Lock Management Helpers ---

/**
 * Checks if a sync is in progress.
 * THIS FUNCTION INCLUDES THE LOCK EXPIRATION LOGIC.
 */
function isSyncInProgress(ctx: GSContext): boolean {
  if (!fs.existsSync(LOCK_FILE)) {
    return false; // No lock file, so no sync is in progress.
  }

  try {
    const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8'));
    const { startTime } = lockData;

    if (typeof startTime !== 'number') {
        throw new Error('Invalid lock file format: startTime is missing or not a number.');
    }

    const lockAge = Date.now() - startTime;

    // **THIS IS THE LOCK EXPIRATION LOGIC**
    // If the lock is older than the timeout, we assume the previous process crashed.
    if (lockAge > LOCK_TIMEOUT_MS) {
      ctx.logger.warn(`Found an expired lock file (age: ${Math.round(lockAge / 1000)}s). Removing it.`);
      removeLock();
      return false; // The expired lock is gone, so a new sync can start.
    }

    // Lock exists and is not expired, so a sync is genuinely in progress.
    return true;
  } catch (err) {
    // If the lock file is corrupted, it's safer to remove it.
    ctx.logger.warn('Found a corrupted lock file. Assuming it is stale and removing.', err);
    removeLock();
    return false;
  }
}

/**
 * Creates a lock file containing the process ID and a start timestamp.
 */
function createLock(): void {
  const lockData = {
    pid: process.pid,
    startTime: Date.now()
  };
  fs.writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2));
}

/**
 * Removes the lock file.
 */
function removeLock(): void {
  if (fs.existsSync(LOCK_FILE)) {
    fs.unlinkSync(LOCK_FILE);
  }
}

// --- Last Sync Time Helpers ---

async function getLastSyncTime() {
  if (fs.existsSync(LAST_SYNC_FILE)) {
    const content = fs.readFileSync(LAST_SYNC_FILE, 'utf-8');
    try {
        const data = JSON.parse(content) as { timestamp: number };
        return data.timestamp;
    } catch {
        return null; // Handle corrupted JSON file
    }
  }
  return null;
}

async function updateLastSyncTime(): Promise<void> {
  fs.writeFileSync(LAST_SYNC_FILE, JSON.stringify({ timestamp: Date.now() }));
}


// --- Main Sync Workflow ---

export default async function (ctx: GSContext): Promise<GSStatus> {
  // Check 1: Prevent concurrent runs and handle expired locks.
  if (isSyncInProgress(ctx)) {
    ctx.logger.info('Sync already in progress, skipping...');
    return new GSStatus(true, 200, undefined, 'Sync already in progress');
  }

  // Check 2: Ensure the backend vector database is available.
  if (!(await isChromaDbAvailable(ctx))) {
    return new GSStatus(true, 200, undefined, 'ChromaDB not available, sync skipped');
  }

  // Check 3: Avoid syncing too frequently.
  const now = Date.now();
  const last = await getLastSyncTime();
  if (last !== null && (now - last < SYNC_INTERVAL_MS)) {
    ctx.logger.info('Skipping sync: already synced within the last 24 hours.');
    return new GSStatus(true, 200, undefined, 'No sync needed');
  }

  // All checks passed. Let's create a lock and start the sync.
  createLock();
  try {
    const repo = await loadRepoUrl();
    if (!repo?.repo_url) {
      return new GSStatus(false, 400, undefined, 'No repo configured');
    }

    ctx.logger.info(last === null ? 'First-time sync...' : 'Syncing updated documentation...');
    
    // The main, heavy-lifting operation.
    await ingestChangedFiles(repo.repo_url, repo.branch || 'main');
    
    await updateLastSyncTime();

    ctx.logger.info('Sync successful.');
    return new GSStatus(true, 200, undefined, 'Sync successful');
  } catch (err) {
    ctx.logger.error('Sync failed during execution:', err);
    return new GSStatus(false, 500, undefined, 'Sync failed');
  } finally {
    // CRITICAL: Always remove the lock when the process is done,
    // whether it succeeded or failed.
    removeLock();
  }
}