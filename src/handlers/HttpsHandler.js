// Обработчик HTTPS через метод CONNECT (туннелирование)

import net from 'net';
import { BaseHandler } from './BaseHandler.js';
import { logger } from '../utils/logger.js';

export class HttpsHandler extends BaseHandler {
    async handle(req, clientSocket, head) {
        const [host, portStr] = req.url.split(':');
        const port = parseInt(portStr, 10) || 443;

        // Проверяем вайтлист
        if (!this._isAllowed(host)) {
            clientSocket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
            clientSocket.end();
            logger.warn(`CONNECT blocked: ${host}:${port}`);
            return;
        }

        this._logRequest(req, `${host}:${port}`);

        try {
            // Создаём туннель к целевому серверу
            const targetSocket = await this._withTimeout(
                new Promise((resolve, reject) => {
                    const socket = net.createConnection({ host, port });
                    socket.on('connect', () => resolve(socket));
                    socket.on('error', reject);
                })
            );

            // Сообщаем клиенту, что туннель установлен
            clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                'Proxy-Agent: C-Mesh/1.0\r\n' +
                '\r\n');

            // Двусторонний пайп
            targetSocket.write(head);
            clientSocket.pipe(targetSocket);
            targetSocket.pipe(clientSocket);

            // Обработка ошибок
            targetSocket.on('error', (err) => {
                logger.error('Target socket error:', err);
                clientSocket.end();
            });
            clientSocket.on('error', (err) => {
                logger.error('Client socket error:', err);
                targetSocket.end();
            });

        } catch (error) {
            logger.error('CONNECT error:', error);
            if (!clientSocket.destroyed) {
                clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
                clientSocket.end();
            }
        }
    }

    _isAllowed(host) {
        const { whitelist, domainMappings } = this.config;

        // Прямая проверка
        if (whitelist.includes(host)) return true;

        // Проверка через маппинг
        if (domainMappings[host]) return true;

        // Wildcard проверка
        for (const pattern of whitelist) {
            if (pattern.startsWith('*.')) {
                const domain = pattern.slice(2);
                if (host.endsWith('.' + domain) || host === domain) {
                    return true;
                }
            }
        }

        return false;
    }
}
