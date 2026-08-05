import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import JoditEditor from 'jodit-react';
import styles from './rich-text-editor.module.css';

// Two toolbar tiers: 'minimal' is the original compact set (ArticleBuilder and
// legacy callers), 'full' is the document-editor set used by the full-screen
// article editor (headings via the paragraph dropdown, image, hr).
const TOOLBARS = {
  minimal: {
    buttons: ['bold', 'italic', 'underline', '|', 'ul', 'ol', '|', 'link', '|', 'paragraph', '|', 'undo', 'redo'],
    buttonsMD: ['bold', 'italic', '|', 'ul', 'ol', '|', 'link'],
    buttonsSM: ['bold', 'italic', '|', 'ul', 'ol'],
    buttonsXS: ['bold', 'italic', 'ul', 'ol'],
  },
  full: {
    buttons: ['paragraph', '|', 'bold', 'italic', 'underline', 'strikethrough', '|', 'ul', 'ol', '|', 'link', 'image', 'hr', '|', 'undo', 'redo'],
    buttonsMD: ['paragraph', '|', 'bold', 'italic', '|', 'ul', 'ol', '|', 'link', 'image'],
    buttonsSM: ['paragraph', 'bold', 'italic', '|', 'ul', 'ol', '|', 'link'],
    buttonsXS: ['bold', 'italic', 'ul', 'ol'],
  },
};

const RichTextEditor = forwardRef(({ rawBody, handleChange, height = '350', fill = false, toolbar = 'minimal', onLiveChange }, ref) => {
  const joditRef = useRef(null);
  const [editorState, setEditorState] = useState('');

  // Committed state only syncs on blur, so save paths that fire while the
  // editor still has focus (Cmd+S) must read the live value through this ref.
  useImperativeHandle(ref, () => ({
    getContent: () => {
      const live = joditRef.current?.value;
      return typeof live === 'string' ? live : editorState;
    },
  }), [editorState]);

  const config = useMemo(() => ({
    height: fill ? '100%' : height,
    iframe: false,
    ...(TOOLBARS[toolbar] || TOOLBARS.minimal),
    toolbarButtonSize: 'small',
    // Fill mode lives in a ~48rem column; adaptive sizing would drop to the MD
    // button set there. The full set fits, so pin it.
    toolbarAdaptive: !fill,
    toolbarSticky: false,
    showXPathInStatusbar: false,
    showCharsCounter: false,
    showWordsCounter: false,
    statusbar: false,
    disablePlugins: ['clean-html', 'powered-by-jodit', 'add-new-line'],
    cleanHTML: {
      cleanOnPaste: false,
      removeEmptyTags: false,
    },
    // Fill mode always opens with an existing article; Jodit evaluates the
    // placeholder before the async body lands and then ghosts it over the
    // real first paragraph, so drop it there entirely.
    showPlaceholder: !fill,
    placeholder: 'Start typing...',
    style: {
      font: '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#374151',
    },
    editorClassName: 'modern-editor',
  }), [height, fill, toolbar]);

  useEffect(() => {
    if (rawBody) {
      setEditorState(rawBody);
    }
  }, [rawBody]);

  const handleEditorStateChange = useCallback(
    (value) => {
      setEditorState(value);
      handleChange(value);
    },
    [handleChange],
  );

  return (
    <div className={`${styles.container} ${fill ? styles.fill : ''}`}>
      <JoditEditor
        ref={joditRef}
        value={editorState}
        config={config}
        onBlur={content => handleEditorStateChange(content)}
        // Keystroke-level signal for ambient UI (word count). Never drive the
        // value prop from this or the cursor resets on every render.
        onChange={onLiveChange}
      />
    </div>
  );
});

export default RichTextEditor;
