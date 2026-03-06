#!/usr/bin/env node

import http from 'http';
import { logger } from './utils/logger.js';
import { serverConfig } from './config/server.js';
import { loadWhitelist } from './config/whitelist.js';
import { ProxyHandlerFactory } from './factories/ProxyHandlerFactory.js';

class CMeshServer {
    constructor(config) {
        this.config = config;
        this.server = null;
    }

    async start() {
        const { whitelist, mappings } = loadWhitelist();

        // Создаём обработчик через фабрику
        const handleRequest = ProxyHandlerFactory.create({
            whitelist,
            domainMappings: mappings,
            timeout: this.config.timeout
        });

        this.server = http.createServer();

        // Обработка обычных запросов
        this.server.on('request', (req, res) => {
            handleRequest(req, res, false);
        });

        // Обработка HTTPS CONNECT туннелей
        this.server.on('connect', (req, clientSocket, head) => {
            handleRequest(req, clientSocket, head, true);
        });

        // Глобальные обработчики ошибок
        this.server.on('clientError', (err, socket) => {
            logger.error('Client error:', err);
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        });

        this.server.on('error', (err) => {
            logger.error('Server error:', err);
        });

        // Запуск
        return new Promise((resolve, reject) => {
            this.server.listen(
                { port: this.config.port, host: this.config.host },
                () => {
                    logger.info(`C-Mesh Accessor running on ${this.config.host}:${this.config.port}`);
                    resolve();
                }
            );
            this.server.on('error', reject);
        });
    }

    async stop() {
        return new Promise((resolve) => {
            if (!this.server) return resolve();

            logger.info(' Shutting down...');
            this.server.close(() => {
                logger.info('Server stopped');
                resolve();
            });


            setTimeout(() => {
                logger.warn('Force closing connections');
                this.server.closeAllConnections?.();
                resolve();
            }, 5000);
        });
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const server = new CMeshServer(serverConfig);


    process.on('SIGINT', async () => await server.stop());
    process.on('SIGTERM', async () => await server.stop());

    try {
        await server.start();
    } catch (error) {
        logger.error('Failed to start:', error);
        process.exit(1);
    }
}

export default CMeshServer;
