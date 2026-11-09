// CSC 309 Artificial Intelligence video bank.
// Sourcing per docs/sourcing-quality-process.txt:
// - ONE winner per topic (order preserved); backups noted in research, NOT imported.
// - Stanford CS221, MIT 6.034, Stanford CS224N/CS231N, Neso prop/FOL,
//   UPenn semantic networks, MIT 6.868J Society of Mind, CS50 AI, Derek Banas,
//   Royal Institution, IBM Technology, Huddar.
// - Comments proof: MIT OCW deep threads; CS224N "democratizing access";
//   Stanford/MIT institutional authority; Neso "remembered for life".
// - GAPS (honest): lab practicals T28-T32, T34-T36 — hands-on build activities.
// - SINGLE-HOME: every video carries the EXACT curriculum topic title in `topic`.
// - Owner of bulk import: davidnwachukwum@gmail.com
// Re-runnable: wipes the course's videos first, inserts in topic order.
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
  ['CSC 309', 'yaLEGZuIIgE', 'watch', 'Stanford CS221 L1: AI Foundations', 'Overview of artificial intelligence.', 'Overview of Artificial Intelligence.'],
  ['CSC 309', '8FHBh_OmdsM', 'watch', 'Chris Bishop (Ri): AI, the History and Future', 'History of AI.', 'History of AI.'],
  ['CSC 309', 'xpIRp_Ylxpw', 'watch', 'Approaches to AI: Thinking and Acting', 'Goals of AI.', 'Goals of AI.'],
  ['CSC 309', 'WbzNRTTrX0g', 'watch', 'CS50 AI Lecture 0: Search', 'AI technique: search.', 'AI Technique.'],
  ['CSC 309', 'XFZ-rQ8eeR8', 'watch', 'IBM: The 7 Types of AI', 'Types of AI.', 'Types of AI.'],
  ['CSC 309', 'qYNweeDHiyU', 'watch', 'IBM: AI, ML, DL and GenAI Explained', 'Branches and applications of AI.', 'Branches and applications of AI.'],
  ['CSC 309', 'sfrg_5VkfK0', 'watch', 'Advantages and Disadvantages of AI', 'Advantages and disadvantages.', 'Advantages and Disadvantages.'],
  ['CSC 309', 'i-EtFuWHufc', 'watch', 'Bert Huang: Intelligent Agents', 'Introduction to intelligent agents.', 'Introduction to Intelligent Agents.'],
  ['CSC 309', 'DYTK4Y46fkE', 'watch', 'Intelligent Agent: Environment and Rationality', 'Agent performance, faculties, rationality, environment.', 'Agent Performance, Examples of Agents, Agent Faculties, Rationality, Agent Environment.'],
  ['CSC 309', 'PimSbFrwXM', 'watch', 'MIT 6.034 L19: Agent Architectures', 'Architectures: GPS, SOAR, subsumption, society of mind.', 'Agent Architectures.'],
  ['CSC 309', '4Iu4KPVbnAY', 'watch', 'Stanford CS221 L6: Search II', 'Search.', 'Search.'],
  ['CSC 309', 'STjW3eH1-j4c', 'watch', 'MIT 6.034 L6: Games, Minimax, Alpha-Beta', 'General classes of AI search problems.', 'General Classes of AI Search Algorithm Problems.'],
  ['CSC 309', 'j1H3jAAGlEA', 'watch', 'MIT 6.034 L4: DFS, Hill Climbing, Beam', 'Problem solving by search.', 'Problem Solving by Search.'],
  ['CSC 309', 'gGQ-vAmdAOI', 'watch', 'MIT 6.034 L5: Optimal Search, Branch and Bound, A*', 'Types of AI search techniques.', 'Types of AI Search Techniques and Strategies.'],
  ['CSC 309', 'TjZBTDzGeGg', 'watch', 'MIT 6.034 L1: Introduction and Scope', 'Types of problems and techniques in AI.', 'Introduction to the types of problems and techniques in AI.'],
  ['CSC 309', 'PNKj529yY5c', 'watch', 'MIT 6.034 L2: Goal Trees and Problem Solving', 'Problem-solving methods.', 'Problem-Solving methods.'],
  ['CSC 309', '0VS62q8U2iA', 'watch', 'Huddar: State Space Search', 'Major structures used in AI programmes.', 'Major structures used in AI programmes.'],
  ['CSC 309', 'HWQLez87vqM', 'watch', 'CS50 AI Lecture 1: Knowledge', 'Knowledge representation.', 'Knowledge Representation.'],
  ['CSC 309', 'x9Mbqu06OVo', 'watch', 'Stanford CS221 L16: Logic II', 'KR and reasoning challenges.', 'KR and Reasoning Challenges.'],
  ['CSC 309', 'xL0kNw5TudI', 'watch', 'Stanford CS221 (2019) Logic 1: Propositional Logic', 'KR languages.', 'KR Languages.'],
  ['CSC 309', 'ARywou8HLQk', 'watch', 'Neso: Introduction to First Order Logic', 'Predicate logic, non-monotonic and probabilistic reasoning.', 'Knowledge representation techniques such as predicate logic, non-monotonic logic, and probabilistic reasoning.'],
  ['CSC 309', 'dU9WsMglBSM', 'watch', 'UPenn: Semantic Networks and Frames', 'Semantic networks: relationships and inheritance.', 'Semantic Network - types of relationships, semantic network inheritance, types and components.'],
  ['CSC 309', 'o6suzoRLZD4', 'watch', 'Minsky: Society of Mind, Common Sense (MIT 6.868J)', 'Introduction to frames.', 'Introduction to Frames.'],
  ['CSC 309', 'DzpHeXVSC5I', 'watch', 'Stanford CS224N L1 (2024)', 'Natural language processing.', 'Natural Language Processing (NLP).'],
  ['CSC 309', 'KVKvde-_MYc', 'watch', 'Stanford CS224N L4: Dependency Parsing', 'NLU: syntactic and semantic structures.', 'Introduction to natural language understanding and various syntactic and semantic structures.'],
  ['CSC 309', 'leXa7EKUPFk', 'watch', 'MIT 6.034 L3: Goal Trees and Rule-Based Expert Systems', 'Expert systems: characteristics and components.', 'Introduction to Expert Systems - characteristics, components, types, requirements, technology, development.'],
  ['CSC 309', 'SykxWpFwMGs', 'watch', 'Derek Banas: Prolog Tutorial', 'Programming languages for AI.', 'Programming Languages for AI.'],
  ['CSC 309', '2fq9wYslV0A', 'watch', 'Stanford CS231N L1: Introduction (2025)', 'Computer image recognition.', 'Introduction to computer image recognition.'],
  ['CSC 309', 'i7oB0OGU3fc', 'watch', 'Huddar: Missionaries and Cannibals Solved Example', 'Search algorithms and communicating agents.', 'model to apply standard search algorithm to the classic search problem of missionaries and cannibals, and how to use communicating agents for searching networks.'],
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
