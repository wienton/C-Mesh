// Фабрика для формирования ответов клиенту

import { logger } from '../utils/logger.js';

export class ResponseFactory {
    /**
     * Проксирует ответ от целевого сервера обратно клиенту
     */
    static forward(clientRes, targetRes) {
        // Копируем статус и заголовки
        clientRes.writeHead(
            targetRes.statusCode,
            targetRes.statusMessage,
            this._filterHeaders(targetRes.headers)
        );

        // Пайпим тело
        targetRes.pipe(clientRes);

        // Обработка ошибок потока
        targetRes.on('error', (err) => {
            logger.error('Response stream error:', err);
            if (!clientRes.headersSent) {
                clientRes.writeHead(502);
                clientRes.end('Proxy Error');
            }
        });
    }

    /**
     * Фильтрует заголовки, которые не должны идти клиенту
     */
    static _filterHeaders(headers) {
        const forbidden = [
            'transfer-encoding',
            'connection',
            'keep-alive',
            'proxy-authenticate',
            'proxy-authorization',
            'te',
            'trailer',
            'upgrade'
        ];

        const filtered = { ...headers };
        forbidden.forEach(h => delete filtered[h]);
        return filtered;
    }

    /**
     * Создаёт ответ для HTTPS CONNECT туннеля
     */
    static createTunnelResponse(clientSocket) {
        return () => {
            clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                'Proxy-Agent: C-Mesh/1.0\r\n' +
                '\r\n');
        };
    }
}
