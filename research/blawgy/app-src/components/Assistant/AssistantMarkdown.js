import React from 'react';
import ReactMarkdown from 'react-markdown';

/**
 * Renders assistant prose as markdown.
 *
 * The model writes bold, lists and links naturally, and showing the raw
 * asterisks makes the panel look broken. react-markdown is already a
 * dependency (ApiDocs uses it) and does NOT use dangerouslySetInnerHTML, so
 * model output cannot inject HTML.
 *
 * Elements are styled explicitly rather than relying on prose classes, because
 * default markdown margins are far too large inside a narrow chat column.
 */

const components = {
  p: ({ children }) => <p className="mb-2 last:mb-0 text-sm leading-relaxed text-gray-800">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,

  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="text-sm leading-relaxed text-gray-800">{children}</li>,

  h1: ({ children }) => <h4 className="mb-1 mt-2 text-sm font-semibold text-gray-900">{children}</h4>,
  h2: ({ children }) => <h4 className="mb-1 mt-2 text-sm font-semibold text-gray-900">{children}</h4>,
  h3: ({ children }) => <h4 className="mb-1 mt-2 text-sm font-semibold text-gray-900">{children}</h4>,

  code: ({ inline, children }) => (inline
    ? <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] text-gray-800">{children}</code>
    : <code className="block overflow-x-auto rounded bg-gray-100 p-2 font-mono text-[11px] text-gray-800">{children}</code>),
  pre: ({ children }) => <pre className="mb-2 overflow-x-auto last:mb-0">{children}</pre>,

  // Model-supplied links open in a new tab and cannot become a reverse-tabnabbing
  // vector.
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
      {children}
    </a>
  ),

  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-gray-200 pl-2 text-sm text-gray-600">{children}</blockquote>
  ),
  hr: () => <hr className="my-2 border-gray-100" />,

  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto">
      <table className="w-full text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b border-gray-200 px-1.5 py-1 text-left font-medium">{children}</th>,
  td: ({ children }) => <td className="border-b border-gray-50 px-1.5 py-1">{children}</td>,
};

export default function AssistantMarkdown({ text }) {
  if (!text) return null;
  return (
    <div className="assistant-markdown">
      <ReactMarkdown components={components}>{text}</ReactMarkdown>
    </div>
  );
}
