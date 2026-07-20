import { MongoClient } from 'mongodb';

const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz';

const VIDEOS = [
  { title: 'Introduction to Discrete Mathematics', url: 'https://youtu.be/4x2kfBpWxWY', order: 1, description: 'Overview of discrete math and its applications in computer science.' },
  { title: 'Sets, Subsets, and Power Sets', url: 'https://youtu.be/Rc8L6wIJmhM', order: 2, description: 'Set theory fundamentals including subsets, power sets, and set operations.' },
  { title: 'Set Operations & Venn Diagrams', url: 'https://youtu.be/R1zuuuF-NjI', order: 3, description: 'Union, intersection, complement, difference, and Venn diagram representations.' },
  { title: 'Propositional Logic & Truth Tables', url: 'https://youtu.be/0ilsU4le7c0', order: 4, description: 'Logical propositions, connectives, and constructing truth tables.' },
  { title: 'Logical Equivalences & Implications', url: 'https://youtu.be/XFmg2f7g3LY', order: 5, description: 'Proving logical equivalences, tautologies, contradictions, and conditional statements.' },
  { title: 'Predicates & Quantifiers', url: 'https://youtu.be/MFnA3v1jMUE', order: 6, description: 'Universal and existential quantifiers, predicate logic, and nested quantifiers.' },
  { title: 'Rules of Inference', url: 'https://youtu.be/7pNErZ3A1gA', order: 7, description: 'Valid arguments, modus ponens, modus tollens, and proof techniques.' },
  { title: 'Introduction to Counting & Permutations', url: 'https://youtu.be/ozZ3ur1bCjo', order: 8, description: 'Fundamental counting principle, permutations, and factorial notation.' },
  { title: 'Combinations & Binomial Theorem', url: 'https://youtu.be/8Pc2KOHPsPc', order: 9, description: 'Combinations, Pascal\'s triangle, binomial theorem, and combinatorial proofs.' },
  { title: 'Probability Basics for Discrete Math', url: 'https://youtu.be/b6MEeJE2Nqk', order: 10, description: 'Discrete probability, sample spaces, events, and probability axioms.' },
  { title: 'Relations & Their Properties', url: 'https://youtu.be/4lfOy-5rq6I', order: 11, description: 'Reflexive, symmetric, transitive relations, and equivalence relations.' },
  { title: 'Functions & Their Types', url: 'https://youtu.be/uNvrKj7SCN4', order: 12, description: 'Injective, surjective, bijective functions, composition, and inverse functions.' },
  { title: 'Graph Theory Introduction', url: 'https://youtu.be/bA_XqD0SiFA', order: 13, description: 'Graphs, vertices, edges, degree, complete graphs, and graph representations.' },
  { title: 'Trees & Their Properties', url: 'https://youtu.be/1Jx5mxIsDDI', order: 14, description: 'Rooted trees, binary trees, tree traversals, and spanning trees.' },
  { title: 'Recurrence Relations', url: 'https://youtu.be/7OL68tMjMAc', order: 15, description: 'Formulating and solving recurrence relations with characteristic equations.' },
  { title: 'Mathematical Induction', url: 'https://youtu.be/4Nstn0d-Sds', order: 16, description: 'Weak and strong induction, proof by induction with examples.' },
]

async function seed() {
  const c = new MongoClient(URI, { connectTimeoutMS: 10000, serverSelectionTimeoutMS: 10000 });
  await c.connect();
  const db = c.db();

  const existing = await db.collection('videos').countDocuments({ courseCode: 'CSC 203' });
  if (existing > 0) {
    console.log(`CSC 203 already has ${existing} videos. Deleting and re-seeding...`);
    await db.collection('videos').deleteMany({ courseCode: 'CSC 203' });
  }

  const docs = VIDEOS.map(v => ({ ...v, courseCode: 'CSC 203' }));
  await db.collection('videos').insertMany(docs);
  console.log(`${docs.length} CSC 203 videos inserted.`);

  await c.close();
}

seed().catch(e => { console.error('Seed failed:', e.message); process.exit(1) });
