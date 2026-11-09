// CYB 301/302/303 + SEN 301/304/306 video banks.
// Sourcing per docs/sourcing-quality-process.txt:
// - ONE winner per topic (order preserved); backups noted in research, NOT imported.
// - CYB: Professor Messer SY0-701 (PLG49S3nxzAnl4QDVqK-hOnoqcSKEIDDuv).
//   Comments proof: pass testimonies, "much better, i understand everything".
// - SEN: NPTEL Software Engineering / SPM (Prof. Rajib Mall, IIT-KGP) +
//   BookSpokify Sommerville chapter series. Institutional authority as proof.
// - GAPS: CYB 301 deep-crypto math (13), CYB 302 biometrics depth (10),
//   CYB 303 governance specifics (7), SEN 304 QA depth (10), SEN 306
//   construction detail (8). Documented, never forced.
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
  // ---------- CYB 301 (15 of 28) ----------
  ['CYB 301', 'jpsc4c7lntw', 'watch', 'Messer: Encrypting Data', 'Introduction to cryptography, symmetric and asymmetric cryptography, key management.', 'Introduction to cryptography, symmetric and asymmetric cryptography, key management, and encryption algorithms.'],
  ['CYB 301', '7aJaEQy6Yoc', 'watch', 'Messer: Cryptographic Attacks', 'Cryptanalysis.', 'Cryptanalysis.'],
  ['CYB 301', 'EcGmQjl6XEo', 'watch', 'Messer: Hashing and Digital Signatures', 'Hash functions.', 'Hash functions.'],
  ['CYB 301', 'AhaZtj5P2a8', 'watch', 'Messer: AAA', 'Data integrity, authentication and perfect secrecy.', 'Data integrity, authentication, and perfect secrecy.'],
  ['CYB 301', 'xHAMEF7-inQ', 'watch', 'Messer: Public Key Infrastructure', 'Public-key cryptography and ElGamal.', 'Public-key cryptography and discrete algorithms-ELGamal cryptography.'],
  ['CYB 301', 'cLa94BZH_9s', 'watch', 'Messer: Certificates', 'Security of ElGamal and RSA encryption, RSA key generation.', 'Security of ELGamal and RSA Encryption, and RSA Key Generation.'],
  ['CYB 301', 'u61J0xR_XPU', 'watch', 'Messer: Encryption Technologies', 'Conventional and public-key cryptography.', 'Conventional and public-key cryptography.'],
  ['CYB 301', '9NAKCyOtFH0', 'watch', 'Messer: Secure Protocols', 'PKI, SSL, and VPN.', 'PKI, SSL, and VPN.'],
  ['CYB 301', 'XxnCxPEllMg', 'watch', 'Messer: Non-repudiation', 'Digital signatures, PRNGs, protocols and cryptanalysis.', 'Digital signatures, pseudo-random number generation, cryptographic protocols and cryptanalytic techniques.'],
  ['CYB 301', 'uU3e_ntg-3g', 'watch', 'Messer: Secure Communication', 'Protocols, hashing, certificates and authorities.', 'Use of protocols, hashing and certificates and certificate authorities.'],
  ['CYB 301', 'vJINnOZyQNg', 'watch', 'Messer: Security Procedures', 'Proper use of cryptography in secure systems.', 'Policies, procedures, and methods for the proper use of cryptography in secure systems.'],
  ['CYB 301', 'R9ojg881dLs', 'watch', 'Messer: Scripting and Automation', 'Practical exercise on writing cryptography algorithms in code.', 'Lab work: Practical exercise on writing cryptography algorithms.'],
  ['CYB 301', 'LfuTMzZke4g', 'watch', 'Messer: Obfuscation', 'Cryptographic techniques survey.', 'Work on cryptographic techniques.'],
  ['CYB 301', '-ZfbifHwEVE', 'watch', 'Messer: Password Attacks', 'Applied cryptanalysis of ciphers and protocols.', 'Practice cryptanalysis of cipher and how to use protocols.'],
  ['CYB 301', 'WQRZMMLUkGE', 'watch', 'Messer: User Training', 'Procedures for proper use of cryptography.', 'Learn the procedures and methods for the proper use of cryptography in secure systems.'],
  // ---------- CYB 302 (8 of 18) ----------
  ['CYB 302', 'MpIzA4fNWew', 'watch', 'Messer: Multifactor Authentication', 'Biometrics and digital image processing as authentication factors.', 'Introduction to biometrics and digital image processing.'],
  ['CYB 302', 'R0W0_gZCVzk', 'watch', 'Messer: Data Types and Classifications', 'Biometric data: raw, template and data methods.', 'Biometric data: raw data, template data, and data methods.'],
  ['CYB 302', 'ZoOyyqhptik', 'watch', 'Messer: Identity and Access Management', 'Biometric matching basics: enrolment and authentication.', 'Biometric matching basics: biometric authentication, enrolment, correct user, and incorrect user.'],
  ['CYB 302', 'leX_Qa7wqB4', 'watch', 'Messer: Protecting Data', 'Storage of biometric data elements and quality.', 'Biometric data: Storage of biometric data elements, transactions, errors and quality upgrades.'],
  ['CYB 302', '71RQaYQ4QSw', 'watch', 'Messer: States of Data', 'Data security and integrity.', 'Data security and integrity.'],
  ['CYB 302', 'gxNi-04yP8Q', 'watch', 'Messer: Data Roles and Responsibilities', 'Privacy issues and aspects of biometrics.', 'Privacy issues and other aspects of biometrics.'],
  ['CYB 302', 'eyVy1gKCuAU', 'watch', 'Messer: Analyzing Vulnerabilities', 'Security strength and recognition rates.', 'Challenging issues: security strength and recognition rates.'],
  ['CYB 302', 'eMOe-PLBy1k', 'watch', 'Messer: Password Security', 'Alternatives of passwords and smart cards.', 'Alternatives of passwords and smart cards.'],
  // ---------- CYB 303 (23 of 30) ----------
  ['CYB 303', 'STM3EUvL7wg', 'watch', 'Messer: Security Controls', 'Principles of applied information security management.', 'Principles of applied information security management.'],
  ['CYB 303', 'FDFxGLnZtoY', 'watch', 'Messer: Zero-day Vulnerabilities', 'Cybersecurity challenges.', 'Cybersecurity challenges.'],
  ['CYB 303', '13KNjPexnEI', 'watch', 'Messer: Third-party Risk Assessment', 'Cybersecurity risks, challenges and the path forward.', 'Cybersecurity risks, challenges and the path forward.'],
  ['CYB 303', '9B0mtWk_AM0', 'watch', 'Messer: Vulnerability Scanning', 'Recognising risks.', 'Recognising risks.'],
  ['CYB 303', 'uo2Yw720mv4', 'watch', 'Messer: Audits and Assessments', 'Decision and risk analysis techniques.', 'Overview of decision and risk analysis techniques.'],
  ['CYB 303', 'P9xakfmX70c', 'watch', 'Messer: Vulnerability Remediation', 'Mitigating risks and vulnerabilities.', 'Mitigating risks and vulnerabilities.'],
  ['CYB 303', 'wEMzVfwBiWY', 'watch', 'Messer: Penetration Tests', 'Assessments for cybersecurity risk mitigation.', 'Effective use of assessments for cybersecurity risk mitigation.'],
  ['CYB 303', '8qpQ8Q6xxiU', 'watch', 'Messer: Cloud Infrastructures', 'Mitigating cybersecurity risk with the cloud.', 'Mitigating cybersecurity risk with the cloud.'],
  ['CYB 303', 'wXoC46Qr_9Q', 'watch', 'Messer: Hardening Techniques', 'Proactive measures for critical challenges.', 'Proactive measures mitigate critical cybersecurity challenges.'],
  ['CYB 303', 'myI-v3mj7Kc', 'watch', 'Messer: Business Impact Analysis', 'Corporate and military cybersecurity risks.', 'Critical corporate and military cybersecurity risks.'],
  ['CYB 303', 'V2DCYO-sWRQ', 'watch', 'Messer: Cloud-specific Vulnerabilities', 'Evolving challenges in cyber risk management.', 'Evolving challenges in cyber risk management.'],
  ['CYB 303', 'HSZxjj1YAh8', 'watch', 'Messer: Agreement Types', 'Governance and security policy.', 'Governance and security policy.'],
  ['CYB 303', 'np2WI_rM-Ok', 'watch', 'Messer: Security Monitoring', 'Threat and vulnerability management.', 'Threat and vulnerability management.'],
  ['CYB 303', 'CYFe16lCRMk', 'watch', 'Messer: Incident Planning', 'Incident management and risk frameworks.', 'Incident management, risk assessment and risk management frameworks.'],
  ['CYB 303', 'sb0dRaQbuBA', 'watch', 'Messer: Resiliency', 'Information leakage, crisis management and continuity.', 'Information leakage, crisis management and business continuity.'],
  ['CYB 303', 'W_Npxwk4fbI', 'watch', 'Messer: Security Awareness', 'Legal, compliance, awareness and implementation.', 'Legal and compliance, security awareness and security implementation considerations.'],
  ['CYB 303', 'ZDJ-BLPLWq4', 'watch', 'Messer: Monitoring Data', 'Assessment of threats and vulnerabilities.', 'Assessment of threats and vulnerabilities.'],
  ['CYB 303', 'yDeDGCh_PDs', 'watch', 'Messer: Segmentation and Access Control', 'Classified and sensitive data.', 'Dealing with classified/sensitive data.'],
  ['CYB 303', 'l64La1xYXL4', 'watch', 'Messer: Secure Infrastructures', 'Implementing frameworks against threats.', 'Practical considerations when implementing the frameworks to address current and future threats.'],
  ['CYB 303', 'YQKbs0ug0XQ', 'watch', 'Messer: Hardening Targets', 'Practical cyber hygiene.', 'Lab work: Practical approach to cyber hygiene.'],
  ['CYB 303', 'BWPJD9Eb9iE', 'watch', 'Messer: Secure Baselines', 'Risk mitigation in the cloud.', 'Practice cybersecurity risk mitigation in the cloud and how to use proactive measures to mitigate the learned challenges.'],
  ['CYB 303', 'cuTVyyS5C7M', 'watch', 'Messer: Gap Analysis', 'Decision and risk analysis techniques.', 'Work on applying the decision and risk analysis techniques.'],
  ['CYB 303', '48wRbMdHFVI', 'watch', 'Messer: Change Management', 'Mitigating risks and vulnerabilities.', 'Master how to mitigate risks and vulnerabilities.'],
  // ---------- SEN 301 (4 topics) ----------
  ['SEN 301', 'Ie7qzy3SY-E', 'watch', 'NPTEL L40: Object-Oriented Design Process', 'OO approach to information system development.', 'Object-oriented approach to information system development, particularly in reference to the earlier stages of analysis and design.'],
  ['SEN 301', 'dfZdd8wER_I', 'watch', 'BookSpokify Ch5: System Modeling', 'Importance and principles of modelling, UML.', 'Importance of modelling, principles of modelling, object- oriented modelling, conceptual model of the Unified Modelling Language (UML), architecture, software development life cycle.'],
  ['SEN 301', '7wo9PHfkyik', 'watch', 'NPTEL L31: Use Case Modelling', 'Object orientation and UML modelling.', 'The principles and basic concepts of object orientation and the different aspects of object-oriented modelling as represented by the UML technique.'],
  ['SEN 301', 'AFOIMsgpJP0', 'watch', 'NPTEL L42: Examples of Object-Oriented Design', 'Case study of a UML-based CASE tool.', 'Case study of a typical UML-based CASE tool.'],
  // ---------- SEN 304 (6 of 16) ----------
  ['SEN 304', 'EwmTlTsnr-k', 'watch', 'BookSpokify Ch8: Software Testing', 'The importance of software testing.', 'The importance of Software Testing.'],
  ['SEN 304', 'Su-bw6Of-g8', 'watch', 'NPTEL L44: Basic Concepts in Testing II', 'Verification and validation.', 'Understanding Verification and Validation.'],
  ['SEN 304', 'kINvjhZqv-A', 'watch', 'BookSpokify Ch24: Quality Management', 'Assurance, verification and a culture of quality.', 'How to assure it and verify it, and the need for a culture of quality.'],
  ['SEN 304', 'u9sIBzKzE6U', 'watch', 'BookSpokify Ch10: Dependable Systems', 'Avoidance of errors and quality problems.', 'Avoidance of errors and other quality problems.'],
  ['SEN 304', 'pXkCkRgPFrc', 'watch', 'NPTEL L55: White Box Testing', 'Testing, verification and validation techniques.', 'Testing, verification and validation techniques.'],
  ['SEN 304', 'ZIUJDS3O0BQ', 'watch', 'NPTEL L47: Unit Testing Strategies II', 'Black-box and white-box unit testing.', 'unit testing – black box and white testing techniques;'],
  // ---------- SEN 306 (4 of 12) ----------
  ['SEN 306', 'zFz6s3TMq4U', 'watch', 'BookSpokify Ch7: Software Design and Implementation', 'Definition of software construction.', 'Definition of Software Construction;'],
  ['SEN 306', 'FTyncRpLd5g', 'watch', 'NPTEL L20: Modular Design', 'Key design concepts, levels, heuristics.', 'Design in construction – Key design concepts, levels of design, design heuristics.'],
  ['SEN 306', 'mND1i92IBps', 'watch', 'NPTEL L18: Pseudocodes and Flowcharts', 'The pseudo code programming process.', 'The Pseudo Code Programming Process.'],
  ['SEN 306', 'reTh1y7ZH_A', 'watch', 'NPTEL L46: Unit Testing Strategies I', 'Developer testing and debugging.', 'Developer Testing and Debugging.'],
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
