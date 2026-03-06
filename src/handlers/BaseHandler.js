import { logger } from '../utils/logger.js';

export class BaseHandler {
    constructor(config) {
        this.config = config;
        this.timeout = config.timeout || 30000;
    }

    /**
     * Абстрактный метод — должен быть переопределён
     */
    async handle(req, res) {
        throw new Error('handle() must be implemented');
    }

    /**
     * Логирование запроса
     */
    _logRequest(req, target) {
        logger.info(`${req.method} ${req.url} → ${target}`);
    }

    /**
     * Обработка таймаута
     */
    _withTimeout(promise, ms = this.timeout) {
        let timer;
        return Promise.race([
            promise,
            new Promise((_, reject) =>
                timer = setTimeout(() => reject(new Error('Timeout')), ms)
            )
        ]).finally(() => clearTimeout(timer));
    }
}
