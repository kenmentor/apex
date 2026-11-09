// IFT 302/304/308/310/342 + INS 204/207/301/305/311 video banks.
// Sourcing per docs/sourcing-quality-process.txt:
// - ONE winner per topic (order preserved); backups noted in research, NOT imported.
// - Dani Krossing PHP, CS50 Mobile, LearnWebCode/Metics WordPress, W3C, Academind,
//   Hanselman, NPTEL Ethics + IP courses, Messer SY0-701/N10-009, Udacity Android,
//   PowerCert, NYT, Barlow SAD, Miller BIS, NPTEL MIS, IITR/IITK management,
//   Schuessler BCIS. Comments proof per series in research.
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
  // ---------- IFT 302 (13 topics) ----------
  ['IFT 302', 'm52ljs78S24', 'watch', 'Dani Krossing: Intro to PHP Programming', 'Framework-based web development with PHP.', 'Introduction to framework-based web development using a contemporary language like PHP and ASP.net.'],
  ['IFT 302', '_wFJj94kSTU', 'watch', 'Academind: Static vs Dynamic Websites', 'Principles of web pages and website design.', 'Principles of web pages (dynamic and static) and website design.'],
  ['IFT 302', 'GRqw0pBwewY', 'watch', 'Dani Krossing: Install a Local Server for PHP', 'Tools used in web development.', 'The tool used in web development.'],
  ['IFT 302', '7GRKUaQ8Spk', 'watch', 'Hanselman: Client-side vs Server-side', 'Client-side and server-side languages.', 'Client-side and server-side languages.'],
  ['IFT 302', 'tHKsZdS8Oug', 'watch', 'Dani Krossing: Connect to a Database From a Website', 'Interactive dynamic websites with database access.', 'Creation of interactive, dynamic websites using a common web architecture and object-based database access.'],
  ['IFT 302', 'Ojk70Ag8Ofs', 'watch', 'Dani Krossing: Signup System in PHP', 'Design, implementation and testing of web applications.', 'Design, implementation, and testing of web-based applications including related software, databases, interfaces, and digital media.'],
  ['IFT 302', 'yrFr5PMdk2A', 'watch', 'Dani Krossing: Object Oriented PHP', 'Standard object models and server-side programmes.', 'Standard object models, and the use of server-side programmes for database and file access;'],
  ['IFT 302', 'VUV00jJ45nU', 'watch', 'CS50 Mobile: Deploying and Testing (L12)', 'Testing and software quality assurance.', 'testing, software quality assurance;'],
  ['IFT 302', 'BrwdgJ0aGsA', 'watch', 'LearnWebCode: WordPress Staging and Deployment', 'Publishing websites.', 'and the process of publishing Web sites.'],
  ['IFT 302', 'NJZNiCf_dyE', 'watch', 'Run PHP in XAMPP (Ken Swartwout)', 'Hands-on PHP with Apache, MySQL and JavaScript.', 'Hands-on PHP and Python programme using open-source software (Apache, PHP, Python, JavaScript, and MySQL).'],
  ['IFT 302', 'OlvCP8kHjvs', 'watch', 'Dani Krossing: Conditions and Control Structures in PHP', 'Control structures, objects and functions.', 'Programming for web development includes control structures, objects, functions, and the use of composite data types.'],
  ['IFT 302', '3Ay2lS6tm4M', 'watch', 'CS50 Mobile: JavaScript, ES6 (L1)', 'Deploying dynamic content using JavaScript.', 'Deploying dynamic content using JavaScript.'],
  ['IFT 302', 'bOqTCDfc7Tk', 'watch', 'Dani Krossing: PHP Form Handling', 'Dynamic pages, validation and data formatting.', 'Designing and developing dynamic web pages and creating, validating, transforming, and formatting data using PHP.'],
  // ---------- IFT 304 (9 topics) ----------
  ['IFT 304', 'OgN0UzL48N0', 'watch', 'Joomla vs WordPress Comparison (Savvy Professor)', 'CMS web development techniques.', 'Web development techniques using content management systems (CMS) (e.g., Joomla, MS SharePoint 2013).'],
  ['IFT 304', 'zd5_MN-6kqs', 'watch', 'Metics: WordPress Tutorial for Beginners 2026', 'Websites with specialised CMS tools.', 'Design and creation of websites using specialised CMS tools.'],
  ['IFT 304', '3vWO1n0Jgg8', 'watch', 'WordPress vs Joomla (OpenAppGuide)', 'CMS evaluation: front-end and back-end development.', 'Review and evaluation of CMS tools and technologies in terms of client requirements.Development of Web sites using front-end (client-side) and back-end (server-side).'],
  ['IFT 304', 'IdxuNU2LkZo', 'watch', 'Hostinger WordPress Tutorial (Metics)', 'Set up, deploy and maintain websites with a CMS.', 'Use of a CMS to set up, deploy, and maintain websites.'],
  ['IFT 304', '20SHvU2PKsM', 'watch', 'W3C WAI: Web Accessibility and Standards', 'Interface, UX, accessibility and web standards.', 'Programming while considering issues of interface and user experience design, accessibility, and Web standards.'],
  ['IFT 304', 'jGAW7Tv1tw0', 'watch', 'LearnWebCode: WordPress Block Type in PHP', 'Languages and tools for CMS content.', 'Methods, languages, tools related to developing web-based content management systems.'],
  ['IFT 304', 'syRi9p9aWYA', 'watch', 'LearnWebCode: Create Your Own WordPress Plugin', 'Plugins and extensions.', 'Development of plugins or extensions that integrate with existing systems to extend their functionality.'],
  ['IFT 304', 'ALU-1M_-jbg', 'watch', 'UX Mastery: How To Conduct A Content Audit', 'Auditing website content.', 'Audit content for a website.'],
  ['IFT 304', 'X2TCO5ESvbk', 'watch', 'WPDev: Convert HTML Site to WordPress', 'Static design to dynamic CMS site.', 'Choose an appropriate CMS, and convert a static design into a dynamic CMS-powered site.'],
  // ---------- IFT 308 (19 topics) ----------
  ['IFT 308', 'EVWcuFXeSgk', 'watch', 'NPTEL: Introduction to Ethical Reasoning and Engineering Ethics', 'Social, ethical, legal and managerial IT issues.', 'Social, ethical, legal, and managerial issues in the application of information technology in government, organisations, and industry.'],
  ['IFT 308', '14_C-NEEZXk', 'watch', 'NPTEL: Basics of Intellectual Property', 'Foundations of intellectual property.', 'Foundations of intellectual property.'],
  ['IFT 308', 'ejwdiJaFqO8', 'watch', 'NPTEL: Introduction to Law', 'Ownership of information.', 'Ownership of information.'],
  ['IFT 308', 'T9Tql2cAc28', 'watch', 'NPTEL: Copyright Infringement and Fair Use', 'Plagiarism and software piracy.', 'Plagiarism, Software piracy.'],
  ['IFT 308', 'g7rq1DSvR7g', 'watch', 'NPTEL: Workplace Rights and Responsibilities', 'Fairness in the workplace.', 'Fairness in the workplace.'],
  ['IFT 308', 'GKbOy2c--KU', 'watch', 'NPTEL: Copyright in Digital Media', 'Digital millennium copyright act.', 'Digital millennium copyright act.'],
  ['IFT 308', 'pwMmfap6Oag', 'watch', 'NPTEL: Patent Basics', 'Patents.', 'Patents.'],
  ['IFT 308', '_YaGAWPkJFE', 'watch', 'NPTEL: Trademark Basics', 'Trademarks and trade secrets.', 'Trademarks and trade secrets.'],
  ['IFT 308', 'WOTOvhx7bLY', 'watch', 'NPTEL: Computer Software and Digital Information', 'Legal issues in computing.', 'Legal issues in computing.'],
  ['IFT 308', 'P6dsoBZxGLA', 'watch', 'NPTEL: Professional Practice in Engineering', 'Organisational context.', 'Organisational context;'],
  ['IFT 308', 'bB-YikzQTYk', 'watch', 'NPTEL: Central Professional Responsibilities of Engineers', 'Professional and ethical issues and responsibilities.', 'professional and ethical issues and responsibilities.'],
  ['IFT 308', 'OgZq59CVjTA', 'watch', 'IEEE CS/ACM Code of Ethics Explained', 'Relationships with professional societies.', 'Relationships with professional societies.'],
  ['IFT 308', '5zz6unK03z4', 'watch', 'NPTEL: Key Questions on Ethical Conduct of Engineers', 'Codes of professional conduct.', 'Codes of professional conduct.'],
  ['IFT 308', 'GvQolte0bI4', 'watch', 'NPTEL: Ethical Reasoning Continued', 'Ethics and history of ethics.', 'Ethics and history of ethics.'],
  ['IFT 308', '4caExR-Igms', 'watch', 'Whistleblowing (Engineering Ethics)', 'Whistle-blowing.', 'Whistle- blowing.'],
  ['IFT 308', 'RV1LfvSduKU', 'watch', 'NPTEL: Workplace Rights and Responsibilities Continued', 'Workplace issues: harassment and discrimination.', 'Workplace issues (harassment, discrimination).'],
  ['IFT 308', '9SD6DRCKZFU', 'watch', 'Messer: Phishing (SY0-701)', 'Identity theft via phishing.', 'Identify theft.'],
  ['IFT 308', 'c6gYVucJpiY', 'watch', 'NPTEL Special Lecture: Introduction to Ethical Hacking', 'Ethical hacking.', 'Ethical hacking.'],
  ['IFT 308', 'a1jlC3uKkRA', 'watch', 'DEF CON 21: Ask the EFF on Digital Civil Liberties', 'Privacy and civil liberties organisations.', 'Privacy and civil liberties organisations.'],
  // ---------- IFT 310 (14 topics) ----------
  ['IFT 310', 'Tn1bH76cgLM', 'watch', 'Udacity: Developing Android Apps Intro', 'Introduction to mobile application development.', 'Introduction to developing mobile applications.'],
  ['IFT 310', 'Buo7kzHECHk', 'watch', 'Udacity: Android Software Stack and Gradle', 'Mobile OS capabilities and components.', 'Mobile operating systems capabilities, application architecture, and major components, such as activities, services, broadcast receivers, etc.'],
  ['IFT 310', 'dpqwsf6g85E', 'watch', 'Udacity: HTTP Request for Weather Data', 'Interactive apps with widgets and web services.', 'Development of interactive applications using widget libraries, web-based services.'],
  ['IFT 310', 'P3Q66DvQ5I4', 'watch', 'Udacity: Draw Your Own View', '2D graphics and animation basics.', 'Basic concepts of 2D graphics and animation.'],
  ['IFT 310', 'XZ7oLq9prEY', 'watch', 'Udacity: SQLiteOpenHelper Database', 'SQL database engine and multithreading.', 'An SQL database engine, and multithreading.'],
  ['IFT 310', 'Gk6RF5k3C2M', 'watch', 'CS50 Mobile: React Native (L3)', 'Multiplatform mobile development.', 'Multiplatform mobile application development.'],
  ['IFT 310', 'AYVEjjxHCeE', 'watch', 'Udacity: Storytime Android Consumer Platform', 'Mobile application basics and features.', 'Mobile application basics and features;'],
  ['IFT 310', 'woSgh5YaYH4', 'watch', 'Udacity: Create a User Interface', 'Android UI design.', 'Android application basics, UI design.'],
  ['IFT 310', 'HdbhBx55uQY', 'watch', 'Udacity: Use SharedPreferences', 'Data storage.', 'Data storage;'],
  ['IFT 310', '2DBJuYAf30w', 'watch', 'Udacity: Introducing SyncAdapters', 'Networking application design.', 'networking application design.'],
  ['IFT 310', 'm57RQcgbT10', 'watch', 'Udacity: Add Map Location Intent', 'Advanced design: sensors, GPS, graphics.', 'Advanced application design (sensors, camera, GPS, Audio, etc.), graphics and games, web- based hybrid application design.'],
  ['IFT 310', 'GYBPcudYj-I', 'watch', 'Udacity: Introducing Project Sunshine', 'Design a simple mobile application.', 'Design and implement a simple mobile application for a given mobile platform.'],
  ['IFT 310', 'oAy4tbBSZEU', 'watch', 'Udacity: JUnit Testing', 'Metrics and methods to evaluate performance.', 'Metrics and methods to evaluate the performance of mobile applications.'],
  ['IFT 310', 'HhHcuvhPStw', 'watch', 'Udacity: Storytime Android Platform', 'Mobile application perspectives and impact.', 'Mobile application perspectives and impact.'],
  // ---------- IFT 342 (10 topics) ----------
  ['IFT 342', 'CpLznUxkzg8', 'watch', 'Messer: IPv6 Addressing (N10-009)', 'IP networking and IPv6 addressing.', 'IP networking concepts and practices for IPv6 addressing.'],
  ['IFT 342', 'b7fiXM3vO18', 'watch', 'Messer: DHCP (N10-009)', 'DHCP and DNS in IPv6 networks.', 'DHCP and DNS in IPv.6 networks.'],
  ['IFT 342', 'tm7i0zEitPQ', 'watch', 'Messer: VPNs (N10-009)', 'Secure communication over VPNs and VoIP.', 'Secure communication over VPNs, VoIP architecture.'],
  ['IFT 342', 'wI2x6eGF1Yg', 'watch', 'Messer: Cloud Models', 'Virtual and cloud computing, VoIP.', 'Concept of Virtual Computing, Cloud Computing, VoIP.'],
  ['IFT 342', 'ieqSi5Aicxc', 'watch', 'Messer: Logs and Monitoring (N10-009)', 'Traffic monitoring and connectivity.', 'Traffic monitoring and network connectivity between operating systems.'],
  ['IFT 342', 'A6tPNGEfOzc', 'watch', 'Messer: Software Defined Networking (N10-009)', 'Latest IP network technologies and services.', 'Overview of latest technologies of IP networks and understand application-level services used in the internet.'],
  ['IFT 342', 'E5Ud1m9h0yc', 'watch', 'CBT Nuggets: What is MPLS', 'Multi-Protocol Label Switching.', 'Multi-Protocol Label Switching (MPLS).'],
  ['IFT 342', 'QbEDRTjcom4', 'watch', 'Messer: Remote Access (N10-009)', 'VPN secure network connectivity.', 'VPN Secure Network Connectivity.'],
  ['IFT 342', 'n_b2sJP2pBk', 'watch', 'PowerCert: What is VoIP?', 'VoIP architecture.', 'VoIP Architecture.'],
  ['IFT 342', '2psly3euy78', 'watch', 'NYT: Net Neutrality Explained', 'Network neutrality.', 'Network Neutrality.'],
  // ---------- INS 204 (12 topics) ----------
  ['INS 204', '7vKuE38Djhc', 'watch', 'Barlow SAD: Analysis Phase (Ch 3)', 'Structured analysis and design for business.', 'Structured approach to analysis and design of information systems for businesses.'],
  ['INS 204', '6-GbY4Asgf8', 'watch', 'Barlow SAD: Development Methodologies (Ch 2)', 'Software development life cycle.', 'Software development life cycle.'],
  ['INS 204', 'czBFiEsvAPM', 'watch', 'Barlow SAD: Program Design (Ch 10)', 'Structured top-down and bottom-up design.', 'Structured top-down and bottom-up design.'],
  ['INS 204', 'StwBh8iQkEs', 'watch', 'Barlow SAD: Elements of a DFD (Ch 5)', 'Dataflow diagramming.', 'Dataflow diagramming.'],
  ['INS 204', 'n67FF0_Fsno', 'watch', 'Visio for DFDs and E-R Diagrams', 'Entity relationship modelling.', 'Entity relationship modelling.'],
  ['INS 204', '7bRMC_r7u-w', 'watch', 'Barlow SAD: Acquisition Tools (Ch 7)', 'Computer aided software engineering.', 'Computer aided software engineering.'],
  ['INS 204', 'DMPxxijmG7M', 'watch', 'Barlow SAD: Input Output Mechanisms (Ch 9)', 'Input, output, prototyping and validation.', 'Input and output, prototyping design and validation.'],
  ['INS 204', '4ZZVo2YPkIg', 'watch', 'Barlow SAD: Architecture Design (Ch 8)', 'File and database design.', 'File and database design.'],
  ['INS 204', '4ZKu48s6AOw', 'watch', 'Barlow SAD: UI Principles (Ch 9)', 'Design of user interfaces.', 'Design of user interfaces.'],
  ['INS 204', 'i--fs4l9U_M', 'watch', 'Barlow SAD: OO Approach (Ch 14)', 'Structured vs object-oriented design.', 'Comparison of structured and object-oriented design.'],
  ['INS 204', 'x_sh0l1hAa8', 'watch', 'Barlow SAD: Project Selection (Ch 2)', 'SDLC activities with case studies.', 'Lab work: Practical exercises on software development life cycle (SDLC) activities with different case studies.'],
  ['INS 204', 'p72mCYQBM8o', 'watch', 'DFD Explained: Library Management System (Karan Jetli)', 'Case studies: top-down, bottom-up, DFD, ER models.', 'Use of different information systems case studies to apply the knowledge of structured top-down and bottom –up design, dataflow diagram and entity relationship models.'],
  // ---------- INS 207 (10 topics, Miller BIS) ----------
  ['INS 207', 'X898qHM2uP0', 'watch', 'Miller BIS Ch 1: Introduction to Information Systems', 'Roles of IS in organisations.', 'Roles and relevance of information systems in organisations to conduct business and solve problems.'],
  ['INS 207', 'e6vQvsGurcQ', 'watch', 'Miller BIS Ch 2: Strategy and Competitive Advantage', 'IS principles in modern organisations.', 'Information systems principles in modern organisations.'],
  ['INS 207', 'L_QwIhBL4r4', 'watch', 'Miller BIS Ch 10: IS Within the Organization', 'Systems concepts.', 'Systems concepts;'],
  ['INS 207', 'SEImedrfUWA', 'watch', 'Miller BIS: CRM and Supply Chain', 'Organisational processes.', 'organisational processes;'],
  ['INS 207', 'zUuxeuurBWQ', 'watch', 'Miller BIS: Hardware and Exam Review', 'Technological aspects of IS.', 'technological aspects of information systems.'],
  ['INS 207', 'PO4MSwAB_Ck', 'watch', 'Miller BIS Ch 6/8: Telecom and Wireless', 'The internet.', 'The internet.'],
  ['INS 207', 'cs58pkkOqog', 'watch', 'Miller BIS Ch 4: Information Security', 'IT security.', 'Information technology security.'],
  ['INS 207', 'N9HT9-huXM8', 'watch', 'Miller BIS Ch 3: Ethics and Privacy', 'Ethical issues.', 'Ethical issues.'],
  ['INS 207', 'qzhNzmiCB1E', 'watch', 'Miller BIS Ch 5: Data and Knowledge Management', 'Database management.', 'Database management.'],
  ['INS 207', 'WhsFyQHpb6s', 'watch', 'Miller BIS Ch 13: Acquiring IS', 'Systems development life cycle.', 'Systems development life cycle.'],
  // ---------- INS 301 (4 topics) ----------
  ['INS 301', 'KPKTQMtnCTw', 'watch', 'NPTEL MIS: Impact of IS on Management', 'MIS integrated with operations management.', 'Integration of core concepts from Management Information System (MIS) with those of Operations Management (OM).'],
  ['INS 301', '_VJkKZFuRvE', 'watch', 'IITR: Operations Management Basics', 'Process view of material and information flows.', 'Introduction of process-oriented view of the flows of materials, information, products and services through and across organisational functions.'],
  ['INS 301', 'DV2M1av-jd8', 'watch', 'NPTEL: Decision Analysis I', 'Analyse processes, minimise cost, maximise value.', 'All organisations must carefully analyse and document their business processes and must continuously assess the efficiency and effectiveness of these processes to minimise cost and maximise value creation.'],
  ['INS 301', 'm6eQ8OQ7haU', 'watch', 'NPTEL: Data Flow Diagrams I', 'Events, efficiency, behaviour-aware process design.', 'Identification information-bearing events, assess and improve process efficiency, learn to model and analyse business processes, and understand the interactions between human behaviour and process design.'],
  // ---------- INS 305 (8 topics) ----------
  ['INS 305', 'TtbImDfUt4c', 'watch', 'IIT Roorkee: Introduction to Management I', 'Definition of management.', 'Definition of management;'],
  ['INS 305', 'jCytq-HVDPk', 'watch', 'IIT Roorkee: Introduction to Management III', 'Theory and technique of management.', 'needs for theory and technique of management.'],
  ['INS 305', 'u1wXD6Gaato', 'watch', 'Lecture 50: Managing Organizational Evolution', 'Managerial transformation and evolution of theory.', 'Managerial transformation process, evolution of management theory.'],
  ['INS 305', 'uMnu4TA9DMQ', 'watch', 'Lecture 04: Type 1 Organizational Theories', 'Theories of management.', 'Theories of management.'],
  ['INS 305', 'CCYic2iIt2g', 'watch', 'Introduction to Management IV', 'Management functions.', 'Management functions.'],
  ['INS 305', 'nuiX4d2oXYo', 'watch', 'Lecture 23: Management by Objectives I', 'Management by objective.', 'Management by objective.'],
  ['INS 305', '8q7cpd8OLqA', 'watch', 'IIT Kanpur: Productivity and Sustainability', 'Securing productivity at work.', 'Securing productivity at work.'],
  ['INS 305', 'zYDvYFgGOew', 'watch', 'Lecture 47: Managing Conflict, Power and Politics', 'Bad management and group conflicts.', 'Criteria for locating bad management and group conflicts in organisation.'],
  // ---------- INS 311 (6 topics) ----------
  ['INS 311', 'fMI6mv9UWLI', 'watch', 'Schuessler BCIS Ep 4: E-Commerce Presence', 'E-business applications and websites.', 'Developing e-business applications and web sites using currently popular software packages, web authoring and development tools.'],
  ['INS 311', 'GUbks2jwFhw', 'watch', 'Schuessler BCIS Ep 3: E-Commerce Infrastructure', 'Business processes via IS, telecom and internet.', 'The business processes enabled by integrating information systems, telecommunications and internet-based technologies.'],
  ['INS 311', '9QQ_fhK273o', 'watch', 'Schuessler BCIS Ep 5: Security and Payment Systems', 'E-security challenges.', 'e-security challenges.'],
  ['INS 311', '8ZYAMPvLncA', 'watch', 'Schuessler BCIS Ep 8: Ethics, Privacy and Governance', 'Ethical and social impact of web applications.', 'Ethical and social impact of web application solutions.'],
  ['INS 311', 'NNx72R8E2W8', 'watch', 'Metics: WordPress Tutorial for Beginners', 'Creating websites and e-business applications.', 'Lab work: Practical exercises on how to creating websites and develop electronic business applications.'],
  ['INS 311', 'ecRoh77L_8o', 'watch', 'Create a Pro Website: Secure Your WordPress Site', 'Securing the developed e-business application.', 'Practise on how to secure the developed electronic business application.'],
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
