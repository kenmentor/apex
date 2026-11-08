// BIO 101/102/107/108/208 + GST 111/112/212/312 + ENT 211/312 video banks.
// Sourcing per docs/sourcing-quality-process.txt:
// - ONE winner per topic (order preserved); backups noted in research, NOT imported.
// - BIO: Amoeba Sisters backbone + Khan Academy statistics + CrashCourse Botany/A&P.
// - GST 111: CrashCourse Linguistics, engVid, Scribbr, Khan, Stanford Talk Smart.
// - GST 112: HistoryVille Nigerian-history series + civic-education channels.
// - GST 212: CrashCourse + Wireless Philosophy. GST 312: UN, BBC Africa, LawShelf,
//   HistoryVille, community-policing and ADR channels.
// - ENT: CrashCourse Business Entrepreneurship + HBS Online, TEDx, Fraser Institute.
// - Comments proof: Amoeba "learned more in 9 min than three 1hr lessons" [4700];
//   Khan "cried cos this helped"; HistoryVille exact-fit Nigerian history.
// - GAPS (junk rows or no neutral source): BIO 107 + GST 111 Allied Health rows,
//   BIO 208 admin rows x2, GST 112 3Rs re-orientation.
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
  // ---------- BIO 101 (8 topics, Amoeba) ----------
  ['BIO 101', '8IlzKri08kk', 'watch', 'Amoeba Sisters: Introduction to Cells', 'Cell structure and organisation.', 'Cell structure and organisation.'],
  ['BIO 101', 'R09zFIGevio', 'watch', 'Amoeba Sisters: Cell Organelles and Structures', 'Functions of cellular organelles.', 'functions of cellular organelles.'],
  ['BIO 101', 'DVouQRAKxYo', 'watch', 'Amoeba Sisters: Classification', 'Characteristics and classification of living things.', 'characteristics and classification of living things.'],
  ['BIO 101', '8m6hHRlKwxY', 'watch', 'Amoeba Sisters: DNA, Chromosomes, Genes and Traits', 'Chromosomes, genes, relationships and importance.', 'chromosomes, genes their relationships and importance.'],
  ['BIO 101', 'fcGDUcGjcyk', 'watch', 'Amoeba Sisters: Asexual and Sexual Reproduction', 'General reproduction.', 'General reproduction.'],
  ['BIO 101', 'rNjPI84sApQ', 'watch', 'Amoeba Sisters: Ecological Relationships', 'Competition, parasitism, predation, symbiosis and more.', 'Interrelationships of organisms (competitions, parasitism, predation, symbiosis, commensalisms, mutualism, saprophytism).'],
  ['BIO 101', 'fI7IV3x-dGI', 'watch', 'Amoeba Sisters: Evolution', 'Heredity and evolution: Darwinism, Lamarckism, Mendel.', 'Heredity and evolution (introduction to Darwinism and Lamarckism, Mendelian laws, explanation of key genetic terms).'],
  ['BIO 101', 'uqEUzgVAF6g', 'watch', 'Amoeba Sisters: Ecological Succession', 'Elements of ecology and types of habitat.', 'Elements of ecology and types of habitat.'],
  // ---------- BIO 102 (4 topics, Amoeba) ----------
  ['BIO 102', 'AEXU3cJ6f9E', 'watch', 'Amoeba Sisters: Classification and Taxonomic Groups', 'Viruses, bacteria and fungi: characteristics and classification.', 'Basic characteristics, identification and classification of viruses, bacteria and fungi.'],
  ['BIO 102', '3y1dTsyfNQ4', 'watch', 'Amoeba Sisters: Animals Tour of 9 Phyla', 'Survey of the plant and animal kingdoms.', 'A generalized survey of the plant and animal kingdoms based mainly on the study of similarities and differences in the external features.'],
  ['BIO 102', 'A_DF246uVlU', 'watch', 'Amoeba Sisters: Plants Diversity and Adaptations', 'Ecological adaptations of plants.', 'Ecological adaptations.'],
  ['BIO 102', '0JDCViWGn-0', 'watch', 'Amoeba Sisters: Human Body Systems Overview', 'Physiology: nutrition, respiration, circulation, excretion, growth.', 'Briefs on physiology to include nutrition, respiration, circulatory systems, excretion, reproduction, growth and development.'],
  // ---------- BIO 107 (6 of 7; Allied Health row = GAP) ----------
  ['BIO 107', 'MEIXRLcC6RA', 'watch', 'Amoeba Sisters: General Lab Safety', 'Common laboratory hazards: prevention and first aid.', 'Common laboratory hazards: prevention and first aid.'],
  ['BIO 107', 'rJJrR8h-DtA', 'watch', 'Cognito: GCSE Biology Unit Conversions', 'Measurements in biology.', 'Measurements in biology.'],
  ['BIO 107', 'tVcEEw6qbBQ', 'watch', 'Amoeba Sisters: Microscopes and Light Microscope Use', 'Uses and care of microscope.', 'Uses and care of microscope.'],
  ['BIO 107', 'nZ9JD0gGBww', 'watch', 'Celestron: Stereo vs Compound Microscopes', 'Compound and dissecting microscope.', 'Compound and dissecting microscope.'],
  ['BIO 107', 'hCa_4wegKBs', 'watch', 'Biological Drawings and WAEC Mark Scheme', 'Biological drawings, scaling, accuracy and proportion.', 'Biological drawings and illustration, scaling, accuracy and proportion;'],
  ['BIO 107', '_TL8LUxHkTg', 'watch', 'Amoeba Sisters: Experimental Design Review', 'Common apparatus and illustrative laboratory experiments.', 'use of common laboratory apparatus and laboratory experiments designed to illustrate the topics covered in BIO 101.'],
  // ---------- BIO 108 (7 topics) ----------
  ['BIO 108', 'iJ0cO5VwBXg', 'watch', 'Amoeba Sisters: Plant Structure and Diversity', 'Anatomy of flowering plants, primary vegetative body.', 'Anatomy of flowering plants, primary vegetative body.'],
  ['BIO 108', 'pqosCR6J2qo', 'watch', 'Crash Course Botany #4: Plant Tissues', 'Stem, leaf, root tissues: xylem, phloem and more.', 'stem, leaf and root to show the mature tissues namely parenchyma, collenchyma, sclerenchyma, xylem and phloem.'],
  ['BIO 108', 'QMBGMUgAqCs', 'watch', 'Amoeba Sisters: Angiosperm Reproduction', 'Types of fruits and seeds.', 'Types of fruits and seeds.'],
  ['BIO 108', 'uYjC9Kol5fM', 'watch', 'Dissection Tools: Names and Uses', 'Care and use of dissecting kits and biological wares.', 'Care and use of dissecting kits and other biological wares.'],
  ['BIO 108', '5j8j7BhCCEg', 'watch', 'Amoeba Sisters: The 4 Body Tissue Types', 'Dissection and general histology of animal tissues.', 'Dissection and general histology of animal tissues based on vertebrate forms.'],
  ['BIO 108', 'i5tR3csCWYo', 'watch', 'Crash Course A&P #2: Tissues', 'Epithelial, muscular, nervous and connective tissues.', 'Morphology and functions of epithelial, muscular, nervous and connective tissues.'],
  ['BIO 108', 'wpKulkADzBk', 'watch', 'Amoeba Sisters: Dichotomous Keys', 'Identification of lower invertebrate groups.', 'Examination of various groups of lower invertebrates under microscopes, identification of various groups of organisms in Animal Kingdom and any experiment designed to emphasize the practical aspects of topics in BIO 102.'],
  // ---------- BIO 208 (12 of 14; admin rows = GAP) ----------
  ['BIO 208', 'rodnzzR4dLo', 'watch', 'Medicosis: Types of Variables', 'Continuous and discontinuous variables.', 'Variability in biological data: continuous and discontinuous variables.'],
  ['BIO 208', 'aKAw-DyZa6g', 'watch', 'Khan: Reasonable Samples', 'Statistical sampling procedures.', 'statistical sampling procedures.'],
  ['BIO 208', 'k5EbijWu-Ss', 'watch', 'Khan: Inferring Population Mean', 'Observations and estimation problems.', 'observations and problems of estimation.'],
  ['BIO 208', 'eLyLbaXfJXo', 'watch', 'Khan: Means and Medians of Distributions', 'Representation and summarization of biological data.', 'representation and summarization of biological data.'],
  ['BIO 208', 'zjHfAhcU6kE', 'watch', 'Grouped Data and Frequency Tables', 'Frequency distribution.', 'frequency distribution.'],
  ['BIO 208', 'E4HAYd0QnRc', 'watch', 'Khan: Range, Variance and Standard Deviation', 'Central tendency and dispersion.', 'measures of central tendency and dispersion.'],
  ['BIO 208', '3UlE8gyKbkU', 'watch', 'Khan: All the Ways You Can Flip a Coin', 'Probability theory.', 'Probability theory.'],
  ['BIO 208', 'hgtMWR3TFnY', 'watch', 'Khan: Intro to the Normal Distribution', 'Normal, binomial and Poisson distributions.', 'normal, binomial and Poisson distribution.'],
  ['BIO 208', '5ABpqVSx33I', 'watch', 'Khan: Z vs T Statistics', 't-test, f-test and chi-square test.', 't-test, f-test and chi-square test.'],
  ['BIO 208', 'EFdlFoHI_0I', 'watch', 'Khan: ANOVA 1', 'ANOVA and covariance.', 'analysis of variance (ANOVA) and covariance.'],
  ['BIO 208', 'z-Qi4w6Xkuc', 'watch', 'Khan: Types of Statistical Studies', 'Principles of experimental design.', 'principles of experimental design.'],
  ['BIO 208', 'GAmzwIkGFgE', 'watch', 'Khan: Regression Line Example', 'Correlation and regression.', 'correlation, linear and curvilinear regression and transformation.'],
  // ---------- GST 111 (16 of 17; Allied Health row = GAP) ----------
  ['GST 111', 'imH7hdOgxrU', 'watch', 'CrashCourse Linguistics #10: Phonology', 'Sound patterns: vowels, consonants, phonetics.', 'Sound patterns in English Language (vowels and consonants, phonetics and phonology).'],
  ['GST 111', 'SceDmiBEESI', 'watch', 'engVid: Parts of Speech', 'English word classes.', 'English word classes (lexical and grammatical words, definitions, forms, functions, usages, collocations).'],
  ['GST 111', 'urr55rAreWc', 'watch', 'engVid: The 4 English Sentence Types', 'Sentences: structural, functional, simple, complex.', 'Sentence in English (types: structural and functional, simple and complex).'],
  ['GST 111', 'Ljjiw9mC_Cg', 'watch', 'English with Lucy: All 16 Tenses', 'Grammar and usage: tense, mood, modality, concord.', 'Grammar and Usage (tense, mood, modality and concord, aspects of language use in everyday life).'],
  ['GST 111', 'WAdpPABoTzE', 'watch', 'Deductive and Inductive Reasoning', 'Logical and critical thinking.', 'Logical and Critical Thinking and Reasoning Methods (Logic and Syllogism, Inductive and Deductive Argument and Reasoning Methods, Analogy, Generalisation and Explanations).'],
  ['GST 111', 'y0d7zupbd4E', 'watch', 'Avoid Plagiarism: Copyright and Ethics', 'Ethical considerations, copyright rules and infringements.', 'Ethical considerations, Copyright Rules and Infringements.'],
  ['GST 111', '-i5aQv97IpQ', 'watch', 'The Writing Process in 5 Steps', 'Writing activities: pre-writing.', 'Writing Activities: (Pre-writing, Writing, Post writing, Editing and Proofreading;'],
  ['GST 111', 'UuOWNNvupik', 'watch', 'Scribbr: How to Write an Essay', 'Summary, essays, letters, CV, reports, note making.', 'Brainstorming, outlining, Paragraphing, Types of writing, Summary, Essays, Letter, Curriculum Vitae, Report writing, Note making and many others.'],
  ['GST 111', 'Wk0k2FLjM1c', 'watch', 'Khan: Meet the Comma', 'Mechanics of writing.', 'Mechanics of writing).'],
  ['GST 111', 'X5yJRAOlA1U', 'watch', 'Types of Reading', 'Comprehension strategies and reading types.', 'Comprehension Strategies: (Reading and types of Reading, Comprehension Skills, 3RsQ).'],
  ['GST 111', 'WAoy4PSELZg', 'watch', 'ICT in Language Learning', 'ICT in modern language learning.', 'Information and Communication Technology in modern Language Learning.'],
  ['GST 111', 'IUuMf4EumsQ', 'watch', 'Four Core English Skills', 'Language skills for effective communication.', 'Language skills for effective communication.'],
  ['GST 111', '93sK4jTGrss', 'watch', 'CrashCourse Linguistics #2: Morphology', 'Major word formation processes.', 'Major word formation processes.'],
  ['GST 111', 'xVc0O2TdUdw', 'watch', 'WAEC Summary Writing Made Easy', 'Writing and reading comprehension strategies.', 'Writing and reading comprehension strategies.'],
  ['GST 111', 'jX3OXwpEpl8', 'watch', 'Deductive vs Inductive vs Abductive Reasoning', 'Logical and critical reasoning for presentations.', 'Logical and critical reasoning for meaningful presentations.'],
  ['GST 111', '5naThX63pF0', 'watch', 'Stanford: Managing Speaking Anxiety', 'Public speaking and listening.', 'Art of public speaking and listening.'],
  // ---------- GST 112 (20 of 21; 3Rs row = GAP) ----------
  ['GST 112', '3beru8wZKwU', 'watch', 'HistoryVille: Centralised Pre-Colonial States', 'Nigerian history and culture up to 1800.', 'Nigerian history, culture and art up to 1800 (Yoruba, Hausa and Igbo peoples and cultures;'],
  ['GST 112', 'B07k1FEdWP4', 'watch', 'HistoryVille: Non-Centralised States', 'Minority ethnic groups.', 'peoples and cultures of the minority ethnic groups).'],
  ['GST 112', 'RnYgkcqTutg', 'watch', 'HistoryVille: Colonisation to Independence', 'Nigeria under colonial rule.', 'Nigeria under colonial rule (advent of colonial rule in Nigeria;'],
  ['GST 112', 'PlRvXgwaNEI', 'watch', 'HistoryVille: Lugard\u2019s Indirect Rule', 'Colonial administration of Nigeria.', 'colonial administration of Nigeria).'],
  ['GST 112', 'kzEOdatpL4U', 'watch', 'HistoryVille: 1914 Amalgamation', 'Evolution as a political unit.', 'Evolution of Nigeria as a political unit (amalgamation of Nigeria in 1914;'],
  ['GST 112', 'sy6nS4GIsh4', 'watch', 'HistoryVille: Awolowo and the Action Group', 'Formation of political parties.', 'formation of political parties in Nigeria;'],
  ['GST 112', 'G_zy5UFa5Lg', 'watch', 'HistoryVille: Complete History of Independence', 'Nationalist movement and independence struggle.', 'nationalist movement and struggle for independence).'],
  ['GST 112', 'FV5cv7H-9iM', 'watch', 'HistoryVille: Nigeria\u2019s 1966 Coups', 'Nation building and military intervention.', 'Nigeria and challenges of nation building (military intervention in Nigerian politics;'],
  ['GST 112', 'BshruN9NmtU', 'watch', 'History Off the Map: The Civil War', 'Nigerian Civil War.', 'Nigerian Civil War).'],
  ['GST 112', 'NI3em1mWtEI', 'watch', 'HistoryVille: Igbo Economy, Trade and Governance', 'Indigenous trade and market system.', 'Concepts of trade and economics of self- reliance (indigenous trade and market system;'],
  ['GST 112', 'eZrmQo15erE', 'watch', 'The Igba-Boi Indigenous Business Model', 'Indigenous apprenticeship system.', 'indigenous apprenticeship system among Nigerian peoples;'],
  ['GST 112', '-spFs1P2I-k', 'watch', 'NAN: Skills Acquisition for Self-Reliance', 'Trade, skill acquisition and self-reliance.', 'trade, skill acquisition and self-reliance).'],
  ['GST 112', 'am-brmj8TqQ', 'watch', 'Classification of Law', 'Social justice: definition and classification of law.', 'Social justice and national development (definition and classification of law);'],
  ['GST 112', '852UlylLhqM', 'watch', 'Fundamental Human Rights in the Nigerian Constitution', 'Judiciary and fundamental rights.', 'Judiciary and fundamental rights.'],
  ['GST 112', 'aelmUrKwctI', 'watch', 'Civic Education 101: Values', 'Individuals, norms and Nigerian values.', 'Individuals, norms and values (basic Nigerian norms and values, patterns of citizenship acquisition;'],
  ['GST 112', 'a2-QL59pVRo', 'watch', 'Duties and Responsibilities of Citizens', 'Citizenship and civic responsibilities.', 'citizenship and civic responsibilities;'],
  ['GST 112', '6x05C0b_un8', 'watch', 'Benefits of Multilingual Education in Nigeria', 'Indigenous languages, usage and development.', 'indigenous languages, usage and development;'],
  ['GST 112', 'MuZHbsVrUsg', 'watch', 'Civics Education: Cultism Exam Guide', 'Negative attitudes and conducts.', 'negative attitudes and conducts [Cultism, kidnapping and other related social vices]).'],
  ['GST 112', 'J9Tit3f6ZC0', 'watch', 'Rifi Farms: Nigeria Agriculture and OFN History', 'Re-orientation strategies and agric programmes.', 're-orientation strategies: Operation Feed the Nation (OFN), Green Revolution, Austerity Measures, War Against Indiscipline and Corruption (WAIC), Mass Mobilization for Self-Reliance, Social Justice and Economic Recovery (MAMSER), National Orientation Agency (NOA).'],
  ['GST 112', 'W_ZuHWP0M5s', 'watch', 'HistoryVille: Nigeria at 66', 'Current socio-political and cultural developments.', 'Current socio-political and cultural developments in Nigeria.'],
  // ---------- GST 212 (9 topics, Philosophy) ----------
  ['GST 212', '8uizj3cZ7lw', 'watch', 'Intro to Philosophy: History, Branches and Why It Matters', 'Scope of philosophy.', 'Scope of philosophy;'],
  ['GST 212', '_bUlaQ5-FqU', 'watch', 'PHI 101 Lecture 1: Intro to Philosophy', 'Notions, meanings, branches and problems of philosophy.', 'notions, meanings, branches and problems of philosophy.'],
  ['GST 212', 'NKEhdsnKKHs', 'watch', 'CrashCourse Philosophy #2: How to Argue', 'Logic as a tool of philosophy.', 'Logic as an indispensable tool of philosophy.'],
  ['GST 212', '3jvQrpVQaYM', 'watch', 'WiPhi: Deductive Arguments', 'Syllogism and rules of inference.', 'Elements of syllogism, symbolic logic— the first nine rules of inference.'],
  ['GST 212', 'VDGp04CfM4M', 'watch', 'WiPhi: Formal and Informal Fallacies', 'Fallacies, laws of thought, arguments.', 'Informal fallacies, laws of thought, nature of arguments.'],
  ['GST 212', '-wrCpLJ1XAw', 'watch', 'CrashCourse Philosophy #3: Induction and Abduction', 'Valid and invalid arguments, deduction and induction.', 'Valid and invalid arguments, logic of form and logic of content — deduction, induction and inferences.'],
  ['GST 212', 'AYkhlXronNk', 'watch', 'CrashCourse Philosophy #14: Epistemic Responsibility', 'Creative and critical thinking.', 'Creative and critical thinking.'],
  ['GST 212', 'Ra1Dmz-5HjU', 'watch', 'CrashCourse Philosophy #46: What Is a Good Life?', 'Impact of philosophy on human existence.', 'Impact of philosophy on human existence.'],
  ['GST 212', 'H0CTHVCkm90', 'watch', 'CrashCourse Philosophy #40: What Is Justice?', 'Philosophy, politics, conduct, religion and values.', 'Philosophy and politics, philosophy and human conduct, philosophy and religion, philosophy and human values, philosophy and character molding, etc.'],
  // ---------- GST 312 (21 topics, Peace and Conflict) ----------
  ['GST 312', 'tw7-_MQsYYA', 'watch', 'What is Peace and Conflict Studies', 'Concepts of peace, conflict and security.', 'The concepts of peace, conflict and security in a multi-ethnic nation.'],
  ['GST 312', 'MKz-iSg5aDY', 'watch', 'Conflict in IR: Concept, Kinds, Causes', 'Types and theories of conflicts.', 'Types and theories of conflicts: ethnic, religious, economic, geo-political Conflicts;'],
  ['GST 312', 'gR3igiwaeyc', 'watch', 'CrashCourse Sociology #6: Conflict Theory', 'Structural, realist and frustration-aggression theories.', 'structural conflict theory, realist theory of conflict, frustration-aggression conflict theory;'],
  ['GST 312', 'xTAX3eAuFHQ', 'watch', 'MRU: African Borders and Conflict', 'Root causes: boundaries and disputes.', 'root causes of conflict and violence in Africa: indigene and settlers phenomenon, boundaries/boarder disputes, political disputes, ethnic disputes and rivalries, economic inequalities, social disputes, nationalist movements and agitations;'],
  ['GST 312', 'vo3xwQFJGzw', 'watch', 'History Off the Map: The Tiv-Jukun Conflicts', 'Tiv-Jukun and chieftaincy case studies.', 'selected conflict case studies – Tiv-Junkun, ZangoKartaf, chieftaincy and land disputes, etc.'],
  ['GST 312', 'EHJKpgyJB5U', 'watch', 'UN: What is Peacebuilding?', 'Peace building and human development.', 'Peace building, management of conflicts and security: Peace & Human Development.'],
  ['GST 312', '_Jp7NQZh_Uw', 'watch', 'Traditional Systems of Conflict Resolution', 'Religious, government and community approaches.', 'Approaches to Peace & Conflict Management (religious, government, community leaders, etc.).'],
  ['GST 312', '5Z58iMa8CuA', 'watch', 'Why Conflict Escalates: Glasl\u2019s 9 Stages', 'Conflict dynamics: constructive and destructive scales.', 'Elements of peace studies and conflict resolution: Conflict dynamics assessment Scales: Constructive & Destructive.'],
  ['GST 312', '5-JQ17X6VNg', 'watch', 'School of Life: John Rawls on Justice', 'Concepts of social justice.', 'Justice and Legal framework: Concepts of Social Justice;'],
  ['GST 312', '7Vx7aVK_Qi4', 'watch', 'Hierarchy of Courts in Nigeria', 'The Nigeria legal system.', 'The Nigeria Legal System.'],
  ['GST 312', 'jsVgXJLXtdw', 'watch', 'BBC Africa: Boko Haram, A Decade of Terror', 'Insurgency and terrorism.', 'Insurgency and terrorism.'],
  ['GST 312', '4uPPWb3V3V4', 'watch', 'Understanding Mediation', 'Peace mediation and peace keeping.', 'Peace mediation and peace keeping.'],
  ['GST 312', 'I-F7VnSQcg0', 'watch', 'TLDR News: The UN Explained', 'Peace and Security Council at all levels.', 'Peace and Security Council (international, national and local levels).'],
  ['GST 312', 'Jr7iWJGOFlY', 'watch', 'Five Key Elements of Community Policing', 'Conventions, treaties and community policing.', 'Agents of conflict resolution – Conventions, Treaties Community Policing: Evolution and Imperatives.'],
  ['GST 312', 'tGFijuVyzyQ', 'watch', 'LawShelf: Intro to ADR', 'Alternative dispute resolution: dialogue.', 'Alternative Dispute Resolution (ADR) (dialogue,.'],
  ['GST 312', 'pCX0utgdN6I', 'watch', 'LawShelf: ADR Methods Negotiation', 'Arbitration, negotiation and collaboration.', 'arbitration, negotiation, collaboration, etc).'],
  ['GST 312', 'PuLmtTfpxxQ', 'watch', 'UNO and Organs: GA, UNSC, ECOSOC, ICJ', 'UN and its conflict resolution organs.', 'The roles of international organizations in conflict resolution ((a) The United Nations, UN and its conflict resolution organs.'],
  ['GST 312', 'eoAiiGzR38s', 'watch', 'Nigeria\u2019s Peacekeeping Mission in Liberia', 'AU, ECOWAS and peace keeping.', '(b) The African Union & Peace Security Council (c) ECOWAS in peace keeping).'],
  ['GST 312', 'ONIISc3nGgA', 'watch', 'Media and Peace Building', 'Media and traditional institutions in peace building.', 'The media and traditional institutions in peace building.'],
  ['GST 312', 'fhV3s5VznSY', 'watch', 'VOA Africa: Refugees, Asylees and IDPs', 'Refugees in post-conflict situations.', 'Managing post- conflict situations/crises: Refugees.'],
  ['GST 312', 'dfZ9RlDfgxs', 'watch', 'UNHCR: Who is an IDP?', 'IDPs and post-conflict roles.', 'Internally Displaced Persons (IDPs);the role of NGOs in post-conflict situations/crises.'],
  // ---------- ENT 211 (9 topics) ----------
  ['ENT 211', 'aozlwC3XwfY', 'watch', 'CrashCourse Business #1: Who Is an Entrepreneur?', 'Concept of entrepreneurship and intrapreneurship.', 'The concept of entrepreneurship (entrepreneurship, intrapreneurship/corporate entrepreneurship);'],
  ['ENT 211', 'RqEetboK1s4', 'watch', 'Essential Schumpeter: What is Entrepreneurship?', 'Theories, rationale and creative destruction.', 'theories, rationale and relevance of entrepreneurship (Schumpeterian and other perspectives, risk-taking, necessity and opportunity-based entrepreneurship, and creative destruction);'],
  ['ENT 211', '-sQeREfZY-8', 'watch', 'HBS Online: 10 Characteristics of Entrepreneurs', 'Characteristics of entrepreneurs.', 'characteristics of entrepreneurs (opportunity seeker, risk-taker, natural and nurtured, problem solver and change agent, innovator and creative thinker);'],
  ['ENT 211', 'Cum3k-Wglfw', 'watch', 'WiPhi: Intro to Critical Thinking', 'Entrepreneurial thinking: critical, reflective, creative.', 'entrepreneurial thinking (critical thinking, reflective thinking and creative thinking).'],
  ['ENT 211', 'q4K5KQ--F9I', 'watch', 'Innovation Matrix', 'Innovation: concept, dimensions, change, knowledge.', 'Innovation (The concept of innovation, dimensions of innovation, change and innovation, knowledge and innovation).'],
  ['ENT 211', '1-xiSOvgNvw', 'watch', 'CrashCourse Business #5: Legal Basics and Entity Formation', 'Enterprise formation, ownership and alliances.', 'Enterprise formation, partnership and networking (basics of business plan, forms of business ownership, business registration and alliance formation, and joint ventures).'],
  ['ENT 211', 'EUo4G1lw-w8', 'watch', 'IP Law Explained', 'Contemporary issues: IP and networking.', 'Contemporary entrepreneurship issues (knowledge, skills and technology, intellectual property, virtual office and networking).'],
  ['ENT 211', 'GdzCoOaD0AU', 'watch', 'Bloomberg: Dangote\u2019s Guide', 'Entrepreneurship in Nigeria.', 'Entrepreneurship in Nigeria (biography of inspirational entrepreneurs, youth and women entrepreneurship, entrepreneurship support institutions, youth enterprise networks and environmental and cultural barriers to entrepreneurship).'],
  ['ENT 211', 'UPJRjS4fVJc', 'watch', '4 Types of Ecommerce: B2C, B2B, C2C, C2B', 'Basic principles of e-commerce.', 'Basic principles of e-commerce.'],
  // ---------- ENT 312 (9 topics) ----------
  ['ENT 312', 'iywvlUk2Wfg', 'watch', 'CrashCourse Business #2: Developing a Business Idea', 'Opportunity identification.', 'Opportunity identification (sources of business opportunities in Nigeria, environmental scanning, demand and supply gap/unmet needs/market gaps/market research, unutilised resources, social and climate conditions and technology adoption gap).'],
  ['ENT 312', 'Dz8MU3q09TQ', 'watch', 'Coach Ayo: How to Write a Business Plan', 'New business development and market research.', 'New business development (business planning, market research).'],
  ['ENT 312', 'MYVL1XHeB74', 'watch', 'CrashCourse Business #16: Financing Options', 'Entrepreneurial finance.', 'Entrepreneurial finance (venture capital, equity finance, micro-finance, personal savings, small business investment organizations and business plan competition).'],
  ['ENT 312', 'n7-wsGLc1js', 'watch', 'CrashCourse Business #12: How to Sell Anything', 'Entrepreneurial marketing and e-commerce.', 'Entrepreneurial marketing and e-commerce (principles of marketing, customer acquisition & retention, B2B, C2C and B2C models of e-commerce, First Mover Advantage, E-commerce business models and successful e-commerce companies).'],
  ['ENT 312', '_HK5gpg39pY', 'watch', 'CrashCourse Business #15: Financial Statements', 'Small business management and book keeping.', 'Small business management/family business: Leadership & Management, basic book keeping, nature of family business and family business growth model.'],
  ['ENT 312', 'DpmvQm1PMPk', 'watch', 'TEDx: Negotiation Skills for Life', 'Negotiation and business communication.', 'Negotiation and business communication (strategy and tactics of negotiation/bargaining, traditional and modern business communication methods).'],
  ['ENT 312', 'HjcKVB10Ucc', 'watch', 'TEDxAccra: Selling Your Idea to an Investor', 'Opportunity discovery: pitches and contests.', 'Opportunity discovery demonstrations (business idea generation presentations, business idea contest, brainstorming sessions, idea pitching).'],
  ['ENT 312', '--vfxsq0_JE', 'watch', 'Introduction to Emerging Technologies', 'AI, VR, IoT, blockchain, cloud and renewables.', 'Technological solutions (The concept of market/customer solution, customer solution and emerging technologies, business applications of new technologies - artificial intelligence (AI), virtual/mixed reality (VR), Internet of things (IoTs), blockchain, cloud computing, renewable energy, etc.'],
  ['ENT 312', 'c0aU5txarGQ', 'watch', 'Eye on Tech: What is E-commerce?', 'Digital business and e-commerce strategies.', 'Digital business and e-commerce strategies).'],
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
