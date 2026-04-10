import 'dotenv/config';
import { createApp } from './app.js';
import { networkInterfaces } from 'os';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function main() {
  const app = await createApp(PORT);

  await app.listen({ port: PORT, host: '0.0.0.0' });

  const nets = networkInterfaces();
  console.log('GameHub server running on:');
  console.log(`  http://localhost:${PORT}`);
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  http://${net.address}:${PORT}`);
      }
    }
  }
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
