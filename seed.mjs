import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz';

const DEPARTMENTS = [
  { code: 'GSS', title: 'General Studies', color: '#130f40' },
  { code: 'COS', title: 'Computer Science', color: '#1a5276' },
  { code: 'CSC', title: 'Computer Science', color: '#1a5276' },
  { code: 'MTH', title: 'Mathematics', color: '#7d3c98' },
  { code: 'PHY', title: 'Physics', color: '#c0392b' },
];

async function seed() {
  const c = new MongoClient(URI, { connectTimeoutMS: 10000, serverSelectionTimeoutMS: 10000 });
  await c.connect();
  const db = c.db();
  console.log('Connected.');

  const COURSE_CODE = 'GSS 212';

  // Clear all collections
  await db.collection('courses').deleteMany({});
  await db.collection('categories').deleteMany({});
  await db.collection('questions').deleteMany({});
  await db.collection('videos').deleteMany({});
  await db.collection('readings').deleteMany({});
  await db.collection('departments').deleteMany({});
  await db.collection('curriculum').deleteMany({});
  console.log('Cleared old data.');

  // Departments
  await db.collection('departments').insertMany(DEPARTMENTS);

  // Course
  await db.collection('courses').insertOne({
    code: COURSE_CODE, title: 'Philosophy & Logic',
    description: 'Comprehensive study of Western philosophy from ancient Greece to contemporary thought, plus formal logic.',
    icon: 'F', color: '#130f40',
  });

  // Compute categories dynamically
  const allCats = await db.collection('courses').find({}).toArray();
  const countByPrefix = {};
  for (const c of allCats) {
    const prefix = c.code.split(/\s/)[0];
    countByPrefix[prefix] = (countByPrefix[prefix] || 0) + 1;
  }
  for (const dept of DEPARTMENTS) {
    await db.collection('categories').insertOne({
      code: dept.code, title: dept.title,
      color: dept.color, courseCount: countByPrefix[dept.code] || 0,
    });
  }
  console.log('Course + categories inserted.');

  // Curriculum
  for (const deptCode of ['GSS']) {
    await db.collection('curriculum').insertOne({
      department_code: deptCode, level: '200 Level',
      course_codes: [COURSE_CODE],
    });
  }

  // Questions from JSON
  const jsonPath = join(__dirname, '..', 'gss212.json');
  const raw = readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(raw);
  const questionDocs = [];
  for (const section of data.sections) {
    for (const q of section.questions) {
      questionDocs.push({
        courseCode: COURSE_CODE, section: section.section_title,
        id: q.id, question: q.question, options: q.options,
        correctAnswer: q.correct_answer, explanation: q.explanation || '',
      });
    }
  }
  await db.collection('questions').insertMany(questionDocs);
  console.log(`${questionDocs.length} questions inserted.`);

  // Videos
  const videos = [
    { courseCode: 'GSS 212', title: 'Introduction to Philosophy', url: 'https://youtu.be/1A_CAkYt3GY', order: 1, description: 'Overview of Western philosophy from ancient to modern.' },
    { courseCode: 'GSS 212', title: 'Socrates, Plato & Aristotle', url: 'https://youtu.be/_mclDkOVS6Q', order: 2, description: 'The three great philosophers of ancient Greece.' },
    { courseCode: 'GSS 212', title: 'Medieval Philosophy & St. Augustine', url: 'https://youtu.be/VPz2JMEwG_8', order: 3, description: 'Faith and reason in the medieval period.' },
    { courseCode: 'GSS 212', title: 'Descartes & Modern Philosophy', url: 'https://youtu.be/CAjWUrWvXj4', order: 4, description: 'The father of modern philosophy and his method of doubt.' },
    { courseCode: 'GSS 212', title: 'Introduction to Logic', url: 'https://youtu.be/VzK5vLpN0OY', order: 5, description: 'Basic concepts of formal logic and argument structure.' },
    { courseCode: 'GSS 212', title: 'Critical Thinking & Fallacies', url: 'https://youtu.be/AMDJT1RN6cE', order: 6, description: 'Common logical fallacies and how to spot them.' },
  ];
  await db.collection('videos').insertMany(videos);
  console.log(`${videos.length} videos inserted.`);

  // Readings from read.html
  const storyPath = join(__dirname, '..', 'read.html');
  const storyHtml = readFileSync(storyPath, 'utf-8');
  const bodyMatch = storyHtml.match(/<body>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    const sections = bodyMatch[1].split(/(?=<h[12]>Chapter\s+\w+)/).filter(s => s.trim());
    const readings = [];
    for (const section of sections) {
      const chapterMatch = section.match(/<h[12]>(Chapter\s+\w+[^<]*)<\/h[12]>/i);
      if (chapterMatch) {
        readings.push({
          courseCode: 'GSS 212', title: chapterMatch[1].trim(),
          order: readings.length + 1, content: section.trim(),
        });
      }
    }
    await db.collection('readings').insertMany(readings);
    console.log(`${readings.length} readings inserted.`);
  }

  await c.close();
  console.log('Seed complete!');
}

seed().catch(e => { console.error('Seed failed:', e.message); process.exit(1) });
