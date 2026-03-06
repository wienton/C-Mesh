const LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

const COLORS = {
    error: '\x1b[31m', // red
    warn: '\x1b[33m',  // yellow
    info: '\x1b[36m',  // cyan
    debug: '\x1b[90m', // gray
    reset: '\x1b[0m'
};

class Logger {
    constructor({ level = 'info', useColors = true } = {}) {
        this.level = LEVELS[level] ?? LEVELS.info;
        this.useColors = useColors && process.stdout.isTTY;
    }

    _format(level, message, ...args) {
        const now = new Date().toISOString();
        const label = `[${now}] [${level.toUpperCase()}]`;

        let output = this.useColors
            ? `${COLORS[level]}${label}${COLORS.reset}`
            : label;

        output += ` ${message}`;
        if (args.length > 0) {
            output += ' ' + args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg) : arg
            ).join(' ');
        }

        return output;
    }

    _log(level, message, ...args) {
        if (LEVELS[level] <= this.level) {
            const output = this._format(level, message, ...args);
            const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
            stream.write(output + '\n');
        }
    }

    error(message, ...args) { this._log('error', message, ...args); }
    warn(message, ...args) { this._log('warn', message, ...args); }
    info(message, ...args) { this._log('info', message, ...args); }
    debug(message, ...args) { this._log('debug', message, ...args); }

    // Алиасы для совместимости
    log = this.info;
}

// Экспортируем готовый инстанс
export const logger = new Logger({
    level: process.env.LOG_LEVEL || 'info',
    useColors: process.env.NO_COLOR !== '1'
});

// Экспортируем класс для кастомизации
export { Logger };

export default logger;
