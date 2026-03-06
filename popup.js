const CONFIG = {
    proxy: {
        host: "127.0.0.1",
        port: 3000,
        scheme: "http"      // http / https / socks4 / socks5
    },

    // Маппинг доменов
    domainMappings: {
        "tg.org": "https://web.telegram.org",
        "yt.be": "https://youtube.com"
    },

    // Домены для селективной маршрутизации
    services: {
        telegram: ["*.telegram.org", "*.telegram.me", "*.t.me", "*.tdesktop.com"],
        youtube: ["*.youtube.com", "*.ytimg.com", "*.googlevideo.com", "*.youtube-nocookie.com"],
        discord: ["*.discord.com", "*.discordapp.com", "*.discord.gg", "discord.com"],
        instagram: ["*.instagram.com", "*.cdninstagram.com"],
        twitter: ["*.twitter.com", "*.twimg.com", "*.x.com"],
        netflix: ["*.netflix.com", "*.nflxext.com", "*.nflximg.com", "*.nflxvideo.net"]
    }
};

const els = {
    toggle: document.getElementById('proxyToggle'),
    universal: document.getElementById('universalToggle'),
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    statusSub: document.getElementById('statusSub'),
    servicesPanel: document.getElementById('servicesPanel'),
    serviceInputs: document.querySelectorAll('.service-input[data-service]'),
    serviceCards: document.querySelectorAll('.service-card')
};

let state = {
    enabled: false,
    universal: false,
    selectedServices: []
};


document.addEventListener('DOMContentLoaded', async () => {
    await loadState();
    bindEvents();
    render();
    console.log(' C-Mesh Accessor loaded');
});

function bindEvents() {
    // Главный переключатель
    els.toggle.addEventListener('change', async (e) => {
        state.enabled = e.target.checked;
        if (state.enabled) {
            await applyProxy();
        } else {
            await disableProxy();
        }
        await saveState();
        render();
    });

    // Universal mode
    els.universal.addEventListener('change', async (e) => {
        state.universal = e.target.checked;

        // Если включили Universal — отключаем все сервисы
        if (state.universal) {
            els.serviceInputs.forEach(input => {
                input.checked = false;
                updateCardVisual(input, false);
            });
            state.selectedServices = [];
        }

        if (state.enabled) await applyProxy();
        await saveState();
        render();
    });

    // Индивидуальные сервисы
    els.serviceInputs.forEach((input, index) => {
        input.addEventListener('change', async (e) => {
            const service = input.dataset.service;
            const checked = e.target.checked;

            updateCardVisual(input, checked);

            // Обновляем список выбранных
            if (checked) {
                if (!state.selectedServices.includes(service)) {
                    state.selectedServices.push(service);
                }
                // Если выбрали сервис — выключаем Universal
                if (state.universal) {
                    state.universal = false;
                    els.universal.checked = false;
                }
            } else {
                state.selectedServices = state.selectedServices.filter(s => s !== service);
            }

            if (state.enabled) await applyProxy();
            await saveState();
            render();
        });
    });
}

function updateCardVisual(input, checked) {
    const card = input.closest('.service-card');
    if (card) {
        card.classList.toggle('checked', checked);
    }
}

function render() {
    // Статус-индикатор
    els.statusDot.classList.toggle('active', state.enabled);

    // Панель сервисов активна только когда прокси включен
    els.servicesPanel.classList.toggle('active', state.enabled);

    // Тексты статуса
    if (state.enabled) {
        if (state.universal) {
            els.statusText.textContent = "Universal mode active";
            els.statusSub.textContent = "All traffic routed // Весь трафик через прокси";
        } else {
            const count = state.selectedServices.length;
            els.statusText.textContent = count > 0
                ? `Selective routing // ${count} service${count !== 1 ? 's' : ''}`
                : "Proxy active // No services selected";
            els.statusSub.textContent = count > 0
                ? `${count} канал${count === 1 ? '' : count < 5 ? 'а' : 'ов'} активно`
                : "Выберите сервисы выше // Select services above";
        }
    } else {
        els.statusText.textContent = "Connection inactive";
        els.statusSub.textContent = "Enable to start // Включите для старта";
    }
}

async function loadState() {
    try {
        const data = await chrome.storage.local.get([
            'cMeshEnabled',
            'cMeshUniversal',
            'cMeshServices'
        ]);

        state.enabled = data.cMeshEnabled ?? false;
        state.universal = data.cMeshUniversal ?? false;
        state.selectedServices = data.cMeshServices ?? [];

        // Применяем к UI
        els.toggle.checked = state.enabled;
        els.universal.checked = state.universal;

        els.serviceInputs.forEach(input => {
            const service = input.dataset.service;
            const checked = state.selectedServices.includes(service);
            input.checked = checked;
            updateCardVisual(input, checked);
        });

    } catch (error) {
        console.error('Failed to load state:', error);
    }
}

async function saveState() {
    try {
        await chrome.storage.local.set({
            cMeshEnabled: state.enabled,
            cMeshUniversal: state.universal,
            cMeshServices: state.selectedServices
        });
    } catch (error) {
        console.error('Failed to save state:', error);
    }
}

/**
 * Генерирует PAC-скрипт для умной маршрутизации
 */
function generatePacScript() {
    const { scheme, host, port } = CONFIG.proxy;
    const proxyAddress = `${scheme.toUpperCase()} ${host}:${port}`;

    // Собираем все домены для маршрутизации
    const domains = [];

    if (state.universal) {
        return `
function FindProxyForURL(url, host) {
  // C-Mesh Accessor PAC — Universal Mode
  // Generated: ${new Date().toISOString()}

  // Локальные адреса — напрямую
  if (isPlainHostName(host) ||
      shExpMatch(host, "localhost") ||
      shExpMatch(host, "*.local") ||
      isInNet(dnsResolve(host), "127.0.0.1", "255.0.0.0") ||
      isInNet(dnsResolve(host), "10.0.0.0", "255.0.0.0") ||
      isInNet(dnsResolve(host), "192.168.0.0", "255.255.0.0") ||
      isInNet(dnsResolve(host), "172.16.0.0", "255.240.0.0")) {
    return "DIRECT";
  }

  // Всё остальное — через прокси
  return "${proxyAddress}";
}
    `.trim();
    }

    // Selective mode: только выбранные сервисы
    if (state.selectedServices.length > 0) {
        state.selectedServices.forEach(service => {
            if (CONFIG.services[service]) {
                domains.push(...CONFIG.services[service]);
            }
        });
    }

    // Если ничего не выбрано — возвращаем скрипт, который всегда DIRECT
    if (domains.length === 0) {
        return `function FindProxyForURL(url, host) { return "DIRECT"; }`;
    }

    // Генерируем правила для выбранных доменов
    const rules = domains.map(d => {
        // Конвертируем wildcard в shExpMatch формат
        if (d.startsWith('*.')) {
            return `    shExpMatch(host, "${d}")`;
        }
        return `    host === "${d}"`;
    }).join(' ||\n');

    return `
function FindProxyForURL(url, host) {
  // C-Mesh Accessor PAC — Selective Mode
  // Generated: ${new Date().toISOString()}
  // Services: ${state.selectedServices.join(', ')}

  const PROXY = "${proxyAddress}";
  const DIRECT = "DIRECT";

  // Локальные адреса всегда напрямую
  if (isPlainHostName(host) ||
      shExpMatch(host, "localhost") ||
      shExpMatch(host, "*.local")) {
    return DIRECT;
  }

  // Выбранные сервисы — через прокси
  if (
${rules}
  ) {
    return PROXY;
  }

  // Всё остальное — напрямую
  return DIRECT;
}
  `.trim();
}

/**
 * Применяет настройки прокси к браузеру
 */
async function applyProxy() {
    // Валидация конфига
    if (!CONFIG.proxy.host || !CONFIG.proxy.port) {
        alert('Proxy not configured!\n\nEdit popup.js and set CONFIG.proxy.host/port');
        state.enabled = false;
        els.toggle.checked = false;
        render();
        return;
    }

    const pacScript = generatePacScript();

    const config = {
        mode: "pac_script",
        pacScript: {
            data: pacScript
        }
    };

    try {
        await chrome.proxy.settings.set({
            value: config,
            scope: 'regular'
        });
        console.log('Proxy settings applied');
    } catch (error) {
        console.error('Failed to apply proxy:', error);
        // Откат состояния при ошибке
        state.enabled = false;
        els.toggle.checked = false;
        render();
    }
}

/**
 * Отключает прокси
 */
async function disableProxy() {
    try {
        await chrome.proxy.settings.set({
            value: {
                mode: "direct",
                rules: {}
            },
            scope: 'regular'
        });
        console.log('Proxy disabled');
    } catch (error) {
        console.error('Failed to disable proxy:', error);
    }
}


/**
 * Проверка валидности домена для PAC
 */
function isValidDomainPattern(pattern) {
    return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(pattern.replace(/^\*\./, ''));
}

export const CMesh = {
    debugPac: () => {
        console.log('Current PAC Script:\n', generatePacScript());
    },
    getState: () => ({ ...state }),
    getConfig: () => ({ ...CONFIG })
};

if (typeof window !== 'undefined') {
    window.CMesh = CMesh;
}
