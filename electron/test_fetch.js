const { app, net } = require('electron');

app.whenReady().then(async () => {
  try {
    const res = await net.fetch('http://xc.nv2.xyz/live/gamila2026/gamila2026/767335.m3u8', {
      headers: {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        'Accept': '*/*'
      },
      redirect: 'follow'
    });
    console.log('Status:', res.status);
    console.log('Headers:', [...res.headers.entries()]);
    const text = await res.text();
    console.log('Body start:', text.substring(0, 100));
  } catch (err) {
    console.error('Fetch error:', err);
  }
  app.quit();
});
