// ANA 322/341/351/352 video banks (+ ANA 399 documented all-GAP).
// Sourcing per docs/sourcing-quality-process.txt:
// - ONE winner per topic (order preserved); backups noted in research, NOT imported.
// - ANA 322 (Histochemistry): The Noted Anatomist (37-min overview; exam testimony
//   "it all makes sense now" [426 likes]).
// - ANA 341 (Human Genetics): Khan Academy heredity intro.
// - ANA 351 (Light Microscopy): iBiology Microscopy Short Course
//   (PLQFc-Dxlf4pSRaEk8Xi9BzS0r8-LYmwRQ): Ron Vale, Salmon, Stuurman.
// - ANA 352 (Research Methodology): Prof. Murtaza Haider TMU Lecture 1.
// - ANA 399 SIWES (5 placement-admin topics): ALL GAP — no fitting teaching video;
//   forcing one would violate the quality bar.
// - English only, full videos, no previews, no Hindi. Rejected: biologycourses
//   histochemistry (audio complaint), Kenhub preview teaser.
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
  // ---------- ANA 322 (1 topic) ----------
  ['ANA 322', '0U5J_unEM-Q', 'watch', 'Histology Fundamentals: The Complete Overview', 'Principles and techniques of histochemistry, stains, fixation and cytology.', 'Principles and techniques of histochemistry, commonly used histochemical techniques and their applications in diagnosis and research, tissue components covered will include nucleic acids, mucins and other carbohydrates, pigments and biogenic amines, lipids, proteins and enzymes the nature of amyloid, the occurrence of amyloid and its demonstration in tissue sections, immunocytochemical techniques, tissue preparation, physical and chemical effects of fixation, limitations of chemical fixation and alternatives to chemical fixation, cryotechniques in histochemistry, embedding techniques, special treatment of mineralised tissue, histological staining structure of dyes, binding of dyes to tissues, mechanisms of selective staining, effects of non-staining components of dye solutions on staining, metachromasia, metallic impregnation techniques, cytological techniques, advantages of exfoliative cytology, methods of cell collection and smear preparation, morphology of cells found in normal smears with emphasis on gynaecological and sputum specimens, changes in smears with age and menstrual cycle.'],
  // ---------- ANA 341 (1 topic) ----------
  ['ANA 341', 'eEUvRrhmcxM', 'watch', 'Khan Academy: Introduction to Heredity', 'Human genetic principles, Mendelian inheritance, linkage and genomics.', 'Fundamental human genetic principles and variation in gene expression in man, classical and molecular genetics including Mendelian inheritance, linkage, nucleic acids, gene expression, recombinant DNA, genomics, immunogenetics, and regulation: patterns of inheritances in families (autosomal dominant, autosomal recessive, X-linked dominant, X-linked recessive, Y- linked and sex influenced), cytogenetics, types and classification of human chromosomes, methods of preparation of human chromosomes and karyotyping, types of numerical and structural chromosome aberrations and their causes, gene hybridization, human genomic studies.'],
  // ---------- ANA 351 (3 topics, iBiology) ----------
  ['ANA 351', '4c5ILWQmqRY', 'watch', 'iBiology: What Can You Learn With a Light Microscope (Ron Vale)', 'History of microscopy, tissue processing, brightfield and contrast methods.', 'History of microscopy, composition of the microscope, contrast and resolution concepts, the practical step by step method of tissue processing for light microscope study shall be taught and demonstrated, transmitted light microscopy: brightfield, phase contrast, dark field, DIC and polarization microscopy, koller illumination, image acquisition, digital image acquisition, cameras, binning gain, principles of fluorescence microscopy, emission and excitation spectrum, stokes shift, basic techniques of optics, light & fluoresence microscopy - fluorescence filter cubes acquisition of simple and complex images, principles of confocal microscopy, the principles and techniques for the use of advance light microscopes will be taught and where possible demonstrated i.e.'],
  ['ANA 351', 'P2teE17zT4I', 'watch', 'iBiology: Dark Field, Phase Contrast, Polarization and DIC', 'Polarizing, phase contrast, interference, dark-field and ultraviolet scopes.', 'polarizing microscope, phase contrast microscope, interference microscope, dark-field Microscope, and Ultraviolet Microscope.'],
  ['ANA 351', 'AhzhOzgYoqw', 'watch', 'iBiology: Introduction to Fluorescence Microscopy', 'Spectral imaging, unmixing and sample preparation for microscopy.', 'Spectral microscope/spectral unmixing Sample preparation for microscopy: fixation, permeabilization, reducing auto fluorescence, making samples transparent, image processing.'],
  // ---------- ANA 352 (1 topic) ----------
  ['ANA 352', '6xuVlje8cCc', 'watch', 'Lecture 1: Intro to Research Methods (TMU)', 'Biomedical research designs, protocol, sampling, analysis and ethics.', 'Introduction to biomedical research, definitions, types of research designs, preparatory stages: literature review, identification of research gaps and referencing styles, protocol development, sampling and sampling techniques, questionnaire design and validation, methods for acquisition of data, data analysis and presentation, basics of data processing, report/manuscript presentation, human and animal ethical issues: ethics in biomedical research, use of computer packages in research and presentations.'],
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
