// CYB 203 + SEN 201 video banks. Sourcing per docs/sourcing-quality-process.txt:
// - ONE winner per topic (order preserved); backups noted in research, NOT imported.
// - CYB 203 (Cybercrime, Law and Countermeasures): Professor Messer SY0-701
//   (PLG49S3nxzAnl4QDVqK-hOnoqcSKEIDDuv). Comments proof: Sec+ pass testimonies
//   (842 score, age-73 first-try pass). GAPS: OSN investigation, multi-jurisdiction
//   survey, Nigeria framework x2 (need local sources; never forced).
// - SEN 201 (Software Engineering): NPTEL Software Engineering (Prof. Rajib Mall,
//   PLbRMhDVUMngf8oZR3DpKMvYhZKga90JVt) + NPTEL Software Project Management,
//   Ian Sommerville curated lectures, Fairbanks/Richards/NTNU institutional sources.
//   Comments proof: NPTEL "you won't forget a word"; Swayam 28.6K enrolled.
//   GAP: SE and law (ethics talk does not qualify).
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
  // ---------- CYB 203 (11 of 15) ----------
  ['CYB 203', '6xUH0t6ugIM', 'watch', 'Messer: Threat Actors', 'General introduction on cybercrime through threat actors.', 'General introduction on cybercrime.'],
  ['CYB 203', '4lAbGpTDZ18', 'watch', 'Messer: Common Threat Vectors', 'Definition of cybercrime through common threat vectors.', 'Definition of cybercrime.'],
  ['CYB 203', 'HDiNPPrGhzE', 'watch', 'Messer: Other Infrastructure Concepts', 'Types of cybercrime and threats to critical infrastructure.', 'Types and categories of cybercrime and threats to the national critical infrastructure.'],
  ['CYB 203', 'X2UiMLxRdhE', 'watch', 'Messer: Incident Response', 'Investigation process and procedure for cybercrime.', 'Investigation process and procedure for cybercrime.'],
  ['CYB 203', 'akoDmeV3LQo', 'watch', 'Messer: Social Engineering Attacks', 'Strategies of cybercrime perpetrators.', 'Strategies of cybercrime perpetrators.'],
  ['CYB 203', 'Fc8ZJfmapbI', 'watch', 'Messer: Mitigation Techniques', 'Ways of curbing and preventing cybercrime.', 'Possible ways of curbing/preventing them.'],
  ['CYB 203', 'x72hG9GvkaQ', 'watch', 'Messer: Indicators of Compromise', 'Technical aspects of investigations, threats, attacks and defences.', 'Technical aspects of computer cybercrime investigations, threats, and types of attacks and defences used by terrorists and criminals.'],
  ['CYB 203', 'UtDWApdO8Zk', 'watch', 'Messer: Digital Forensics', 'Computer and network forensics investigations.', 'Concepts, trends, and methods in computer and network forensics investigations.'],
  ['CYB 203', 'EDru1LTYDJw', 'watch', 'Messer: Log Data', 'Digital evidence collection and evaluation from logs.', 'Skills and knowledge in digital evidence collection and evaluation.'],
  ['CYB 203', 'WGXrbAh0LUI', 'watch', 'Messer: Privacy', 'Policies, legal issues, jurisdiction and privacy.', 'Policies, legal issues, international jurisdiction, and privacy issues.'],
  ['CYB 203', '5kY9kvzeWjA', 'watch', 'Messer: Security Policies', 'Introduction to cyber law and countermeasures.', 'Introduction to cyber law and countermeasures.'],
  // ---------- SEN 201 (25 of 26; SE-and-law = GAP) ----------
  ['SEN 201', 'Ln_LP7c23WM', 'watch', 'NPTEL L01: Introduction to Software Engineering', 'Software engineering concepts and principles.', 'Software Engineering concepts and principles.'],
  ['SEN 201', 'Z2no7DxDWRI', 'watch', 'Sommerville: Fundamental Activities of SE', 'Design, development and testing of software systems.', 'Design, development and testing of software systems.'],
  ['SEN 201', 'OT2O7uNldQk', 'watch', 'NPTEL L06: Life Cycle Model', 'Software processes: lifecycle and process models.', 'Software processes: software lifecycle and process models.'],
  ['SEN 201', 'x9OHuhxICRw', 'watch', 'NPTEL SPM: ISO 9001 and SEI CMM', 'Process assessment models.', 'Process assessment models.'],
  ['SEN 201', 'bfx1u27hvvU', 'watch', 'NPTEL SPM: Personal Software Process', 'Software process metrics.', 'Software process metrics.'],
  ['SEN 201', '_ziaLmfToSk', 'watch', 'NPTEL L07: Life Cycle Model Continued', 'Life cycle of software system.', 'Life cycle of software system.'],
  ['SEN 201', 'l9XFipXoJb0', 'watch', 'NPTEL L15: Requirement Specification Intro', 'Software requirements and specifications.', 'Software requirements and specifications.'],
  ['SEN 201', '5q_KBeNlRFk', 'watch', 'NPTEL L19: Design Fundamentals', 'Software design.', 'Software design.'],
  ['SEN 201', 'Rn1g6V-vlHw', 'watch', 'Fairbanks: What is Software Architecture?', 'Software architecture.', 'Software architecture.'],
  ['SEN 201', '3CnuwmF-e-Y', 'watch', 'Software Metrics: Friend or Foe?', 'Software metrics debate.', 'Software metrics.'],
  ['SEN 201', '_9bmWEMhGFU', 'watch', 'NPTEL L43: Testing Basic Concepts I', 'Software quality and testing.', 'Software quality and testing.'],
  ['SEN 201', 'Ic6q7S48Mho', 'watch', 'Richards Lesson 6: Classifying Architecture Patterns', 'Software architecture patterns.', 'Software architecture.'],
  ['SEN 201', 'TSacDWHGlWU', 'watch', 'NPTEL L45: Testing Basic Concepts III', 'Software validation through testing.', 'Software validation.'],
  ['SEN 201', '0HUU612UuXI', 'watch', 'IIT Bombay L25: Software Evolution', 'Software evolution and maintenance.', 'Software evolution: software maintenance;'],
  ['SEN 201', 'ahr9l4TEIk4', 'watch', 'SECourses L9: Evolution, Maintenance and Legacy', 'Characteristics of maintainable software.', 'characteristics of maintainable software;'],
  ['SEN 201', 'UXERB3xFgc4', 'watch', 'TutorialsPoint: Software Re-engineering', 'Re-engineering.', 're-engineering;'],
  ['SEN 201', 'sJPRgYHHA_w', 'watch', 'Sommerville: Legacy Systems Intro', 'Legacy systems.', 'legacy systems;'],
  ['SEN 201', 'feAZV7Ofov4', 'watch', 'Sommerville: Reuse Landscape', 'Software reuse.', 'software reuse.'],
  ['SEN 201', 'gi5kxGslkNc', 'watch', 'Sommerville: 10 Questions to Introduce SE', 'SE and its place as a computing discipline.', 'Software Engineering and its place as a computing discipline.'],
  ['SEN 201', 'TQWJYqOzs0g', 'watch', 'NPTEL SPM L32: Team Management', 'Team management in software projects.', 'Software project management: team management;'],
  ['SEN 201', 'AvwZ7JO8LNk', 'watch', 'NPTEL SPM L26: Project Scheduling', 'Project scheduling.', 'project scheduling;'],
  ['SEN 201', '0mpuhlabOWE', 'watch', 'NPTEL SPM L16: Estimation Techniques', 'Software measurement and estimation techniques.', 'software measurement and estimation techniques;'],
  ['SEN 201', 'wjd0YMixlJA', 'watch', 'NPTEL SPM L34: Team Structure and Risk', 'Risk analysis.', 'risk analysis;'],
  ['SEN 201', 'zQXss82WudM', 'watch', 'NPTEL SPM L51: Quality Management', 'Software quality assurance.', 'software quality assurance;'],
  ['SEN 201', 'i2E1VDjmrXo', 'watch', 'NTNU: Configuration Management', 'Software configuration management.', 'software configuration management.'],
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
