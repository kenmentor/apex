// CSC 102/162/182 video banks. Sourcing per docs/sourcing-quality-process.txt:
// - ONE winner per topic (order preserved); backups noted in research, NOT imported.
// - CSC 102: CS50x Lecture 0 + Neso C++ ch5/ch1. CSC 162: Neso DE ch3/ch1,
//   Ben Eater (SR latch + reset circuit — distinct videos from the IFT 212 bank),
//   Neso NT ch4, Neso MP ch1. CSC 182: Neso C++ ch2.
// - Comments proof: Neso C++ "none compare in quality and clarity"; Ben Eater
//   logic "finally explaining the fundamentals" [2500]; CS50 "now a software
//   engineer" [2300]; CrashCourse "summarize a 4-year degree" [2100].
// - X-course reuses of CS50/Neso service videos flagged (service-series precedent).
// - SINGLE-HOME: every video carries the EXACT curriculum topic title in `topic`.
// - Owner of bulk import: davidnwachukwum@gmail.com
// Re-runnable: wipes each course's videos first, inserts in topic order.
import { MongoClient } from 'mongodb';
import { readFileSync, existsSync } from 'fs';
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
  // ---------- CSC 102 (3 topics) ----------
  ['CSC 102', 'IDDmrzzB14M', 'watch', 'CS50 Lecture 0: Scratch and Problem Solving', 'Problem solving fundamentals.', 'Problem Solving Fundamentals'],
  ['CSC 102', 'aI3cmQ6UOzg', 'watch', 'Neso C++: Procedural vs Object Oriented Programming', 'Programming paradigms and concepts.', 'Programming Paradigms & Concepts'],
  ['CSC 102', 'M5UAO6n1LmQ', 'watch', 'Neso C++: Introduction to Programming', 'Programming in C++ and Python.', 'Programming (C++/Python)'],
  // ---------- CSC 162 (5 topics) ----------
  ['CSC 162', 'crSGS1uBSNQ', 'watch', 'Neso DE: Introduction to Number Systems', 'Number systems and boolean algebra.', 'Number Systems & Boolean Algebra'],
  ['CSC 162', 'KM0DdEaY5sY', 'watch', 'Ben Eater: SR Latch and Digital Logic', 'Digital logic and circuits.', 'Digital Logic & Circuits'],
  ['CSC 162', 'uyE_UhLwIXc', 'watch', 'Neso NT: Introduction to Network Theorems', 'Circuit analysis.', 'Circuit Analysis'],
  ['CSC 162', 'HtFro0UKqkk', 'watch', 'Ben Eater: Reset Circuit and Power Supply Tips', 'Grounding and power systems.', 'Grounding & Power Systems'],
  ['CSC 162', 'jte2S2iWRMI', 'watch', 'Neso MP: Introduction to Microprocessors', 'Microcomputer hardware.', 'Microcomputer Hardware'],
  // ---------- CSC 182 (1 topic; stored title uses "Oop") ----------
  ['CSC 182', 'G_hWFHBH2Y0', 'watch', 'Neso C++: Keywords and Identifiers', 'C++ basics and object-oriented concepts.', 'C++ Basics & Oop Concepts'],
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
