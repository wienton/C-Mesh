// Обработчик обычных HTTP-запросов

import http from 'http';
import https from 'https';
import { BaseHandler } from './BaseHandler.js';
import { RequestFactory } from '../factories/RequestFactory.js';
import { ResponseFactory } from '../factories/ResponseFactory.js';
import { logger } from '../utils/logger.js';

export class HttpHandler extends BaseHandler {
    async handle(req, res) {
        const targetUrl = this._resolveTarget(req);
        this._logRequest(req, targetUrl);

        const options = RequestFactory.createForwardRequest(req, targetUrl);
        const lib = options.protocol === 'https:' ? https : http;

        try {
            const proxyReq = await this._withTimeout(
                new Promise((resolve, reject) => {
                    const r = lib.request(options, (proxyRes) => {
                        ResponseFactory.forward(res, proxyRes);
                        resolve(r);
                    });
                    r.on('error', reject);

                    // Пайпим тело запроса
                    req.pipe(r);
                })
            );
        } catch (error) {
            logger.error('HTTP proxy error:', error);
            if (!res.headersSent) {
                res.statusCode = error.code === 'ECONNREFUSED' ? 503 : 502;
                res.end('Proxy Error: ' + error.message);
            }
        }
    }

    _resolveTarget(req) {
        const { domainMappings } = this.config;
        // Для относительных путей добавляем протокол и хост
        if (req.url.startsWith('/')) {
            const host = req.headers.host;
            const mapped = RequestFactory.mapDomain(host, domainMappings);
            return mapped + req.url;
        }
        // Абсолютный URL
        return req.url;
    }
}
