import { useState, useRef, useCallback, useEffect } from 'react';
import { WSMessage } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL;

export function useWebSocket(sessionId: string | null, token: string | null) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<WSMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const streamBufferRef = useRef('');

  const connect = useCallback(() => {
    if (!sessionId || !token) return;

    const ws = new WebSocket(`${WS_URL}/ws/agent/${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ token }));
    };

    ws.onmessage = (event) => {
      const data: WSMessage = JSON.parse(event.data);

      if (data.type === 'connected') {
        setConnected(true);
        return;
      }

      if (data.type === 'assistant_chunk') {
        streamBufferRef.current += data.content || '';
        setStreaming(true);
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.type === 'assistant_chunk') {
            return [
              ...prev.slice(0, -1),
              { ...last, content: streamBufferRef.current },
            ];
          }
          return [...prev, { type: 'assistant_chunk', content: streamBufferRef.current }];
        });
        return;
      }

      if (data.type === 'assistant_complete') {
        streamBufferRef.current = '';
        setStreaming(false);
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.type !== 'assistant_chunk');
          return [...filtered, data];
        });
        return;
      }

      setMessages((prev) => [...prev, data]);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [sessionId, token]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  const sendMessage = useCallback(
    (content: string, attachments?: { type: string; data: string }[]) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      setMessages((prev) => [
        ...prev,
        { type: 'connected', content } as unknown as WSMessage,
      ]);

      wsRef.current.send(
        JSON.stringify({ type: 'message', content, attachments: attachments || [] })
      );
    },
    []
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  return { connected, messages, streaming, sendMessage, clearMessages };
}
