// CSC 308 (Operating Systems) + CSC 322 (Tech Entrepreneurship) video banks.
// Sourcing per docs/sourcing-quality-process.txt:
// - ONE winner per topic (order preserved); backups noted in research, NOT imported.
// - CSC 308: Neso Academy OS (real lectures) + CrashCourse CS (memory/files/I/O,
//   flagged x-course reuse) + Asianometry (history), TutorialsPoint (security),
//   MIT 6.824 (distributed systems), Guru99 (Linux processes), Edureka (UNIX).
// - CSC 322: Y Combinator How to Start a Startup lectures (Sam Altman, Graham,
//   Thiel, Chesky, Hoffman, Rabois, Andreessen, Levie).
// - Comments proof: Neso OS "followed before exams"; YC lectures are the
//   canonical startup curriculum (Stanford CS183B).
// - GAPS: 308T10 case studies, 308T11 hands-on lab, 308T14 teaching OSs,
//   322T11 technical presentations (no fitting video; never forced).
//   308T17 is a contributor topic ("How the operating system works") — skipped.
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
  // ---------- CSC 308 (14 of 17 core topics) ----------
  ['CSC 308', 'vBURTt97EkA', 'watch', 'Neso: Introduction to Operating Systems', 'Fundamentals of operating systems design and implementation.', 'Fundamentals of operating systems design and implementation.'],
  ['CSC 308', '1lG7lFLXBIs', 'watch', 'Asianometry: The Evolution of the Operating System', 'History and evolution of operating systems.', 'History and evolution of operating systems.'],
  ['CSC 308', '26QPDBe-NB8', 'watch', 'CrashCourse CS #18: Operating Systems', 'Types of operating systems.', 'Types of operating systems.'],
  ['CSC 308', 'fvN98a_7AT4', 'watch', 'Neso: Operating System Structure', 'Operating system structures.', 'Operating system structures.'],
  ['CSC 308', 'OrM7nZcxXZU', 'watch', 'Neso: Process Management (Processes and Threads)', 'Process management: processes, threads, scheduling, synchronisation.', 'Process management: processes, threads, CPU scheduling, process synchronisation.'],
  ['CSC 308', 'TQCr9RV7twk', 'watch', 'CrashCourse CS #19: Memory and Storage', 'Memory management and virtual memory.', 'Memory management and virtual memory.'],
  ['CSC 308', 'KN8YgJnShPM', 'watch', 'CrashCourse CS #20: Files and File Systems', 'File systems.', 'File systems;'],
  ['CSC 308', '4RPtJ9UyHS0', 'watch', 'CrashCourse CS #22: Keyboards and Command Line', 'I/O systems.', 'I/O systems;'],
  ['CSC 308', '3kKkOBClw1Q', 'watch', 'TutorialsPoint: Operating System Security', 'Security and protection.', 'Security and protection;'],
  ['CSC 308', 'cQP8WApzIQQ', 'watch', 'MIT 6.824 Lecture 1: Introduction to Distributed Systems', 'Distributed systems.', 'Distributed systems;'],
  ['CSC 308', 'P8GrPOpD8Sk', 'watch', 'Guru99: Process Management Commands in Linux', 'Process, memory, file and directory management under Linux.', 'All the process, memory, file and directory management issues will be demonstrated under the LINUX operating system.'],
  ['CSC 308', 'E002zp3E25M', 'watch', 'Edureka: Basic UNIX Commands', 'UNIX shell commands for beginners.', 'Also UNIX commands will be briefly discussed.'],
  ['CSC 308', 'g6QjVDyGgSE', 'watch', 'Neso: Scheduling Algorithms Solved Problems', 'Programming exercises simulating taught algorithms.', 'Another possibility is through programming exercises that implement and simulate algorithms taught.'],
  ['CSC 308', 'FYUi-u7UWgw', 'watch', 'Neso: The Dining Philosophers Problem', 'Deadlock simulation: producer-consumer and dining philosophers.', 'Simulation of CPU scheduling algorithms, producer-consumer problem, memory allocation algorithms, file organisation techniques, deadlock algorithms and disk scheduling algorithms.'],
  // ---------- CSC 322 (12 of 13; technical presentations = GAP) ----------
  ['CSC 322', 'CBYhVcO4WgI', 'watch', 'YC L1: How to Start a Startup (Altman, Moskovitz)', 'Fundamental concepts of innovation and business ideas.', 'Fundamental concepts of innovation and business ideas in general.'],
  ['CSC 322', 'sz_LgBAGYyo', 'watch', 'YC L7: How to Build Products Users Love (Hale)', 'Product development.', 'Product development.'],
  ['CSC 322', 'dQ7ZvO5DpIw', 'watch', 'YC L13: How to be a Great Founder (Hoffman)', 'Business leadership.', 'Business leadership.'],
  ['CSC 322', 'SHAh6WKBgiE', 'watch', 'YC L19: Sales and Marketing (Bosmeny)', 'Digital marketing.', 'Digital marketing.'],
  ['CSC 322', 'oQOC-qy-GDY', 'watch', 'YC L8: Doing Things That Don\u2019t Scale (Cheung)', 'Entrepreneurial opportunities in IT.', 'Entrepreneurial opportunities in IT.'],
  ['CSC 322', 'EHzvmyMJEK4', 'watch', 'YC L18: Legal and Accounting Basics (Nathoo, Levy)', 'Legal issues and business ethics.', 'Legal issues and Business ethics.'],
  ['CSC 322', 'ii1jcLg-eIQ', 'watch', 'YC L3: Before the Startup (Graham)', 'New venture creation process.', 'New venture creation process.'],
  ['CSC 322', 'qAws7eXItMk', 'watch', 'YC L16: How to Run a User Interview (Shear)', 'Business feasibility planning through user interviews.', 'Business feasibility planning.'],
  ['CSC 322', 'yP176MBG9Tk', 'watch', 'YC L4: Building Product, Talking to Users (Cheung)', 'Market research by talking to users.', 'Market research.'],
  ['CSC 322', '5_0dVHMpJlo', 'watch', 'YC L5: Competition is for Losers (Thiel)', 'Business strategy.', 'Business strategy.'],
  ['CSC 322', 'uFX95HahaUs', 'watch', 'YC L9: How to Raise Money (Andreessen, Conway, Conrad)', 'Business models, plans and fundraising.', 'Business models and Business plans.'],
  ['CSC 322', 'RfWgVWGEuGE', 'watch', 'YC L10: Culture (Chesky, Lin)', 'Airbnb story: report on a successful entrepreneurial outfit.', 'Report on a successful entrepreneurial outfit.'],
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
