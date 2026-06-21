import fs from 'fs';
import https from 'https';
import path from 'path';

const token = process.env.GH_TOKEN;
const tag = 'v1.0.19';
const repo = 'mohamed438201/iptv-web';

const getRelease = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${repo}/releases/tags/${tag}`,
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'Node.js',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(`Failed to get release: ${res.statusCode} ${data}`);
        }
      });
    }).on('error', reject);
  });
};

const uploadAsset = (uploadUrlStr, filePath) => {
  return new Promise((resolve, reject) => {
    const fileName = path.basename(filePath);
    const uploadUrl = new URL(uploadUrlStr.replace(/\{.*\}/, '') + `?name=${fileName}`);
    
    const stats = fs.statSync(filePath);
    const options = {
      hostname: uploadUrl.hostname,
      path: uploadUrl.pathname + uploadUrl.search,
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'Node.js',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/zip',
        'Content-Length': stats.size
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          console.log(`Successfully uploaded ${fileName}`);
          resolve();
        } else {
          reject(`Failed to upload asset: ${res.statusCode} ${data}`);
        }
      });
    });

    req.on('error', reject);
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(req);
  });
};

async function main() {
  try {
    console.log(`Fetching release for tag ${tag}...`);
    const release = await getRelease();
    console.log(`Uploading dist.zip to release ${release.id}...`);
    await uploadAsset(release.upload_url, 'dist.zip');
    console.log('Upload complete.');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
