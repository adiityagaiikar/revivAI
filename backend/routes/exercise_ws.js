const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');

function setupExerciseWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    // We migrated directly to FastAPI Port 8000 to avoid Windows Camera Mutex issues
    // Just close any stale client connections immediately.
    ws.close();
  });
}

module.exports = setupExerciseWebSocket;
