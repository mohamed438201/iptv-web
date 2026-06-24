const axios = require('axios');

async function testList() {
  const m3u8Url = 'http://xc.nv2.xyz:80/live/gamila2026/gamila2026/1020304.m3u8';
  try {
    const resM3u8 = await axios.get(m3u8Url, { 
      headers: { 'User-Agent': 'VLC/3.0.9 LibVLC/3.0.9' },
      maxRedirects: 5
    });
    console.log('Original URL:', m3u8Url);
    console.log('Final URL:', resM3u8.request.res.responseUrl);
  } catch (err) {
    console.log('error:', err.message);
  }
}
testList();
