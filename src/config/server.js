// Настройки сервера

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

export const serverConfig = {
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT, 10) || 3000,

    // Таймауты
    timeout: parseInt(process.env.TIMEOUT, 10) || 30000,
    keepAliveTimeout: 65000,

    // Логирование
    logLevel: process.env.LOG_LEVEL || 'info',
    logFile: process.env.LOG_FILE,

    // Безопасность
    allowLocalhost: process.env.ALLOW_LOCALHOST === 'true',
    rateLimit: {
        enabled: process.env.RATE_LIMIT === 'true',
        windowMs: 60000,
        maxRequests: 100
    },

    // Интеграции
    cloudflare: {
        enabled: process.env.CF_ENABLED === 'true',
        token: process.env.CF_API_TOKEN,
        zoneId: process.env.CF_ZONE_ID
    }
};
