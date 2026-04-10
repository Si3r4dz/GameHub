import type { FastifyInstance } from 'fastify';
import { networkInterfaces } from 'os';

export function registerServerInfoRoutes(
  app: FastifyInstance,
  port: number,
): void {
  app.get('/api/server-info', async () => {
    const nets = networkInterfaces();
    let ip = 'localhost';
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]!) {
        if (net.family === 'IPv4' && !net.internal) {
          ip = net.address;
          break;
        }
      }
      if (ip !== 'localhost') break;
    }
    return { ip, port };
  });
}
