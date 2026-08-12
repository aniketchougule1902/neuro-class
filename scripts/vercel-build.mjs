import { execSync } from 'child_process';
import { mkdirSync, cpSync, writeFileSync, existsSync } from 'fs';

console.log('=== Vercel Build: Starting ===');

// 1. Build frontend with Vite
console.log('Building frontend with Vite...');
execSync('npx vite build', { stdio: 'inherit' });

// 2. Create Vercel Build Output API structure
console.log('Creating Vercel Build Output structure...');
mkdirSync('.vercel/output/static', { recursive: true });

// 3. Copy dist/ into .vercel/output/static/
cpSync('dist', '.vercel/output/static', { recursive: true });

// 4. Write Vercel output config
writeFileSync('.vercel/output/config.json', JSON.stringify({
  version: 3,
  routes: [
    { handle: 'filesystem' },
    { src: '/(.*)', dest: '/index.html' }
  ]
}, null, 2));

console.log('=== Vercel Build: Complete ===');
console.log('Output written to .vercel/output/');
