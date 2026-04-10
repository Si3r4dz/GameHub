import type { GameServerPlugin } from '@gamehub/core';

export async function loadPlugins(): Promise<Map<string, GameServerPlugin>> {
  const plugins = new Map<string, GameServerPlugin>();

  // Import game plugins from workspace packages
  // Each game exports a serverPlugin from its package
  try {
    const yahtzee = await import('@gamehub/yahtzee');
    plugins.set(
      yahtzee.serverPlugin.config.id,
      yahtzee.serverPlugin,
    );
  } catch {
    console.warn('Yahtzee plugin not found — skipping');
  }

  try {
    const quiz = await import('@gamehub/quiz');
    plugins.set(quiz.serverPlugin.config.id, quiz.serverPlugin);
  } catch {
    console.warn('Quiz plugin not found — skipping');
  }

  return plugins;
}
