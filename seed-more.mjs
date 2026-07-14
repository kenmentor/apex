import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz';

async function main() {
  const c = new MongoClient(URI, { connectTimeoutMS: 10000, serverSelectionTimeoutMS: 10000 });
  await c.connect();
  const db = c.db();
  console.log('Connected.');

  // ── Ensure departments exist ──
  const departments = [
    { code: 'COS', title: 'Computer Science', color: '#1a5276' },
    { code: 'CSC', title: 'Computer Science', color: '#1a5276' },
  ];
  for (const dept of departments) {
    const exists = await db.collection('departments').findOne({ code: dept.code });
    if (!exists) {
      await db.collection('departments').insertOne(dept);
      console.log(`Department ${dept.code} created.`);
    }
  }

  // ── Define courses ──
  const courses = [
    { file: 'CSC282 (2).json', code: 'CSC 282', title: 'Computer Lab 2B: Java OOP', icon: '☕', color: '#e67e22', dept: 'CSC', level: '200 Level' },
    { file: 'COS202.json', code: 'COS 202', title: 'Computer Programming II', icon: '💻', color: '#2980b9', dept: 'COS', level: '200 Level' },
  ];

  for (const course of courses) {
    const jsonPath = join(__dirname, '..', course.file);
    const raw = readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(raw);

    const existing = await db.collection('courses').findOne({ code: course.code });
    if (existing) {
      console.log(`${course.code} already exists. Skipping.`);
      continue;
    }

    await db.collection('courses').insertOne({
      code: course.code,
      title: course.title,
      description: data.study_guide_title || '',
      icon: course.icon,
      color: course.color,
    });

    // Questions use the clean course.code, NOT data.course_code from JSON
    const questionDocs = [];
    for (const section of data.sections) {
      const sectionName = section.section_title;
      for (const q of section.questions) {
        questionDocs.push({
          courseCode: course.code,
          section: sectionName,
          id: q.id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correct_answer,
          explanation: q.explanation || '',
        });
      }
    }
    await db.collection('questions').insertMany(questionDocs);

    console.log(`${course.code} — ${questionDocs.length} questions imported.`);

    // ── Ensure curriculum entry exists ──
    const currExists = await db.collection('curriculum').findOne({
      department_code: course.dept,
      level: course.level,
    });
    if (currExists) {
      if (!currExists.course_codes.includes(course.code)) {
        await db.collection('curriculum').updateOne(
          { _id: currExists._id },
          { $push: { course_codes: course.code } }
        );
        console.log(`  Added ${course.code} to ${course.dept} ${course.level} curriculum.`);
      }
    } else {
      await db.collection('curriculum').insertOne({
        department_code: course.dept,
        level: course.level,
        course_codes: [course.code],
      });
      console.log(`  Created curriculum entry: ${course.dept} ${course.level}`);

      // Also seed the corresponding department if missing
      const deptExists = await db.collection('departments').findOne({ code: course.dept });
      if (!deptExists) {
        await db.collection('departments').insertOne({
          code: course.dept,
          title: course.dept === 'CSC' ? 'Computer Science' : course.dept,
          color: '#1a5276',
        });
        console.log(`  Department ${course.dept} auto-created.`);
      }
    }
  }

  // ── Update category courseCounts and auto-create missing ones ──
  const countByPrefix = {};
  const allCourses = await db.collection('courses').find({}).toArray();
  for (const c of allCourses) {
    const prefix = c.code.split(/\s/)[0];
    countByPrefix[prefix] = (countByPrefix[prefix] || 0) + 1;
  }
  for (const [prefix, count] of Object.entries(countByPrefix)) {
    const catExists = await db.collection('categories').findOne({ code: prefix });
    const deptForTitle = await db.collection('departments').findOne({ code: prefix });
    const title = catExists ? catExists.title : (deptForTitle ? deptForTitle.title : prefix);
    const color = catExists ? catExists.color : (deptForTitle ? deptForTitle.color : '#636e72');
    if (catExists) {
      await db.collection('categories').updateOne(
        { code: prefix },
        { $set: { courseCount: count } }
      );
    } else {
      await db.collection('categories').insertOne({
        code: prefix,
        title,
        color,
        courseCount: count,
      });
    }
  }

  await c.close();
  console.log('Done!');
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1) });
