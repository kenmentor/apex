// CYB 201 + INS 202 video banks. Sourcing per docs/sourcing-quality-process.txt:
// - ONE winner per topic (order preserved); backups noted in research, NOT imported.
// - Winners by COMMENTS first, web consensus second, views last. English only.
// - CYB 201: Professor Messer SY0-701 (PLG49S3nxzAnl4QDVqK-hOnoqcSKEIDDuv, 121 vids).
//   Comments proof: "I passed my comptia sec+ exam yesterday and is all thanks to you" [269 likes].
// - INS 202: IxDF + Josh Bongard UVM HCI (2018 titled PL AuiGdPEdw0iLnUFP7kALZf3SbGIokPKt / 2020 lectures).
//   Comments proof: IxDF professor-recommended; PhD-topic testimony.
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
const OWNER = 'davidnwachukwum@gmail.com';

// [courseCode, videoId, host, title, description, exactTopicTitle]
const ROWS = [
  // ---------- CYB 201 (18 topics, Messer SY0-701) ----------
  ['CYB 201', 'SBcDGb9l6yo', 'watch', 'CIA Triad and AAA Fundamentals', 'Confidentiality, integrity, availability, authentication, access control, non-repudiation.', 'Basic concepts: cyber, security, confidentiality, integrity, availability, authentication, access control, non-repudiation and fault-tolerant methodologies for implementing security.'],
  ['CYB 201', '5kY9kvzeWjA', 'watch', 'Security Policies and Incident Response', 'Policies, best practices, testing security and incident response.', 'Security policies, best current practices, testing security, and incident response.'],
  ['CYB 201', 'cLhUMoQS1a8', 'watch', 'Risk Management and Disaster Recovery', 'Risk management, disaster recovery and access control.', 'Risk management, disaster recovery and access control.'],
  ['CYB 201', 'U6BWn81P5Ec', 'watch', 'Encryption Technologies and App Vulnerabilities', 'Basic cryptography and where application vulnerabilities live.', 'Basic cryptography and software application vulnerabilities.'],
  ['CYB 201', '4lAbGpTDZ18', 'watch', 'Common Threat Vectors and Evolution of Attacks', 'How cyber-attacks evolved and the vectors they use.', 'Evolution of cyber-attacks.'],
  ['CYB 201', 'nNiNTviiacU', 'watch', 'Security Tools: IDS, Firewalls and System Security', 'OS protection, IDS, security models, network and distributed system security, DoS, worms and viruses.', 'Operating system protection mechanisms, intrusion detection systems, basic formal models of security, cryptography, steganography, network and distributed system security, denial of service (and other) attack strategies, worms, viruses, transfer of funds/value across networks, electronic voting, secure applications.'],
  ['CYB 201', '4tGFraaP48Q', 'watch', 'Security Considerations and Guidelines', 'Cybersecurity policy and implementation guidelines.', 'Cybersecurity policy and guidelines.'],
  ['CYB 201', 'IjJf4jLtONQ', 'watch', 'Compliance and Government Regulation of IT', 'Regulatory compliance for information technology.', 'Government regulation of information technology.'],
  ['CYB 201', '6xUH0t6ugIM', 'watch', 'Threat Actors and Cyber Operations', 'Main actors of cyberspace and how cyber operations run.', 'Main actors of cyberspace and cyber operations.'],
  ['CYB 201', 'WGXrbAh0LUI', 'watch', 'Privacy and Institutional Impact of Cybersecurity', 'Impact on civil and military institutions, privacy, business and government.', 'Impact of cybersecurity on civil and military institutions, privacy, business and government applications;'],
  ['CYB 201', 'jd001Hj7XWM', 'watch', 'Network Infrastructure Concepts', 'Networks, protocols, operating systems and associated applications.', 'examination of the dimensions of networks, protocols, operating systems, and associated applications.'],
  ['CYB 201', 'Fc8ZJfmapbI', 'watch', 'Mitigation Techniques and Countermeasures', 'Methods and motives of attackers and organisational countermeasures.', 'Methods and motives of cybersecurity incident perpetrators, and the countermeasures employed by organisations and agencies to prevent and detect those incidences.'],
  ['CYB 201', '-LevHAzXgFs', 'watch', 'Penetration Testing and Rules of Engagement', 'Ethical obligations and rules of engagement for security professionals.', 'Ethical obligations of security professionals.'],
  ['CYB 201', '86fruE9jkKk', 'watch', 'Threat Intelligence and Security Trends', 'Current trends and developments in cybersecurity.', 'Trends and development in cybersecurity.'],
  ['CYB 201', 'yRSqIGjeb7s', 'watch', 'Application Attacks', 'Software application vulnerabilities and attack techniques.', 'Software application vulnerabilities.'],
  ['CYB 201', 'pmyuWY7Pbag', 'watch', 'Risk Management Strategies and National Policy', 'National security strategies and policy tools for cyber-attack typologies.', 'Evolution of cybersecurity and national security strategies, requirements to the typologies of cyber-attacks that require policy tools and domestic response.'],
  ['CYB 201', 'Ykx7t54y-oo', 'watch', 'Risk Analysis for Evolving Threats', 'Cybersecurity strategies evolving in the face of big risk.', 'Cybersecurity strategies evolving in the face of big risk.'],
  ['CYB 201', 'jBvdRpXaomk', 'watch', 'Security Standards and Frameworks', 'Role of standards and frameworks in cybersecurity.', 'Role of standards and frameworks.'],
  // ---------- INS 202 (13 of 15 topics; t0/t4 are syllabus fragments) ----------
  ['INS 202', '8G__DIv8Wj8', 'watch', 'HCI Foundations Lecture 1', 'Foundations and concept of the human-computer interface.', 'discuss the foundations and concept of the human-computer interface;'],
  ['INS 202', 'U7rS_2ch_Ps', 'watch', '5 Principles of Interaction Design', 'Principles of the human-computer interface.', 'explain the principles of the human-computer interface;'],
  ['INS 202', 'CUTnU7y3s0U', 'watch', 'What is Design in HCI? HCD Principles', 'Design and development of the human-computer interface.', 'explain the design and development of the human-computer interface;'],
  ['INS 202', 'pReEmcJow6M', 'watch', 'PACT Analysis for User Feedback', 'Why user feedback matters, analysed with PACT.', 'explain the importance of user feedback.'],
  ['INS 202', 'yNzLBI0wsGU', 'watch', 'What Is HCI?', 'Foundations of human-computer interaction.', 'Foundations of HCI.'],
  ['INS 202', 'UwAZDqqT0NA', 'watch', 'Concepts Underlying HCI Design', 'The concept underlying the design of HCI.', 'The concept underlying the design of HCI.'],
  ['INS 202', 'Vp-gaKaWOG8', 'watch', 'Interface Design Principles', 'Principles of graphical user interfaces.', 'Principles of GUI.'],
  ['INS 202', 'XIGSJshYb90', 'watch', 'CrashCourse: GUI Toolkits Overview', 'Closest match: GUI toolkits survey; no exact IxDF/Bongard equivalent.', 'GUI toolkits.'],
  ['INS 202', 'I6qzM4-Zxxg', 'watch', 'HCI Design Process and System Design Methods', 'System design methods in HCI.', 'System design methods.'],
  ['INS 202', 'Q00J77xOdCw', 'watch', 'Mental Models and Interface Metaphors', 'User conceptual models and interface metaphors.', 'User conceptual models and interface metaphors.'],
  ['INS 202', 'kkdsE_YpZLA', 'watch', 'Memory, Attention and Perception in HCI', 'Human cognitive and physical ergonomics.', 'Human cognitive and physical ergonomics.'],
  ['INS 202', 'nhzBAHQW7vc', 'watch', 'Human-Centred Evaluation Methods', 'Human-centred software evaluation and development.', 'Human-centred software evaluation and development.'],
  ['INS 202', 'MzCryg8mYlI', 'watch', 'GUI Design and Programming Lecture', 'GUI design and programming.', 'GUI design and programming.'],
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
