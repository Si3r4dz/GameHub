import type { GameConfig } from '@gamehub/core';
import { useT } from '@gamehub/i18n';

export function GameTile({
  config,
  onClick,
}: {
  config: GameConfig;
  onClick: () => void;
}) {
  const t = useT();

  return (
    <div
      className="game-tile"
      onClick={onClick}
      style={{ borderColor: config.color }}
    >
      <div className="icon">{config.icon}</div>
      <div className="name">{t(`game.${config.id}.name`)}</div>
      <div className="desc">{t(`game.${config.id}.description`)}</div>
      <div className="players">
        {config.minPlayers}–{config.maxPlayers} {t('common.players').toLowerCase()}
      </div>
    </div>
  );
}
