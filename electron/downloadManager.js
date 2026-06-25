import { app, ipcMain, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';

// AES-256-CTR configuration
export const ALGORITHM = 'aes-256-ctr';
// In a real app, generate this securely or use safeStorage. For now, a static key derived from app name.
export const ENCRYPTION_KEY = crypto.scryptSync('iptv-secure-key-2026', 'salt', 32); 

export function initDownloadManager(mainWindow) {
  const downloadsDir = path.join(app.getPath('userData'), 'downloads');
  const metadataFile = path.join(downloadsDir, 'metadata.json');

  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }

  // Load existing metadata
  let downloads = {};
  if (fs.existsSync(metadataFile)) {
    try {
      downloads = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
      // Mark any interrupted downloads as paused
      Object.keys(downloads).forEach(id => {
        if (downloads[id].status === 'downloading') {
          downloads[id].status = 'paused';
        }
      });
    } catch (e) {
      console.error('Error reading downloads metadata:', e);
    }
  }

  const saveMetadata = () => {
    fs.writeFileSync(metadataFile, JSON.stringify(downloads, null, 2));
  };

  const activeDownloads = new Map();

  ipcMain.handle('start-download', async (event, item) => {
    try {
      const id = String(item.stream_id || item.series_id || item.id);
      
      const isResuming = downloads[id] && downloads[id].status === 'paused';
      
      if (downloads[id] && downloads[id].status === 'completed') {
        return { success: false, error: 'Already downloaded' };
      }
      if (downloads[id] && downloads[id].status === 'downloading') {
        return { success: false, error: 'Already downloading' };
      }

      const filePath = path.join(downloadsDir, `${id}.enc`);
      
      if (!isResuming) {
        downloads[id] = {
          ...item,
          id,
          filePath,
          status: 'downloading',
          progress: 0,
          downloadedBytes: 0,
          totalBytes: 0,
          downloadedSegments: 0,
          totalSegments: 0,
          createdAt: new Date().toISOString()
        };
      } else {
        downloads[id].status = 'downloading';
      }
      saveMetadata();

      const controller = new AbortController();
      activeDownloads.set(id, controller);

      const initialResponse = await axios({
        method: 'GET',
        url: item.url,
        responseType: 'stream',
        signal: controller.signal,
        headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' },
        maxRedirects: 5
      });

      const finalUrl = initialResponse.request.res.responseUrl || item.url;
      const contentType = initialResponse.headers['content-type'] || '';
      const isHls = finalUrl.includes('.m3u8') || contentType.includes('mpegurl');

      if (isHls) {
        downloads[id].isHls = true;
        const hlsDir = path.join(downloadsDir, `${id}_hls`);
        if (!fs.existsSync(hlsDir)) {
          fs.mkdirSync(hlsDir, { recursive: true });
        }
        downloads[id].filePath = hlsDir;
        
        let playlistContent = '';
        for await (const chunk of initialResponse.data) {
          playlistContent += chunk.toString();
        }

        const lines = playlistContent.split('\n');
        const segments = [];
        let targetDuration = 10;
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('#EXT-X-TARGETDURATION:')) {
            targetDuration = parseInt(trimmed.split(':')[1], 10) || 10;
          }
          if (trimmed && !trimmed.startsWith('#')) {
            try {
              segments.push(new URL(trimmed, finalUrl).toString());
            } catch (e) {
              console.error('Invalid segment URL:', trimmed);
            }
          }
        }

        if (segments.length === 0) {
          throw new Error('No segments found in playlist');
        }

        downloads[id].totalSegments = segments.length;
        downloads[id].targetDuration = targetDuration;
        saveMetadata();

        let downloadedSegments = downloads[id].downloadedSegments || 0;
        let downloadedBytes = downloads[id].downloadedBytes || 0;

        const downloadSegment = async (url, seq) => {
          const segRes = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            signal: controller.signal,
            headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' }
          });
          
          const iv = Buffer.alloc(16, 0);
          const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
          const writeStream = fs.createWriteStream(path.join(hlsDir, `${seq}.enc`));
          
          let bytesInSeg = 0;
          return new Promise((resolve, reject) => {
            segRes.data.on('data', (chunk) => {
              bytesInSeg += chunk.length;
            });
            segRes.data.pipe(cipher).pipe(writeStream);
            writeStream.on('finish', () => resolve(bytesInSeg));
            writeStream.on('error', reject);
          });
        };

        for (let i = 0; i < segments.length; i++) {
          if (controller.signal.aborted) throw new Error('Cancelled');
          
          // Resume logic: skip already downloaded segments
          const segPath = path.join(hlsDir, `${i}.enc`);
          if (fs.existsSync(segPath)) {
            const stat = fs.statSync(segPath);
            if (stat.size > 0 && i < downloadedSegments) {
               // Already downloaded, skip
               continue;
            }
          }
          
          let retries = 3;
          let bytesInSeg = 0;
          while (retries > 0) {
            try {
              bytesInSeg = await downloadSegment(segments[i], i);
              break;
            } catch (err) {
              retries--;
              if (retries === 0 || err.message === 'Cancelled') throw err;
              await new Promise(r => setTimeout(r, 1000));
            }
          }

          downloadedSegments = Math.max(downloadedSegments, i + 1);
          downloadedBytes += bytesInSeg;
          
          const progress = Math.round((downloadedSegments / segments.length) * 100);
          let estimatedTotalBytes = downloads[id].totalBytes;
          if (progress <= 5 || !estimatedTotalBytes) {
            estimatedTotalBytes = Math.round((downloadedBytes / downloadedSegments) * segments.length);
          }
          downloads[id].totalBytes = estimatedTotalBytes;
          downloads[id].downloadedBytes = downloadedBytes;
          downloads[id].downloadedSegments = downloadedSegments;

          if (progress > downloads[id].progress || downloadedSegments === segments.length) {
            downloads[id].progress = progress;
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('on-download-progress', { 
                id, 
                progress, 
                downloadedLength: downloadedBytes, 
                totalLength: estimatedTotalBytes 
              });
            }
            saveMetadata();
          }
        }

      } else {
        // Raw file handling
        const filePath = path.join(downloadsDir, `${id}.enc`);
        downloads[id].filePath = filePath;
        
        let downloadedLength = 0;
        let fileFlags = 'w';
        
        if (isResuming && fs.existsSync(filePath)) {
          downloadedLength = fs.statSync(filePath).size;
          fileFlags = 'a';
        }

        const headers = { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' };
        if (downloadedLength > 0) {
          // Calculate how many raw bytes were actually downloaded.
          // Since AES-CTR doesn't change byte size, raw bytes = encrypted bytes.
          headers['Range'] = `bytes=${downloadedLength}-`;
        }

        const res = await axios({
          method: 'GET',
          url: item.url,
          responseType: 'stream',
          signal: controller.signal,
          headers,
          maxRedirects: 5
        });

        // Initialize Cipher with the correct counter state!
        const iv = Buffer.alloc(16, 0);
        const blockOffset = BigInt(Math.floor(downloadedLength / 16));
        let counter = blockOffset;
        for (let i = 15; i >= 0; i--) {
          iv[i] = Number(counter & 255n);
          counter >>= 8n;
        }
        
        const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        
        // If we are resuming from the middle of a block, we need to discard the padding bytes
        const byteOffsetInBlock = downloadedLength % 16;
        if (byteOffsetInBlock > 0) {
          // create Cipher output but discard the first byteOffsetInBlock bytes
          // We can just pipe a dummy buffer to advance the internal state
          const dummy = Buffer.alloc(byteOffsetInBlock, 0);
          cipher.update(dummy);
        }

        const writeStream = fs.createWriteStream(filePath, { flags: fileFlags });
        
        const totalLength = parseInt(res.headers['content-length'], 10) + downloadedLength || downloads[id].totalBytes || 0;
        downloads[id].totalBytes = totalLength;
        saveMetadata();

        await new Promise((resolve, reject) => {
          res.data.on('data', (chunk) => {
            const encChunk = cipher.update(chunk);
            writeStream.write(encChunk);
            downloadedLength += chunk.length;
            const progress = totalLength ? Math.round((downloadedLength / totalLength) * 100) : 0;
            
            if (progress > downloads[id].progress || downloadedLength % (5 * 1024 * 1024) === 0) {
              downloads[id].progress = progress;
              downloads[id].downloadedBytes = downloadedLength;
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('on-download-progress', { id, progress, downloadedLength, totalLength });
              }
              saveMetadata();
            }
          });

          res.data.on('end', () => {
            const finalChunk = cipher.final();
            if (finalChunk && finalChunk.length > 0) {
              writeStream.write(finalChunk);
            }
            writeStream.end();
            resolve();
          });

          res.data.on('error', (err) => {
            writeStream.end();
            reject(err);
          });
        });

        await new Promise((resolve, reject) => {
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });
      }

      downloads[id].status = 'completed';
      downloads[id].progress = 100;
      saveMetadata();
      activeDownloads.delete(id);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('on-download-complete', { id });
      }

      return { success: true, id };
    } catch (error) {
      if (axios.isCancel(error)) {
        const id = String(item.stream_id || item.series_id || item.id);
        if (downloads[id] && !downloads[id].isCancelled) {
          downloads[id].status = 'paused';
          saveMetadata();
        }
        return { success: false, error: 'Cancelled' };
      }
      console.error('Download error:', error);
      const id = String(item.stream_id || item.series_id || item.id);
      if (downloads[id]) {
        downloads[id].status = 'error';
        downloads[id].error = error.message;
        saveMetadata();
      }
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('pause-download', async (event, id) => {
    if (activeDownloads.has(id)) {
      activeDownloads.get(id).abort();
      activeDownloads.delete(id);
    }
    if (downloads[id] && downloads[id].status === 'downloading') {
      downloads[id].status = 'paused';
      saveMetadata();
      return { success: true };
    }
    return { success: false };
  });

  ipcMain.handle('get-downloads', () => {
    return Object.values(downloads);
  });

  ipcMain.handle('remove-download', async (event, id) => {
    if (downloads[id]) {
      downloads[id].isCancelled = true;
    }
    
    if (activeDownloads.has(id)) {
      activeDownloads.get(id).abort();
      activeDownloads.delete(id);
    }
    
    if (downloads[id]) {
      const filePath = downloads[id].filePath;
      if (fs.existsSync(filePath)) {
        // Wait for 1 second before deleting to ensure stream handles are fully closed
        setTimeout(() => {
          try {
            if (fs.existsSync(filePath)) {
              if (fs.lstatSync(filePath).isDirectory()) {
                fs.rmSync(filePath, { recursive: true, force: true });
              } else {
                fs.unlinkSync(filePath);
              }
            }
          } catch(err) {
            console.error('Failed to delete cancelled file/folder:', err);
          }
        }, 1000);
      }
      delete downloads[id];
      saveMetadata();
    }
    return { success: true };
  });

  ipcMain.handle('show-item-in-folder', async (event, id) => {
    if (downloads[id] && downloads[id].filePath) {
      if (fs.existsSync(downloads[id].filePath)) {
        shell.showItemInFolder(downloads[id].filePath);
        return { success: true };
      }
    }
    return { success: false };
  });

  return downloadsDir;
}
