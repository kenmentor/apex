// Basic Medical Sciences 200-level video bank — ANA 201/202/203/204.
// Sourcing per docs/sourcing-quality-process.txt:
// - ONE winner playlist per topic group (order preserved); backups noted in
//   the header of scripts/seed-bms-videos.mjs research notes, NOT imported.
// - Winners picked by COMMENTS first (sampled top comments per series:
//   exam-pass testimony, "best tutorial on the net", practical-exam
//   cramming), web consensus second (PCOM, Pecs med school, MERLOT listing,
//   Mizzou M1, r/medschool), views last.
// - Winners: AnatomyZone regional playlists (Upper/Lower Limb), Ninja Nerd
//   series (neuro, embryology, trunk/pelvis models), Kenhub full tutorials,
//   Armando Hasudungan, Khan Academy. English only. No previews/paywalls,
//   no re-uploads. Direct YouTube links.
// - SINGLE-HOME: every video carries the EXACT curriculum topic title in
//   `topic`, so the matcher shows it only under that topic (never spread).
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
const YTB = id => `https://youtu.be/${id}`;

// [courseCode, videoId, host, title, description, exactTopicTitle]
const ROWS = [
  // ---------- ANA 201 ----------
  ['ANA 201', 'd4qHVe6xmWM', 'youtu.be', 'Body Planes & Sections', 'Anatomical planes on a real skeleton: the language every topic uses.', 'Descriptive terms, plans and terms of relationship of the human body, terms of comparison, attachment of muscles, types of muscles, movements of joints.'],
  ['ANA 201', 'gfC4t6iyFVc', 'youtu.be', 'Anatomical Orientation & Directional Terminology', 'Descriptive terms of relationship and comparison.', 'Descriptive terms, plans and terms of relationship of the human body, terms of comparison, attachment of muscles, types of muscles, movements of joints.'],
  ['ANA 201', 'YJnsNDyO8oY', 'youtu.be', 'Body Cavities & Serosal Membranes', 'Ventral and dorsal cavities; general organisation of body systems.', 'Osteology, principles of kinesiology, general organisation of body system.'],
  ['ANA 201', 'BQTV-iUFAl0', 'youtu.be', 'Bones of the Foot', 'Osteology of the foot: tarsals, metatarsals, phalanges.', 'Osteology, principles of kinesiology, general organisation of body system.'],
  ['ANA 201', '3v5AsAESg1Q', 'youtu.be', 'Bones of the Pelvis - Hip Bones', 'Osteology of the pelvis: hip bones and sacrum.', 'Osteology, principles of kinesiology, general organisation of body system.'],
  ['ANA 201', '4amn0a_mGU0', 'youtu.be', 'Bones of the Hand and Wrist', 'Osteology of the hand: carpals, metacarpals, phalanges.', 'Osteology, principles of kinesiology, general organisation of body system.'],
  ['ANA 201', '5bneylG3w10', 'youtu.be', 'Scapula and Clavicle - Shoulder Girdle', 'Osteology of the shoulder region: scapula and clavicle.', 'shoulder region;'],
  ['ANA 201', 'vG1XQkj3Yx0', 'youtu.be', 'Shoulder Joint - Glenohumeral Joint', 'Shoulder joint: glenohumeral articulation and movements.', 'shoulder region;'],
  ['ANA 201', 'J7HfnAn_Rhc', 'youtu.be', 'Clavicle and Scapula - Shoulder Girdle', 'Pectoral and shoulder girdle osteology review.', 'shoulder region;'],
  ['ANA 201', '1s_q-Znnmwo', 'youtu.be', 'Features of the Humerus', 'Osteology of the arm: humerus landmarks.', 'arm and cubital fossa;'],
  ['ANA 201', 'Os2zuEuGCIw', 'youtu.be', 'Muscles of the Upper Arm', 'Anterior and posterior arm muscles: biceps, triceps, brachialis.', 'arm and cubital fossa;'],
  ['ANA 201', 'mdnTFA2588Q', 'youtu.be', 'Cubital Fossa', 'Cubital fossa boundaries and contents.', 'arm and cubital fossa;'],
  ['ANA 201', 'S1Jo3Asc68g', 'youtu.be', 'Elbow Joint', 'Elbow joint: articulations and movements.', 'arm and cubital fossa;'],
  ['ANA 201', 'O-yQoHmcunk', 'youtu.be', 'Radius and Ulna', 'Osteology of the forearm: radius and ulna.', 'flexor compartment of forearm;'],
  ['ANA 201', 'BjIab-huqgU', 'youtu.be', 'Forearm Muscles Part 1 - Anterior Flexor Compartment', 'Flexor compartment of the forearm: superficial and deep flexors.', 'flexor compartment of forearm;'],
  ['ANA 201', 'LSls4MWv3MQ', 'youtu.be', 'Median Nerve', 'Median nerve: arm, cubital fossa and carpal tunnel.', 'flexor compartment of forearm;'],
  ['ANA 201', '7F4dHDwwvhQ', 'youtu.be', 'Forearm Muscles Part 2 - Posterior Extensor Compartment', 'Extensor compartment of the forearm.', 'extensor compartment of forearm;'],
  ['ANA 201', '3M6dzH1i-GI', 'youtu.be', 'Radial Nerve', 'Radial nerve: spiral groove and posterior interosseous branch.', 'extensor compartment of forearm;'],
  ['ANA 201', 'Q6s1eHmsd5w', 'youtu.be', 'Muscles of the Hand', 'Intrinsic muscles of the hand.', 'hand;'],
  ['ANA 201', 'uiyqVsSPD1w', 'youtu.be', 'Wrist and Hand Joints', 'Radiocarpal and intercarpal joints.', 'hand;'],
  ['ANA 201', 'lRjF5wI_IqU', 'youtu.be', 'Upper Limb Arteries - Hand and Wrist', 'Palmar arches and blood supply of the hand.', 'hand;'],
  ['ANA 201', '0bBHUcGK7P0', 'youtu.be', 'Upper Limb Veins', 'Venous and lymphatic drainage of the upper limb.', 'venous and lymphatic drainage of the upper limb.'],
  ['ANA 201', 'UlDFSlRBeCE', 'watch', 'Brachial Plexus', 'Ninja Nerd: roots to branches of the brachial plexus.', 'Applied anatomy of nerves;'],
  ['ANA 201', 'EoTfDy8T5vM', 'youtu.be', 'Ulnar Nerve', 'Ulnar nerve course and distribution.', 'Applied anatomy of nerves;'],
  ['ANA 201', 'Wru7UCHlbFU', 'youtu.be', 'Musculocutaneous Nerve', 'Musculocutaneous nerve and anterior arm muscles.', 'Applied anatomy of nerves;'],
  ['ANA 201', '2ufqUOpm8O0', 'youtu.be', 'Upper Limb Arteries - Arm and Forearm', 'Brachial, radial and ulnar arteries.', 'blood supply of the upper limb.'],
  ['ANA 201', '8trLEtQYDGw', 'youtu.be', 'Muscles of the Thigh Part 1 - Anterior Compartment', 'Anterior thigh: quadriceps, sartorius; femoral triangle.', 'femoral triangle;'],
  ['ANA 201', '-Obyz2hMsb8', 'youtu.be', 'Femoral Triangle', 'Femoral triangle boundaries and contents.', 'femoral triangle;'],
  ['ANA 201', 'IslbAQxDUt0', 'youtu.be', 'Thigh Arteries', 'Femoral and profunda femoris arteries.', 'femoral triangle;'],
  ['ANA 201', 'MjPAPTJdxa8', 'youtu.be', 'Muscles of the Thigh Part 2 - Medial Compartment', 'Adductor group and adductor canal.', 'adductor canal and medial side of the thigh;'],
  ['ANA 201', 'RHJwCzzWqhE', 'youtu.be', 'Muscles of the Gluteal Region Part 1', 'Gluteus maximus, medius and minimus.', 'gluteal region;'],
  ['ANA 201', 'cF0zy4ub1V4', 'youtu.be', 'Muscles of the Gluteal Region Part 2', 'Deep gluteal muscles: piriformis, obturators, gemelli.', 'gluteal region;'],
  ['ANA 201', 'kXg3akhbrrg', 'youtu.be', 'Muscles of the Thigh and Gluteal Region Part 1', 'Thigh and gluteal compartments and innervation.', 'gluteal region;'],
  ['ANA 201', 'ecfssWS1aVg', 'youtu.be', 'Muscles of the Thigh and Gluteal Region Part 2', 'Thigh and gluteal muscles: insertions and actions.', 'gluteal region;'],
  ['ANA 201', 'ZWcdMj8wRos', 'youtu.be', 'Hip Joint', 'Hip joint: acetabulum, ligaments and movements.', 'gluteal region;'],
  ['ANA 201', 'PAMWumkerRA', 'youtu.be', 'Muscles of the Thigh Part 3 - Posterior Compartment', 'Hamstrings: back of the thigh.', 'back of the thigh, popliteal fossa;'],
  ['ANA 201', 've448qTT_-4', 'youtu.be', 'Knee Joint Part 1', 'Knee joint: cruciate and collateral ligaments.', 'back of the thigh, popliteal fossa;'],
  ['ANA 201', '58g4nWqbHAc', 'youtu.be', 'Knee Joint Part 2', 'Menisci, bursae and popliteal fossa.', 'back of the thigh, popliteal fossa;'],
  ['ANA 201', '-QsTZy2gga8', 'youtu.be', 'Popliteal Fossa', 'Popliteal fossa boundaries and contents.', 'back of the thigh, popliteal fossa;'],
  ['ANA 201', 'V6DrSg2DEes', 'youtu.be', 'Knee Arteries', 'Genicular anastomosis around the knee.', 'back of the thigh, popliteal fossa;'],
  ['ANA 201', '83_ctEOFkhM', 'youtu.be', 'Muscles of the Leg Part 2 - Anterior and Lateral Compartments', 'Anterior and peroneal compartments; dorsum of the foot.', 'extensor compartment of the leg and dorsum of the foot;'],
  ['ANA 201', 'F1J0HbV2n5s', 'youtu.be', 'Muscles of the Leg Part 1 - Posterior Compartment', 'Posterior leg: gastrocnemius, soleus, deep flexors.', 'peroneal and flexor compartment of the leg;'],
  ['ANA 201', 'ocUiJYXebHs', 'youtu.be', 'Muscles of the Foot Part 1', 'Sole of the foot, first layers; arches of the foot.', 'sole of the foot, arches of the foot;'],
  ['ANA 201', 'aOBHTkSamWw', 'youtu.be', 'Muscles of the Foot Part 2', 'Sole of the foot, deeper layers and arches.', 'sole of the foot, arches of the foot;'],
  ['ANA 201', 'AinzrO_qnHw', 'youtu.be', 'Lower Limb Veins Overview', 'Venous and lymphatic drainage of the lower limb.', 'venous and lymphatic drainage of the lower limb;'],
  ['ANA 201', 'DZ0IL1tHNxo', 'youtu.be', 'Sacral Plexus', 'Sacral plexus and nerves of the lower limb.', 'applied anatomy of the nerves and blood supply to the lower limb.'],
  ['ANA 201', 'etLsLdRldgM', 'youtu.be', 'Leg Arteries', 'Anterior and posterior tibial arteries.', 'applied anatomy of the nerves and blood supply to the lower limb.'],
  ['ANA 201', 'wLcy4JXgE18', 'youtu.be', 'Foot Arteries', 'Dorsalis pedis and plantar arteries.', 'applied anatomy of the nerves and blood supply to the lower limb.'],
  ['ANA 201', 'JNczJx2ju3I', 'youtu.be', 'Lower Limb Arteries Overview', 'Complete arterial overview of the lower limb.', 'applied anatomy of the nerves and blood supply to the lower limb.'],
  ['ANA 201', '4Fp2gLbwBDs', 'youtu.be', 'Internal Iliac Artery', 'Internal iliac branches to pelvis and gluteal region.', 'applied anatomy of the nerves and blood supply to the lower limb.'],
  // ---------- ANA 202 ----------
  ['ANA 202', '1i_iJBcB51I', 'watch', 'The Four Types of Tissues', 'Dr. Armando Hasudungan: epithelial, connective, muscular, nervous.', 'Basic tissues of the body, the epithelial, connective tissues, muscle and nervous tissue.'],
  ['ANA 202', '15k5fajCN_w', 'watch', 'Cells and Tissues: Human Histology Intro', 'Kenhub microanatomy: the four basic tissues under the microscope.', 'The microanatomy of the four basic tissues, namely: epithelial tissue, including glandular tissue, connective tissue, muscular tissue, and nervous tissue.'],
  ['ANA 202', 'J-U51Z4Pr7o', 'watch', '4 Basic Tissue Types', 'Kenhub: connective, muscle, epithelial and nervous tissue.', 'Basic tissues of the body, the epithelial, connective tissues, muscle and nervous tissue.'],
  ['ANA 202', 'sKins25SEVk', 'watch', 'Epithelial and Connective Tissue', 'Khan Academy MCAT: covering, glandular and connective tissues.', 'Covering and Lining Epithelia.'],
  ['ANA 202', 'LUDws4JrIiI', 'watch', 'Cell Cycle: Interphase and Mitosis', 'Ninja Nerd: cell dynamics and the cell cycle.', 'Cell dynamics and cell cycle.'],
  // ---------- ANA 203 ----------
  ['ANA 203', '8-KF0rnhKTU', 'watch', 'Embryology: Fertilization, Cleavage, Blastulation', 'Fertilization to blastocyst: cleavage, morula, implantation.', 'fertilisation;'],
  ['ANA 203', '7SK-WPnF1Dc', 'watch', 'Embryology: Gastrulation', 'Bilaminar to trilaminar disc: notochord formation.', 'gastrulation;'],
  ['ANA 203', 'u6203vWPFU0', 'watch', 'Embryology: Ectoderm', 'Ectoderm derivatives: skin, neural plate, placodes.', 'derivatives of the germ layers;'],
  ['ANA 203', 'Az6yzmeI4fU', 'watch', 'Embryology: Mesoderm', 'Mesoderm derivatives: muscle, bone, kidney, gonads.', 'derivatives of the germ layers;'],
  ['ANA 203', '1BlAplt6ydM', 'watch', 'Embryology: Endoderm', 'Endoderm derivatives: gut tube and organ linings.', 'derivatives of the germ layers;'],
  ['ANA 203', 'R81ahD_lbtI', 'watch', 'Embryology: Development of the Placenta', 'Fetal membranes and placenta formation.', 'placenta;'],
  ['ANA 203', 'BtLyik7oAxc', 'watch', 'Embryology: Neurulation and Neural Crest Migration', 'Neural plate to neural tube; embryo folding.', 'notochord, neurulation;'],
  ['ANA 203', 'WmlbqVyhMts', 'watch', 'Embryology: Development of Skeletal System', 'Bone development and limb formation.', 'development of limbs and teratology.'],
  ['ANA 203', 'tuhv_JrmaXg', 'watch', 'Embryology: Development of Muscular System', 'Muscle development from somites to limbs.', 'development of limbs and teratology.'],
  ['ANA 203', 'wiRes2-in0E', 'watch', 'Embryology: Development of the Urinary System', 'Kidney development: pronephros to metanephros.', 'Urinary and genital systems.'],
  ['ANA 203', 'eKuO_526YCc', 'watch', 'Embryology: Development of Reproductive System', 'Gonad and genital development.', 'Urinary and genital systems.'],
  ['ANA 203', '00jgSl0FHNE', 'watch', 'Embryology: Development of the Respiratory System', 'Lung bud to alveoli; teratology notes.', 'Respiratory system.'],
  // ---------- ANA 204 ----------
  ['ANA 204', 'c-2Yk9rBCcA', 'watch', 'Anatomy of the Thoracic Wall', 'Ribs, sternum and intercostal spaces.', 'Respiratory system.'],
  ['ANA 204', 'QisaWVtTC4E', 'watch', 'Muscles of the Thorax and Abdomen', 'Thoracic and abdominal wall muscles, diaphragm.', 'Musculo-skeletal system.'],
  ['ANA 204', 'LVazkGgtlfA', 'watch', 'Muscles of the Male and Female Pelvic Floor', 'Levator ani, perineum and pelvic support.', 'Urinary and genital systems.'],
  ['ANA 204', 'tdlmHi0n0Ss', 'watch', 'Coxa and Pelvis Anatomy', 'Hip bones, sacrum, pelvic brim and outlet.', 'Musculo-skeletal system.'],
];

async function seed() {
  const c = new MongoClient(URI, { connectTimeoutMS: 20000, serverSelectionTimeoutMS: 20000 });
  await c.connect();
  const db = c.db();
  const byCourse = {};
  for (const [courseCode, id, host, title, description, topic] of ROWS) {
    const url = host === 'youtu.be' ? YTB(id) : YT(id);
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
