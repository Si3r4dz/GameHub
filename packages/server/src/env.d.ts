// Game plugins may not be installed yet — declare them as optional modules
declare module '@gamehub/yahtzee' {
  import type { GameServerPlugin } from '@gamehub/core';
  export const serverPlugin: GameServerPlugin;
}

declare module '@gamehub/quiz' {
  import type { GameServerPlugin } from '@gamehub/core';
  export const serverPlugin: GameServerPlugin;
}
