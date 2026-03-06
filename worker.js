const WHITELIST = [
    '*.telegram.org', '*.t.me', '*.youtube.com', '*.discord.com'
];

const MAPPINGS = {
    'tg.org': 'https://web.telegram.org'
};

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const host = url.hostname;

        // Проверка вайтлиста
        if (!isAllowed(host)) {
            return new Response('Forbidden', { status: 403 });
        }

        // Маппинг домена
        const target = mapDomain(host, url.pathname + url.search);

        // Создаём новый запрос к цели
        const proxyRequest = new Request(target, {
            method: request.method,
            headers: filterHeaders(request.headers),
            body: request.body,
            redirect: 'manual'
        });

        try {
            const response = await fetch(proxyRequest);
            // Возвращаем ответ с корректными заголовками
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: filterHeaders(response.headers)
            });
        } catch (error) {
            return new Response('Proxy Error: ' + error.message, { status: 502 });
        }
    }
};

function isAllowed(host) {
    return WHITELIST.some(pattern => {
        if (pattern.startsWith('*.')) {
            const domain = pattern.slice(2);
            return host === domain || host.endsWith('.' + domain);
        }
        return host === pattern;
    });
}

function mapDomain(host, path) {
    if (MAPPINGS[host]) return MAPPINGS[host] + path;
    return `https://${host}${path}`;
}

function filterHeaders(headers) {
    const result = new Headers();
    const skip = ['proxy-authorization', 'proxy-authenticate'];
    for (const [key, value] of headers) {
        if (!skip.includes(key)) result.set(key, value);
    }
    result.set('x-forwarded-by', 'C-Mesh-Worker');
    return result;
}
