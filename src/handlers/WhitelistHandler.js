// Проверка запросов по вайтлисту

import { logger } from '../utils/logger.js';

export class WhitelistHandler {
    constructor(whitelist = [], domainMappings = {}) {
        this.whitelist = new Set(whitelist);
        this.domainMappings = domainMappings;
    }

    /**
     * Проверяет, разрешён ли запрос
     * @returns {Promise<{allowed: boolean, reason?: string}>}
     */
    async check(req) {
        const host = this._extractHost(req);
        if (!host) {
            return { allowed: false, reason: 'Invalid host' };
        }

        // Проверяем прямой вайтлист
        if (this.whitelist.has(host)) {
            return { allowed: true };
        }

        // Проверяем wildcard-паттерны
        for (const pattern of this.whitelist) {
            if (this._matchPattern(host, pattern)) {
                return { allowed: true };
            }
        }

        // Проверяем маппинг доменов
        if (this.domainMappings[host] ||
            Object.keys(this.domainMappings).some(p => this._matchPattern(host, p))) {
            return { allowed: true };
        }

        logger.debug(`Host not allowed: ${host}`);
        return { allowed: false, reason: 'Host not in whitelist' };
    }

    _extractHost(req) {
        // Для абсолютных URL
        if (req.url?.startsWith('http')) {
            try {
                return new URL(req.url).hostname;
            } catch {
                return null;
            }
        }
        // Из заголовка Host
        return req.headers.host?.split(':')[0] || null;
    }

    _matchPattern(host, pattern) {
        if (pattern.startsWith('*.')) {
            const domain = pattern.slice(2);
            return host === domain || host.endsWith('.' + domain);
        }
        return host === pattern;
    }

    /**
     * Добавляет домен в вайтлист на лету
     */
    add(pattern) {
        this.whitelist.add(pattern);
        logger.info(`Whitelist updated: +${pattern}`);
    }

    /**
     * Удаляет домен из вайтлиста
     */
    remove(pattern) {
        this.whitelist.delete(pattern);
        logger.info(`Whitelist updated: -${pattern}`);
    }
}
