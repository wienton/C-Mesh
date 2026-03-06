// Factory для создания обработчиков запросов
// Возвращает нужный хендлер в зависимости от типа запроса

import { HttpHandler } from '../handlers/HttpHandler.js';
import { HttpsHandler } from '../handlers/HttpsHandler.js';
import { WhitelistHandler } from '../handlers/WhitelistHandler.js';
import { logger } from '../utils/logger.js';

export class ProxyHandlerFactory {
    /**
     * Создаёт цепочку обработчиков для запроса
     * @param {Object} config - конфигурация
     * @returns {Function} middleware-функция
     */
    static create(config) {
        const whitelist = new WhitelistHandler(config.whitelist);
        const httpHandler = new HttpHandler(config);
        const httpsHandler = new HttpsHandler(config);

        return async (req, res, isConnect = false) => {
            try {
                // 1. Проверяем домен по вайтлисту
                const { allowed, reason } = await whitelist.check(req);
                if (!allowed) {
                    logger.warn(`Blocked: ${req.url} - ${reason}`);
                    return this._sendBlocked(res, reason);
                }

                // 2. Маршрутизируем по типу запроса
                const handler = isConnect ? httpsHandler : httpHandler;
                return await handler.handle(req, res);

            } catch (error) {
                logger.error('Handler error:', error);
                res.statusCode = 502;
                res.end('Bad Gateway');
            }
        };
    }

    static _sendBlocked(res, reason) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden', reason }));
    }
}
