// Run: node check-service-account.js
// or: node -r dotenv/config check-service-account.js
try { require('dotenv').config?.(); } catch (e) {}
const fs = require('fs');
const path = process.env.GOOGLE_APPLICATION_CREDENTIALS || './firebase-service-account.json';
const full = path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path) ? path : require('path').resolve(process.cwd(), path);
console.log('Checking JSON at:', full);
if (!fs.existsSync(full)) {
  console.log('File exists:', false);
  process.exit(0);
}
console.log('File exists:', true);
try {
  const j = JSON.parse(fs.readFileSync(full, 'utf8'));
  const pk = j.private_key || '';
  console.log('serviceAccount.private_key present:', !!pk);
  if (!pk) process.exit(0);
  const shownStart = pk.slice(0, 40).replace(/\n/g,'\\n');
  const shownEnd = pk.slice(-40).replace(/\n/g,'\\n');
  console.log('StartsWith BEGIN:', pk.includes('-----BEGIN PRIVATE KEY-----'));
  console.log('EndsWith END:', pk.includes('-----END PRIVATE KEY-----'));
  console.log('Shown start (masked):', shownStart);
  console.log('Shown end   (masked):', shownEnd);
  console.log('Length:', pk.length);
  console.log('Contains real newlines:', pk.includes('\n'));
  console.log('Contains literal \\\\n sequences:', pk.includes('\\n'));
} catch (err) {
  console.error('JSON parse / read error:', err.message || err);
}