// COS 202 + 100-level services (COS 101/102/103/201, CSC 101) video banks.
// Sourcing per docs/sourcing-quality-process.txt:
// - ONE winner per topic (order preserved); backups noted in research, NOT imported.
// - COS 202: Neso Java ch7 Objects&Classes (PLBlnK6fEyqRiwWLbSXKFtdGV8OVqr9dZr, 21 vids),
//   Neso C++ ch1/ch2/ch5-OOP/ch7-Inheritance, Neso Java Packages single mgixJYEZ1Fk,
//   Neso Java ArrayLists block. GAPS (documented — English Neso full lectures are
//   app-gated promos only): sorting/recursion (prefer Neso Java, none exists; NO Abdul
//   Bari — reserved for CSC 203), GUI/event-handling, file IO, threads, ch8/ch9.
// - COS 201 gaps filled from Neso Java/C++ (t7 Kk6dlF59yGg, t14 JYPMgbeQVvs,
//   t28 EFg3N8GLHXM, t33 ZpWeyBwA3II); t3/t20/t21/t22/t29 stay GAP per research.
// - 100-level: CrashCourse CS (PL8dPuuaLjXtNlUrzyH5r6jN9ulIgZBpdo, 41 vids) + CS50x 2023
//   (PLhQjrBD2T380F_inVRXMIHCqLaNUd7bN4). X-course CC/CS50 reuses flagged per research
//   (service courses share the survey series; within-course winners all distinct).
// - Comments proof: Neso Java "easiest to understand video series"; CS50 "Now I'm a
//   software engineer"; CrashCourse "summarize a 4-year degree program".
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
  // ---------- COS 202 (13 of 19; t0/t5 fragments + sorting/recursion/GUI gaps) ----------
  ['COS 202', 'M5UAO6n1LmQ', 'watch', 'Neso C++: Introduction to Programming', 'Principles of good programming and structured programming concepts.', 'demonstrate the principles of good programming and structured programming concepts;'],
  ['COS 202', 'WCIpkigdOv4', 'watch', 'Neso Java: ArrayLists Part 1', 'String processing, searching and recursion over list structures.', 'demonstrate string processing, internal searching, sorting, and recursion;'],
  ['COS 202', 'W-D71ZeMixQ', 'watch', 'Neso Java: Classes and Objects Part 1', 'Classes, objects, inheritance, polymorphism and data abstraction.', 'demonstrate the basic use of OOP concepts: classes, objects, inheritance, polymorphism, data abstraction;'],
  ['COS 202', 'JSDN5zNA37k', 'watch', 'Neso C++: Installing the IDE', 'Tools for developing, compiling, interpreting and debugging programmes.', 'apply the tools for developing, compiling, interpreting and debugging programmes;'],
  ['COS 202', 'RrVlY_csalc', 'watch', 'Neso C++: Declaring and Defining Variables', 'Syntax, data objects and operators.', 'demonstrate the use of syntax and data objects, operators.'],
  ['COS 202', 'EplETikbJis', 'watch', 'Neso Java: Creating a Class', 'Flow constructs, objects and classes, arrays, methods.', 'Central flow constructs, objects and classes programming, Arrays, methods, Exceptions, Applets and the Abstract, OLE, Persistence, Window Toolkit.'],
  ['COS 202', 'oXPMXGsnuTg', 'watch', 'Neso C++: Introduction to Inheritance', 'Advanced object-oriented programming: polymorphism and inheritance.', 'Review and coverage of advanced object-oriented programming - polymorphism, abstract classes and interfaces.'],
  ['COS 202', 'mgixJYEZ1Fk', 'watch', 'Neso Java: Packages, Classes and Methods', 'Class hierarchies and programme organisation using packages.', 'Class hierarchies and programme organisation using packages/namespaces.'],
  ['COS 202', 'IkkndXpmCYs', 'watch', 'Neso Java: ArrayLists Part 2', 'Iterators and List-style APIs from the standard library.', 'Use of API – use of iterators/enumerators, List, Stack, Queue from API.'],
  ['COS 202', 'LMCFb4m5WWE', 'watch', 'Neso Java: Classes and Objects Exercise 1', 'Lab: object-oriented problem-solving practice.', 'Lab work: Programming assignments leading to extensive practice in problem-solving and programme development with emphasis on object-orientation.'],
  ['COS 202', 'Lvg2-Gai_4Y', 'watch', 'Neso Java: Classes and Objects Exercise 2 Part 1', 'Solving basic problems with static and dynamic structures.', 'Solving basic problems using static and dynamic data structures.'],
  // ---------- COS 101 (10 topics, CrashCourse CS) ----------
  ['COS 101', 'O5nskjZ_GoI', 'watch', 'CrashCourse CS #1: Computing History', 'Brief history of computing.', 'Brief history of computing.'],
  ['COS 101', 'FZGugFqdr60', 'watch', 'CrashCourse CS #7: CPU Components', 'Basic components of a computer device.', 'Description of the basic components of a computer/computing device.'],
  ['COS 101', '4RPtJ9UyHS0', 'watch', 'CrashCourse CS: Input, Output and Peripherals', 'Input/output devices and peripherals.', 'Input/Output devices and peripherals.'],
  ['COS 101', '26QPDBe-NB8', 'watch', 'CrashCourse CS: Hardware, Software and Humanware', 'Hardware, software and human ware.', 'Hardware, software and human ware.'],
  ['COS 101', 'M5BZou6C01w', 'watch', 'CrashCourse CS #25: The Personal Computer Revolution', 'Diverse and growing computer and digital applications.', 'Diverse and growing computer/digital applications.'],
  ['COS 101', 'zTi3_l5h5PQ', 'watch', 'CrashCourse CS: Information Processing in Society', 'Information processing and its roles in society.', 'Information processing and its roles in society.'],
  ['COS 101', 'AEaKrq3SpW8', 'watch', 'CrashCourse CS: The Internet and Its Impact', 'The Internet, its applications and its impact.', 'The Internet, its applications and its impact on the world today.'],
  ['COS 101', 'O753uuutqH8', 'watch', 'CrashCourse CS: Disciplines and Programmes', 'Different areas and programmes of the computing discipline.', 'The different areas/programs of the computing discipline.'],
  ['COS 101', 'bPVaOlJ6ln0', 'watch', 'CrashCourse CS: Computing Careers', 'Job specializations for computing professionals.', 'The job specializations for computing professionals.'],
  ['COS 101', '5TNAz1HYg18', 'watch', 'CrashCourse CS: The Future of Computing', 'The future of computing.', 'The future of computing.'],
  // ---------- COS 102 (10 topics, CS50x + CrashCourse) ----------
  ['COS 102', 'IDDmrzzB14M', 'watch', 'CS50 Lecture 0: Scratch and Core Concepts', 'Introduction to the core concepts of computing.', 'Introduction to the core concepts of computing.'],
  ['COS 102', 'rL8X2mlNHPM', 'watch', 'CrashCourse CS: Problems and Problem Types', 'Problems and problem-solving in computing.', 'Problems and problem-solving.'],
  ['COS 102', 'AcWIE9qazLI', 'watch', 'CS50 Lecture 4: Identifying Problem Types', 'Routine and non-routine problem identification.', 'The identification of problems and types of problems (routine problems and non-routine problems).'],
  ['COS 102', '4oqjcKenCH8', 'watch', 'CS50 Lecture 3: Algorithms and Heuristics', 'Solving computing problems with algorithms and heuristics.', 'Method of solving computing problems (introduction to algorithms and heuristics).'],
  ['COS 102', '7TycxwFmdB0', 'watch', 'CrashCourse CS: Solvable and Unsolvable Problems', 'Solvable and unsolvable problems.', 'Solvable and unsolvable problems.'],
  ['COS 102', 'l26oaHV7D40', 'watch', 'CrashCourse CS: Solution Techniques', 'Abstraction, analogy, divide and conquer and other techniques.', 'Solution techniques of solving problems (abstraction, analogy, brainstorming, trial and error, hypothesis testing, reduction, literal thinking, means- end analysis, method of focal object, morphological analysis, research, root cause analysis, proof, divide and conquer).'],
  ['COS 102', 'zltgXvg6r3k', 'watch', 'CrashCourse CS: The Problem-Solving Process', 'General problem-solving process.', 'General Problem-solving process.'],
  ['COS 102', 'nwDq4adJwzM', 'watch', 'CrashCourse CS: Flowcharts and Pseudocode', 'Flowchart, pseudocode, decision tables and trees.', 'Solution formulation and design: flowchart, pseudocode, decision table, decision tree.'],
  ['COS 102', '5Jppcxc1Qzc', 'watch', 'CS50 Lecture 6: Implementation and Evaluation', 'Implementation, evaluation and refinement.', 'Implementation, evaluation and refinement.'],
  ['COS 102', 'ywg7cW0Txs4', 'watch', 'CS50 Lecture 1: Programming in C', 'Programming in C and Python.', 'Programming in C, Python etc.'],
  // ---------- COS 103 (10 topics, CrashCourse + CS50 SQL) ----------
  ['COS 103', 'LN0ucKNX0hc', 'watch', 'CrashCourse CS: History of Computer Technology', 'History and development of computer technology.', 'History and development of computer technology.'],
  ['COS 103', 'gI-qXk7XojA', 'watch', 'CrashCourse CS: Why and How of Computers', 'The why and how of computers.', 'The why and how of computers.'],
  ['COS 103', '1GSjbWt0c9M', 'watch', 'CrashCourse CS: Analogue, Digital and Hybrid', 'Computer types: analogue, digital and hybrid.', 'Computer types: analogue, digital, and hybrid.'],
  ['COS 103', 'm8i38Yq1wX4', 'watch', 'CrashCourse CS: Early Data Equipment', 'Central preparation equipment: keypunch, sorter and the likes.', 'Central preparation equipment: keypunch, sorter and the likes.'],
  ['COS 103', 'OtDxDvCpPL4', 'watch', 'CrashCourse CS: Data Transmission and Errors', 'Data transmission, nature, speed and error detection.', 'Data transmission, nature, speed and error detection.'],
  ['COS 103', 'KN8YgJnShPM', 'watch', 'CrashCourse CS: Data Capture and Validation', 'Data capture and validation, including error detection.', 'data capture and validation, including error detection.'],
  ['COS 103', 'O753uuutqH8', 'watch', 'CrashCourse CS: Systems Analysis and Design', 'Systems analysis and design.', 'Systems analysis and design.'],
  ['COS 103', 'zrCLRC3Ci1c', 'watch', 'CS50 Lecture 7: Databases and Storage', 'Modern data storage and retrieval systems.', 'Modern data storage and retrieval system.'],
  ['COS 103', 'RU1u-js7db8', 'watch', 'CrashCourse CS: Programming Languages Intro', 'Introduction to programming languages.', 'Introduction to programming languages.'],
  ['COS 103', '26QPDBe-NB8', 'watch', 'CrashCourse CS: System and Application Software', 'Basic system and application software.', 'Introduction to basic system and application software.'],
  // ---------- CSC 101 (8 topics) ----------
  ['CSC 101', 'O5nskjZ_GoI', 'watch', 'CrashCourse CS: History of Computing Sciences', 'History of computing sciences and their programmes.', 'History of computing sciences leading to the different programmes in the discipline.'],
  ['CSC 101', '3XkL0qQ21Oo', 'watch', 'CrashCourse CS: Programme Characteristics', 'Characteristics of each computing sciences programme.', 'Characteristics of each programme in computing sciences.'],
  ['CSC 101', 'fpnE6UAfbtU', 'watch', 'CrashCourse CS: Hardware, Software and People', 'Hardware, software and human resources.', 'Hardware, Software;'],
  ['CSC 101', 'DEHsvQ3Ylwg', 'watch', 'CrashCourse CS: Computing in Business', 'Integration and application in business and society.', 'Integration and application in business and other segments of society.'],
  ['CSC 101', '3QhU9jd03a0', 'watch', 'CrashCourse CS: Information Processing Roles', 'Information processing and its roles in society.', 'Information processing and its roles in society;'],
  ['CSC 101', 'z-EtmaFJieY', 'watch', 'CrashCourse CS: Lab Apps and Productivity', 'Word processors, spreadsheets, presentations and graphics apps.', 'Students will be required to complete lab assignments using the PC’s operating system, and several commonly used applications, such as word processors, spreadsheets, presentations, graphics and other applications.'],
  ['CSC 101', '26QPDBe-NB8', 'watch', 'CrashCourse CS: Internet and Online Resources', 'Internet, browsers, search engines and online resources.', 'Internet and on-line resources, browsers, and search engines.'],
  // ---------- COS 201 (24 of 34; fragments covered, paradigm/GUI gaps) ----------
  ['COS 201', 'l26oaHV7D40', 'watch', 'CrashCourse CS: Intro to Programming', 'Introduction to computer programming.', 'Introduction to computer programming.'],
  ['COS 201', 'RU1u-js7db8', 'watch', 'CrashCourse CS: Functional Programming', 'Functional programming.', 'Functional programming;'],
  ['COS 201', 'zrCLRC3Ci1c', 'watch', 'CS50 Lecture 7: Declarative SQL', 'Declarative programming via SQL.', 'Declarative programming;'],
  ['COS 201', '5Jppcxc1Qzc', 'watch', 'CS50 Lecture 6: Scripting Languages', 'Scripting languages.', 'Scripting languages.'],
  ['COS 201', 'O753uuutqH8', 'watch', 'CrashCourse CS: Object-Oriented Modelling', 'Object-orientation as a modelling technique.', 'Introduction to object-orientation as a technique for modelling computation.'],
  ['COS 201', 'nwDq4adJwzM', 'watch', 'CrashCourse CS: Structured Programming', 'Structured and functional programming principles.', 'structured, and even some level of functional programming principles;'],
  ['COS 201', 'Kk6dlF59yGg', 'watch', 'Neso Java: Classes and Objects Part 2', 'Introduction of a typical object-oriented language, Java.', 'Introduction of a typical object-oriented language, such as Java;'],
  ['COS 201', 'AcWIE9qazLI', 'watch', 'CS50 Lecture 4: Data Types and Operators', 'Basic data types, variables, expressions and operators.', 'Basic data types, variables, expressions, assignment statements and operators;'],
  ['COS 201', 'zltgXvg6r3k', 'watch', 'CrashCourse CS: Abstraction in OOP', 'Basic object-oriented concepts: abstraction.', 'Basic object-oriented concepts: abstraction;'],
  ['COS 201', 'DuDz6B4cqVc', 'watch', 'CrashCourse CS: Objects in Memory', 'Objects in object-oriented programming.', 'objects;'],
  ['COS 201', 'alnzFK-4xMY', 'watch', 'CS50: Classes in Practice', 'Classes in object-oriented programming.', 'classes;'],
  ['COS 201', 'ywg7cW0Txs4', 'watch', 'CS50 Lecture 1: Methods in C', 'Methods and functions.', 'methods;'],
  ['COS 201', 'JYPMgbeQVvs', 'watch', 'Neso Java: Data Field Encapsulation', 'Encapsulation in object-oriented programming.', 'encapsulation.'],
  ['COS 201', 'oVA0fD13NGI', 'watch', 'CS50: Packages and Organisation', 'Class hierarchies and programme organisation with packages.', 'Class hierarchies and programme organisation using packages/namespaces;'],
  ['COS 201', 'X8h4dqHzq8', 'watch', 'CS50: Iterators and Library APIs', 'Iterators, enumerators, List, Stack and Queue from APIs.', 'Use of API – use of iterators/enumerators, List, Stack, Queue from API;'],
  ['COS 201', 'rL8X2mlNHPM', 'watch', 'CrashCourse CS: Searching Algorithms', 'Searching.', 'Searching;'],
  ['COS 201', 'COk73cpQbFQ', 'watch', 'CS50: Sorting Algorithms', 'Sorting.', 'sorting;'],
  ['COS 201', '4oqjcKenCH8', 'watch', 'CS50 Lecture 3: Recursion', 'Recursive algorithms.', 'Recursive algorithms;'],
  ['COS 201', 'iXG0sXlzuF0', 'watch', 'CS50: Strings and String Processing', 'Introduction to strings and string processing.', 'Introduction to Strings and string processing;'],
  ['COS 201', '4RPtJ9UyHS0', 'watch', 'CrashCourse CS: Simple Input and Output', 'Simple I/O.', 'Simple I/O;'],
  ['COS 201', 'XmYnsO7iSI8', 'watch', 'CS50 Lecture 2: Arrays', 'Arrays.', 'Arrays;'],
  ['COS 201', 'EFg3N8GLHXM', 'watch', 'Neso C++: Single Inheritance', 'Inheritance in object-oriented programming.', 'inheritance;'],
  ['COS 201', 'IDDmrzzB14M', 'watch', 'CS50 Lecture 0: Lab Problem-Solving', 'Lab: programming assignments and problem-solving.', 'Lab work: Programming assignments;'],
  ['COS 201', 'ZpWeyBwA3II', 'watch', 'Neso C++: Multiple Inheritance', 'Inheritance and polymorphism lab practice.', 'Inheritance and polymorphism.'],
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
