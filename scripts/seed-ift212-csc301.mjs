// IFT 212 + CSC 301 video banks. Sourcing per docs/sourcing-quality-process.txt:
// - ONE winner per topic (order preserved); backups noted in research, NOT imported.
// - IFT 212: Ben Eater 8-bit computer (PLowKtXNTBypGqImE405J2565dvjafglHU, 44 eps)
//   + CrashCourse CS (PL8dPuuaLjXtNlUrzyH5r6jN9ulIgZBpdo) where Ben Eater has no match (flagged).
//   Comments proof: "hand drawn diagrams... enhancing the knowledge" [346 likes].
// - CSC 301: mycodeschool Data Structures (PL2_aWCzGMAwI3W_JlcBbtYTwiQSsOTa6P, 42 vids).
//   Proven swap: CSC 301 Apna -> mycodeschool. Comments proof: "understood everything for FREE" [1200 likes].
//   Do NOT reuse Abdul Bari (reserved for CSC 203).
// - SINGLE-HOME: every video carries the EXACT curriculum topic title in `topic`.
// - Owner of bulk import: davidnwachukwum@gmail.com
// Re-runnable: wipes each course's videos first, inserts in topic order.
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

// [courseCode, videoId, host, title, description, exactTopicTitle]
const ROWS = [
  // ---------- IFT 212 (19 topics) ----------
  ['IFT 212', 'HyznrdDSSGM', 'watch', '8-bit Computer Overview: Hardware and ISA', 'Principles of computer hardware and instruction set architecture.', 'Principles of computer hardware and instruction set architecture.'],
  ['IFT 212', 'AwUirxi9eBg', 'watch', 'Control Signals and Internal CPU Organisation', 'Internal CPU organisation and implementation.', 'Internal CPU organisation and implementation.'],
  ['IFT 212', 'FCscQGBIL-Y', 'watch', 'More Machine-Language Instructions', 'Instruction format and types, memory and I/O instructions.', 'Instruction format and types, memory, and I/O instructions.'],
  ['IFT 212', 'Zg1NdPKoosU', 'watch', 'Conditional Jumps: Dataflow and Flow Control', 'Dataflow, arithmetic and flow control instructions, addressing modes, stack operations.', 'Dataflow, arithmetic, and flow control instructions, addressing modes, stack operations, and interrupts.'],
  ['IFT 212', 'dXdoim96v5A', 'watch', 'Control Logic 1: Data Path and Control Unit', 'Data path and control unit design.', 'Data path and control unit design.'],
  ['IFT 212', 'JUVt_KYAp-I', 'watch', 'Reprogramming the Microcode', 'RTL, microprogramming and hardwired control.', 'RTL, microprogramming and hardwired control.'],
  ['IFT 212', 'AqNDk_UJW4k', 'watch', 'Turing Complete: Assembly Practice', 'The practice of assembly language programming.', 'The practice of assembly language programming.'],
  ['IFT 212', 'FnxPIZR1ybs', 'watch', 'RAM Intro: Memory Hierarchy', 'Memory hierarchy from registers to RAM.', 'Memory hierarchy.'],
  ['IFT 212', 'TQCr9RV7twk', 'watch', 'CrashCourse: Memory and Cache Basics', 'Closest match: cache and virtual memory survey; no Ben Eater equivalent.', 'Cache memory, Virtual memory.'],
  ['IFT 212', 'rtAlC5J1U40', 'watch', 'CrashCourse: Cache Performance', 'Closest match on cache performance.', 'Cache performance.'],
  ['IFT 212', 'RU1u-js7db8', 'watch', 'CrashCourse: Compilers and Cache Support', 'Closest match: compiler support for performance.', 'Compiler support for cache performance.'],
  ['IFT 212', 'dLh1n2dErzE', 'watch', 'Decimal Display: Computer Output', 'I/O organisations: getting data out of the computer.', 'I/O organisations.'],
  ['IFT 212', '-6JAgFWCL9w', 'watch', 'Connecting the Bus: Architecture Demo', 'Practical demonstration of a typical computer architecture.', 'Lab work: Practical demonstration of the architecture of a typical computer.'],
  ['IFT 212', 'dHWFpkGsxOs', 'watch', 'Control Logic 3: Executing Instructions', 'How different instruction types are executed.', 'Illustration of different types of instructions and how they are executed.'],
  ['IFT 212', 'ObnosznZvHY', 'watch', 'Flags Register: Simple Assembly', 'Simple assembly language programming with flags.', 'Simple Assembly Language programming.'],
  ['IFT 212', 'DlEa8kd7n3Q', 'watch', 'Hardware Interrupts (6502 Series)', 'Demonstration of interrupts.', 'Demonstration of interrupts.'],
  ['IFT 212', '4RPtJ9UyHS0', 'watch', 'CrashCourse: Keyboards, CLI and Batch Era', 'Closest match for MS-DOS batch, debugging, keyboard input and file/disk I/O era.', 'Programming assignments to practice MS-DOS batch programming, Assembly Process, Debugging, Procedures, Keyboard input, Video Output, File and Disk I/O, and Data Structure.'],
  ['IFT 212', 'zltgXvg6r3k', 'watch', 'CrashCourse: Instruction Sets incl. RISC', 'Closest match: instruction sets including reduced sets.', 'Demonstration of Reduced Instruction Set Computers.'],
  ['IFT 212', '6-tKOHICqrI', 'watch', 'CrashCourse: Moore Law, Multicore and Parallelism', 'Closest match: parallel architectures and interconnection networks.', 'Illustration of parallel architectures and interconnection networks.'],
  // ---------- CSC 301 (9 topics, mycodeschool) ----------
  ['CSC 301', '92S4zgXN17o', 'watch', 'Introduction to Data Structures', 'Primitive types, arrays, records, strings and string processing.', 'Primitive types, Arrays, Records Strings and String processing.'],
  ['CSC 301', 'hWokyBoo0aI', 'watch', 'Stack and Heap: BST Memory Allocation', 'Data representation in memory: stack and heap allocation, queues, trees.', 'Data representation in memory, Stack and Heap allocation, Queues, Trees.'],
  ['CSC 301', 'sFVxsglODoo', 'watch', 'Array Implementation of Stacks', 'Implementation strategies for stacks, queues and trees.', 'Implementation strategies for stack, queues, trees.'],
  ['CSC 301', 'cAZ8CyDY56s', 'watch', 'Dynamic Allocation: malloc-style Insert', 'Closest match for run-time storage management.', 'Run time storage management;'],
  ['CSC 301', 'NobHlGUjV3g', 'watch', 'Pointers and Linked Structures', 'Pointers and references, linked structures.', 'Pointers and References, linked structures.'],
  ['CSC 301', 'COZK7NATh4k', 'watch', 'BST Implementation in C/C++', 'Lab: C/C++ functions on arrays, records, strings, queues, trees, pointers.', 'Lab work: Writing C+/C++ functions to perform practical exercises and implement using the algorithms on arrays, records, string processing, queues, trees, pointers and linked structures.'],
  ['CSC 301', 'gXgEDyodOJU', 'watch', 'Graphs and Their Representation', 'Graphs and their representation.', 'Graphs and their representation.'],
  ['CSC 301', 'DuDz6B4cqVc', 'watch', 'CrashCourse: Hash Tables', 'No mycodeschool hashing video; closest match on hashing and hash tables.', 'Hashing and hash tables.'],
  ['CSC 301', 'pkkFqlG0Hds', 'watch', 'Sorting Algorithms Intro', 'Sorting and searching algorithms.', 'Sorting and searching algorithms.'],
];

async function seed() {
  const c = new MongoClient(URI, { connectTimeoutMS: 20000, serverSelectionTimeoutMS: 20000 });
  await c.connect();
  const db = c.db();
  const byCourse = {};
  for (const [courseCode, id, host, title, description, topic] of ROWS) {
    const url = YT(id);
    (byCourse[courseCode] = byCourse[courseCode] || []).push({ courseCode, url, title, description, topic });
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
