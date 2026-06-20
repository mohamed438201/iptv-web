const http = require('http');

const accounts = [
    { host: 'http://vlc.news:80', user: 'e1orut4v6yff', pass: 'ivigc9xwz4x1' },
    { host: 'http://xc.nv2.xyz:80', user: '247942367', pass: '348953267' },
    { host: 'http://ea.saidisat.com:80', user: 'cnk6uc7hr9', pass: '4v8rzl4823' },
    { host: 'http://xc.nv2.xyz:80', user: 'gamila2026', pass: 'gamila2026' }
];

async function checkAccount(acc) {
    const url = `${acc.host}/player_api.php?username=${acc.user}&password=${acc.pass}`;
    return new Promise((resolve) => {
        const req = http.get(url, {
            headers: {
                'User-Agent': 'VLC/3.0.9 LibVLC/3.0.9'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json && json.user_info) {
                        resolve({
                            acc,
                            working: json.user_info.auth === 1 && json.user_info.status === 'Active',
                            details: json.user_info
                        });
                    } else {
                        resolve({ acc, working: false, error: `Invalid JSON response, status: ${res.statusCode}` });
                    }
                } catch (e) {
                    resolve({ acc, working: false, error: `Parse error, status: ${res.statusCode}, data: ${data.substring(0,50)}` });
                }
            });
        }).on('error', (err) => {
            resolve({ acc, working: false, error: err.message });
        });
        
        req.setTimeout(5000, () => {
            req.destroy();
            resolve({ acc, working: false, error: 'Timeout' });
        });
    });
}

async function run() {
    console.log("Testing accounts...");
    for (const acc of accounts) {
        const result = await checkAccount(acc);
        if (result.working) {
            console.log(`[WORKING] ✅ Host: ${acc.host} | User: ${acc.user} | Pass: ${acc.pass}`);
            console.log(`          Status: ${result.details.status} | Exp: ${new Date(result.details.exp_date * 1000).toLocaleString()}`);
        } else {
            console.log(`[FAILED] ❌ Host: ${acc.host} | User: ${acc.user} | Error: ${result.error || 'Auth failed or inactive'}`);
        }
    }
}

run();
