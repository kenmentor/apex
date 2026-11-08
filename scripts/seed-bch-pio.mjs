// BCH 201/202 + PIO 201/203 video banks. Sourcing per docs/sourcing-quality-process.txt:
// - ONE winner per topic (order preserved); backups noted in research, NOT imported.
// - BCH: Khan Academy chemistry/biology line (institutional authority).
// - PIO: Armando Hasudungan series (2.91M subs, MD, MERLOT-listed; exam-cram comments)
//   + Khan Academy + exact-match Medicosis singles (flagged as series exceptions).
// - GAPS (no English match, never Hindi): BCH 202 centrifugation/fractionation,
//   PIO 203 peripheral-resistance/local-control.
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
  // ---------- BCH 201 (12 topics, Khan) ----------
  ['BCH 201', 'Pk4d9lY48GI', 'watch', 'Amino Acids Intro: Chemistry and Functions', 'Introductory chemistry of amino acids, properties, reactions and functions.', 'Introductory chemistry of amino acids, their properties, reactions and biological functions.'],
  ['BCH 201', 'BbZB-WBVFSk', 'watch', 'Amino Acid Structure and Classification', 'Neutral, basic and acidic amino acids.', 'Classification of amino acids: neutral, basic and acidic;'],
  ['BCH 201', '78QUeXVKiJ4', 'watch', 'Polar and Non-polar Amino Acids', 'Polar and non-polar amino acids.', 'polar and non-polar;'],
  ['BCH 201', '2_IJz1ivopQ', 'watch', 'Essential Amino Acids and Special Cases', 'Essential and non-essential amino acids.', 'essential and non- essential amino acids.'],
  ['BCH 201', 'nv2kfBFkv4s', 'watch', 'Peptide Bonds and Peptides', 'Peptides and peptide bond formation.', 'Peptides.'],
  ['BCH 201', 'MODnIkQvyz0', 'watch', 'Protein Chemistry and Classification Overview', 'Introductory chemistry and classification of proteins.', 'Introductory chemistry and classification of proteins.'],
  ['BCH 201', 'l0V-Xmps1mE', 'watch', 'Biological Functions of Proteins', 'Biological functions of proteins.', 'Biological functions of proteins.'],
  ['BCH 201', '42llTiRn-b8', 'watch', 'Isoelectric Point: Isolation and Purification', 'Methods of protein isolation, purification and identification.', 'Methods of their isolation, purification and identification.'],
  ['BCH 201', 'O5gN-IK6uKs', 'watch', 'Four Levels of Protein Structure', 'Primary, secondary, tertiary and quaternary structures.', 'Primary, secondary, tertiary and quaternary structures of proteins.'],
  ['BCH 201', 'Hnl2t0MvU0s', 'watch', 'Biuret Test: Protein Tests', 'Basic principles of tests for proteins and amino acids.', 'Basic principles of tests for proteins and amino acids.'],
  ['BCH 201', 'j5VA6YrqTNs', 'watch', 'Biomolecules Intro: Carbs, Lipids, Nucleic Acids', 'Introductory chemistry of carbohydrates, lipids and nucleic acids.', 'Introductory chemistry of carbohydrates, lipids and nucleic acids.'],
  ['BCH 201', 'NX0ZPtB_QFY', 'watch', 'Nucleic Acid Structure: Nucleosides and Nucleotides', 'Nomenclature of nucleosides and nucleotides; acid/alkali hydrolysis.', 'Nomenclature of nucleosides and nucleotides, effects of acid and alkali on hydrolysis of nucleic acids.'],
  // ---------- BCH 202 (10 of 11; centrifugation = GAP) ----------
  ['BCH 202', 'zk3vlhz1b6k', 'watch', 'Cell Theory', 'The cell theory.', 'The cell theory.'],
  ['BCH 202', 'Hmwvj9X4GNY', 'watch', 'Parts of the Cell: Structures and Functions', 'Structures and functions of major cell components.', 'Structures and functions of major cell components.'],
  ['BCH 202', 'QOR9is_nQJ8', 'watch', 'Prokaryotic vs Eukaryotic Cells', 'Cell types, constancy and diversity.', 'Cell types, constancy and diversity.'],
  ['BCH 202', '7FN1NBoV2u0', 'watch', 'Eukaryotic Cell Characteristics and Organelles', 'Cell organelles of prokaryotes and eukaryotes.', 'Cell organelles of prokaryotes and eukaryotes.'],
  ['BCH 202', 'HjlWm3LudJs', 'watch', 'Armando: Cells Overview and Composition', 'Chemical composition of cells.', 'Chemical composition of cells.'],
  ['BCH 202', 'pVWQm-GYK_Y', 'watch', 'Cell Junctions and Extracellular Structures', 'Structure, function and fractionation of extra-cellular organelles.', 'Structure, function and fractionation of extra- cellular organelles.'],
  ['BCH 202', 'raW6b5kQHPY', 'watch', 'Fluid and Electrolyte Overview: Total Body Water', 'Water, total body water and its distribution.', 'Water, total body water and its distribution.'],
  ['BCH 202', 'FzeL1fcBwnE', 'watch', 'ADH and Aldosterone: Water Balance Regulation', 'Regulation of water and electrolyte balance.', 'Regulation of water and electrolyte balance.'],
  ['BCH 202', '-w-FhctMvD0', 'watch', 'Hyponatraemia: Disorders of Water Balance', 'Disorders of water and electrolyte balance.', 'Disorder of water and electrolyte balance.'],
  ['BCH 202', 'oda2K4IFBaE', 'watch', 'Intro to pH: Acidity, Alkalinity and pK', 'Acidity and alkalinity, pH and pK values and cellular activities.', 'Acidity and alkalinity, pH and pK values and their effects on cellular activities.'],
  // ---------- PIO 201 (15 topics) ----------
  ['PIO 201', '6qk_LTVXZ2w', 'watch', 'What is Physiology? History and Intro', 'Introduction and history of physiology.', 'Introduction and history of physiology.'],
  ['PIO 201', 'K0HDlWx4Xxk', 'watch', 'Cell Membrane Structure and Functions', 'Structure and functions of cell membranes.', 'Structure and functions of cell membranes.'],
  ['PIO 201', 'SUyMRfuPQ_w', 'watch', 'Membrane Transport Processes', 'Transport processes across membranes.', 'Transport process.'],
  ['PIO 201', 'L4Tbi1ql-tU', 'watch', 'Active Transport in Epithelia and Glands', 'Special transport in bladder, kidney, gall bladder, intestine, astrocytes, exocrine glands.', 'Special transport mechanism in amphibian bladder, kidney, gall bladder, intestine, astrocytes and exocrine glands.'],
  ['PIO 201', 'VaP_CBBARSI', 'watch', 'Passive Diffusion: Biophysical Principles', 'Biophysical principles of transport.', 'Biophysical principles.'],
  ['PIO 201', 'bfuOljRU1nk', 'watch', 'Homeostasis and Temperature Regulation', 'Homeostasis and control systems including temperature regulation.', 'Homeostasis and control systems including temperature regulation.'],
  ['PIO 201', 'fNlp0UMqUtM', 'watch', 'Sleep and Circadian Biological Rhythms', 'Biological rhythms.', 'Biological rhythms.'],
  ['PIO 201', '5MOn8X-tyFw', 'watch', 'What Is Inside Blood: Composition and Functions', 'Composition and functions of blood.', 'Composition and functions of blood.'],
  ['PIO 201', 'ddifthdMNVc', 'watch', 'Blood Cell Lineages: Haemopoiesis', 'Haemopoiesis.', 'Haemopoiesis.'],
  ['PIO 201', 'LXFQG4Ugreo', 'watch', 'WBC Movement and Differential Count', 'WBC and differential count.', 'WBC and differential count.'],
  ['PIO 201', 'buqYpkR5hKc', 'watch', 'Coagulation Cascade, Fibrinolysis and Platelets', 'Plasma proteins, coagulation, fibrinolysis and platelet functions.', 'Plasma proteins Coagulation, fibrinolysis and platelet functions.'],
  ['PIO 201', 'Nnqp_3HMlDU', 'watch', 'Blood Types: ABO and Rh Systems', 'Blood groups ABO and Rh systems.', 'Blood groups –ABO system – Rh system.'],
  ['PIO 201', 'Amn2EWTY2Lk', 'watch', 'ABO Transfusion: Collection, Storage and Hazards', 'Indications, collection, storage and hazards of blood transfusion.', 'Blood transfusion – indication for collection and storage of blood, hazards of blood transfusions.'],
  ['PIO 201', 'RezL2xWFCe8', 'watch', 'Spleen and the Reticuloendothelial System', 'Reticulo-endothelial system.', 'Reticulo- endothelial system.'],
  ['PIO 201', 'KvvECcXnDks', 'watch', 'HIV, Immunity and Immunodeficiency', 'Immunity and immunodeficiency disease and HIV.', 'Imunity and immodeficiency disease and HIV.'],
  // ---------- PIO 203 (20 of 21; peripheral resistance = GAP) ----------
  ['PIO 203', 'Sc3IN99sRrI', 'watch', 'Cardiovascular Anatomy: The Heart', 'The heart.', '15) The heart;'],
  ['PIO 203', 'XTF0-54yJMk', 'watch', 'Left-Heart Pressures and the Cardiac Cycle', 'Events of the cardiac cycle.', 'events of the cardiac cycle.'],
  ['PIO 203', 'KiouveG278Y', 'watch', 'Autonomic Control of Cardiac Contractility', 'Control of cardiac contractility.', 'Control of cardiac contractility.'],
  ['PIO 203', 'FlyKXrY5ak0', 'watch', 'Myocyte Membrane Potential: Electrophysiology', 'Cardiac electrophysiology.', 'Cardiac electrophysiology.'],
  ['PIO 203', 'o7L0W3Xb5Eg', 'watch', 'Contraction and Pacemaker Properties', 'Properties of cardiac muscles.', 'Properties of cardiac muscles.'],
  ['PIO 203', 'hpQFToprlH8', 'watch', 'Cardiac Output: Measurement and Control', 'Cardiac output measurement and control.', 'Cardiac output - measurement and control.'],
  ['PIO 203', 'bxCRBqISa-c', 'watch', 'Armando: Cardiology and Cardiac Output', 'Haemodynamics of circulation: pressure, flow and cardiac output.', 'Haemodynamics of circulation.'],
  ['PIO 203', 'ajLgwCygHsc', 'watch', 'Baroreceptors: Arterial Pressure Regulation', 'Arterial blood pressure and its regulation.', 'Arterial blood pressure and its regulation.'],
  ['PIO 203', 'ecXJ7to6Lb4', 'watch', 'Cardiac Output and MAP Regulation Reflexes', 'Cardiovascular reflexes.', 'Cardiovascular reflexes.'],
  ['PIO 203', '3wpT-4bSmoU', 'watch', 'Coronary Supply and Regional Blood Flow', 'Regional blood flow.', 'Regional blood flow.'],
  ['PIO 203', 'NqkdqJtxIfs', 'watch', 'Shock: Cardiovascular Changes in Exercise and Haemorrhage', 'Cardiovascular changes in exercise, haemorrhage and shock.', 'Cardiovascular changes in exercise, haemorrhage and shock.'],
  ['PIO 203', 'qGiPZf7njqY', 'watch', 'Meet the Lungs: Upper Respiratory Functions', 'Functions of the upper respiratory tract.', 'Respiratory physiology – functions of upper respiratory tract.'],
  ['PIO 203', 'GD-HPx_ZG8I', 'watch', 'Mechanics of Breathing and Compliance', 'Mechanics of respiration including compliance.', 'Mechanics of respiration including compliance.'],
  ['PIO 203', 'B_XzUDClgac', 'watch', 'Surfactant Explained', 'Surfactant.', 'Surfactant.'],
  ['PIO 203', '9VdHhD1vcDU', 'watch', 'Lung Volumes and Capacities', 'Lung volumes and capacities.', 'Lung volume and capacities.'],
  ['PIO 203', 'qDrV33rZlyA', 'watch', 'Pulmonary Gas Exchange', 'Pulmonary gas exchange.', 'Pulmonary gas exchange.'],
  ['PIO 203', 'BYGPkRFvzOc', 'watch', 'Oxygen-Haemoglobin Curve: Blood Gas Transport', 'Blood gas transport.', 'Blood gas transport.'],
  ['PIO 203', 'YwcNbVnHNAo', 'watch', 'Armando: Understanding Spirometry', 'Pulmonary function tests: normal, obstructive vs restrictive.', 'Pulmonary function tests.'],
  ['PIO 203', '9j6BpanhpKY', 'watch', 'Nervous and Chemical Control of Respiration', 'Nervous and chemical control of respiration.', 'Nervous and chemical control of respiration.'],
  ['PIO 203', 'uUSLvpHi9ZI', 'watch', 'Altitude Response and ODC Shifts', 'Response to hypoxia, high altitude, exercise and artificial respiration.', 'Response to hypoxia, high altitude, exercise and artificial respiration.'],
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
