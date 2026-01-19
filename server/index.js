const { PeerServer } = require('peer');

// Run a server on port 9000
const peerServer = PeerServer({ 
  port: 9000, 
  path: '/myapp',
  proxied: true
});

console.log('🚀 Signaling Server running on port 9000');