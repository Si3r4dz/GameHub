import { useState, useEffect, useCallback, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { HUB_EVENTS } from '@gamehub/core';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export function useHubConnection(socket: Socket) {
  const [status, setStatus] = useState<ConnectionStatus>(
    socket.connected ? 'connected' : 'disconnected',
  );
  const lastConnectRef = useRef<{ hubId: string; token: string } | null>(null);

  useEffect(() => {
    const onConnect = () => {
      setStatus('connected');
      if (lastConnectRef.current) {
        socket.emit(HUB_EVENTS.HUB_CONNECT, lastConnectRef.current);
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
    (hubId: string, token: string) => {
      lastConnectRef.current = { hubId, token };
      if (!socket.connected) {
        socket.connect();
      }
      socket.emit(HUB_EVENTS.HUB_CONNECT, { hubId, token });
    },
    [socket],
  );

  return { status, connect };
}
