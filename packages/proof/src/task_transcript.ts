import { readFileSync } from 'node:fs';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/** File name suffix for mirrored raw assistant stream under the artifact dir. */
export function taskStreamArtifactRelPath(taskId: string): string {
  return `${taskId}.stream.txt`;
}

interface StreamMirrorState {
  absPath: string;
  pendingBuf: string;
  flushing: Promise<void>;
}

/**
 * In-memory authoritative assistant transcript per task, with optional best-effort
 * append-only `.stream.txt` mirror when artifacts are enabled.
 */
export class TaskTranscriptStore {
  private readonly text = new Map<string, string>();
  private readonly streamPaths = new Map<string, string>();
  private mirrors = new Map<string, StreamMirrorState>();
  /** When false, omit mirror writes entirely (logged once per task via callback). */

  mirrorEnabledForTask(taskId: string): boolean {
    return this.mirrors.has(taskId);
  }

  resetTask(taskId: string): void {
    this.text.set(taskId, '');
  }

  /**
   * Registers a mirrored stream path and truncates/creates it. Absolute path.
   */
  async beginMirroredAppend(
    taskId: string,
    artifactAbsoluteDir: string,
    logMirrorError?: (taskId: string, message: string) => void
  ): Promise<void> {
    const absPath = join(
      artifactAbsoluteDir,
      taskStreamArtifactRelPath(taskId)
    );
    this.streamPaths.set(taskId, absPath);
    this.mirrors.set(taskId, {
      absPath,
      pendingBuf: '',
      flushing: Promise.resolve(),
    });
    try {
      await mkdir(dirname(absPath), { recursive: true });
      await writeFile(absPath, '', 'utf8');
    } catch (e) {
      this.mirrors.delete(taskId);
      const msg = e instanceof Error ? e.message : String(e);
      logMirrorError?.(
        taskId,
        `[proof] stream mirror init failed for ${taskId}: ${msg}`
      );
    }
  }

  registerExistingMirror(
    taskId: string,
    artifactAbsoluteDir: string,
    relativePath: string
  ): void {
    this.streamPaths.set(taskId, join(artifactAbsoluteDir, relativePath));
  }

  append(taskId: string, chunk: string): void {
    if (!chunk) return;
    const cur = this.text.get(taskId) ?? '';
    this.text.set(taskId, cur + chunk);
    const m = this.mirrors.get(taskId);
    if (m) {
      m.pendingBuf += chunk;
    }
  }

  /**
   * Flush pending mirrored bytes best-effort. Coalesced to match canvas publish throttle.
   */
  async flushStreamMirror(
    taskId: string,
    logMirrorError?: (taskId: string, message: string) => void
  ): Promise<void> {
    const m = this.mirrors.get(taskId);
    if (!m) return;
    if (m.pendingBuf.length === 0) {
      await m.flushing;
      return;
    }
    const payload = m.pendingBuf;
    m.pendingBuf = '';
    m.flushing = m.flushing.then(async () => {
      try {
        await appendFile(m.absPath, payload, 'utf8');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logMirrorError?.(
          taskId,
          `[proof] stream mirror append failed for ${taskId}: ${msg}`
        );
      }
    });
    await m.flushing;
  }

  finalizeTaskMirrorsDone(taskId: string): void {
    this.mirrors.delete(taskId);
  }

  get(taskId: string): string | undefined {
    const v = this.text.get(taskId);
    if (v !== undefined && v !== '') return v;
    const path = this.streamPaths.get(taskId);
    if (!path) return v;
    try {
      const diskText = readFileSync(path, 'utf8');
      this.text.set(taskId, diskText);
      return diskText;
    } catch {
      return v;
    }
  }

  /** Non-optional concatenation helper — empty string when missing. */
  getJoined(taskId: string): string {
    return this.get(taskId) ?? '';
  }

  clearAll(): void {
    this.text.clear();
    this.streamPaths.clear();
    this.mirrors.clear();
  }
}
