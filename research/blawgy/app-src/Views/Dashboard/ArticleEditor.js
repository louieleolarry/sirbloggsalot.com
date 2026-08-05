import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { XIcon, Tag, Loader2, ExternalLink } from 'lucide-react';
import RichTextEditor from '../../components/rich-text-editor/rich-text-editor.component';

// Word count over HTML: tags out, entities collapsed, whitespace split.
function countWords(html) {
  if (!html) return 0;
  const text = String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .trim();
  return text ? text.split(/\s+/).length : 0;
}

function shortDate(d) {
  if (!d) return null;
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return null;
  return t.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Whitespace-insensitive compare for the dirty check: Jodit normalizes markup
// on load, so a byte-exact compare would cry wolf on an untouched article.
const normalizeHtml = (s) => String(s || '').replace(/\s+/g, ' ').trim();

function statusMeta(article) {
  const s = article?.blogStatus;
  const date = shortDate(article?.publishDate);
  if (s === 'published') return { dot: 'bg-emerald-500', label: date ? `Published ${date}` : 'Published' };
  if (s === 'cms_draft') return { dot: 'bg-blue-500', label: 'Draft on your site' };
  if (s === 'failed') return { dot: 'bg-rose-500', label: 'Publish failed' };
  if (article?.publishDate && new Date(article.publishDate).getTime() > Date.now()) {
    return { dot: 'bg-slate-400', label: date ? `Publishes ${date}` : 'Scheduled' };
  }
  return { dot: 'bg-slate-400', label: 'Written' };
}

/**
 * Full-screen article editor. Replaces the old cramped EditArticleModal with a
 * document-style writing surface: editable title, quiet keyword line, a full
 * rich-text toolbar, and a header that says plainly what saving will do (live
 * post updated in place vs Blawgy copy only).
 *
 * State ownership stays with the Dashboard (title/keywords/content + save),
 * this component adds the shell: dirty tracking with a discard guard on
 * Esc/close, Cmd+S to save, live word count.
 *
 * `keywords` may arrive as a string (list rows) or an array (plan entries);
 * edits are emitted back in the same shape so the save payload matches what
 * the backend stored.
 */
const ArticleEditor = ({
  article,
  title,
  keywords,
  content,
  isLoading,
  isSaving,
  liveSync,          // bool: this site's platform updates the live post on save
  onTitleChange,
  onKeywordsChange,
  onContentChange,
  onSave,            // (overrides?: { title, keywords, blogContent }) => void
  onClose,
}) => {
  const editorRef = useRef(null);
  const titleRef = useRef(null);
  const keywordsWereArray = useRef(Array.isArray(keywords));
  const [kwText, setKwText] = useState(() =>
    Array.isArray(keywords) ? keywords.join(', ') : (keywords || '')
  );
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const wordCountTimer = useRef(null);

  const status = statusMeta(article);
  const isPublished = article?.blogStatus === 'published';

  // Snapshot the pristine document once the body has arrived, for dirty checks.
  const initialRef = useRef(null);
  useEffect(() => {
    if (!isLoading && initialRef.current === null) {
      initialRef.current = {
        title: title || '',
        kw: kwText,
        content: normalizeHtml(content),
      };
    }
    // Snapshot exactly once, when loading settles; later prop churn is edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  useEffect(() => {
    setWordCount(countWords(content));
  }, [content]);

  // Lock the page scroll behind the editor.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Auto-grow the title textarea. Also keyed on isLoading: the textarea only
  // mounts after the body fetch settles, and the title usually does not change
  // at that moment, so without it a multi-line title stays clipped at one row.
  useEffect(() => {
    const el = titleRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [title, isLoading]);

  const emitKeywords = (text) => {
    setKwText(text);
    onKeywordsChange(
      keywordsWereArray.current
        ? text.split(',').map((s) => s.trim()).filter(Boolean)
        : text
    );
  };

  const currentKeywords = () =>
    keywordsWereArray.current
      ? kwText.split(',').map((s) => s.trim()).filter(Boolean)
      : kwText;

  const isDirty = useCallback(() => {
    const init = initialRef.current;
    if (!init) return false;
    const live = editorRef.current?.getContent?.();
    const cur = normalizeHtml(typeof live === 'string' ? live : content);
    return (title || '') !== init.title || kwText !== init.kw || cur !== init.content;
  }, [title, kwText, content]);

  const doSave = useCallback(() => {
    if (isSaving || isLoading) return;
    // Committed content only syncs on editor blur; pull the live value so a
    // Cmd+S mid-typing never saves a stale body.
    const live = editorRef.current?.getContent?.();
    const overrides = { title, keywords: currentKeywords() };
    if (typeof live === 'string') {
      onContentChange(live);
      overrides.blogContent = live;
    }
    onSave(overrides);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSaving, isLoading, title, kwText, onContentChange, onSave]);

  const requestClose = useCallback(() => {
    if (isSaving) return;
    if (isDirty()) setConfirmDiscard(true);
    else onClose();
  }, [isSaving, isDirty, onClose]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        doSave();
      } else if (e.key === 'Escape') {
        if (confirmDiscard) { setConfirmDiscard(false); return; }
        requestClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [doSave, requestClose, confirmDiscard]);

  const handleLiveChange = useCallback((html) => {
    clearTimeout(wordCountTimer.current);
    wordCountTimer.current = setTimeout(() => setWordCount(countWords(html)), 400);
  }, []);
  useEffect(() => () => clearTimeout(wordCountTimer.current), []);

  const saveHint = useMemo(() => {
    if (!isPublished) return null;
    return liveSync
      ? 'Saving updates the live post on your site'
      : 'Saving updates your Blawgy copy. Use Republish to update your site';
  }, [isPublished, liveSync]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" data-testid="article-editor">
      {/* Header */}
      <div className="flex h-14 flex-shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={requestClose}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close editor"
            title="Close (Esc)"
          >
            <XIcon size={18} />
          </button>
          <div className="h-5 w-px bg-slate-200" />
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-slate-700" data-testid="editor-status">
            <span className={`h-2 w-2 flex-shrink-0 rounded-full ${status.dot}`} />
            {status.label}
          </span>
          {isPublished && article?.publishedUrl && (
            <a
              href={article.publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium text-primary hover:text-primary-hover"
            >
              View live <ExternalLink size={13} />
            </a>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-4">
          {saveHint && (
            <span className="hidden text-xs text-slate-400 lg:block" data-testid="editor-save-hint">{saveHint}</span>
          )}
          {!isLoading && (
            <span className="hidden text-xs tabular-nums text-slate-400 md:block">
              {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}
            </span>
          )}
          <button
            onClick={doSave}
            data-save-button
            disabled={isSaving || isLoading}
            title="Save (Cmd+S)"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Document */}
      <div className="flex min-h-0 flex-1 justify-center">
        <div className="flex w-full max-w-3xl min-w-0 flex-col px-5 sm:px-8">
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-slate-500">
              <Loader2 size={20} className="animate-spin" />
              Loading article…
            </div>
          ) : (
            <>
              <div className="flex-shrink-0 pt-8">
                <textarea
                  ref={titleRef}
                  rows={1}
                  value={title || ''}
                  onChange={(e) => onTitleChange(e.target.value.replace(/\n/g, ' '))}
                  placeholder="Untitled"
                  aria-label="Article title"
                  className="w-full resize-none border-0 bg-transparent text-2xl font-bold leading-tight text-slate-900 placeholder-slate-300 focus:outline-none sm:text-3xl"
                />
                <div className="mt-1 mb-4 flex items-center gap-1.5">
                  <Tag size={13} className="flex-shrink-0 text-slate-300" />
                  <input
                    value={kwText}
                    onChange={(e) => emitKeywords(e.target.value)}
                    placeholder="Keywords, comma separated"
                    aria-label="Keywords"
                    className="w-full border-0 bg-transparent text-sm text-slate-500 placeholder-slate-300 focus:outline-none"
                  />
                </div>
              </div>
              <RichTextEditor
                ref={editorRef}
                rawBody={content}
                handleChange={onContentChange}
                onLiveChange={handleLiveChange}
                fill
                toolbar="full"
              />
            </>
          )}
        </div>
      </div>

      {/* Discard guard */}
      {confirmDiscard && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/30" data-testid="discard-guard">
          <div className="w-80 rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <p className="text-sm font-semibold text-slate-900">Discard unsaved changes?</p>
            <p className="mt-1 text-sm text-slate-600">Your edits to this article will be lost.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDiscard(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Keep editing
              </button>
              <button
                onClick={onClose}
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleEditor;
