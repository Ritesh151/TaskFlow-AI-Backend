"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = require("node:http");
const app_1 = require("./app");
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const prisma_1 = require("./lib/prisma");
const auth_service_1 = require("./services/auth.service");
let shuttingDown = false;
async function bootstrap() {
    await prisma_1.prisma.$connect();
    await (0, auth_service_1.ensureSeedUser)();
    const server = (0, node_http_1.createServer)(app_1.app);
    server.listen(env_1.env.PORT, '0.0.0.0', () => {
        logger_1.logger.info({ port: env_1.env.PORT }, 'Backend listening');
    });
    const gracefulShutdown = async (signal) => {
        if (shuttingDown) {
            return;
        }
        shuttingDown = true;
        logger_1.logger.info({ signal }, 'Graceful shutdown started');
        server.close(async () => {
            await prisma_1.prisma.$disconnect();
            logger_1.logger.info('Shutdown complete');
            process.exit(0);
        });
        setTimeout(async () => {
            logger_1.logger.error('Forcing shutdown after timeout');
            await prisma_1.prisma.$disconnect();
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
        logger_1.logger.fatal({ err: error }, 'Uncaught exception');
        void gracefulShutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason) => {
        logger_1.logger.fatal({ err: reason }, 'Unhandled rejection');
        void gracefulShutdown('unhandledRejection');
    });
}
void bootstrap().catch(async (error) => {
    logger_1.logger.fatal({ err: error }, 'Failed to bootstrap backend');
    await prisma_1.prisma.$disconnect();
    process.exit(1);
});
