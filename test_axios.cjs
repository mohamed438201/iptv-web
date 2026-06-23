const axios = require('axios');

async function test() {
  try {
    const res = await axios({
      method: 'get',
      url: 'http://xc.nv2.xyz/live/gamila2026/gamila2026/70108_1782129651.ts?session=3zeCYVzzVihEi1KEddXjQjFygaZE0URXyybPSZgdJwzVP63w1oG7tU_NC7MgxAXrhXMamaDt1H1bb1gJKgjIc1eUcz5gwZfQ&location=local',
      headers: {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        'Accept': '*/*'
      },
      responseType: 'stream',
      maxRedirects: 5
    });
    console.log('Status:', res.status);
    console.log('Headers:', res.headers);
    let size = 0;
    res.data.on('data', chunk => {
      size += chunk.length;
    });
    res.data.on('end', () => {
      console.log('Total size:', size);
    });
  } catch (err) {
    if (err.response) {
      console.error('Error status:', err.response.status);
    } else {
      console.error('Error:', err.message);
    }
  }
}

test();
