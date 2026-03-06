export const defaultWhitelist = [
    '*.telegram.org',
    '*.telegram.me',
    '*.t.me',
    '*.tdesktop.com',
    '*.youtube.com',
    '*.ytimg.com',
    '*.googlevideo.com',
    '*.discord.com',
    '*.discordapp.com',
    'discord.com',
    '*.instagram.com',
    '*.cdninstagram.com',
    '*.twitter.com',
    '*.twimg.com',
    '*.x.com',
    '*.netflix.com',
    '*.nflxext.com'
];

export const defaultMappings = {
    'tg.org': 'https://web.telegram.org',
    'yt.be': 'https://youtube.com',

};

export function loadWhitelist(source = 'default') {
    // TODO: добавить загрузку из:
    // - файла: fs.readFileSync('./whitelist.json')
    // - API: fetch(config.apiUrl + '/whitelist')
    // - базы данных

    return {
        whitelist: defaultWhitelist,
        mappings: defaultMappings
    };
}
