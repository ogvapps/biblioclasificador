import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'dev-api-classify-middleware',
        configureServer(server) {
          server.middlewares.use('/api/classify', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Method Not Allowed' }));
              return;
            }

            let body = '';
            req.on('data', (chunk: Buffer) => {
              body += chunk.toString();
            });

            req.on('end', async () => {
              try {
                if (!process.env.GROQ_API_KEY && env.GROQ_API_KEY) {
                  process.env.GROQ_API_KEY = env.GROQ_API_KEY;
                }

                // @ts-ignore
                const classifyModule = await import('./api/classify.js');
                const handler = classifyModule.default;

                const webReq = new Request('http://localhost/api/classify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: body || '{}'
                });

                const apiRes = await handler(webReq);
                res.statusCode = apiRes.status;
                apiRes.headers.forEach((val: string, key: string) => {
                  res.setHeader(key, val);
                });

                const resText = await apiRes.text();
                res.end(resText);
              } catch (err: any) {
                console.error('Local API /api/classify error:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Error interno en middleware' }));
              }
            });
          });
        }
      }
    ],
    server: {
      host: true, // Exposes network IP so user can open app on mobile via WiFi
      port: 5173
    },
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Split heavy libraries into separate lazy-loaded chunks
            if (id.includes('node_modules/exceljs')) return 'vendor-excel';
            if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) return 'vendor-firebase';
          }
        }
      }
    }
  };
});