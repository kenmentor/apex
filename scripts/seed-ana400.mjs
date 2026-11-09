// ANA 411/412/441 video banks (ANA 421/422/432/499 = confirmed GAPs).
// Sourcing per docs/sourcing-quality-process.txt:
// - ONE winner per topic (order preserved); backups noted in research, NOT imported.
// - ANA 411: Kenhub FULL videos, Rehab Science, Synaptyx, Clinical Examination.
// - ANA 412: iBiology/Science Communication Lab (Nogales), Univ. of Adelaide.
// - ANA 441: Human Anatomy Brad, Nightingale, Vidya-mitra/CEC-UGC, Flint Dibble,
//   Cambridge Museums, ProfCahoon, Griffith, Hidden Science.
// - Comments proof: Kenhub exam-cram [245]; Rehab Science [117];
//   Human Anatomy Brad exam testimony; Nogales cryo-EM answers.
// - GAPS: ANA 421 (embalming/plastination exists but skipped per scope),
//   ANA 422 seminars, ANA 432 placements, ANA 499 project/admin.
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
  // ---------- ANA 411 (5 topics) ----------
  ['ANA 411', 'bfiUnhAHt8Q', 'watch', 'Kenhub: Types of Joints in the Human Body', 'Structural anatomy of bones, joints, muscle attachments and surface terminology.', 'Structural anatomy of bones, joints, and muscle attachments, anatomical terminology used in surface anatomy, an introduction to analysis of human movement.'],
  ['ANA 411', 'GkC5q6mcohk', 'watch', 'Rehab Science: Biomechanics Lecture 1 Intro', 'Functional musculoskeletal anatomy and the physical laws of motion.', 'The focus is on functional musculoskeletal anatomy and the physical laws that control motion.'],
  ['ANA 411', '516yaKb4PUY', 'watch', 'Synaptyx: Biomechanics of Exercise and Sport', 'Kinesiology applied to daily living and exercise.', 'The unit focuses both on the application of kinesiology to physical activities of daily living and exercise.'],
  ['ANA 411', 'R7KpcogGUfs', 'watch', 'Kenhub: Surface Anatomy of the Thorax', 'Mapping surface representations of major internal organs.', 'Practical cum demonstration exercises to map out surface representations of major internal organs of the body.'],
  ['ANA 411', 'cEZSgR7TEqI', 'watch', 'Surface Anatomy of Upper and Lower Limbs (Living Subject)', 'Recognition of major visible anatomical features of the living subject.', 'Recognition and demonstration of major visible anatomical features of the living human subject.'],
  // ---------- ANA 412 (2 topics) ----------
  ['ANA 412', 'nkGRhYv01ag', 'watch', 'Eva Nogales (UC Berkeley): Introduction to Electron Microscopy', 'Specimen prep, TEM principles, immuno-EM, tomography, cryo-EM.', '30) Specimen preparation methods: tissue sample acquisition techniques, tissue processing and examination, physical and technical principles of different electron microscopes, localization of molecules by immunoelectron microscopy, special techniques for localization of molecules in electron microscopy, occupational safety in electron microscopy laboratory work, localization of elements by electron microscopy, electron tomography, correlative light and electron microscopy, image processing and interpretation, Cryo electron microscopy, techniques for material characterization by electron microscopy, demonstrations on transmission and scanning electron microscopy of biological samples, examples of application of electron microscopy in biomedical research.'],
  ['ANA 412', 'Ad5VGbA-_vk', 'watch', 'Tissue Preparation for Electron Microscopy (Univ. of Adelaide)', 'Practical demonstration of EM specimen preparation.', 'The practical aspects shall be demonstrated.'],
  // ---------- ANA 441 (8 topics) ----------
  ['ANA 441', 'Zhy4bRW3MOY', 'watch', 'Skeletal System: Bones, Articulation, Growth and Development (Full Lecture)', 'Major features of the human skeleton: growth, development and function.', 'Lectures cum practical study of major features of bones of the human skeleton, a detailed consideration of the basic properties of bone growth, development, and function in the human body, an examination of all major skeletal structures and the morphological features associated with them.'],
  ['ANA 441', '5aFTxkydkzk', 'watch', 'Forensic Anthropology: Identifying Individuals', 'Functions of skeletal structures and fragmentary remains in forensics.', 'The focus will be on the functions of these structures within the body as well as the identification of fragmentary remnants of them in a forensic or archaeological context.'],
  ['ANA 441', 'pZ9jOUuaFlQ', 'watch', 'Biological Profiling of Skeletal Remains', 'Age, sex and stature estimation from human bone.', 'Major techniques used in biological anthropology to analyse human bone, such as estimation of age at death, estimation of biological sex and stature.'],
  ['ANA 441', 'Nmkbc-t_d7k', 'watch', 'A Quick Intro to Bioarchaeology (Flint Dibble)', 'Research studies involving analysis of human bone.', 'Evaluation of major research studies involving analysis of human bone.'],
  ['ANA 441', 'V7DjC_FY4lg', 'watch', 'Curation and Ethics in the Study of Human Remains (Cambridge Museums)', 'Ethical issues in collection and curation of human bone.', 'Consideration of ethical issues in the collection and curation of human bone.'],
  ['ANA 441', '0lhVzYaDlFI', 'watch', 'Long Bone Measurement (Osteometric Demo)', 'Bone measurement for human identification.', 'Measurement of bone parameters and their application to human identification.'],
  ['ANA 441', 'hqv3IT8OrIs', 'watch', 'Anthropometry Part 1 (Griffith Univ.)', 'Practical anthropometry integrated in lectures.', 'The practical is integrated in the lectures for better understanding of Basic Medical Sciences anthropometry.'],
  ['ANA 441', 'jYaxR8pJSbY', 'watch', 'Dermatoglyphics: Science, Genetics and Formation of Fingerprints', 'Fingerprint techniques in forensic anthropology.', 'Dermatoglyphics, fingerprints techniques and their use in forensic anthropology.'],
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
