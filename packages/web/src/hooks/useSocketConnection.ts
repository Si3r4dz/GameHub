import { useState, useEffect, useCallback, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { PLATFORM_EVENTS } from '@gamehub/core';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export function useSocketConnection(socket: Socket) {
  const [status, setStatus] = useState<ConnectionStatus>(
    socket.connected ? 'connected' : 'disconnected',
  );
  // Store last gameId/token so we can auto-rejoin on reconnect
  const lastConnectRef = useRef<{ gameId: string; token: string } | null>(
    null,
  );

  useEffect(() => {
    const onConnect = () => {
      setStatus('connected');
      // Auto-rejoin room after reconnect
      if (lastConnectRef.current) {
        socket.emit(PLATFORM_EVENTS.GAME_CONNECT, lastConnectRef.current);
      }
    };
    const onDisconnect = () => setStatus('disconnected');
    const onConnecting = () => setStatus('connecting');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.io.on('reconnect_attempt', onConnecting);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.io.off('reconnect_attempt', onConnecting);
    };
  }, [socket]);

  const connect = useCallback(
    (gameId: string, token: string) => {
      lastConnectRef.current = { gameId, token };
      if (!socket.connected) {
        socket.connect();
      }
      socket.emit(PLATFORM_EVENTS.GAME_CONNECT, { gameId, token });
    },
    [socket],
  );

  return { status, connect };
}
