import { useCallback, useRef, useState } from 'react';
import { auth } from '../../firebaseConfig';

/**
 * Streams a turn from /api/assistant/chat.
 *
 * fetch + ReadableStream rather than EventSource: EventSource is GET-only and
 * cannot send an Authorization header, and we need both a POST body and the
 * Firebase token.
 */

const baseURL = process.env.NODE_ENV === 'production'
  ? 'https://app.blawgy.com'
  : (process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080');

export default function useAssistantStream() {
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [pendingTool, setPendingTool] = useState(null);
  const conversationId = useRef(null);
  const abortRef = useRef(null);

  const reset = useCallback(() => {
    conversationId.current = null;
    setMessages([]);
    setPendingTool(null);
  }, []);

  const send = useCallback(async (text, { site, ambientSite, confirmation } = {}) => {
    if (!text?.trim() || streaming) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setStreaming(true);
    setPendingTool(null);

    // One assistant entry per turn; deltas append to it, cards push into it.
    const turnIndex = { current: null };
    setMessages((prev) => {
      turnIndex.current = prev.length;
      return [...prev, { role: 'assistant', text: '', cards: [], thinking: false, activeTool: null }];
    });

    const patchTurn = (patch) => {
      setMessages((prev) => prev.map((m, i) => (
        i === turnIndex.current ? { ...m, ...(typeof patch === 'function' ? patch(m) : patch) } : m
      )));
    };

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`${baseURL}/api/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          site,
          ambientSite,
          conversationId: conversationId.current,
          ...(confirmation
            ? { confirmationToken: confirmation.token, confirmTool: confirmation.tool }
            : {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const detail = await response.json().catch(() => ({}));
        patchTurn({ error: detail.message || 'Something went wrong.', thinking: false });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let split;
        while ((split = buffer.indexOf('\n\n')) !== -1) {
          const raw = buffer.slice(0, split);
          buffer = buffer.slice(split + 2);
          const line = raw.split('\n').find((l) => l.startsWith('data:'));
          if (!line) continue;

          let event;
          try {
            event = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }

          switch (event.type) {
            case 'conversation':
              conversationId.current = event.id;
              break;
            case 'text':
              patchTurn((m) => ({ text: m.text + event.text, thinking: false, activeTool: null }));
              break;
            case 'thinking':
              patchTurn({ thinking: true });
              break;
            case 'tool_start':
              patchTurn({ activeTool: event.name, thinking: false });
              break;
            case 'card':
              patchTurn((m) => ({
                cards: [...m.cards, { tool: event.tool, ...event.render }],
                activeTool: null,
              }));
              if (event.render?.card === 'ConfirmCard') {
                setPendingTool({
                  tool: event.render.props.tool,
                  token: event.render.props.confirmationToken,
                  effect: event.render.props.effect,
                  args: event.render.props.args,
                  reversible: event.render.props.reversible,
                });
              }
              break;
            case 'error':
              patchTurn({ error: event.message, thinking: false, activeTool: null });
              break;
            case 'done':
              patchTurn({ thinking: false, activeTool: null });
              break;
            default:
              break;
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        patchTurn({ error: 'Lost connection. Try again?', thinking: false, activeTool: null });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [streaming]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  return { messages, send, stop, streaming, reset, pendingTool, setPendingTool, conversationId };
}
