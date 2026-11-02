import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './server/routes/api';
import { ENV } from './server/config/env';
import { verifyDatabaseConnection } from './server/db/index';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();

  // Verify PostgreSQL connection and log detailed startup health check
  const dbHealth = await verifyDatabaseConnection();

  // Security & Middleware (Configured to support AI Studio preview iframe)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      frameguard: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
    })
  );

  // Explicitly remove X-Frame-Options to allow embedding in AI Studio preview iframe
  app.use((_req, res, next) => {
    res.removeHeader('X-Frame-Options');
    next();
  });

  // CORS: Restrict to explicit trusted origins in production
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. same-origin, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (ENV.NODE_ENV !== 'production') return callback(null, true);
        if (ENV.CORS_ORIGINS.includes(origin) || ENV.CORS_ORIGINS.includes('*')) {
          return callback(null, true);
        }
        return callback(new Error(`CORS policy blocked access from origin: ${origin}`));
      },
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // CSRF Defense for cookie-based session mutations
  // State-changing requests from web clients using cookie auth must include the platform header
  app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const hasCookieSession = Boolean(req.cookies?.nivaspay_token);
      const isApiRoute = req.path.startsWith('/api/');
      const isWebhook = req.path.startsWith('/api/webhooks/');

      if (hasCookieSession && isApiRoute && !isWebhook) {
        const clientHeader = req.headers['x-client-platform'] || req.headers['x-requested-with'];
        if (!clientHeader) {
          return res.status(403).json({
            error: '403_FORBIDDEN: CSRF protection triggered. Missing client header.',
          });
        }
      }
    }
    next();
  });

  // Mount API Routes
  app.use('/api', apiRouter);

  // Vite middleware in development or static in production
  if (ENV.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(ENV.PORT, '0.0.0.0', () => {
    console.log(`[NivasPay Production Server] Running on http://0.0.0.0:${ENV.PORT} (Env: ${ENV.NODE_ENV})`);
    console.log(
      `[Startup Status] Database Mode: ${
        dbHealth.connected ? 'LIVE POSTGRESQL' : 'SERVICE RESTRICTED (POSTGRESQL OFFLINE)'
      }`
    );
  });
}

startServer().catch((err) => {
  console.error('[Fatal Server Startup Error]:', err);
  process.exit(1);
});
