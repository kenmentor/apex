// PHY 101/102/107/108 + CHM 101/102/107/108 video banks.
// Sourcing per docs/sourcing-quality-process.txt:
// - ONE winner per topic (order preserved); backups noted in research, NOT imported.
// - Professor Dave Explains (classical physics, general/organic chemistry),
//   Organic Chemistry Tutor (physics, organic), Michel van Biezen (mechanics, E&M),
//   Khan Academy (kinematics, angular momentum, AP Physics).
// - Comments proof: Dave "pray to god... he sends you a link to jesus" [14K];
//   OCT "I passed... 2 grades better"; van Biezen "passed Physics 2 with grade A".
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
  // ---------- PHY 101 (15 topics) ----------
  ['PHY 101', 'RIvJvHBguHg', 'watch', 'Dave: Intro to Classical Physics', 'Space and time.', 'Space and time;'],
  ['PHY 101', 'sXKiAKn0WCM', 'watch', 'Dave: Scalars, Vectors and Vector Operations', 'Units and dimension, vectors and scalars, displacement, velocity, acceleration.', 'units and dimension, vectors and scalars, differentiation of vectors: displacement, velocity and acceleration;'],
  ['PHY 101', 'dHjWVlfNraM', 'watch', 'OCT: Kinematics In One Dimension', 'Kinematics.', 'kinematics;'],
  ['PHY 101', 'xzA6IBWUEDE', 'watch', 'Dave: Newton\u2019s Second Law', 'Newton\u2019s laws of motion, inertial frames, impulse, momentum.', 'Newton’s laws of motion (inertial frames, impulse, force and action at a distance, momentum conservation);'],
  ['PHY 101', 'wD7C4V9smG4', 'watch', 'Dave: Relative Motion and Inertial Frames', 'Relative motion.', 'relative motion;'],
  ['PHY 101', '3EbUa5ZDybg', 'watch', 'Dave: Frictional Forces', 'Application of Newtonian mechanics.', 'application of Newtonian mechanics;'],
  ['PHY 101', 'dr39gKnviAc', 'watch', 'Khan: Developing Kinematic Equations', 'Equations of motion.', 'equations of motion;'],
  ['PHY 101', 'zVRH9d5PW8g', 'watch', 'Dave: Work and Energy', 'Conservation principles, work, energy, centre of mass.', 'conservation principles in physics, conservative forces, conservation of linear momentum, kinetic energy and work, potential energy, system of particles, centre of mass;'],
  ['PHY 101', 'jNc2SflUl9U', 'watch', 'Dave: Angular Motion and Torque', 'Rotational motion.', 'rotational motion;'],
  ['PHY 101', 'C2nHuDNUW5o', 'watch', 'van Biezen: Cross Product, Vector Product', 'Torque, vector product, moment, angular momentum.', 'torque, vector product, moment, rotation of coordinate axes and angular momentum.'],
  ['PHY 101', 'aSdaT62ndYE', 'watch', 'OCT: Polar Coordinates Basic Intro', 'Polar coordinates.', 'Polar coordinates;'],
  ['PHY 101', '-7trrETEE7k', 'watch', 'Khan: Conservation of Angular Momentum', 'Conservation of angular momentum.', 'conservation of angular momentum;'],
  ['PHY 101', 'SZj6DuB0vvo', 'watch', 'Dave: Uniform Circular Motion', 'Circular motion.', 'circular motion;'],
  ['PHY 101', '5wu7VMgt_6g', 'watch', 'van Biezen: Moment of Inertia Intro', 'Moments of inertia, gyroscopes and precession.', 'moments of inertia, gyroscopes and precession;'],
  ['PHY 101', 'kxkFaBG6a-A', 'watch', 'Dave: Newton\u2019s Law of Universal Gravitation', 'Gravitation, Kepler laws, escape velocity, orbits.', 'gravitation: Newton’s law of gravitation, Kepler’s laws of planetary motion, gravitational potential energy, escape velocity, satellites motion and orbits.'],
  // ---------- PHY 102 (24 topics) ----------
  ['PHY 102', 'k1jaDh97Q_g', 'watch', 'OCT: Four Fundamental Forces', 'Forces in nature.', 'Forces in nature.'],
  ['PHY 102', 'VFbyDCG_j18', 'watch', 'Dave: Electric Charge and Electric Fields', 'Electrostatics.', 'Electrostatics;'],
  ['PHY 102', 'ZbBHnod_Mew', 'watch', 'OCT: Charging By Induction', 'Charge properties and methods of charging.', 'electric charge and its properties, methods of charging.'],
  ['PHY 102', '-jxX7Vt2wrA', 'watch', 'van Biezen: Coulomb\u2019s Law 1/8', 'Coulomb\u2019s law and superposition.', 'Coulomb’s law and superposition.'],
  ['PHY 102', 'EPIhhbwbCNc', 'watch', 'van Biezen: Electric Field 1/18', 'Electric field and potential.', 'electric field and potential.'],
  ['PHY 102', 'NyRjHj2uy6k', 'watch', 'van Biezen: Gauss\u2019s Law 1/16', 'Gauss\u2019s law.', 'Gauss’s law.'],
  ['PHY 102', 'CFzCDg9yp7Q', 'watch', 'van Biezen: Capacitors 1/37', 'Capacitance.', 'Capacitance.'],
  ['PHY 102', 'PSlnlXjaHA4', 'watch', 'van Biezen: Electric Dipole 5/18', 'Electric dipoles.', 'Electric dipoles.'],
  ['PHY 102', 'RiY-sHz-whw', 'watch', 'OCT: Energy Density of a Capacitor', 'Energy in electric fields.', 'Energy in electric fields.'],
  ['PHY 102', 'XWlZ9bfGIoI', 'watch', 'Dave: Electric Potential, Current and Resistance', 'Conductors, insulators, current, voltage, resistance.', 'Conductors and insulators, current, voltage and resistance.'],
  ['PHY 102', 'GcQeEXYXpww', 'watch', 'van Biezen: Ohm\u2019s Law 1/23', 'Ohm\u2019s law and DC circuits.', 'Ohm’s law and analysis of DC circuits.'],
  ['PHY 102', 'IgtIdttfGVw', 'watch', 'Dave: Magnets and Magnetic Fields', 'Magnetic fields.', 'Magnetic fields.'],
  ['PHY 102', 'kBoasyx8C_Y', 'watch', 'van Biezen: Magnetic Forces 1/26', 'Lorentz force.', 'Lorentz force.'],
  ['PHY 102', '4WNOxRfj0ns', 'watch', 'van Biezen: Ampere\u2019s Law 11/28', 'Biot-Savart and Ampere\u2019s laws.', 'Biot-Savart and Ampère’s laws.'],
  ['PHY 102', '2Zi7ekMAZYU', 'watch', 'van Biezen: Magnetic Dipole Moment 10/26', 'Magnetic dipoles.', 'magnetic dipoles.'],
  ['PHY 102', 'Y14R6Jf8QRY', 'watch', 'van Biezen: Capacitors with Dielectric 2/37', 'Dielectrics.', 'Dielectrics.'],
  ['PHY 102', 'Yl2VeN1Zeu8', 'watch', 'OCT: Energy Stored In an Inductor', 'Energy in magnetic fields.', 'Energy in magnetic fields.'],
  ['PHY 102', 'R1QN_0fcZ_8', 'watch', 'OCT: Internal Resistance and EMF', 'Electromotive force.', 'Electromotive force.'],
  ['PHY 102', 'ejRJM-kCyWQ', 'watch', 'van Biezen: Faraday\u2019s Law 1/4', 'Electromagnetic induction.', 'Electromagnetic induction.'],
  ['PHY 102', 'ECbR03hN6vg', 'watch', 'van Biezen: Inductance 1/8', 'Self and mutual inductances.', 'Self and mutual inductances.'],
  ['PHY 102', '1-aoGz5X_j0', 'watch', 'van Biezen: Faraday and Lenz 1/2', 'Faraday and Lenz\u2019s laws.', 'Faraday and Lenz’s laws.'],
  ['PHY 102', 'XETUcuXYWSc', 'watch', 'van Biezen: The Transformer', 'Transformers and Maxwell\u2019s equations.', 'Step up and step-down transformers: Maxwell\'s equations.'],
  ['PHY 102', '2GvqQvohP2k', 'watch', 'OCT: Series RLC and Resonant Frequency', 'EM oscillations and waves.', 'Electromagnetic oscillations and waves.'],
  ['PHY 102', 'ERIToctYUcQ', 'watch', 'OCT: AC vs DC', 'AC voltages and currents.', 'AC voltages and currents applied to inductors, capacitors, resistance, and combinations.'],
  // ---------- PHY 107 (7 topics) ----------
  ['PHY 107', 'rEnFanjTd6U', 'watch', 'van Biezen: SI for Length, Mass, Time', 'Quantitative measurements.', 'This introductory course emphasizes quantitative measurements.'],
  ['PHY 107', 'fAQqMmZ1vMI', 'watch', 'van Biezen: Dimensional Analysis', 'Experimental techniques.', 'Experimental techniques.'],
  ['PHY 107', 'sadJh5nIiyQ', 'watch', 'van Biezen: Uncertainty Intro', 'Treatment of measurement errors.', 'The treatment of measurement errors.'],
  ['PHY 107', 'bqf8m7xNvLg', 'watch', 'Dave: Graphical Analysis', 'Graphical analysis.', 'Graphical analysis.'],
  ['PHY 107', 'PoG14wRRQmM', 'watch', 'OCT: Viscosity of Fluids', 'Lab experiments: meters, oscilloscope, resonance, light, heat, viscosity.', 'The experiments include studies of meters, the oscilloscope, mechanical systems, electrical and mechanical resonant systems, light, heat, viscosity, etc.'],
  ['PHY 107', '21p-yiQ9xy4', 'watch', 'Khan: Intro to AP Physics 1', 'Topics covered across PHY 101 to 104.', '(covered in PHY 101, 102, 103 and PHY 104).'],
  ['PHY 107', 'EeHtK5UYEMM', 'watch', 'Dave: Accuracy and Precision', 'Observation, measurement, data collection and deduction.', 'However, emphasis should be placed on the basic physical techniques for observation, measurements, data collection, analysis, and deduction.'],
  // ---------- PHY 108 (2 topics) ----------
  ['PHY 108', 'D5jMjpMIjMQ', 'watch', 'van Biezen: Convert Feet to Meters', 'Continuation of PHY 107 practical measurements.', 'This practical course is a continuation of PHY 107 and is intended to be taught during the second semester of the 100 level to cover the practical aspect of the theoretical courses that have been covered with emphasis on quantitative measurements, the treatment of measurement errors, and graphical analysis.'],
  ['PHY 108', 'qMgtrFBzlXE', 'watch', 'Dave: Calculating Percent Error', 'Measurement, data analysis and deduction.', 'However, emphasis should be placed on the basic physical techniques for observation, measurements, data collection, analysis and deduction.'],
  // ---------- CHM 101 (14 topics, Dave) ----------
  ['CHM 101', 'dggHWvFJ8Xs', 'watch', 'Dave: Elements, Compounds and Mixtures', 'Atoms, molecules, elements, compounds and reactions.', 'Atoms, molecules, elements and compounds, and chemical reactions.'],
  ['CHM 101', 't8mMN2X5_Vw', 'watch', 'Dave: Quantum Mechanics of the Electron', 'Modern electronic theory of atoms.', 'Modern electronic theory of atoms.'],
  ['CHM 101', 'Aoi4j8es4gQ', 'watch', 'Dave: Quantum Numbers and Electron Configurations', 'Electronic configuration and periodicity.', 'Electronic configuration, periodicity and building up of the periodic table.'],
  ['CHM 101', 'nTujP4jCbsg', 'watch', 'Dave: Valence Bond, Hybrid Orbitals and MO Theory', 'Hybridisation and shapes of simple molecules.', 'Hybridisation and shapes of simple molecules.'],
  ['CHM 101', 'PoQjsnQmxok', 'watch', 'Dave: Covalent vs Ionic, Polar vs Nonpolar Bonds', 'Valence forces.', 'Valence forces;'],
  ['CHM 101', 'Wj6qR1zvldc', 'watch', 'Dave: Lattice Structures in Ionic Solids', 'Structure of solids.', 'Structure of solids.'],
  ['CHM 101', 'X7ckfeRjjvI', 'watch', 'Dave: Balancing Chemical Equations', 'Chemical equations and stoichiometry.', 'Chemical equations and stoichiometry;'],
  ['CHM 101', '08kGgrqaZXA', 'watch', 'Dave: Intermolecular Forces and Boiling Points', 'Chemical bonding, intermolecular forces, kinetic theory.', 'chemical bonding and intermolecular forces, kinetic theory of matter.'],
  ['CHM 101', 'ZVhJ4TO8a-M', 'watch', 'Dave: Thermochemistry, Heat and Enthalpy', 'Elementary thermochemistry.', 'Elementary thermochemistry;'],
  ['CHM 101', 'wYqQCojggyM', 'watch', 'Dave: Kinetics, Initial Rates and Rate Laws', 'Rates, equilibrium and thermodynamics.', 'rates of reaction, equilibrium and thermodynamics.'],
  ['CHM 101', 'NNXvokAcSuE', 'watch', 'Dave: Acids and Bases, pH and pOH', 'Acids, bases and salts.', 'Acids, bases and salts.'],
  ['CHM 101', 'robEY-idcLU', 'watch', 'Dave: Kinetic Molecular Theory and Ideal Gas Laws', 'Properties of gases.', 'Properties of gases.'],
  ['CHM 101', 'VXvtkwubQQg', 'watch', 'Dave: Oxidation-Reduction Reactions', 'Redox reactions and electrochemistry.', 'Redox reactions and introduction to electrochemistry.'],
  ['CHM 101', 'fES21E0qebw', 'watch', 'Dave: Nuclear Reactions and Radioactivity', 'Radioactivity.', 'Radioactivity.'],
  // ---------- CHM 102 (12 topics, Dave + OCT) ----------
  ['CHM 102', 'B_ketdzJtY8', 'watch', 'OCT: Organic Chemistry Basic Introduction', 'Historical survey and importance of organic chemistry.', 'Historical survey of the development and importance of organic chemistry;'],
  ['CHM 102', 'BNAZO1FplaQ', 'watch', 'OCT: Allotropes of Carbon and Fullerenes', 'Fullerenes, nanotubules, nanostructures.', 'fullerenes as fourth allotrope of carbon, uses as nanotubules, nanostructures, nanochemistry.'],
  ['CHM 102', 'fYCzeFEAfjg', 'watch', 'Dave: Resonance Structures and Formal Charge', 'Electronic theory in organic chemistry.', 'Electronic theory in organic chemistry.'],
  ['CHM 102', '04HWovMzkAk', 'watch', 'Dave: Recrystallization', 'Isolation and purification of organic compounds.', 'Isolation and purification of organic compounds;'],
  ['CHM 102', 'SBir5wUS3Bo', 'watch', 'Dave: NMR Spectroscopy', 'Structure determination, qualitative and quantitative analysis.', 'determination of structures of organic compounds including qualitative and quantitative analysis in organic chemistry;'],
  ['CHM 102', 'rHyIdxOzj9U', 'watch', 'Dave: IUPAC Nomenclature of Alkanes', 'Nomenclature and functional group classes.', 'nomenclature and functional group classes of organic compounds.'],
  ['CHM 102', 'xoA1zMiCEB4', 'watch', 'Dave: Nucleophiles, Electrophiles and the SN2 Reaction', 'Reaction mechanism and kinetics.', 'Introductory reaction mechanism and kinetics.'],
  ['CHM 102', 'dGyM4l_sSgQ', 'watch', 'Dave: Stereochemistry Enantiomers', 'Stereochemistry.', 'Stereochemistry.'],
  ['CHM 102', 'm9jM8lWxrAE', 'watch', 'OCT: Functional Groups', 'Alkanes through carboxylic acids and derivatives.', 'The chemistry of alkanes, alkenes, alkynes, alcohols, ethers, amines, alkyl halides, nitriles, aldehydes, ketones, carboxylic acids and derivatives.'],
  ['CHM 102', 'xNK_dzvakL8', 'watch', 'Dave: Halogens of the Periodic Table', 'Chemistry of selected metals and non-metals.', 'The chemistry of selected metals and non-metals.'],
  ['CHM 102', 'PMVH_PXUa6A', 'watch', 'Dave: Alkali Metals of the Periodic Table', 'Group IA, IIA and IVA elements.', 'Comparative chemistry of group IA, IIA and IVA elements.'],
  ['CHM 102', '3Tp2lfnA_UI', 'watch', 'Dave: Transition Metals, Lanthanides and Actinides', 'Introduction to transition metal chemistry.', 'Introduction to transition metal chemistry.'],
  // ---------- CHM 107 (2 topics, Dave lab) ----------
  ['CHM 107', 'ZwqLCX-TN8c', 'watch', 'Dave: Introduction to Chemistry Lab Techniques', 'Laboratory experiments for CHM 101 and 102.', 'Laboratory experiments designed to reflect topics presented in courses CHM 101 and CHM 102.'],
  ['CHM 107', 'U-JrTSbUsK0', 'watch', 'Dave: Titration of Strong Acid With Strong Base', 'Titrations, qualitative and redox analysis, gravimetry.', 'These include acid-base titrations, qualitative analysis, redox reactions, gravimetric analysis, data analysis and presentation.'],
  // ---------- CHM 108 (2 topics, Dave lab) ----------
  ['CHM 108', 'iIfmoD-G1qo', 'watch', 'Dave: Recrystallization and Melting Point Analysis', 'Continuation of CHM 107 lab work.', 'Continuation of CHM 107.'],
  ['CHM 108', 'TH9bU7jWRk8', 'watch', 'Dave: Pipettes and Standard Solutions', 'Functional group and volumetric analysis.', 'Additional laboratory experiments to include functional group analysis, quantitative analysis using volumetric methods.'],
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
