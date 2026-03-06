// Фабрика для создания/модификации исходящих запросов

import { URL } from 'url';
import { logger } from '../utils/logger.js';

export class RequestFactory {
    /**
     * Создаёт новый запрос к целевому серверу на основе входящего
     * @param {http.IncomingMessage} originalReq
     * @param {string} targetUrl - конечный URL
     * @returns {Object} опции для http/https.request()
     */
    static createForwardRequest(originalReq, targetUrl) {
        const parsed = new URL(targetUrl);
        const isHttps = parsed.protocol === 'https:';

        // Копируем заголовки, фильтруя хоппер-заголовки
        const headers = { ...originalReq.headers };
        delete headers['proxy-connection'];
        delete headers['connection'];
        delete headers['keep-alive'];
        delete headers['transfer-encoding'];

        // Подменяем хост
        headers.host = parsed.hostname;

        headers['x-forwarded-by'] = 'C-Mesh-Accessor';

        return {
            protocol: parsed.protocol,
            hostname: parsed.hostname,
            port: parsed.port || (isHttps ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: originalReq.method,
            headers,
            timeout: 30000,
            agent: false
        };
    }

    /**
     * Маппит домен через конфигурацию
     * Например: tg.org -> https://api.telegram.org
     */
    static mapDomain(host, mappings) {
        // Прямое совпадение
        if (mappings[host]) return mappings[host];

        // Wildcard: *.example.com ==> example.com
        for (const [pattern, target] of Object.entries(mappings)) {
            if (pattern.startsWith('*.')) {
                const domain = pattern.slice(2);
                if (host.endsWith('.' + domain) || host === domain) {
                    return target.replace('{host}', host);
                }
            }
        }

        // По умолчанию — возвращаем как есть
        return `https://${host}`;
    }
}
