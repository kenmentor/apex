// MLS 201/301/302/303/304/305 + MCB 221/231/305 video banks.
// Sourcing per docs/sourcing-quality-process.txt:
// - ONE winner per topic (order preserved); backups noted in research, NOT imported.
// - Armando Hasudungan, Khan Academy, Amoeba Sisters, Professor Dave, university
//   lectures (Kaiser, MedLive, Shomu's, Osmosis, RegisteredNurseRN), lab channels.
// - Comments proof: Dave "most precious resources for medical students";
//   Amoeba [1900] returning learners; Strong Medicine peer-clinician discussion.
// - GAPS: MLS refrigeration, gastric ref values/agents, practicals, secondary
//   fixation, decalc tests, museum mounting, tumour slides; MCB multi-group
//   isolation, subculturing. Documented, never forced. No paywalled/members-only
//   videos (2 rejected), no Hindi, no Kenhub previews.
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
  // ---------- MLS 201 (9 of 10; refrigeration = GAP) ----------
  ['MLS 201', 'aiKiafl5_Gw', 'watch', 'Specimen Collection and Processing I (MLSC Lecture)', 'Introduction to medical microbiology, immunology and histopathology.', 'General introduction to Medical Microbiology, immunology and Histopathology, specimen collection, reception and registration.'],
  ['MLS 201', 'spMkFHCg4-I', 'watch', 'Safety in the Clinical Microbiology Lab', 'Safety precautions in micro, immunology and histopathology labs.', 'Safety precaution in Medical Microbiology Immunology and Histopathology Laboratories.'],
  ['MLS 201', 'S7Ysd7DnVGU', 'watch', 'Dave: Light Microscopy', 'Microscopy use, care and sterilisation principles.', 'Microscopy use and care of the microscope and other equipment sterilisation-principles and techniques.'],
  ['MLS 201', 'RwBUgVDeRqw', 'watch', 'Dave: Common Scientific Glassware', 'Glassware care and maintenance.', 'Glassware-care and maintenance.'],
  ['MLS 201', 'QFagglO-SiA', 'watch', 'Intro to Clinical Chemistry', 'Clinical chemistry, haematology and transfusion sciences.', 'General introduction to clinical Chemistry, Haematology and Blood Transfusion Sciences.'],
  ['MLS 201', 'Jm7I-kqRqH4', 'watch', 'Handling, Processing and Storing Specimens', 'Storage and disposal of specimens.', 'Storage and disposal of specimens.'],
  ['MLS 201', '_h0XkmOw2kY', 'watch', 'Medicosis: Color-Coded Phlebotomy Tubes', 'Specimen containers.', 'Specimen containers.'],
  ['MLS 201', '55EBlnDMr4M', 'watch', 'Lab Safety and Standard Precautions', 'Safety in chemical pathology, haematology and blood bank labs.', 'Safety precaution in the chemical pathology, Haematology and Blood Bank Laboratories.'],
  ['MLS 201', 'kuUBPv3nkjE', 'watch', 'Animal Handling Workshop (Live Demo)', 'Handling of laboratory animals.', 'Handling of Laboratory animals.'],
  // ---------- MLS 301 (26 of 28) ----------
  ['MLS 301', '8rZRYPoerPw', 'watch', 'OCT: SI Base and Derived Units', 'Traditional and SI units in clinical chemistry.', 'Traditional and S.I units in Clinical Chemistry;'],
  ['MLS 301', 'Rcb6I7gsl-Y', 'watch', 'Armando: Gastric Acid Physiology', 'Ward procedures and lab investigation of gastric secretions.', 'Ward procedures and Laboratory Investigation of Gastric Secretions.'],
  ['MLS 301', 'Oh_Pt_UrtEE', 'watch', 'Khan: Meet the GI Tract', 'Intestinal function tests.', 'Intestinal function tests;'],
  ['MLS 301', 'M008eTnvV9Y', 'watch', 'Armando: Digestive Physiology Overview', 'Digestion and absorption.', 'Digestion and absorption;'],
  ['MLS 301', 'gZeliSjhkpg', 'watch', 'Khan: Celiac Disease', 'Causes of malabsorption.', 'Causes of Malabsorption.'],
  ['MLS 301', 'aww5NiahRb8', 'watch', 'Armando: B12 Digestion and Pernicious Anaemia', 'Laboratory investigation of malabsorption.', 'Laboratory investigation of malabsorption.'],
  ['MLS 301', '8Mn0IUCTg3U', 'watch', 'Armando: GFR', 'Renal function tests.', 'Renal function tests;'],
  ['MLS 301', 'KWHasxDRf54', 'watch', 'Armando: Kidney Physiology Overview', 'Functions of the kidney.', 'functions of the kidney;'],
  ['MLS 301', 'ko_XD4jPEo8', 'watch', 'Armando: Reabsorption and Secretion', 'Renal plasma flow, GFR, clearance and concentration tests.', 'Measurement of Renal plasma flow, Glomerular filtration rate – Creatinine clearance, Insulin clearance, Concentration and Dilution Tests;'],
  ['MLS 301', 'JwaeWXhklio', 'watch', 'Armando: Micturition', 'Urinary acidification and osmolarity tests.', 'Urinary Acidification Tests, urine specific gravity/Osmolarity Dye Excretion test.'],
  ['MLS 301', 'v3BTWpNTyLU', 'watch', 'Body Fluid Compartments: ICF and ECF', 'Water and electrolyte metabolism.', 'Water and Electrolyte metabolism.'],
  ['MLS 301', 'ja7p_tzTTEA', 'watch', 'Khan: Intro to Acids and Bases', 'Acid base balance.', 'Acid base balance;'],
  ['MLS 301', 'MaXh8IYHkLc', 'watch', 'Acidosis and Alkalosis in 7 Minutes', 'Definition and causes of acidosis and alkalosis.', 'Definition and causes of acidosis and alkalosis;'],
  ['MLS 301', 'gjKmQ501sAg', 'watch', 'Khan: Buffers', 'Blood buffers.', 'Blood buffers.'],
  ['MLS 301', 'dHi9ctwDUnc', 'watch', 'Khan: Bohr vs Haldane Effect', 'Transport of blood gases.', 'Transport of blood gases;'],
  ['MLS 301', '51adnbdpBqo', 'watch', 'ROME ABG Interpretation (RegisteredNurseRN)', 'Assessment of acid-base status.', 'assessment of acid/base status.'],
  ['MLS 301', 'HGg_WiaSr4U', 'watch', 'Khan: Intro to Lipids', 'Lipids.', 'Lipids;'],
  ['MLS 301', '1Dx7LDwINLU', 'watch', 'Amoeba: Biomolecules Updated 2023', 'Definition and types of lipids.', 'definition and types of lipids;'],
  ['MLS 301', 'FxOXPVW4ZCc', 'watch', 'Armando: Diabetic Ketoacidosis', 'Free fatty acids, ketone bodies and lactate.', 'Formation of free fatty acids, ketone bodies and Lactate;'],
  ['MLS 301', 'PkKH8lTxvzA', 'watch', 'Armando: Lipoproteins and Cholesterol', 'Measurement of plasma lipids and lipoproteins.', 'Measurement of plasma lipids and lipoproteins.'],
  ['MLS 301', 'EBf97p7AeZc', 'watch', 'Medicosis: Albumin and Globulins', 'Plasma proteins and physiologic functions.', 'Plasma proteins and physiologic functions;'],
  ['MLS 301', '7VH32yaztuo', 'watch', 'Plasma Proteins Lecture', 'Factors affecting synthesis and catabolism.', 'factors affecting synthesis and catabolism.'],
  ['MLS 301', 'h3obl4ZMukY', 'watch', 'Biuret Method Demo', 'Determining total protein in serum.', 'Methods for the determining of total protein in serum.'],
  ['MLS 301', '1c6a0BNsyek', 'watch', 'Armando: Insulin and Glucagon', 'Blood glucose homeostasis.', 'Carbohydrate metabolism: Blood glucose homeostasis;'],
  ['MLS 301', 'W0KPwTy0W9k', 'watch', 'Armando: Type II Diabetes Pathophysiology', 'Hyperglycaemia and diabetes mellitus.', 'hyperglycaemia diabetes mellitus – its causes and investigation;'],
  ['MLS 301', 'U3TbzU2UeuM', 'watch', 'Hypoglycemia Explained', 'Hypoglycaemia types, causes and investigation.', 'Hypoglycaemia – types causes and investigation.'],
  // ---------- MLS 302 (10 of 11; practicals = GAP) ----------
  ['MLS 302', 'XVWOlKdpF_I', 'watch', 'Khan: Hematopoiesis', 'Origin, development and functions of blood cells.', 'Origin, development and functions of blood cells.'],
  ['MLS 302', 'LWtXthfG9_M', 'watch', 'Khan: Hemoglobin', 'Synthesis and breakdown of haemoglobin.', 'Synthesis and breakdown of haemoglobin.'],
  ['MLS 302', 'cj2kNVKpqWs', 'watch', 'Hb Estimation: Collection and Anticoagulants', 'Methods of haemoglobin estimation.', 'Methods of Haemoglobin estimation.'],
  ['MLS 302', '-F3PZj9zo-U', 'watch', 'Hemocytometer Neubauer Chamber Count', 'Methods of cell counting.', 'Methods of cell counting.'],
  ['MLS 302', 'DN-meIV-G3c', 'watch', 'Dr Najeeb: RBC Indices', 'Absolute values.', 'Absolute values.'],
  ['MLS 302', 'rLIEeUP_e-Y', 'watch', 'Khan: Hemostasis', 'Introduction to homeostasis.', 'Introduction to Homeostasis.'],
  ['MLS 302', 'VxEIsPOdOLw', 'watch', 'Khan: Anticoagulation and Thrombolysis', 'Action of common anticoagulants.', 'Principle and mode of action of common anticoagulants.'],
  ['MLS 302', 'QBCkOYAI5Mo', 'watch', 'Blood Films Staining Demo', 'Haematological stains: principle and components.', 'Principle and components of Haematological stains.'],
  ['MLS 302', 'FNVvQ788wzk', 'watch', 'Khan: Coagulation Cascade', 'Simple tests in blood coagulation.', 'Simple tests used in blood coagulation.'],
  ['MLS 302', 'Jmc81RK32qg', 'watch', 'Blood Film and Smear Demo', 'Normal and abnormal blood films.', 'Blood films-normal and abnormal.'],
  // ---------- MLS 303 (15 topics) ----------
  ['MLS 303', 'ycO-oWYvaQI', 'watch', 'Dave: Intro to the Microbial World', 'Scope of microbiology: historical approach.', 'Scope of microbiology: Historical approach and many others.'],
  ['MLS 303', '8IJRzcPC9wg', 'watch', 'Dave: Taxonomy of Bacteria', 'Classification and nomenclature of microorganisms.', 'Classification and nomenclature of microorganisms.'],
  ['MLS 303', 'ThU9Ckp1mB8', 'watch', 'Armando: Microbiology Overview', 'Introduction to the microbial world.', 'Introduction to the microbial world;'],
  ['MLS 303', 'kpk5wswBPPw', 'watch', 'Amoeba: Comparing Cell Types', 'Bacteriology, mycology, virology and parasitology.', 'Introduction to Bacteriology, Mycology, Virology and Parasitology (the protozoan).'],
  ['MLS 303', 'fzIKJpcfXfo', 'watch', 'Armando: Bacteria Structure', 'General properties, structure, growth and reproduction of bacteria.', 'Bacteriology: The general properties of bacteria, structure, growth, reproduction, requirements both environmental and nutritional.'],
  ['MLS 303', '7Lh-M-rX86Q', 'watch', 'Armando: Growth, Reproduction and Classification', 'Bacterial metabolism, genetics and variation.', 'Aspects of Bacterial metabolism, bacterial genetics and variation.'],
  ['MLS 303', 'IVBCrzjOl40', 'watch', 'Armando: Antibiotics Mechanisms', 'Sterilisation, antibiotics and chemotherapy.', 'Sterilisation in Microbiology, bacteria in health and disease: Antibiotics and chemotherapy;'],
  ['MLS 303', 'LSYED-7riNY', 'watch', 'Armando: Immunology Overview', 'Infection and immunity.', 'infection and immunity;'],
  ['MLS 303', 'j1Krn0kkSUg', 'watch', 'Dave: Fluorescence Microscopy', 'Laboratory techniques and serology.', 'introduction to laboratory techniques and methods including serology.'],
  ['MLS 303', 'lADC0C_WeH0', 'watch', 'Dave: Intro Virology and Classification', 'Viruses: properties, structure, reproduction and diagnosis.', 'Viruses: General properties, structure and biology of viruses, classification – various methods, reproduction, resistance, pathology, purification of viruses, propagation of viruses, immunity and diagnosis of viral infection, interferon and interference, inclusion bodies, cytopathic effects.'],
  ['MLS 303', 'm-bTWGPZqhk', 'watch', 'Dave: Virus-Cell Interactions II', 'Viral-host interactions and identification.', 'Viral- host interactions and identification.'],
  ['MLS 303', 'wqKNm_evkYA', 'watch', 'Dave: Intro to Mycology', 'Fungi: morphology, groups and classification.', 'Fungi: Morphology, groups and classification.'],
  ['MLS 303', '4jEPWtpS9WA', 'watch', 'Slay Step 1: Skin Fungi', 'Lesion types, mycoses and growth requirements.', 'Types of lesion and types of mycoses, growth requirements.'],
  ['MLS 303', 'gIEm3QV58Dw', 'watch', 'Strong Medicine: Classification and Structure Lesson 1', 'Characteristics and diseases of fungi.', 'Characteristics and general features of fungi and their diseases.'],
  ['MLS 303', 'rzrqdt6QVrA', 'watch', 'SciWhiz: Pathogenic Fungi Review', 'Identification and lab demonstration.', 'Identification, and demonstration in the laboratory.'],
  // ---------- MLS 304 (14 of 18) ----------
  ['MLS 304', 'pNrnsiRyC6Q', 'watch', 'General Pathology Lecture', 'Introduction to histopathology.', 'Introduction to Histopathology.'],
  ['MLS 304', 'ItpO9tGZpc0', 'watch', 'MLS with Raza: Tissue Fixation', 'Fixation: autolysis and bacterial decomposition.', 'Fixation – Autolysis, bacterial decomposition.'],
  ['MLS 304', '6DyhCNHhCI4', 'watch', 'Fixation, Dehydration and Clearing', 'Effects of fixation and common fixing agents.', 'Effects of fixation, common fixing agents and their uses.'],
  ['MLS 304', 'ECiwGChC4JM', 'watch', 'Decalcification Complete Guide (MLS with Raza)', 'Decalcification aims, agents and clearing tests.', 'Fixation pigments, Decalcification – Aims and applications, decalcifying agents.'],
  ['MLS 304', 'xIyXA3c3oxU', 'watch', 'Embedding Process (Goodwin University)', 'Dehydration, clearing, infiltration and embedding.', 'Dehydration, clearing and infiltration/embedding.'],
  ['MLS 304', '3-ksptLWVgc', 'watch', 'Frozen Section and Stains', 'Frozen and celloidin sections.', 'Frozen and celloidin sections.'],
  ['MLS 304', 'nUjK4n3_1C8', 'watch', 'Slide Preparation (Univ. of Bristol)', 'Embedding media.', 'Embedding media.'],
  ['MLS 304', 'NRxxyEgnWmo', 'watch', 'Osmosis: Liver Histology', 'Basic histology of organs.', 'Basic histology of organs.'],
  ['MLS 304', 'ZICJIzzXVbw', 'watch', 'Exfoliative Cytology Lecture', 'Principles of exfoliate cytology.', 'Principles and application of Exfoliate Cytology.'],
  ['MLS 304', 'cPmhf29io8E', 'watch', 'Dr Jibran Ahmed: Cervical Cytology (Bethesda)', 'Collection and fixation for cytology.', 'Collection and fixation of specimens for cytological examination.'],
  ['MLS 304', 'PzRk6ABYLgk', 'watch', 'Simply Pathology: Museum Specimens', 'Museum technique and colour restoration.', 'Museum technique-colour restoration.'],
  ['MLS 304', 'cdCh4_Ckor0', 'watch', 'Armando: Inflammation I', 'Tissue and cellular injury inflammation.', 'Tissues and cellular injury inflammation.'],
  ['MLS 304', 'Q3cVCiraAgw', 'watch', 'Armando: Wound Healing', 'Healing and repairs.', 'Healing and repairs.'],
  ['MLS 304', 'cZSzgeMAL0c', 'watch', 'pathCast: Gross Specimen Examination', 'Gross appearance of diseased organs at post-mortem.', 'Gross appearance of diseased organs in routine post-mortem examination.'],
  // ---------- MLS 305 (5 topics) ----------
  ['MLS 305', 'eXKThTSnot8', 'watch', 'Dave: Jenner and the Dawn of Immunology', 'Historical background of immunology.', 'The Historical background of Immunology.'],
  ['MLS 305', 'rp7T4IItbtM', 'watch', 'Khan: Innate vs Adaptive Immunity', 'Classification of immunity.', 'Classification of Immunity.'],
  ['MLS 305', '2-57bqFSJ1E', 'watch', 'Armando: Innate Immunity and Complement', 'Innate immunity.', 'Innate immunity.'],
  ['MLS 305', '4cpzrcp5M7Q', 'watch', 'Armando: Immune Cells Map', 'Development and structure of immune cells.', 'Development and structure of cells in the Immune System Cellular interaction the expression and regulation of immunity.'],
  ['MLS 305', 'gFEJDxl4-xs', 'watch', 'Armando: Adaptive Immunity', 'Acquired immunity.', 'Acquired Immunity.'],
  // ---------- MCB 221 (17 of 18) ----------
  ['MCB 221', 'T-K_pmEOZuQ', 'watch', 'LevelUpRN: History of Microbiology', 'History of the science of microbiology.', 'History of the Science of Microbiology.'],
  ['MCB 221', 'xTnNv7YplSo', 'watch', 'Khan: Prokaryotic and Eukaryotic Cells', 'Prokaryotes and eukaryotes.', 'Classification of organisms into prokaryotes and eukaryotes;'],
  ['MCB 221', 'EWjYS-DNIiQ', 'watch', 'MooMooMath: Three Domains of Life', 'Archaea and eubacteria.', 'Classification of prokaryotes into archaea and eubacteria.'],
  ['MCB 221', 'EC-U6tv6Wf4', 'watch', 'Dave: Unicellular Life, Bacteria', 'Anatomy and cytochemistry of bacteria and fungi.', 'Anatomy and cytochemistry of bacteria and fungi.'],
  ['MCB 221', 'DbU_exm1Cwg', 'watch', 'Cocci vs Bacilli vs Spirilla', 'Shapes, groupings and colonial morphology.', 'Shapes, groupings and colonial morphology of bacteria and fungi.'],
  ['MCB 221', 's8jhJXgC-bk', 'watch', 'Armando: Viruses', 'Structure of viruses.', 'Structure of viruses.'],
  ['MCB 221', 'QZbFG6wgd40', 'watch', 'MedLive: Sterilization and Disinfection', 'Sterilization and disinfection.', 'Sterilization and disinfection;'],
  ['MCB 221', '5aQk9rCzOAE', 'watch', 'Armando: Gut Microbiome', 'Structure, ecology and reproduction of microbial genera.', 'Structure, ecology and reproduction of representative microbial genera.'],
  ['MCB 221', 'rydQVvo8rM0', 'watch', 'Liquid Media Cultures (Broadcast Biology)', 'Culture of micro-organisms.', 'Culture of micro-organisms.'],
  ['MCB 221', 'bm99zrq3ijo', 'watch', 'Streak Plate Isolation (MicroChem)', 'Isolation of micro-organisms.', 'Isolation of micro-organisms;'],
  ['MCB 221', 'VpVg_pSPQxE', 'watch', 'Amoeba: Enzymes', 'Nutrition and biochemical activities.', 'Nutrition and biochemical activities of micro-organisms.'],
  ['MCB 221', 'C_GRI3fxUWw', 'watch', 'Armando: Intro to Antibodies', 'Antigens and antibodies.', 'Antigens and antibodies.'],
  ['MCB 221', 'cMVyrrdgaYk', 'watch', 'Shomu\u2019s Biology: Bacterial ID Methods', 'Identification and economic importance of microbial groups.', 'Identification and economic importance of selected microbial groups.'],
  ['MCB 221', 'TbOQIbEEVtA', 'watch', 'Amoeba: Mutations', 'Microbial variation and heredity.', 'Microbial variation and heredity.'],
  ['MCB 221', 'qonAQKjxPMc', 'watch', 'Essential Micro Lab Equipment (Pharmatalks)', 'Study of laboratory equipment.', 'Study of laboratory equipment.'],
  ['MCB 221', 'R6L40mt-2WU', 'watch', 'Bacteriology of Air, Water, Food, Milk and Soil', 'Microbiology of air, food, milk, dairy, water and soil.', 'Introduction to microbiology of air, food, milk, dairy products, water and soil.'],
  ['MCB 221', 'AZS2wb7pMo4', 'watch', 'Bhanu Prakash: Gram Stain Animation', 'Staining, sensitivity, serology and antimicrobials.', 'Staining techniques, antibiotic sensitivity tests, serological tests, antimicrobial agents.'],
  // ---------- MCB 231 (10 of 11; subculturing = GAP) ----------
  ['MCB 231', 'oX10mXkg-B8', 'watch', 'Dr Gary Kaiser: Aseptic Technique', 'Culturing of micro-organisms.', 'Culturing of micro-organisms.'],
  ['MCB 231', '9cy9VqVUODo', 'watch', 'Culture Media Types (Animated Biology)', 'Preparation of media for microbial growth.', 'Preparation of media for microbial growth.'],
  ['MCB 231', 'FutAgWDymAM', 'watch', 'Four Quadrant Streak (Hardy Diagnostics)', 'Isolation of pure culture.', 'Isolation of pure culture.'],
  ['MCB 231', 'lCVl3l7GmRI', 'watch', 'Pour Plate Colony Counting (MicroChem)', 'Streaking and pour plates.', 'Streaking, pour plates etc.'],
  ['MCB 231', 'sxa46xKfIOY', 'watch', 'Bio-Rad: Gram Staining', 'Staining techniques for differentiation.', 'Staining techniques for differentiation of micro-organisms.'],
  ['MCB 231', 'Tdn9PV5kWXY', 'watch', 'CFUs: Enumeration of Micro-organisms', 'Direct and indirect enumeration.', 'Enumeration of micro-organisms, direct and indirect procedures.'],
  ['MCB 231', 'E4a8g1o72AM', 'watch', 'Biochemical Tests for ID', 'Colonial, cellular and biochemical identification.', 'Identification of micro-organisms to include colonial and cellular morphology and biochemical procedures.'],
  ['MCB 231', 'M-szotkpT00', 'watch', 'Kirby-Bauer Disc Test (TheRubinLab)', 'Serology, sensitivity discs and agar-well methods.', 'Identification of bacteria should also include the use of serological techniques, antibiotic sensitivity discs and agar-in well methods.'],
  ['MCB 231', 'qt8VrEKEois', 'watch', 'McIntosh and Fildes Jar, Gas-pak', 'Anaerobic jar for anaerobes.', 'The use of anaerobic jar for growth of anaerobic organisms.'],
  ['MCB 231', 'zOlwzdbSuhc', 'watch', 'Preservation of Pure Cultures', 'Agar slants, subculturing, freezing, lyophilisation.', 'Methods of preservation (agar slants, frequent subculturing, refrigeration and use of deep freezers, lyophilisation, storage in liquid nitrogen) of microbial cultures.'],
  // ---------- MCB 305 (6 topics) ----------
  ['MCB 305', 'kBlzl0FpeC8', 'watch', 'Dave: Mushroom Life Cycle', 'Structure, life cycles and classification of fungi.', 'Structure, life cycles, physiology and classification of fungi.'],
  ['MCB 305', 'psJQtVtg0sM', 'watch', 'Strong Medicine: Fungal Infections Lesson 2', 'Medical and food fungi, pathogenicity and treatment.', 'Fungi of medical, food and industrial Importance, fungal pathogenicity, immunity epidemiology, incidence treatment-Superficial mycoses (ringworm, superficial candidosis, pityriasis), subcutaneous mycoses (Mycetoma, Histoplasmosis, Phaeohyphomycosis).'],
  ['MCB 305', 'owRzU83eQvs', 'watch', 'Medicosis: Histo, Blasto, Cocci and Paracocci', 'Systemic mycoses.', 'Systemic mycoses coccidomycoses, blastomycose, Paracocidio-domycosis, aspergillosis, cryptococcosis).'],
  ['MCB 305', 'yck1KHVu99o', 'watch', 'Alpha Genomics: Fermentation Products', 'Food and industrial fungi.', 'Fungi of food and industrial importance (Aspergillus niger, Saccharomyces cerevisiae importance.'],
  ['MCB 305', 'bWxPpK7t5lE', 'watch', 'Esco Lifesciences: What Is Fermentation', 'Fungal metabolites and industrial uses.', 'Metabolites of fungi, industrial uses of fungi.'],
  ['MCB 305', 'mhXmkDapHWg', 'watch', 'Patrick Kelly: Penicillin, Fleming to Pharmacy', 'Fungi in medicine.', 'Fungi in medicine.'],
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
