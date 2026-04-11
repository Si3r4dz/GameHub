import { useT } from '@gamehub/i18n';
import type { ConnectionStatus } from '../hooks/useSocketConnection';

const keys: Record<ConnectionStatus, string> = {
  connected: 'connection.connected',
  connecting: 'connection.connecting',
  disconnected: 'connection.disconnected',
};

const classes: Record<ConnectionStatus, string> = {
  connected: 'conn-bar ok',
  connecting: 'conn-bar connecting',
  disconnected: 'conn-bar lost',
};

export function ConnectionBar({ status }: { status: ConnectionStatus }) {
  const t = useT();
  return <div className={classes[status]}>{t(keys[status])}</div>;
}
