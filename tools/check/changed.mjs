// Shared helper for the checks: which files (and which lines) this change adds compared with main.
// "This change" = commits on the branch since it left main, plus uncommitted work. Set CHECK_BASE to
// compare against something else (e.g. CHECK_BASE=HEAD~1). With no main to compare against (a fresh
// clone with no history), every file counts as changed.
import { execFileSync } from 'node:child_process';

/** Read bounded Git output, including large generated sprite and animation diffs. */
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });

/** The commit this change started from, or null when there's nothing to compare against. */
export function baseRef() {
  const want = process.env.CHECK_BASE || 'origin/main';
  for (const ref of [want, 'main']) {
    try { return git('merge-base', 'HEAD', ref).trim(); } catch (e) { /* try the next */ }
  }
  return null;
}

/**
 * Files added or changed since the base, with the line numbers each change adds.
 * @returns {Map<string, Set<number>|null>} path -> added line numbers (null = the whole file is new)
 */
export function changedLines() {
  const base = baseRef(), out = new Map();
  if (!base) {
    for (const f of git('ls-files').split('\n').filter(Boolean)) out.set(f, null);
    return out;
  }
  for (const f of git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean)) out.set(f, null);
  let file = null;
  for (const line of git('diff', '-U0', '--no-color', '--diff-filter=AM', base, '--').split('\n')) {
    if (line.startsWith('+++ ')) { file = line.slice(4) === '/dev/null' ? null : line.slice(6); if (file && !out.has(file)) out.set(file, new Set()); continue; }
    const m = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (m && file && out.get(file)) { const start = +m[1], n = m[2] === undefined ? 1 : +m[2]; for (let i = 0; i < n; i++) out.get(file).add(start + i); }
  }
  // binary files (images, audio) have no line diff above, so take the file list from git itself
  for (const f of git('diff', '--name-only', '--diff-filter=M', base, '--').split('\n').filter(Boolean)) if (!out.has(f)) out.set(f, new Set());
  for (const f of git('diff', '--name-only', '--diff-filter=A', base, '--').split('\n').filter(Boolean)) out.set(f, null);
  return out;
}

/** Did this change add the given line of the file (or the whole file)? */
export function isAdded(changes, file, line) {
  if (!changes.has(file)) return false;
  const lines = changes.get(file);
  return lines === null || lines.has(line);
}
