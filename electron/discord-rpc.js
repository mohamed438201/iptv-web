import DiscordRPC from 'discord-rpc';

// Set this to your Discord App Client ID
const clientId = '1518331558803537921'; 

DiscordRPC.register(clientId);

const rpc = new DiscordRPC.Client({ transport: 'ipc' });

// State for rate limiting and timestamps
let lastUpdateTime = 0;
let activityTimer = null;
let currentStartTimestamp = new Date();
let lastDetails = '';
let isConnected = false;

export function initRPC() {
  rpc.on('ready', () => {
    console.log('✅ Discord RPC connected successfully!');
    isConnected = true;
  });

  const connectRPC = () => {
    console.log('🔄 Attempting to connect to Discord RPC...');
    rpc.login({ clientId }).catch((err) => {
      console.error('❌ Discord RPC Login Error:', err.message);
      setTimeout(connectRPC, 10000); // Retry every 10 seconds
    });
  };

  connectRPC();
}

const sendToDiscord = (details, state) => {
  if (!rpc || !isConnected) return;
  
  if (!details) {
    console.log('📡 Clearing Discord activity');
    rpc.clearActivity().catch(err => console.error('❌ Clear Activity Error:', err.message));
    lastDetails = '';
    return;
  }

  // Manage the elapsed time
  if (details.startsWith('Watching:') || details.startsWith('Viewing:')) {
    // Reset timer if starting a new media item
    if (lastDetails !== details) {
      currentStartTimestamp = new Date();
    }
  }
  
  lastDetails = details;

  console.log(`📡 Sending activity to Discord: ${details}`);
  
  rpc.setActivity({
    details: details,
    state: state,
    startTimestamp: currentStartTimestamp,
    largeImageKey: 'logo',
    largeImageText: 'IPTV Premium App',
    instance: false,
  }).then(() => {
    console.log('✅ Activity updated on Discord');
    lastUpdateTime = Date.now();
  }).catch((err) => {
    console.error('❌ Activity Update Error:', err.message);
    // If it fails due to rate limit, we update the timestamp anyway to avoid spamming
    lastUpdateTime = Date.now();
  });
};

export function setActivity(details, state = 'Programmer: Mohamed Sherif') {
  if (!isConnected) return;

  const now = Date.now();
  const timeSinceLastUpdate = now - lastUpdateTime;
  const COOLDOWN = 15000; // 15 seconds Discord rate limit

  // Clear any pending queued updates so we only send the latest one
  if (activityTimer) {
    clearTimeout(activityTimer);
    activityTimer = null;
  }

  if (timeSinceLastUpdate >= COOLDOWN) {
    // We can send immediately
    sendToDiscord(details, state);
  } else {
    // We must wait to respect Discord's rate limits
    const waitTime = COOLDOWN - timeSinceLastUpdate;
    console.log(`⏳ Queuing Discord RPC update for "${details}" (waiting ${waitTime}ms)...`);
    activityTimer = setTimeout(() => {
      sendToDiscord(details, state);
    }, waitTime);
  }
}
