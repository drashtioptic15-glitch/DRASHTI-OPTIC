import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Render sets PORT (e.g. 10000) for the public HTTP endpoint
const publicPort = process.env.PORT || 10000;
const backendPort = process.env.BACKEND_PORT || 5000;

console.log('==================================================');
console.log('👓 DRASHTI OPTIC UNIFIED PRODUCTION RUNNER');
console.log(`🌐 Public Port (Next.js Frontend): ${publicPort}`);
console.log(`📡 Internal Port (Express API):     ${backendPort}`);
console.log('==================================================\n');

// 1. Spawn Backend Service
const backendProcess = spawn('node', ['src/server.js'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: String(backendPort),
    BACKEND_PORT: String(backendPort),
    NODE_ENV: process.env.NODE_ENV || 'production',
  },
});

// 2. Spawn Frontend Service
const isWin = process.platform === 'win32';
const npxCmd = isWin ? 'npx.cmd' : 'npx';

const frontendProcess = spawn(npxCmd, ['next', 'start', '-p', String(publicPort)], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: String(publicPort),
    BACKEND_HOST: '127.0.0.1',
    BACKEND_PORT: String(backendPort),
    NODE_ENV: process.env.NODE_ENV || 'production',
  },
});

backendProcess.on('error', (err) => {
  console.error('❌ Backend process startup error:', err);
});

frontendProcess.on('error', (err) => {
  console.error('❌ Frontend process startup error:', err);
});

backendProcess.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`⚠️ Backend exited with code ${code}`);
  }
});

frontendProcess.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`⚠️ Frontend exited with code ${code}`);
  }
});

const cleanup = () => {
  console.log('\nStopping Drashti Optic services...');
  try { backendProcess.kill('SIGTERM'); } catch {}
  try { frontendProcess.kill('SIGTERM'); } catch {}
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
