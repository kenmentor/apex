import { NextResponse } from 'next/server';
import { getPayloadHMR } from '@payloadcms/next/utilities';
import payloadConfig from '@/payload.config';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    const jsonPath = path.resolve(process.cwd(), '..', 'CSC282 (2).json');
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(raw);

    const payload = await getPayloadHMR({ config: payloadConfig });

    const existing = await payload.find({
      collection: 'courses',
      where: { code: { equals: data.course_code } },
      limit: 1,
    });

    let course;
    if (existing.docs.length > 0) {
      course = existing.docs[0];
    } else {
      course = await payload.create({
        collection: 'courses',
        data: {
          code: data.course_code,
          title: data.course_title,
          description: data.study_guide_title || '',
          icon: '☕',
          color: '#e67e22',
        },
      });
    }

    let imported = 0;
    for (const section of data.sections) {
      for (const q of section.questions) {
        const opts = {};
        for (const [key, val] of Object.entries(q.options)) {
          if (val) opts[key] = val;
        }

        const existingQ = await payload.find({
          collection: 'questions',
          where: {
            and: [
              { question: { equals: q.question } },
              { course: { equals: course.id } },
            ],
          },
          limit: 1,
        });

        if (existingQ.docs.length === 0) {
          await payload.create({
            collection: 'questions',
            data: {
              course: course.id,
              section: section.section_title,
              questionId: q.id,
              question: q.question,
              options: opts,
              correctAnswer: q.correct_answer,
              explanation: q.explanation || '',
            },
          });
          imported++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      course: `${data.course_code} - ${data.course_title}`,
      sections: data.sections.length,
      imported,
      total: data.sections.reduce((s, sec) => s + sec.questions.length, 0),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
