import type { ConnectionStatus } from '../hooks/useSocketConnection';

const labels: Record<ConnectionStatus, string> = {
  connected: 'Połączono',
  connecting: 'Łączenie...',
  disconnected: 'Rozłączono',
};

const classes: Record<ConnectionStatus, string> = {
  connected: 'conn-bar ok',
  connecting: 'conn-bar connecting',
  disconnected: 'conn-bar lost',
};

export function ConnectionBar({ status }: { status: ConnectionStatus }) {
  return <div className={classes[status]}>{labels[status]}</div>;
}
