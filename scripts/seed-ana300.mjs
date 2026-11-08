// ANA 301/302/307/312 video banks. Sourcing per docs/sourcing-quality-process.txt:
// - ONE winner per topic (order preserved); backups noted in research, NOT imported.
// - ANA 301 (Head & Neck): AnatomyZone Head & Neck playlist
//   (PLmxKpKbsez55p4lV5vPAPl8231T5SFN7J). Comments proof: site-adopted 3D tutorials,
//   NBDE/ward-level testimony pattern per prior banks.
// - ANA 302 (Neuroanatomy): Ninja Nerd Neurology playlist
//   (PLTF9h-T1TcJgx3OFachdjHPMX6VE4VDS1, 66 vids). Comments proof: "best to learn
//   from", exam passes (prior bank evidence).
// - ANA 307 (topics are Human Genetics, not entrepreneurship): Amoeba Sisters,
//   Zero To Finals, Shomu's Biology, ETSU Online, DrWD40, MedLive (all English).
// - ANA 312 (Radiological Anatomy): Clover Learning (radiography education),
//   Navigating Radiology, Meaghan Piretti, Heather Davis (all English).
// - GAPS (documented): 301t0 header fragment, 301t13 radiological H&N, 302t0
//   neuroembryology, 302t7 pons tegmentum, 302t9 midbrain tegmentum, 302t13
//   epithalamus/subthalamus, 307t1 expression variation, 307t6 hybridisation,
//   307t7 genomic studies, 312t4 OF/OM projections.
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
  // ---------- ANA 301 (13 of 15; t0 header fragment + t13 radiological H&N = GAP) ----------
  ['ANA 301', 'CBNIK2MpMzw', 'watch', 'Facial Artery: Origin, Course, Branches', 'Face and scalp blood supply.', 'Face and scalp.'],
  ['ANA 301', 'f3Yruz2VekM', 'watch', 'Ninja Nerd: Anatomy of the Spine Model', 'Back and spinal cord overview.', 'Back and spinal cord.'],
  ['ANA 301', 'uSA-diFkIUs', 'watch', 'Anterior Cranial Fossa', 'Cranial cavity: anterior cranial fossa.', 'Cranial cavity.'],
  ['ANA 301', '14sC6UT0Aog', 'watch', 'Anatomy of the Orbit: Vessels and Nerves', 'Orbit, with parotid/temporal/infratemporal region context.', 'Orbit, parotid, temporal and infratemporal regions.'],
  ['ANA 301', 'YOgE2pmXfZg', 'watch', 'Anterior Triangle of the Neck', 'Triangles of neck, submandibular region, deep neck dissection.', 'Triangles of neck, submandibular region, nerves and vessels in deep dissection of neck.'],
  ['ANA 301', 'aNi78ZRGbqc', 'watch', 'Thyroid Gland: Description, Relations, Blood Supply', 'Thyroid and parathyroid.', 'Thyroid and parathyroid.'],
  ['ANA 301', 'gGLyG2RIPWc', 'watch', 'Scalene Muscles and Scalene Hiatus', 'Closest match for pre-vertebral region and neck joints.', 'Pre-vertebral region and joints of neck.'],
  ['ANA 301', 'qGVTsHGvy0g', 'watch', 'Pharyngeal Constrictors: Pharynx Anatomy', 'Mouth, tongue, pharynx and larynx region anatomy.', 'Mouth and tongue, pharynx, palato-nasal cavity and sinuses, larynx, ear and eye.'],
  ['ANA 301', 'qOmmqu6_g3s', 'watch', 'Ninja Nerd: Neuron Anatomy and Function', 'Neuroanatomy foundations for head and neck.', 'Neuroanatomy.'],
  ['ANA 301', '5mrd2fu3qvY', 'watch', 'Ninja Nerd: Ventricles of the Brain Model', 'Meninges, brain base, hindbrain, midbrain, diencephalon and ventricles.', 'Meninges, base of brain and blood supply, hindbrain, medulla, pons, cerebellum and 4th ventricle, midbrain, diencephalon and third ventricle, cerebral hemispheres, sulci and gyri, internal structure of cerebrum and lateral ventricle, basal nuclei, thalamus and hypothalamus, synapses and reflex arcs.'],
  ['ANA 301', 'MRl9akfrGQ4', 'watch', 'Ninja Nerd: Dorsal Column Medial Lemniscus Pathway', 'Sensory and ascending pathways.', 'Sensory and ascending pathways, motor and descending pathways, cerebellar connections-pathways for hearing, smell and vision.'],
  ['ANA 301', '7dZHmKMLdC0', 'watch', 'Ninja Nerd: Autonomic Nervous System', 'Autonomic nervous system.', 'Autonomic nervous system.'],
  ['ANA 301', 'qzKHMgK9yYU', 'watch', 'Ninja Nerd: Anatomy of the Brain, Dissectible Model', 'Brain and spinal cord overview.', 'Brain and spinal cord.'],
  // ---------- ANA 302 (17 of 21) ----------
  ['ANA 302', 'ADAOsuaOSCk', 'watch', 'Ninja Nerd: Anatomy of the Brain Model', 'Introduction to the central nervous system.', 'introduction to the central nervous system;'],
  ['ANA 302', '6XtPzcXAqBc', 'watch', 'Ninja Nerd: Gross Anatomy of Spinal Cord and Nerves', 'Spinal cord morphology.', 'spinal cord morphology;'],
  ['ANA 302', 'qqb4S5Tv008', 'watch', 'Ninja Nerd: Spinal Cord White Matter', 'Spinal cord tracts in white matter.', 'spinal cord-tracts;'],
  ['ANA 302', 'fMF04LiaLFY', 'watch', 'Ninja Nerd: Medulla Anatomy and Function', 'Lower medulla and pyramids.', 'lower medulla-pyramids;'],
  ['ANA 302', 'zKA8iaxfEww', 'watch', 'Ninja Nerd: Corticospinal Tract', 'Decussation of the pyramids and tubercles pathway.', 'decussation, tubercles;'],
  ['ANA 302', 'Xi9_WRVoynM', 'watch', 'Ninja Nerd: Pons Anatomy and Function', 'Upper medulla olive, basis pontis and middle cerebellar peduncle.', 'upper medulla-olive, pons-basis pontis and middle cerebellar penduncle;'],
  ['ANA 302', '-3Pj5sNqf-Y', 'watch', 'Ninja Nerd: Midbrain Anatomy and Function', 'Midbrain tectum.', 'midbrain-tectum;'],
  ['ANA 302', 'NVsrexn3pT8', 'watch', 'Ninja Nerd: Cerebellum Anatomy and Function', 'Cerebellum.', 'cerebellum;'],
  ['ANA 302', 'L8SezbBHWJI', 'watch', 'Ninja Nerd: Thalamus Anatomy and Function', 'Diencephalon and thalamus.', 'diencephalon-thalamus;'],
  ['ANA 302', 'hgoa_ZxX5Sg', 'watch', 'Ninja Nerd: Hypothalamus Anatomy and Function', 'Diencephalon and hypothalamus.', 'diencephalon-hyphothalamus;'],
  ['ANA 302', 'ZsFVAmCaCkU', 'watch', 'Ninja Nerd: Descending Tracts Overview', 'Ascending and descending pathways with ventricles context.', 'ascending pathways and descending pathways, ventricles;'],
  ['ANA 302', 'Eyl0ihAd-1Y', 'watch', 'Ninja Nerd: Corticobulbar Tract', 'Pyramidal system via the corticobulbar tract.', 'pyramidal system;'],
  ['ANA 302', '2LzZMWGQe1k', 'watch', 'Ninja Nerd: Cerebral Cortex Overview', 'Hemispheres, sulci and gyri, internal cerebrum and basal ganglia.', 'cerebral hemispheres, sulci and gyri, internal structure of cerebrum, basal ganglia;'],
  ['ANA 302', '3Bvz6DHBB1g', 'watch', 'Ninja Nerd: Limbic System Anatomy and Function', 'Cortex, Brodmann areas, limbic system and brain blood supply.', 'cortex- cytoarchitectonics, brodman areas, limbic system blood supply to the brain and spinal sord;'],
  ['ANA 302', '0H9sIyNmygQ', 'watch', 'Ninja Nerd: Brain Meninges and Hematomas', 'Meninges, venous sinuses, hypophysis and cranial nerves.', 'meninges, venous sinuses, hypophysis cerebri, cranial nerves;'],
  ['ANA 302', '7dZHmKMLdC0', 'watch', 'Ninja Nerd: Autonomic Nervous System', 'Autonomic nervous system.', 'autonomic nervous system;'],
  ['ANA 302', 'lwTeoVZPuJM', 'watch', 'Ninja Nerd: UMN vs LMN Lesions', 'Applied anatomy: localizing lesions.', 'Applied Anatomy.'],
  // ---------- ANA 307 Human Genetics (5 of 8) ----------
  ['ANA 307', 'jLmoJPxihjA', 'watch', 'Amoeba Sisters: Mega Genetics Review', 'Fundamental human genetic principles: Mendelian and non-Mendelian.', 'Fundamental human genetic principles.'],
  ['ANA 307', 'lm0RXMFIenU', 'watch', 'Zero To Finals: Autosomal Dominant and Recessive', 'Patterns of inheritance in families.', 'Patterns of inheritances in families (autosomal dominant, autosomal recessive, X-linked dominant, X- linked recessive, Y-linked and sex influenced).'],
  ['ANA 307', 'MP3mm04OrQg', 'watch', 'Reading Karyotypes: Chromosome Types', 'Cytogenetics, types and classification of human chromosomes.', 'Cytogenetics, types and classification of human chromosomes.'],
  ['ANA 307', 'WpG1FuhIuuw', 'watch', 'Preparing Karyotypes, Staining and Banding', 'Methods of preparation of human chromosomes and karyotyping.', 'Methods of preparation of human chromosomes and Karyotyping.'],
  ['ANA 307', 'X9tRGdlA_20', 'watch', 'ETSU Cytogenetics: Chromosome Analysis and Aberrations', 'Numerical and structural chromosome aberrations and causes.', 'Types of numerical and structural chromosome aberrations and their causes.'],
  // ---------- ANA 312 Radiological Anatomy (4 of 5; OF/OM = GAP) ----------
  ['ANA 312', '2scYh2J4GRY', 'watch', 'Navigating Radiology: Chest X-ray Introduction', 'Basic principles of radiological imaging and modern techniques.', 'Basic principles of radiological imaging of human tissue, radiological identification of major body structures, introduction to modern imaging techniques, precautionary measures.'],
  ['ANA 312', 'NUuOobpsPQc', 'watch', 'Positioning Terminology Basics', 'Anatomical positions and radiographic viewing terms.', 'Anatomical position: viewing radiograph, sagittal, coronal, axial, anterior, posterior, dorsal, ventral, supine, prone, erect, medial, lateral, superior, inferior, cranial, caudal, flexion, Basic Medical Sciences extension, abduction, adduction, circumduction, rotation, proximal, distal, oblique, decubitus, superficial, deep, palmar, plantar, inversion, eversion.'],
  ['ANA 312', 'cbzeFEodrIc', 'watch', 'Bone Markings Explained', 'Apical, foramen, condyle, fossa, process and cross-sectional terms.', 'apical, foramen, condyle, fossa, process and other important cross sectional anatomical terminology.'],
  ['ANA 312', 'X3Z6cOE3Lzc', 'watch', 'Clover Learning: Routine Chest Series Positioning', 'PA, AP, lateral and decubitus projections.', 'Posteroanterior, anteroposterior, RAO, LAO, RPO, LPO, dorsal decubitus, ventral decubitus, lateral decubitus.'],
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
