/**
 * Line diff for the Updates review surface: article HTML in, GitHub-style
 * hunks out. No dependencies (CRA), pure functions, safe on garbage input.
 *
 * Pipeline: htmlToBlocks() turns HTML into readable one-line blocks (headings
 * prefixed, list items bulleted), diffBlocks() runs a classic LCS diff, and
 * buildHunks() groups the result for rendering, collapsing long unchanged
 * runs behind a "N unchanged lines" row with context kept on both sides.
 */

/** Block-level HTML -> array of readable text lines. */
export function htmlToBlocks(html) {
  const raw = String(html || '').trim();
  if (!raw) return [];

  let doc = null;
  try {
    doc = new DOMParser().parseFromString(raw, 'text/html');
  } catch (err) {
    doc = null;
  }
  if (!doc || !doc.body) {
    // Fallback: strip tags, one line per closing block tag.
    return raw
      .replace(/<\/(p|h[1-6]|li|div|blockquote|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .split('\n')
      .map((l) => l.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }

  const lines = [];
  const pushText = (prefix, el) => {
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (text) lines.push(prefix ? `${prefix} ${text}` : text);
  };

  const walk = (node) => {
    for (const el of Array.from(node.children || [])) {
      const tag = el.tagName ? el.tagName.toLowerCase() : '';
      if (/^h[1-6]$/.test(tag)) {
        pushText(`${tag.toUpperCase()} ·`, el);
      } else if (tag === 'p' || tag === 'blockquote' || tag === 'pre') {
        pushText('', el);
      } else if (tag === 'li') {
        pushText('•', el);
      } else if (tag === 'ul' || tag === 'ol') {
        walk(el);
      } else if (tag === 'table') {
        pushText('[table]', el);
      } else if (tag === 'script') {
        lines.push('[interactive tool script]');
      } else if (el.children && el.children.length) {
        walk(el);
      } else {
        pushText('', el);
      }
    }
  };
  walk(doc.body);
  if (!lines.length) {
    // Bare text with no block tags: one line.
    const text = (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
    if (text) lines.push(text);
  }
  return lines;
}

/**
 * LCS diff over two arrays of lines.
 * Returns ops: [{ type: 'same' | 'add' | 'del', line }]
 */
export function diffBlocks(before, after) {
  const a = Array.isArray(before) ? before : [];
  const b = Array.isArray(after) ? after : [];
  const n = a.length;
  const m = b.length;

  // DP table of LCS lengths. Guard against pathological sizes.
  if (n * m > 4_000_000) {
    // Too big to diff comfortably; degrade to whole-swap.
    return [
      ...a.map((line) => ({ type: 'del', line })),
      ...b.map((line) => ({ type: 'add', line })),
    ];
  }

  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: 'same', line: a[i] });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: 'del', line: a[i] });
      i++;
    } else {
      ops.push({ type: 'add', line: b[j] });
      j++;
    }
  }
  while (i < n) { ops.push({ type: 'del', line: a[i] }); i++; }
  while (j < m) { ops.push({ type: 'add', line: b[j] }); j++; }
  return ops;
}

/**
 * Group diff ops for rendering. Unchanged runs longer than
 * (2 * context + collapseThreshold) collapse to { type: 'collapsed', count },
 * keeping `context` lines visible on each side.
 */
export function buildHunks(ops, { context = 2, collapseThreshold = 4 } = {}) {
  const out = [];
  let sameRun = [];

  const flushSame = (isEnd) => {
    if (!sameRun.length) return;
    const limit = context * 2 + collapseThreshold;
    if (sameRun.length > limit) {
      const head = out.length === 0 ? [] : sameRun.slice(0, context);
      const tail = isEnd ? [] : sameRun.slice(sameRun.length - context);
      const hidden = sameRun.length - head.length - tail.length;
      head.forEach((line) => out.push({ type: 'same', line }));
      out.push({ type: 'collapsed', count: hidden, lines: sameRun.slice(head.length, sameRun.length - tail.length) });
      tail.forEach((line) => out.push({ type: 'same', line }));
    } else {
      sameRun.forEach((line) => out.push({ type: 'same', line }));
    }
    sameRun = [];
  };

  for (const op of ops) {
    if (op.type === 'same') {
      sameRun.push(op.line);
    } else {
      flushSame(false);
      out.push(op);
    }
  }
  flushSame(true);
  return out;
}

/** One call for the review surface: HTML before/after -> renderable hunks + counts. */
export function diffHtml(beforeHtml, afterHtml, opts = {}) {
  const ops = diffBlocks(htmlToBlocks(beforeHtml), htmlToBlocks(afterHtml));
  const added = ops.filter((o) => o.type === 'add').length;
  const removed = ops.filter((o) => o.type === 'del').length;
  return { hunks: buildHunks(ops, opts), added, removed };
}
