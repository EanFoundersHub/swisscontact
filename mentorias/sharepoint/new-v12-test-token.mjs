import crypto from 'node:crypto';
const token=crypto.randomBytes(32).toString('base64url');
if(token.length!==43)throw new Error('Longitud criptográfica inesperada.');
process.stdout.write(token);
