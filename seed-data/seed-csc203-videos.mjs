import { MongoClient } from 'mongodb';

const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz';

const VIDEOS = [
  { title: '1. Introduction to Algorithms', url: 'https://youtu.be/0IAPZzGSbME', order: 1, description: 'Overview of algorithms and their importance in computer science.' },
  { title: '1.1 Priori Analysis and Posteriori Testing', url: 'https://youtu.be/-JTq1BFBwmo', order: 2, description: 'Difference between theoretical analysis and empirical testing.' },
  { title: '1.2 Characteristics of Algorithm', url: 'https://youtu.be/FbYzBWdhMb0', order: 3, description: 'Key properties of good algorithms.' },
  { title: '1.3 How Write and Analyze Algorithm', url: 'https://youtu.be/xGYsEqe9Vl0', order: 4, description: 'Step-by-step guide to writing and analyzing algorithms.' },
  { title: '1.4 Frequency Count Method', url: 'https://youtu.be/1U3Uwct45IY', order: 5, description: 'Counting operations to determine time complexity.' },
  { title: '1.5.1 Time Complexity #1', url: 'https://youtu.be/9TlHvipP5yA', order: 6, description: 'Introduction to time complexity analysis.' },
  { title: '1.5.2 Time Complexity Example #2', url: 'https://youtu.be/9SgLBjXqwd4', order: 7, description: 'Practical examples of time complexity calculation.' },
  { title: '1.5.3 Time Complexity of While and if #3', url: 'https://youtu.be/p1EnSvS3urU', order: 8, description: 'Analyzing loops and conditional statements.' },
  { title: '1.6 Classes of functions', url: 'https://youtu.be/w7t4_JUUTeg', order: 9, description: 'Different function classes in algorithm analysis.' },
  { title: '1.7 Compare Class of Functions', url: 'https://youtu.be/5v-tKX2uRAk', order: 10, description: 'Comparing growth rates of functions.' },
  { title: '1.8.1 Asymptotic Notations Big Oh - Omega - Theta #1', url: 'https://youtu.be/A03oI0znAoc', order: 11, description: 'Introduction to Big O, Omega, and Theta notations.' },
  { title: '1.8.2 Asymptotic Notations - Big Oh - Omega - Theta #2', url: 'https://youtu.be/Nd0XDY-jVHs', order: 12, description: 'Working with asymptotic notations in practice.' },
  { title: '1.9 Properties of Asymptotic Notations', url: 'https://youtu.be/NI4OKSvGAgM', order: 13, description: 'Important properties of asymptotic notations.' },
  { title: '1.10.1 Comparison of Functions #1', url: 'https://youtu.be/mwN18xfwNhk', order: 14, description: 'Comparing algorithm efficiencies using asymptotic analysis.' },
  { title: '1.10.2 Comparison of Functions #2', url: 'https://youtu.be/WlBBTSL0ZRc', order: 15, description: 'More examples of function comparison.' },
  { title: '1.11 Best Worst and Average Case Analysis', url: 'https://youtu.be/lj3E24nnPjI', order: 16, description: 'Understanding best, worst, and average case scenarios.' },
  { title: '1.12 Disjoint Sets Data Structure', url: 'https://youtu.be/wU6udHRIkcc', order: 17, description: 'Weighted union and collapsing find algorithms.' },
  { title: '2 Divide And Conquer', url: 'https://youtu.be/2Rr2tW9zvRg', order: 18, description: 'Introduction to the divide and conquer strategy.' },
  { title: '2.1.1 Recurrence Relation (T(n)= T(n-1) + 1) #1', url: 'https://youtu.be/4V30R3I1vLI', order: 19, description: 'Solving recurrence relations - decreasing functions.' },
  { title: '2.1.2 Recurrence Relation (T(n)= T(n-1) + n) #2', url: 'https://youtu.be/IawM82BQ4II', order: 20, description: 'Recurrence relation examples with linear terms.' },
  { title: '2.1.3 Recurrence Relation (T(n)= T(n-1) + log n) #3', url: 'https://youtu.be/MhT7XmxhaCE', order: 21, description: 'Recurrence relations with logarithmic terms.' },
  { title: '2.1.4 Recurrence Relation T(n)=2 T(n-1)+1 #4', url: 'https://youtu.be/JvcqtZk2mng', order: 22, description: 'Recurrence relations with branching recursion.' },
  { title: '2.2 Masters Theorem Decreasing Function', url: 'https://youtu.be/CyknhZbfMqc', order: 23, description: 'Master theorem for decreasing function recurrences.' },
  { title: '2.3.1 Recurrence Relation Dividing Function T(n)=T(n/2)+1 #1', url: 'https://youtu.be/8gt0D0IqU5w', order: 24, description: 'Recurrence relations for divide and conquer - part 1.' },
  { title: '2.3.2 Recurrence Relation Dividing [ T(n)=T(n/2)+ n] #2', url: 'https://youtu.be/XcZw01FuH18', order: 25, description: 'Divide and conquer recurrence with linear work.' },
  { title: '2.3.3 Recurrence Relation [ T(n)= 2T(n/2) + n] #3', url: 'https://youtu.be/1K9ebQJosvo', order: 26, description: 'Classic merge sort recurrence relation.' },
  { title: '2.4.1 Masters Theorem in Algorithms for Dividing Function #1', url: 'https://youtu.be/OynWkEj0S-s', order: 27, description: 'Master theorem for divide and conquer recurrences.' },
  { title: '2.4.2 Examples for Master Theorem #2', url: 'https://youtu.be/kGcO-nAm9Vc', order: 28, description: 'Practical examples applying the master theorem.' },
  { title: '2.5 Root function (Recurrence Relation)', url: 'https://youtu.be/9rVuyjxzwgM', order: 29, description: 'Solving recurrences involving root functions.' },
  { title: '2.6.1 Binary Search Iterative Method', url: 'https://youtu.be/C2apEw9pgtw', order: 30, description: 'Binary search algorithm - iterative approach.' },
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
