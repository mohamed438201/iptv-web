export const getBaseUrl = (server) => {
  if (!server) return '';
  const isNativeApp = window.Capacitor !== undefined || (navigator.userAgent && navigator.userAgent.toLowerCase().includes('electron'));
  const isDev = import.meta.env?.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const useProxy = !isNativeApp || (isNativeApp && isDev && !window.Capacitor);
  return useProxy ? server.proxy : server.host;
};

export const buildXtreamApiUrl = (server, action, params = {}) => {
  const baseUrl = getBaseUrl(server);
  let query = `/player_api.php?username=${server.user}&password=${server.pass}&action=${action}`;
  for (const key in params) {
    query += `&${key}=${params[key]}`;
  }
  return `${baseUrl}${query}`;
};

// Explicitly use the host, used by Electron which bypasses CORS
export const buildXtreamHostApiUrl = (server, action, params = {}) => {
  let query = `/player_api.php?username=${server.user}&password=${server.pass}&action=${action}`;
  for (const key in params) {
    query += `&${key}=${params[key]}`;
  }
  return `${server.host}${query}`;
};

export const buildXtreamStreamUrl = (server, type, streamId, extension) => {
  const baseUrl = getBaseUrl(server);
  const path = type === 'live' ? 'live' : (type === 'movie' ? 'movie' : 'series');
  return `${baseUrl}/${path}/${server.user}/${server.pass}/${streamId}.${extension}`;
};

// Explicitly use the host, used by Electron downloads which bypass CORS and need absolute URLs
export const buildXtreamHostStreamUrl = (server, type, streamId, extension) => {
  const path = type === 'live' ? 'live' : (type === 'movie' ? 'movie' : 'series');
  return `${server.host}/${path}/${server.user}/${server.pass}/${streamId}.${extension}`;
};
