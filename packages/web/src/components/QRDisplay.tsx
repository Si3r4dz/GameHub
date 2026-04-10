import { useEffect, useRef } from 'react';

declare function qrcode(typeNumber: number, errorCorrection: string): {
  addData(data: string): void;
  make(): void;
  createSvgTag(cellSize: number, margin: number): string;
};

export function QRDisplay({
  gameId,
  serverIp,
  joinPath,
}: {
  gameId: string;
  serverIp: string;
  serverPort: number;
  joinPath?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Use the current page's port (works in both dev Vite:5173 and prod Fastify:3001)
  const currentPort = window.location.port;
  const path = joinPath ?? `/join/${gameId}`;
  const joinUrl = `http://${serverIp}:${currentPort}${path}`;

  useEffect(() => {
    const loadQR = async () => {
      if (
        typeof window !== 'undefined' &&
        !(window as unknown as Record<string, unknown>).qrcode
      ) {
        const script = document.createElement('script');
        script.src =
          'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js';
        await new Promise<void>((resolve) => {
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }
      renderQR();
    };

    const renderQR = () => {
      if (!containerRef.current) return;
      const qr = (window as unknown as { qrcode: typeof qrcode }).qrcode(
        0,
        'M',
      );
      qr.addData(joinUrl);
      qr.make();
      containerRef.current.innerHTML = qr.createSvgTag(4, 0);
    };

    loadQR();
  }, [joinUrl]);

  return (
    <div className="qr-section">
      <div className="game-code">{gameId}</div>
      <div ref={containerRef} />
      <div className="game-url">{joinUrl}</div>
    </div>
  );
}
