// ICT 305 video bank (19 of 47 topics). Sourcing per docs/sourcing-quality-process.txt:
// - ONE winner per topic (order preserved); backups noted in research, NOT imported.
// - Winners: Neso Academy CN singles (8 playlists, 70 videos) + Jeremy's IT Lab
//   CCNA 200-301 (PLhTW6Fulbw1Tqaa9cTEpAZo86TCO6xfYS, 43 videos, 4.7M views).
// - Comments proof: Neso CRC "9mins to make it easy and clear" [505 likes + creator heart];
//   Jeremy "I passed my CCNA exam yesterday, largely because of these lectures" [2200 likes].
// - GAPS (28 topics, documented — transmission cluster, Huffman/compression, FEC,
//   FDDI/MAN, P2P, client-server reqs, GUI standards, transactions, backup/recovery,
//   NOS): no fitting video in either bank; forcing matches would violate exact-topic law.
//   Duplicate topics #11/#12 (character synchronisation) left for merge at seed time.
// - SINGLE-HOME: every video carries the EXACT curriculum topic title in `topic`.
// - Owner of bulk import: davidnwachukwum@gmail.com
// Re-runnable: wipes the course's videos first, inserts in topic order.
import { MongoClient } from 'mongodb';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
for (const p of [join(__dirname, '..', '.env')]) {
  try {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        process.env[m[1]] = v;
      }
    }
  } catch {}
}

const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz';
const YT = id => `https://www.youtube.com/watch?v=${id}`;
const OWNER = 'davidnwachukwum@gmail.com';

// [courseCode, videoId, host, title, description, exactTopicTitle]
const ROWS = [
  ['ICT 305', 'K6Qt23sY68Y', 'watch', 'Connecting Devices: Building a Simple Network', 'Students build a simple communications network in the lab.', 'simple communications network.'],
  ['ICT 305', '5AVuUgEJu1E', 'watch', 'Network Performance and Transmission Efficiency', 'Network performance and the efficiency of transmission.', 'the efficiency of transmission.'],
  ['ICT 305', 'ReQiSK8W3Ag', 'watch', 'Flow Control: Introduction to Network Protocols', 'Introduction to network protocols through flow control.', 'Protocols: Introduction to network protocol.'],
  ['ICT 305', 'qBXmbJZQ5rY', 'watch', 'OSI Model Part 1: Seven-Layer Architecture', 'Seven-layer ISO-OSI standard protocols and network architecture.', 'Seven Layer ISO-OSI standard protocols and network architecture.'],
  ['ICT 305', 'XI8kMBMMS6o', 'watch', 'OSI Model Part 4: Upper Layers', 'Transport protocols, session services and other protocols.', 'Transport protocols, session services protocols, and other protocols.'],
  ['ICT 305', 'MzhiVE6OuQA', 'watch', 'Ethernet and IEEE 802.3 Standards', 'IEEE 802 standards through Ethernet.', 'Institute of Electrical and Electronics Engineering 802 standards.'],
  ['ICT 305', 'A9g6rTMblz4', 'watch', 'CRC Part 1: Error Control', 'Error control and data compression: the flagship method.', 'Error control and Data Compression.'],
  ['ICT 305', 'EMrY-8m8D1E', 'watch', 'Error Detection Methods Overview', 'Error detection methods.', 'error detection methods.'],
  ['ICT 305', 'UwERCzJv-y8', 'watch', 'VRC: Parity Checking', 'Parity checking with vertical redundancy check.', 'parity checking.'],
  ['ICT 305', 'nNONvBsOtrE', 'watch', 'LRC Block Codes', 'Linear block codes with longitudinal redundancy check.', 'linear block codes.'],
  ['ICT 305', 'wQGwfBS3gpk', 'watch', 'CRC Part 2: Cyclic Redundancy Checking', 'Cyclic redundancy checking continued.', 'cyclic redundancy checking.'],
  ['ICT 305', 'YdkksvhkQGQ', 'watch', 'Stop-and-Wait ARQ: Feedback Error Control', 'Feedback error control with stop-and-wait ARQ.', 'feedback error control.'],
  ['ICT 305', 'u2n762WG0Vo', 'watch', 'Ethernet LAN Switching Part 1', 'Local area networks with Ethernet LAN switching.', 'Local Area Networks.'],
  ['ICT 305', 'MAZi6VoekYw', 'watch', 'CSMA: Medium Access Control', 'Medium access control techniques: Ethernet, token bus, token ring.', 'medium access control techniques – Ethernet, token bus, and token ring.'],
  ['ICT 305', 'cjFzOnm6u1g', 'watch', 'VLANs Part 1: LAN Standards and 802.1Q', 'LAN standards with VLANs and 802.1Q.', 'LAN standards.'],
  ['ICT 305', 'H8W9oMNSuwo', 'watch', 'Day 1: Client, Server and Network Basics', 'Client-server with explicit definitions and examples.', 'Client-Server.'],
  ['ICT 305', 'ieTH5lVhNaY', 'watch', 'Interfaces and Cables: Connectivity', 'Connectivity through interfaces and cables.', 'connectivity.'],
  ['ICT 305', 'WfIhQ3o2xow', 'watch', 'Selective Repeat ARQ: Reliable Transfer', 'Reliability with selective-repeat ARQ.', 'reliability.'],
  ['ICT 305', 't-ai8JzhHuY', 'watch', 'Day 3: OSI and TCP/IP Suite', 'TCP/IP and network operating systems.', 'TCP/IP and Network OS.'],
];

async function seed() {
  const c = new MongoClient(URI, { connectTimeoutMS: 20000, serverSelectionTimeoutMS: 20000 });
  await c.connect();
  const db = c.db();
  const byCourse = {};
  for (const [courseCode, id, host, title, description, topic] of ROWS) {
    const url = YT(id);
    (byCourse[courseCode] = byCourse[courseCode] || []).push({ courseCode, url, title, description, topic, ownerEmail: OWNER, addedBy: OWNER });
  }
  for (const [courseCode, list] of Object.entries(byCourse)) {
    const existing = await db.collection('videos').countDocuments({ courseCode });
    if (existing > 0) {
      console.log(`${courseCode} has ${existing} videos. Re-seeding (doc: playlists win, single-homed)...`);
      await db.collection('videos').deleteMany({ courseCode });
    }
    await db.collection('videos').insertMany(list.map((v, i) => ({ ...v, order: i + 1 })));
    console.log(`${list.length} ${courseCode} videos inserted.`);
  }
  await c.close();
}

seed().catch(e => { console.error('Seed failed:', e.message); process.exit(1) });
