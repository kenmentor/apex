// BCH 301-309 + BCH 401-403 video banks.
// Sourcing per docs/sourcing-quality-process.txt:
// - ONE winner per topic (order preserved); backups noted in research, NOT imported.
// - Khan Academy (MCAT biomolecules/chemical processes/cellular respiration),
//   Professor Dave (biochem/biology/genetics/forensic/pharmacology courses),
//   Shomu's Biology (biochem/SMBB/biotech/gene-regulation/DNA-repair playlists),
//   NPTEL IIT-KGP/IITG enzymology, SimplyAandP nutrition, AK Lectures, Stanford.
// - Comments proof: Dave Biochem "Nailed the long boring 70 slide powerpoint"
//   [850]; Shomu RDT "Basically passed all my exams"; AK Lectures [126 likes].
// - GAPS (22, honest): 400-level specialization, forensic-tox depth, niche
//   analytical topics, in-person practicals. Documented, never forced.
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
  // ---------- BCH 301 (14 topics, no GAPs) ----------
  ['BCH 301', 'AD3-v1oKjSk', 'watch', 'Khan: Six Types of Enzymes', 'Discovery, classification and nomenclature of enzymes.', 'Discovery, classification and nomenclature of enzymes.'],
  ['BCH 301', 'c-f7tc_VO-0', 'watch', 'NPTEL: Vitamins and Coenzymes I', 'Fat and water soluble vitamins, co-enzymes, minerals.', 'Vitamins: fat and water soluble vitamins and co-enzymes, minerals in enzyme biochemistry.'],
  ['BCH 301', 'LIi-G9RGTPo', 'watch', 'NPTEL: Vitamins and Coenzymes II', 'Structures and functions of vitamins and co-enzymes.', 'Structures and functions of vitamins and co- enzymes.'],
  ['BCH 301', '6cGdWi_DSGk', 'watch', 'Shomu: Enzyme Kinetics Animation', 'Kinetics of enzymes.', 'Kinetics of enzymes.'],
  ['BCH 301', 'SsI-sQ6Ows8', 'watch', 'Shomu: Enzyme Catalysis Mechanism', 'Mechanisms of enzyme-catalysed reactions.', 'Mechanisms of enzyme-catalysed reactions.'],
  ['BCH 301', 'LC5I8BsO18I', 'watch', 'Khan: Enzymes and Their Local Environment', 'Effects of temperature, pH, ions and inhibitors.', 'Effects of temperature, pH, ions and inhibitors on enzyme catalysed reactions.'],
  ['BCH 301', 'ALU24yhKJZw', 'watch', 'Khan: Enzymatic Inhibition and Lineweaver Burk Plots', 'Enzyme inhibition.', 'Enzyme inhibition.'],
  ['BCH 301', '7u2MkbsE_dw', 'watch', 'Khan: Steady States and the Michaelis Menten Equation', 'Derivation and significance of Michaelis-Menten.', 'Derivation and significance of Michaelis-Menten equation.'],
  ['BCH 301', 'JpzUOPUgi60', 'watch', 'Shomu: Allosteric Enzyme', 'Allosteric and regulatory enzymes.', 'Allosteric/Regulatory enzymes.'],
  ['BCH 301', '8lUB2sAQkzw', 'watch', 'Khan: Induced Fit Model', 'Active sites of enzymes.', 'Active sites of enzymes.'],
  ['BCH 301', 'clnyn0drdJo', 'watch', 'Shomu: Double Reciprocal Plot', 'Estimation of kinetic parameters of enzyme activities.', 'Estimation of kinetic parameters of enzyme activities.'],
  ['BCH 301', 'bxtoM9Pfmy8', 'watch', 'Shomu: Zymogen Activation', 'Zymogen activation, digestive enzymes, production and isolation.', 'Zymogen activation, digestive enzymes and many more Production, isolation, purification and characterization of enzymes.'],
  ['BCH 301', 'SyoXKNT-01U', 'watch', 'Shomu: Isozyme', 'Marker enzymes.', 'Marker enzymes.'],
  ['BCH 301', 'nZJG07Nz8ME', 'watch', 'ORNL: Frances Arnold, Innovation by Evolution', 'Recent advances in enzymology: directed evolution.', 'Recent advances in enzymology.'],
  // ---------- BCH 302 (7 of 9) ----------
  ['BCH 302', 'FILqt0nSiRo', 'watch', 'Dave: Carbohydrates Part 2, Polysaccharides', 'Chemistry, function, isolation of polysaccharides.', 'Chemistry and function, isolation and purification of polysaccharides.'],
  ['BCH 302', 'wFYsufJ9XMM', 'watch', 'Dave: Carbohydrates Part 1', 'Disaccharides, oligosaccharides and polysaccharides.', 'Biochemistry of important disaccharides, oligosaccharides and polysaccharides;'],
  ['BCH 302', 'fJ63WavB7UE', 'watch', 'Shomu: Breakdown of Glycogen', 'Degradation and digestion of carbohydrates.', 'degradation and digestion of carbohydrates…'],
  ['BCH 302', 'FVWSBleIoCU', 'watch', 'Shomu: Glycolysis', 'Glycolysis, TCA, phosphogluconate and glyoxylate pathways.', 'Glycolysis, the TCA cycle, the phosphogluconate pathway, the glycoxylate pathway;'],
  ['BCH 302', 'frW2SaK5ubE', 'watch', 'Shomu: Pentose Phosphate Pathway', 'Pentose phosphate, Cori and Calvin pathways.', 'the pentose phosphate pathway and the cori cycle, the calvin pathway.'],
  ['BCH 302', 'WOy-rLlcb90', 'watch', 'Shomu: Gluconeogenesis', 'Gluconeogenesis, glycogenesis, glycogenolysis, fructose.', 'Gluconeogenesis and glycogenesis, glycogenolysis, metabolism of fructose, Polyol pathway.'],
  ['BCH 302', 'rmqJNA5IXck', 'watch', 'Shomu: Regulation of Hexokinase 4', 'Regulation of carbohydrate metabolism.', 'Regulation of carbohydrate metabolism.'],
  // ---------- BCH 303 (2 topics) ----------
  ['BCH 303', 'I4lU4zQJQRk', 'watch', 'Khan: How Does the Body Adapt to Starvation?', 'Tissue-specific metabolism.', 'Tissue-specific metabolism.'],
  ['BCH 303', 'Id2E72P8Fe0', 'watch', 'Khan: Insulin and Glucagon', 'Division of labour and hormonal regulation of fuel metabolism.', 'The division of labour and hormonal regulation of fuel metabolism.'],
  // ---------- BCH 304 (13 of 15) ----------
  ['BCH 304', 'J6R8zDAl_vw', 'watch', 'Dave: Amino Acids', 'Amino acids as building blocks of proteins.', 'Amino acids as building blocks of proteins;'],
  ['BCH 304', 'WKwiax3iFRM', 'watch', 'Shomu: Peptide Bond Structure', 'The peptide bond as covalent backbone.', 'the peptide bond as covalent backbone of proteins.'],
  ['BCH 304', 'EweuU2fEgjw', 'watch', 'Dave: Protein Structure', 'Forces stabilising protein structure.', 'Forces involved in the stabilisation of protein structure.'],
  ['BCH 304', 'amvK8YAhe5w', 'watch', 'Shomu: 2D Gel Electrophoresis', 'Protein isolation, fractionation and characterisation.', 'Protein isolation, fractionation, purification and characterisation.'],
  ['BCH 304', 'zqs3taXR454', 'watch', 'Shomu: Chromatography Part 2 (Ion Exchange)', 'Amino acid analysis of peptides and proteins.', 'Amino acid analysis of peptides and proteins.'],
  ['BCH 304', 'qFTDOT9Kojc', 'watch', 'Shomu: Protein Sequence Analysis', 'Determining amino acid sequences.', 'Methods for the determination of the sequence of amino acids in proteins.'],
  ['BCH 304', 'Zj8BV_qnHZ4', 'watch', 'Shomu: Protein Synthesis in Prokaryotes', 'Protein biosynthesis and molecular weight determination.', 'Protein Biosynthesis, Molecular weight determination of proteins.'],
  ['BCH 304', 'vnW9kH0agcE', 'watch', 'Shomu: Proteomics', 'Techniques in protein biochemistry.', 'Techniques in protein biochemistry.'],
  ['BCH 304', 'YZyeFcgqK8Y', 'watch', 'Shomu: Oxidative Deamination', 'Oxidative degradation of amino acids and one-carbon units.', 'Oxidative degradation of amino acids and metabolism of one carbon units.'],
  ['BCH 304', 'bAArdiXVQ3I', 'watch', 'Shomu: Amino Acid Metabolism', 'Ammonia toxicity and urea formation.', 'Ammonia toxicity and urea formation.'],
  ['BCH 304', 'p7Ss0yGf84U', 'watch', 'AK Lectures: Glucogenic and Ketogenic Amino Acids', 'Ketogenic and glucogenic amino acids.', 'Ketogenic and Glucogenic amino acids.'],
  ['BCH 304', '02JbwkmQwqQ', 'watch', 'Shomu: Amino Acid Synthesis', 'Biosynthesis of amino acids and derivatives.', 'Biosynthesis of amino acids and some derivatives;'],
  ['BCH 304', '0I8vaXqfElo', 'watch', 'Shomu: Urea Cycle', 'The urea cycle.', 'the urea cycle;'],
  // ---------- BCH 305 (8 topics, SimplyAandP) ----------
  ['BCH 305', 'CgUEu54nqqU', 'watch', 'Factors Affecting Energy Intake and Expenditure', 'Energy requirement, BMR and SDA.', 'General nutrition requirement, energy aspect of diet, basal metabolic rate (BMR) and specific dynamic action (SDA).'],
  ['BCH 305', 'jEd91r___5Y', 'watch', 'Stanford: What is Malnutrition?', 'Major nutritional disorders.', 'The major nutritional disorder.'],
  ['BCH 305', 'pWqvg0IRn6U', 'watch', 'Nutritional Issues: Malnutrition', 'Kwashiorkor, marasmus, obesity, iron.', 'Kwashiorkor, marasmus, obesity, iron.'],
  ['BCH 305', '2TazDXY4_8o', 'watch', 'Trace Minerals: Iron, Copper, Zinc, Selenium', 'Sources, absorption, anaemia, hemochromatosis.', 'Sources’ absorption, distribution in the body and biochemical function excretion, anaemia, and hemochromatosis.'],
  ['BCH 305', 'PrIrazoAPU0', 'watch', 'Regulation of Water', 'Water and major ions, fluid intake and output.', 'Water and the major icons: H+, Na+, K+, Ca++ HCO3, fluid intake and output.'],
  ['BCH 305', '6Xy0g6skOJI', 'watch', 'General Characteristics of Water', 'Total body water: ICF and ECF.', 'Total body water distribution intracellular and extracellular fluids.'],
  ['BCH 305', '04lY-bE6WJ0', 'watch', 'Trace Minerals: I, Cr, Mn, Mo, F', 'Trace elements.', 'Trace element.'],
  ['BCH 305', 'Q3L_uu93Op8', 'watch', 'Minerals Overview and Major Minerals', 'Calcium and phosphorus metabolism.', 'Calcium and phosphorus, metabolism and significances in the body.'],
  // ---------- BCH 306 (6 of 7) ----------
  ['BCH 306', 'OBagQf8_lZM', 'watch', 'Shomu: Mammalian Cell Culture 1', 'Tissue and cell culture, immunoassays, blotting, isotopic techniques.', 'Tissue and cell culture techniques, immunoassays, blotting and isotopic techniques.'],
  ['BCH 306', 'RIsFdMpp_rk', 'watch', 'Shomu: Gel Electrophoresis', 'Electrophoresis, manometry and centrifugation.', 'Principles, methodologies, instrumentation and applications of electrophoresis, manometry and centrifugation…'],
  ['BCH 306', 'QhU98LwL0_s', 'watch', 'Shomu: Chromatography Part 1', 'Paper, TLC, column, gas and HPLC chromatography.', 'Chromatographic techniques including paper, thin layer, column, gas, and high-performance…'],
  ['BCH 306', '6WmWzkprmxI', 'watch', 'Shomu: Mass Spectrometry Part 1', 'Spectroscopy: UV-vis, IR, NMR and mass spec.', 'Spectroscopic techniques including uv- visible, infra-red, nuclear magnetic resonance and mass spectrometry.'],
  ['BCH 306', 'p7F8rz0_Vzw', 'watch', 'Shomu: FRET', 'Fluorimetry and potentiometric measurements.', 'Fluorimetry, polarographic including potentiometric and electrometric measurements.'],
  ['BCH 306', '6ju5bmU9AyA', 'watch', 'Shomu: Gas Chromatography', 'GC-MS, thermocycler, HPLC, NMR, FTIR.', 'State-of-the-art equipment: GC-MS, thermocycler, HPLC, NMR, FTIR.'],
  // ---------- BCH 307 (12 of 13) ----------
  ['BCH 307', '3YRjpiBqSU4', 'watch', 'Shomu: Gene Cloning', 'Gene cloning and recombinant DNA in medicine.', 'Gene cloning and the application of recombinant DNA technology in medicine.'],
  ['BCH 307', 'WCN_gHhdqCA', 'watch', 'Dave: Immunostimulants', 'Application of immunotherapy.', 'Application of immunotherapy.'],
  ['BCH 307', 'NT4PkGpygd4', 'watch', 'Shomu: Central Dogma', 'Molecular and cell biology.', 'Molecular and cell biology.'],
  ['BCH 307', 'PAvW_-1WgWw', 'watch', 'Shomu: DNA Replication 1', 'DNA replication and transcription.', 'DNA, replication and transcription.'],
  ['BCH 307', '6NhDY3IDp00', 'watch', 'Dave: Nucleic Acids DNA and RNA', 'RNA and relationship to DNA.', 'RNA and relationship to DNA.'],
  ['BCH 307', 'bKIpDtJdK8Q', 'watch', 'Dave: Transcription and Translation', 'Genetic code.', 'Genetic code.'],
  ['BCH 307', 'Fu7t3rjW7yQ', 'watch', 'Shomu: Gene Regulation in Eukaryotes', 'Protein biosynthesis and regulation of gene expression.', 'Biosynthesis of protein and regulation of gene expression.'],
  ['BCH 307', 'aUMN0a5XpsU', 'watch', 'Shomu: Properties of Restriction Enzymes', 'Tools of genetic engineering.', 'Tools of genetic engineering (molecular biology).'],
  ['BCH 307', 'SUqN38nGxqg', 'watch', 'Shomu: Nucleic Acid Hybridization', 'Hybridisation, cloning, Southern blotting, PCR.', 'Hybridisation, molecular cloning, southern blotting and related techniques, PCR…'],
  ['BCH 307', '_0UTZR7PVzc', 'watch', 'AK Lectures: Hemoglobinopathies', 'Inheritance of haemoglobinopathies.', 'Molecular and biochemical basis of inheritance of common diseases, haemoglobinopathies.'],
  ['BCH 307', 'SE7Fi8jM8ho', 'watch', 'Shomu: Gene Therapy Part 1', 'Gene therapy.', 'Gene therapy.'],
  ['BCH 307', 'A-hmvyep7zk', 'watch', 'Shomu: Cancer Biology Part 1', 'Biochemical aspects of cancer and therapy.', 'Biochemical aspects of cancer and cancer therapy.'],
  // ---------- BCH 308 (4 of 5) ----------
  ['BCH 308', 'PK6HmIe2EAg', 'watch', 'Khan: ATP', 'High-energy compounds.', 'High-energy compounds.'],
  ['BCH 308', 'ViAmQivKif0', 'watch', 'Khan: Gibbs Free Energy and Spontaneity', 'Chemical thermodynamics, oxidations and reductions.', 'Chemical thermodynamics, Oxidations and reductions.'],
  ['BCH 308', 'J30zpvbmw7s', 'watch', 'Khan: Oxidative Phosphorylation and ETC', 'Electron transport and oxidative phosphorylation.', 'Chemical potentials, Electrochemical potentials, Electron transport system and oxidative phosphorylation.'],
  ['BCH 308', 'rukK3vnaWA8', 'watch', 'Shomu: ATP Synthesis (Chemiosmotic Theory)', 'Shuttle systems, ATP cycle and regulation.', 'Shuttle systems for oxidation of extra-mitochondrial NADH, ATP Cycle, Regulation of ATP production.'],
  // ---------- BCH 309 (12 of 17) ----------
  ['BCH 309', 'ER49EweKwW8', 'watch', 'Khan: Endocrine Gland Hormone Review', 'Steroid, thyroid and polypeptide hormone action.', 'Endocrinology structure, function and molecular mechanism of action of steroid, thyroid and polypeptide hormones.'],
  ['BCH 309', 'q2EzcTJ3xiY', 'watch', 'Dave: Laboratory Forensic Investigation', 'Xenobiotics and forensic biochemistry.', 'Xenobiotics and forensic biochemistry.'],
  ['BCH 309', 'L1W0q1kEof4', 'watch', 'Dave: Pharmacokinetics', 'Detoxification and foreign compound metabolism.', 'Detoxification mechanisms, metabolism of foreign compounds.'],
  ['BCH 309', 'sXTmjhQphV4', 'watch', 'Dave: AFIS and Fingerprints in the Courtroom', 'Recent forensic techniques.', 'Recent development in forensic techniques.'],
  ['BCH 309', 'paw2SUY22_s', 'watch', 'Khan: Mitochondria, Apoptosis and Oxidative Stress', 'Aging, apoptosis and oxidative stress.', 'Basic concept of aging… apoptosis… oxidative stress in ageing… neurotransmitters… muscles action.'],
  ['BCH 309', 'xtSHKPJk10k', 'watch', 'Dave: Illicit Drugs, How Do They Work?', 'Metabolism of drugs and foreign compounds.', 'Metabolism of drugs and other foreign compounds.'],
  ['BCH 309', 'AcrqIxt8am8', 'watch', 'Dave: Cell Membrane', 'Biological membrane transport and diseases.', 'The structure of biological membrane transport and diseases.'],
  ['BCH 309', 'KhdX5eX4dMM', 'watch', 'Khan: Retroviruses', 'Retroviruses and cancer.', 'Retroviruses, molecular basis and involvement in cancer.'],
  ['BCH 309', 'ma7MVU8sjkI', 'watch', 'Dave: HIV', 'AIDS biochemistry, spread, detection, treatment.', 'AIDS, biochemistry of the viruses, spread, detection, drug treatment and other.'],
  ['BCH 309', 'QRPRmRAOCog', 'watch', 'Khan: Oncogenes', 'Proto-oncogenes and oncogenes.', 'Cancer proto- oncogenes and oncogenes.'],
  ['BCH 309', 'oTH2_KxsBHs', 'watch', 'Shomu: Lac Operon Concept', 'Operon: induction and repression.', 'Gene rearrangement in Burkett’s lymphoma and other disease, genetic regulation of metabolism, the operon concept, induction and repression.'],
  ['BCH 309', 'L1svFdst5D8', 'watch', 'Shomu: Metabolomics', 'Review of current biochemical topics.', 'Review of current biochemical topics.'],
  // ---------- BCH 401 (7 of 13) ----------
  ['BCH 401', 'jUUeR4o_2-0', 'watch', 'NPTEL: Enzyme Mechanisms I', 'Chemistry of enzyme catalysis.', 'Chemistry of enzyme catalysis.'],
  ['BCH 401', 'k9oLo5Io5KM', 'watch', 'NPTEL Guwahati: Enzyme Kinetics', 'Steady state enzyme kinetics.', 'Steady state enzyme kinetics.'],
  ['BCH 401', 'HCIUAK_wBYE', 'watch', 'Shomu: Enzyme Substrate Complex', 'Ligand binding and enzymology.', 'Ligand binding and its application to enzymology.'],
  ['BCH 401', '5xp9lI_fXDo', 'watch', 'Khan: Cooperativity', 'Kinetics of multiple binding sites.', 'Kinetics of multiple binding sites.'],
  ['BCH 401', '5XyGYzv1io4', 'watch', 'NPTEL: Role of Effector Molecules', 'Molecular models of allosterism.', 'Molecular models of allosterism.'],
  ['BCH 401', '2HaFHUAwVyQ', 'watch', 'Shomu: Pyruvate Dehydrogenase Complex', 'Multi-enzyme complexes.', 'Multi-enzyme complexes.'],
  ['BCH 401', 'rteRh_hs3NQ', 'watch', 'NPTEL: Regulation of Enzyme Activity', 'Regulation of enzyme activity and synthesis.', 'Regulation of enzyme activity and synthesis.'],
  // ---------- BCH 402 (15 of 18) ----------
  ['BCH 402', 'BbA-pHyirzo', 'watch', 'Dave: Chromosome Structure and Organization', 'Gene structure and function.', 'Gene structure and function.'],
  ['BCH 402', 'AmOO4j0E408', 'watch', 'Khan: DNA', 'Nucleic acid function.', 'Nucleic acid function and biological function.'],
  ['BCH 402', 'SoFjbFYTBd8', 'watch', 'Shomu: Restriction Endonuclease', 'DNA sequencing and restriction endonucleases.', 'DNA sequencing and restriction endonucleases.'],
  ['BCH 402', 'sX6LncNjTFU', 'watch', 'Dave: DNA Damage and Repair', 'DNA repair mechanisms.', 'DNA repair mechanisms.'],
  ['BCH 402', 'eM7arWJJ3zk', 'watch', 'Khan: Leading and Lagging Strands', 'Nucleic acid replication.', 'Nucleic acid replication.'],
  ['BCH 402', 'OqRt723t33o', 'watch', 'Khan: DNA and Chromatin Regulation', 'Regulation of nucleic acid synthesis.', 'Regulation of nucleic acid synthesis.'],
  ['BCH 402', 'yoZ8vgqP7CY', 'watch', 'Shomu: Protein Synthesis Process', 'Genetic code and gene-protein relationship.', 'Genetic code and gene-protein relationship.'],
  ['BCH 402', 'utsMNqQfyms', 'watch', 'Shomu: Transcription 01', 'Eukaryotic transcription.', 'Eukaryotic transcription.'],
  ['BCH 402', 'J9jhg90A7Lw', 'watch', 'Dave: Regulation of Gene Expression', 'Control of gene expression.', 'Control of gene expression.'],
  ['BCH 402', 'u1MIA-rmwlc', 'watch', 'Shomu: DNA Rolling Circle Replication', 'Phage DNA replicator structure.', 'Functional analysis of the replicator structure of bacteriophage DNA.'],
  ['BCH 402', 'aWpAe3rc5BU', 'watch', 'Shomu: Developmental Biology of Drosophila', 'Model systems for molecular embryology.', 'Model systems used for studying embryology at the molecular level.'],
  ['BCH 402', 'LcD__SH6N38', 'watch', 'Shomu: Totipotent, Pluripotent, Multipotent Stem Cells', 'Model systems in differentiation studies.', 'Model systems in differentiation studies.'],
  ['BCH 402', 'eqJqhA8HSJ0', 'watch', 'Dave: Cell Cycle and its Regulation', 'Cell cycle and proliferation control.', 'Cell cycle, Control of cell proliferation.'],
  ['BCH 402', 'MIfDx417SDs', 'watch', 'Shomu: DNA Cloning', 'Genetic engineering and recombinant DNA.', 'Genetic engineering and recombinant DNA Technology.'],
  ['BCH 402', 'vi7MeqD2_FY', 'watch', 'Shomu: PCR in Detail', 'PCR, human genome project and gene therapy.', 'Polymerase chain reaction, human genome project and gene therapy.'],
  // ---------- BCH 403 (5 of 6) ----------
  ['BCH 403', '61DIlOp86q4', 'watch', 'Shomu: Amphibolic Pathways of Citric Acid Cycle', 'Krebs cycle links to all metabolisms.', 'The relationship of Krebs Cycle to protein, carbohydrate, lipid and nucleic acid metabolism.'],
  ['BCH 403', 'PpzIzQggFCw', 'watch', 'Shomu: Metabolism Big Picture', 'Integration of metabolic pathways.', 'Integration of metabolic pathways.'],
  ['BCH 403', 'UWrJssS76XE', 'watch', 'Khan: Allosteric Regulation and Feedback Loops', 'Regulation of metabolic enzymes.', 'Regulation of enzymes of metabolic pathways-feedback inhibition versus enzyme synthesis.'],
  ['BCH 403', 'JImCiDicfQw', 'watch', 'Shomu: Lac Operon, Glucose, cAMP and CAP', 'Catabolite and end-product repression.', 'Catabolite repression, end product repression.'],
  ['BCH 403', '7fuLw031H-g', 'watch', 'Khan: Regulation of Glycolysis and Gluconeogenesis', 'Regulatory mechanisms in metabolic pathways.', 'Identification of different regulatory mechanisms in metabolic pathways.'],
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
