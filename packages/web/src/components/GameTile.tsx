import type { GameConfig } from '@gamehub/core';

export function GameTile({
  config,
  onClick,
}: {
  config: GameConfig;
  onClick: () => void;
}) {
  return (
    <div
      className="game-tile"
      onClick={onClick}
      style={{ borderColor: config.color }}
    >
      <div className="icon">{config.icon}</div>
      <div className="name">{config.name}</div>
      <div className="desc">{config.description}</div>
      <div className="players">
        {config.minPlayers}–{config.maxPlayers} graczy
      </div>
    </div>
  );
}
