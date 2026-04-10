import type { GameClientPlugin } from '@gamehub/core';

type PluginLoader = () => Promise<{ clientPlugin: GameClientPlugin }>;

const registry: Record<string, PluginLoader> = {
  yahtzee: () => import('@gamehub/yahtzee/client'),
  quiz: () => import('@gamehub/quiz/client'),
};

const loaded = new Map<string, GameClientPlugin>();

export async function getGamePlugin(
  gameType: string,
): Promise<GameClientPlugin | null> {
  if (loaded.has(gameType)) return loaded.get(gameType)!;
  const loader = registry[gameType];
  if (!loader) return null;
  const mod = await loader();
  loaded.set(gameType, mod.clientPlugin);
  return mod.clientPlugin;
}
