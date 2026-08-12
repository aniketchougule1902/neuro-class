import { execSync } from 'child_process';
import { mkdirSync, cpSync, writeFileSync } from 'fs';

console.log('=== Vercel Build: Starting ===');

// Build frontend with Vite
console.log('Building frontend with Vite...');
execSync('npx vite build', { stdio: 'inherit' });

// Create Vercel Build Output API structure
console.log('Creating Vercel Build Output structure...');
mkdirSync('.vercel/output/static', { recursive: true });
cpSync('dist', '.vercel/output/static', { recursive: true });

// SPA routing config — all paths serve index.html
writeFileSync('.vercel/output/config.json', JSON.stringify({
  version: 3,
  routes: [
    { handle: 'filesystem' },
    { src: '/(.*)', dest: '/index.html' }
  ]
}, null, 2));

console.log('=== Vercel Build: Complete ===');
