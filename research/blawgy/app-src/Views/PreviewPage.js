import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { EyeIcon, CodeIcon, FileTextIcon, CopyIcon, FileIcon, EditIcon } from 'lucide-react';
import axios from 'axios';
import { formatDate } from '../utils/dateFormatter';
import styles from './PreviewPage.module.css';
import logo from '../assets/blawgy-logo.svg';

// Use plain axios for preview - no auth interceptors needed
// This prevents logout issues when opening preview in new tabs
const baseURL = process.env.NODE_ENV === 'production'
  ? 'https://app.blawgy.com'
  : (process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080');

const PreviewPage = () => {
  const { siteId, postId, domain, slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('preview'); // 'preview', 'code', 'text', or 'markdown'

  // Determine if this is a sample preview or regular preview
  const isSamplePreview = domain && slug;

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        let response;
        if (isSamplePreview) {
          // Fetch sample article data (no auth required)
          response = await axios.get(`${baseURL}/api/sample/${domain}/${slug}`);
        } else {
          // Fetch regular article data (no auth required)
          response = await axios.get(`${baseURL}/blog/${siteId}/${postId}`);
        }

        if (response.data) {
          setArticle(response.data);
        } else {
          // Empty body (e.g. 204 / missing article) — surface an error
          // instead of leaving `article` null and crashing the render.
          setError('Article not found');
        }
      } catch (err) {
        setError('Failed to load article');
        console.error('Error fetching article:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [siteId, postId, domain, slug, isSamplePreview]);

  const formatContent = (content) => {
    if (!content) return '';
    return content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  };

  const formatHtmlForCodeView = (content) => {
    if (!content) return '';
    const formatted = content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/&lt;(\/?[a-zA-Z0-9]+)(\s[^>]*)?&gt;/g, '<span class="tag">&lt;$1$2&gt;</span>')
      .replace(/(\s[a-zA-Z-]+)=(&quot;[^&]*&quot;)/g, '<span class="attribute">$1</span>=<span class="string">$2</span>')
      .replace(/(\n\s*)/g, '<br>$1');
    return formatted;
  };

  const stripHtml = (content) => {
    if (!content) return '';
    const div = document.createElement('div');
    div.innerHTML = content;
    return div.textContent || div.innerText || '';
  };



  const copyToClipboard = (content) => {
    navigator.clipboard.writeText(content).then(() => {
      console.log('Copied to clipboard');
    });
  };

  const convertHtmlToMarkdown = (html) => {
    if (!html) return '';

    // First, decode HTML entities
    let content = html
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');

    // Remove article tags
    content = content.replace(/<\/?article>/g, '');

    // Special handling for table of contents
    content = content.replace(
      /<ul>\s*(?:-\s*\[(.*?)\]\((.*?)\)[\s\n]*)+\s*<\/ul>/g,
      (match) => {
        // Extract all links and format them consistently
        const links = match.match(/-\s*\[(.*?)\]\((.*?)\)/g) || [];
        return links
          .map(link => {
            const [, text, href] = link.match(/-\s*\[(.*?)\]\((.*?)\)/) || [];
            return `- [${text.trim()}](${href.trim()})`;
          })
          .join('\n') + '\n\n';
      }
    );

    // Handle headers with IDs
    content = content.replace(/<h([1-6])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h\1>/g,
      (_, level, id, text) => `${'#'.repeat(level)} ${text}\n\n`
    );

    // Handle regular headers
    content = content
      .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
      .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
      .replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
      .replace(/<h4>(.*?)<\/h4>/g, '#### $1\n\n')
      .replace(/<h5>(.*?)<\/h5>/g, '##### $1\n\n')
      .replace(/<h6>(.*?)<\/h6>/g, '###### $1\n\n');

    // Lists - handle nested lists better
    content = content.replace(/<ul>([\s\S]*?)<\/ul>/g, (match, list) => {
      return list
        .replace(/<li>([\s\S]*?)<\/li>/g, '- $1\n')
        .replace(/^/gm, '  ') + '\n';
    });

    content = content.replace(/<ol>([\s\S]*?)<\/ol>/g, (match, list) => {
      let index = 1;
      return list
        .replace(/<li>([\s\S]*?)<\/li>/g, () => `${index++}. $1\n`)
        .replace(/^/gm, '  ') + '\n';
    });

    // Tables
    content = content.replace(/<table[^>]*>([\s\S]*?)<\/table>/g, (match, tableContent) => {
      const rows = tableContent.match(/<tr>[\s\S]*?<\/tr>/g) || [];
      let markdown = '\n';

      rows.forEach((row, index) => {
        const cells = row.match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g) || [];
        const markdownCells = cells.map(cell =>
          cell.replace(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g, '$1')
            .trim()
            .replace(/\|/g, '\\|')
        );

        markdown += `| ${markdownCells.join(' | ')} |\n`;

        if (index === 0) {
          markdown += `|${markdownCells.map(() => ' --- ').join('|')}|\n`;
        }
      });

      return markdown + '\n';
    });

    // Other elements
    content = content
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<a href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')
      .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/g, '![$2]($1)')
      .replace(/<blockquote>([\s\S]*?)<\/blockquote>/g, '> $1\n\n')
      .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, '```\n$1\n```\n\n')
      .replace(/<code>(.*?)<\/code>/g, '`$1`')
      .replace(/<p>([\s\S]*?)<\/p>/g, '$1\n\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<iframe[^>]*src="([^"]*)"[^>]*><\/iframe>/g,
        (_, src) => {
          // Convert YouTube embed URLs to watch URLs for better markdown compatibility
          const videoUrl = src.replace('youtube.com/embed/', 'youtube.com/watch?v=');
          return `\n[Video](${videoUrl})\n\n`;
        }
      );

    // Clean up extra whitespace more aggressively
    return content
      .replace(/\n\s*\n\s*\n/g, '\n\n')  // Remove extra blank lines
      .replace(/^\s+|\s+$/g, '')          // Trim start and end
      .replace(/^[ \t]+/gm, '')           // Remove leading whitespace from each line
      .replace(/[ \t]+$/gm, '')           // Remove trailing whitespace from each line
      .replace(/\n{3,}/g, '\n\n');        // No more than 2 consecutive newlines
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.previewHeader}>
        <div className={styles.headerLeft}>
          <a href="https://blawgy.com" target="_blank" rel="noopener noreferrer">
            <img src={logo} alt="Blawgy" className={styles.logo} />
          </a>
        </div>
        <div className={styles.headerRight}>
          {!isSamplePreview && (
            <button
              className={styles.editButton}
              // Hand the id over via sessionStorage: the auth/redirect dance on
              // the way into /dashboard rewrites the URL (query params are
              // dropped), and /preview renders in the unauthenticated router
              // branch so a client-side navigate would hit the login catch-all.
              // Hard load + storage survives both.
              onClick={() => {
                try {
                  sessionStorage.setItem('blawgy:pendingEdit', JSON.stringify({ id: postId, at: Date.now() }));
                } catch (_) { /* private mode: fall through, button still opens the dashboard */ }
                window.location.assign('/dashboard');
              }}
            >
              <EditIcon size={14} />
              Edit article
            </button>
          )}
          <button
            className={styles.previewButton}
            onClick={() => window.close()}
          >
            Close
          </button>
        </div>
      </div>

      <div className={`${styles.secondaryNav} ${viewMode === 'preview' ? '' : styles.onDark}`}>
        <div className={styles.headerButtons}>
          <button
            className={`${styles.toggleButton} ${viewMode === 'preview' ? styles.active : ''}`}
            onClick={() => setViewMode('preview')}
          >
            <EyeIcon size={14} />
            Preview
          </button>
          <button
            className={`${styles.toggleButton} ${viewMode === 'code' ? styles.active : ''}`}
            onClick={() => setViewMode('code')}
          >
            <CodeIcon size={14} />
            HTML
          </button>
          <button
            className={`${styles.toggleButton} ${viewMode === 'markdown' ? styles.active : ''}`}
            onClick={() => setViewMode('markdown')}
          >
            <FileTextIcon size={14} />
            Markdown
          </button>
          <button
            className={`${styles.toggleButton} ${viewMode === 'text' ? styles.active : ''}`}
            onClick={() => setViewMode('text')}
          >
            <FileIcon size={14} />
            Text
          </button>
        </div>
      </div>

      <div
        className={styles.header}
        style={{ display: viewMode === 'preview' ? undefined : 'none' }}
      />

      <div
        className={`${styles.content} ${viewMode !== 'preview' ? styles.contentCompact : ''}`}
      >
        <article className={styles.article}>
          {article.imageUrl && viewMode === 'preview' && (
            <img
              src={article.imageUrl}
              alt={article.imageDescription || article.title}
              className={styles.image}
            />
          )}

          {viewMode === 'preview' && (
            <>
              <h1 className={styles.title}>{article.title}</h1>

              {article.publishDate && (
                <div className={styles.date}>
                  {formatDate(article.publishDate)}
                </div>
              )}

              {article.metaDescription && (
                <div className={styles.meta}>
                  {article.metaDescription}
                </div>
              )}
            </>
          )}

          {viewMode === 'preview' && (
            <div
              className={styles.previewContent}
              dangerouslySetInnerHTML={{ __html: formatContent(article.blogContent) }}
            />
          )}

          {viewMode === 'code' && (
            <>
              <div className={styles.viewLabel}>
                <CodeIcon size={20} />
                HTML Source Code
              </div>
              <div className={styles.codeView}>
                <button
                  className={styles.copyButton}
                  onClick={() => copyToClipboard(article.blogContent)}
                >
                  <CopyIcon size={14} />
                  Copy
                </button>
                <div dangerouslySetInnerHTML={{ __html: formatHtmlForCodeView(article.blogContent) }} />
              </div>
            </>
          )}

          {viewMode === 'text' && (
            <>
              <div className={styles.viewLabel}>
                <FileTextIcon size={20} />
                Plain Text Content
              </div>
              <div className={styles.textView}>
                <button
                  className={styles.copyButton}
                  onClick={() => copyToClipboard(stripHtml(article.blogContent))}
                >
                  <CopyIcon size={14} />
                  Copy
                </button>
                {stripHtml(article.blogContent)}
              </div>
            </>
          )}

          {viewMode === 'markdown' && (
            <>
              <div className={styles.viewLabel}>
                <FileIcon size={20} />
                Markdown Source
              </div>
              <div className={styles.codeView}>
                <button
                  className={styles.copyButton}
                  onClick={() => copyToClipboard(convertHtmlToMarkdown(article.blogContent))}
                >
                  <CopyIcon size={14} />
                  Copy
                </button>
                <div className={styles.markdownContent}>
                  {convertHtmlToMarkdown(article.blogContent)}
                </div>
              </div>
            </>
          )}
        </article>
      </div>
    </div>
  );
};

export default PreviewPage; 