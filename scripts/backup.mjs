// Consistent SQLite snapshot while the app is running: node scripts/backup.mjs
// Writes /app/backups/pulse-YYYY-MM-DD-HHMM.db and keeps the newest 14.
import { readdirSync, unlinkSync } from 'node:fs';
import { createClient } from '@libsql/client';

const dir = process.env.BACKUP_DIR || '/app/backups';
const url = process.env.DATABASE_URL || 'file:/app/data/pulse.db';
const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
const target = `${dir}/pulse-${stamp}.db`;

const db = createClient({ url });
await db.execute({ sql: 'VACUUM INTO ?', args: [target] });
console.log(`Backup geschrieben: ${target}`);

const old = readdirSync(dir).filter(f => /^pulse-.*\.db$/.test(f)).sort().reverse().slice(14);
for (const f of old) unlinkSync(`${dir}/${f}`);
if (old.length) console.log(`${old.length} alte Backups gelöscht`);
