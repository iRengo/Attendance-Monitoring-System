// Run: node debug-firebase-key.js
// or: node -r dotenv/config debug-firebase-key.js
try { require('dotenv').config?.(); } catch (e) {}
const pk = process.env.FIREBASE_PRIVATE_KEY || '';
console.log('FIREBASE_PRIVATE_KEY present:', !!pk);
if (!pk) process.exit(0);
const shownStart = pk.slice(0, 40).replace(/\n/g,'\\n');
const shownEnd = pk.slice(-40).replace(/\n/g,'\\n');
console.log('StartsWith BEGIN:', pk.includes('-----BEGIN PRIVATE KEY-----'));
console.log('EndsWith END:', pk.includes('-----END PRIVATE KEY-----'));
console.log('Shown start (masked):', shownStart);
console.log('Shown end   (masked):', shownEnd);
console.log('Length:', pk.length);
console.log('Contains literal \\\\n sequences:', pk.includes('\\n'));
console.log('Contains real newlines:', pk.includes('\n'));