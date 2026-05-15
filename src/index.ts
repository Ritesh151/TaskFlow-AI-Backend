import { createServer } from 'node:http';
import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './lib/prisma';
import { ensureSeedUser } from './services/auth.service';

let shuttingDown = false;

async function bootstrap() {
  await prisma.$connect();
  await ensureSeedUser();

  const server = createServer(app);

  server.listen(env.PORT, '0.0.0.0', () => {
    logger.info({ port: env.PORT }, 'Backend listening');
  });

  const gracefulShutdown = async (signal: string) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.info({ signal }, 'Graceful shutdown started');

    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Shutdown complete');
      process.exit(0);
    });

    setTimeout(async () => {
      logger.error('Forcing shutdown after timeout');
      await prisma.$disconnect();
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGINT', () => {
    void gracefulShutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void gracefulShutdown('SIGTERM');
  });

  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    void gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled rejection');
    void gracefulShutdown('unhandledRejection');
  });
}

void bootstrap().catch(async (error) => {
  logger.fatal({ err: error }, 'Failed to bootstrap backend');
  await prisma.$disconnect();
  process.exit(1);
});
