// DTS 201/204/211/302/304/316 video banks (DTS 308 + DTS 322 = full GAPs).
// Sourcing per docs/sourcing-quality-process.txt:
// - ONE winner per topic (order preserved); backups noted in research, NOT imported.
// - freeCodeCamp full courses, StatQuest, Khan (non-AP), Neso DBMS ch1-4,
//   3Blue1Brown, CrashCourse Statistics. Zero collisions with banked IDs.
// - Comments proof: StatQuest "made all the pieces finally fit" [162];
//   Khan "learned a lot more here than in college" [263];
//   3Blue1Brown "literally an institution" [14k].
// - GAPS: DTS 308 data ethics/FAIR (full), DTS 322 entrepreneurship (full),
//   proprietary tools (SPSS/SAS/Cloudera/Splunk), niche stats (Monte Carlo,
//   Markov chains/MGFs, tail sums), index/demographic numbers. Documented.
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
  ['DTS 201', 'ua-CiDNNj30', 'watch', 'Learn Data Science Tutorial - Full Course for Beginners', '', 'Fundamentals of Data Science.'],
  ['DTS 201', 'jcTj6FgWOpo', 'watch', 'Data Analytics Crash Course: Teach Yourself in 30 Days', '', 'Methodology of extracting knowledge from big datasets as well as various tools and platforms for Data Science.'],
  ['DTS 201', 'N6BghzuFLIg', 'watch', 'Intro to Data Science - Crash Course for Beginners', '', 'What is Data and why is it important? Basic classification of Data (Structured, semi-structured and unstructured data), Scope of Data Science, Steps of Data Science Process: Data collection, Pre-processing, training, and testing.'],
  ['DTS 201', 'TPMlZxRRaBQ', 'watch', 'Tableau for Data Science and Data Visualization - Crash Course Tutorial', '', 'Rudiments of data visualisations;'],
  ['DTS 201', 'xxpc-HPKN28', 'watch', 'Statistics - A Full University Course on Data Science Basics', '', 'Distributions, Probability, and Simulations;'],
  ['DTS 201', 'Gv9_4yMHFhI', 'watch', 'A Gentle Introduction to Machine Learning', '', 'Predictions and Models.'],
  ['DTS 201', 'CNuI8OWsppg', 'watch', 'Applied Deep Learning with PyTorch - Full Course', '', 'Use cases in various domains such Image, Natural Language, Audio and Video.'],
  ['DTS 201', 'LHBE6Q9XlzI', 'watch', 'Python for Data Science - Course for Beginners (Learn Python, Pandas, NumPy, Matplotlib)', '', 'Basic introduction to knowledge extraction: Data mining, Business Intelligence & Knowledge management, Introduction to Big Data integration and intelligence, Introduction to Data Analytics, Introduction to programming.'],
  ['DTS 201', 'XU5pw3QRYjQ', 'watch', 'Data Science Hands-On Crash Course', '', 'Lab work: Practical experiments on data science process steps in simulated models.'],
  ['DTS 201', 'JwSS70SZdyM', 'watch', 'Build 12 Data Science Apps with Python and Streamlit - Full Course', '', 'Practical application of the methods and tools used in data science for prediction models with some simulated exerises.'],
  ['DTS 201', 'GPVsHOlRBBI', 'watch', 'Data Analysis with Python Course - Numpy, Pandas, Data Visualization', '', 'Practical experiments on how to extract knowledge;'],
  ['DTS 201', 'r-uOLxNrNk8', 'watch', 'Data Analysis with Python - Full Course for Beginners (Numpy, Pandas, Matplotlib, Seaborn)', '', 'how to mine valuable data from large set of data sets using data mining process and methods.'],
  ['DTS 201', 'WcDaZ67TVRo', 'watch', 'Data Analysis with Python for Excel Users - Full Course', '', 'Learn how to integrate business intelligence in big data along with some data analytics pratical exercises.'],
  ['DTS 201', '_V8eKsto3Ug', 'watch', 'R Programming Tutorial - Learn the Basics of Statistical Computing', '', 'Simple exercises on R programming to enhance the coding knowledge acquired during theory class.'],
  ['DTS 204', 'vikkiwjQqfU', 'watch', 'Population and Estimated Parameters, Clearly Explained!!!', '', 'Population and samples.'],
  ['DTS 204', '0ZstEh_8bYc', 'watch', 'Sampling distribution example problem', '', 'Asymptotics.'],
  ['DTS 204', 'yQhTtdq_y9M', 'watch', 'What is a (mathematical) model?', '', 'Statistical models and methodologies.'],
  ['DTS 204', 'FXZ2O1Lv-KE', 'watch', 'Sampling distribution of the sample mean', '', 'Random sampling distributions.'],
  ['DTS 204', 'fxx_E0ojKrc', 'watch', 'Time Series Forecasting in Python - Tutorial for Beginners', '', 'Elementary time series analysis.'],
  ['DTS 204', '0oc49DyA3hU', 'watch', 'Hypothesis Testing and The Null Hypothesis, Clearly Explained!!!', '', 'Estimation (point and interval) and tests of hypotheses concerning population mean and proportion (one and two sample cases).'],
  ['DTS 204', '7ArmBVF2dCs', 'watch', 'Linear Regression, Clearly Explained!!!', '', 'Regression and correlation.'],
  ['DTS 204', 'eWRfhZUzrAc', 'watch', 'Python for Beginners - Full Course [Programming Tutorial]', '', 'Programming in Python computer language.'],
  ['DTS 204', 'SzZ6GpcfoQY', 'watch', 'Calculating the Mean, Variance and Standard Deviation, Clearly Explained!!!', '', 'Computation of mean, variance and correlation.'],
  ['DTS 204', 'pkYVOmU3MgA', 'watch', 'Data Structures and Algorithms in Python - Full Course for Beginners', '', 'Sorting and ranking of data.'],
  ['DTS 204', 'JOKJ6g3gUFE', 'watch', 'Data Analysis with Python: Part 2 of 6 - Python Functions and Working with Files (Live Course)', '', 'Preparing Data for Analysis.'],
  ['DTS 204', 'IFKQLDmRK0Y', 'watch', 'Quantiles and Percentiles, Clearly Explained!!!', '', 'Evaluating Quantitative Data.'],
  ['DTS 204', 'VX_M3tIyiYk', 'watch', 'Power Analysis, Clearly Explained!!!', '', 'Sample Size Estimation.'],
  ['DTS 204', 'hokALdIst8k', 'watch', 'Multiple Regression in R, Step-by-Step!!!', '', 'Basic statistical computing in regression analysis and the analysis of designed experiments.'],
  ['DTS 204', 'PaFPbb66DxQ', 'watch', 'The Main Ideas of Fitting a Line to Data (The Main Ideas of Least Squares and Linear Regression.)', '', 'Lab work: Practical experiments on statistical models and methodologies.'],
  ['DTS 204', 'J1twbrHel3o', 'watch', 'Standard error of the mean', '', 'Practical exercises on random sampling distribution methods.'],
  ['DTS 204', 'nnBJeb_I-q8', 'watch', 'StatQuickie: Which t test to use', '', 'Practicals on test of hypothesis, population, mean, proportion, regression and correlation analysis.'],
  ['DTS 204', 'b2mLDkMSyn4', 'watch', 'Data Analysis with Python: Part 4 of 6 - Analyzing tabular data with Pandas', '', 'Exercise on how to sort and data from different data set.'],
  ['DTS 211', 'g_3IKHG-rfA', 'watch', 'Harvard CS50\'s Intro to R Programming - Full University Course', '', 'History and Overview of R, Installation, Introduction to R and RStudio, R interface, Cleaning and transforming data, Getting data in and out of R, Evaluation, R Objects, Numbers, Attributes, Vectors, Matrices/Arrays, Lists, Factors, Missing Values, Data Types, Structures and Frames, Names, , Displaying and plotting data, Reading lines of a Text File, Reading from a URL connection, Vectorised Operations, Dates and Times, Control Structures, Functions, Scoping Rules, Coding Standard for R, Looping, Debugging, Profiling R Code.'],
  ['DTS 211', '9uFQECk30kA', 'watch', 'R Shiny for Data Science Tutorial - Build Interactive Data-Driven Web Apps', '', 'Creating data products using R package.'],
  ['DTS 211', 'u1cc1r_Y7M0', 'watch', 'Linear Regression in R, Step-by-Step', '', 'Lab work: Installation of R programming language and learning the practical basics.'],
  ['DTS 211', 'qcvAqAH60Yw', 'watch', 'ROC and AUC in R', '', 'Practical programming exercises on R programming language in getting data in and out, evaluation, computation, finding missing values and reading lines of text files.'],
  ['DTS 211', 'ctmNq7FgbvI', 'watch', 'Ridge, Lasso and Elastic-Net Regression in R', '', 'Practical exercises on R coding and debugging.'],
  ['DTS 302', 'E-1xI85Zog8', 'watch', 'MongoDB with Python Crash Course - Tutorial for Beginners', '', 'Big data retrieval and relational querying: Postgres databases, NoSQL data, MongoDB, Aerospike, and Pandas for data aggregation and working with data frames.'],
  ['DTS 302', '_C8kWso4ne4', 'watch', 'PySpark Tutorial', '', 'Big Data Processing: Apache Spark, Hadoop, Spark Core (Spark MLlib and GraphX).'],
  ['DTS 304', 'OMwgGL3lHlI', 'watch', 'Introduction to Database Management Systems (DBMS)', '', 'Information Management Concepts.'],
  ['DTS 304', 'U5Gg9R-Dc0Q', 'watch', 'File System vs. Database Management System', '', 'Information storage & retrieval.'],
  ['DTS 304', 'vqxvDtSgW2k', 'watch', 'Applications of DBMS', '', 'Information management applications.'],
  ['DTS 304', 'OwQoj3GJfNY', 'watch', 'Introduction to Data Models', '', 'Information capture and representation.'],
  ['DTS 304', '9lTuR0RfKz8', 'watch', 'DML Commands - DELETE and SELECT', '', 'Analysis and indexing - search, retrieval, information privacy.'],
  ['DTS 304', 'MR0PK0qkCD8', 'watch', 'Primary Key and Foreign Key Constraints in SQL', '', 'Integrity and security.'],
  ['DTS 304', '9ev9V_DHUZY', 'watch', 'Three Tier Architecture', '', 'Scalability, Efficiency and Effectiveness.'],
  ['DTS 304', 'eGlyfNRdjz4', 'watch', 'DBMS - Definition', '', 'Introduction to database systems.'],
  ['DTS 304', '8_W5JT7Jz2Y', 'watch', 'Database System Architecture - Part 1', '', 'Components of database systems.'],
  ['DTS 304', 'fO5tDyOY5Fw', 'watch', 'Database Administrator (DBA)', '', 'DBMS functions.'],
  ['DTS 304', 'cOzq67n2yN4', 'watch', 'Instances and Schemas in DBMS', '', 'Database architecture and data independence.'],
  ['DTS 304', 'KpbyPhJqIf0', 'watch', 'Relational Query Languages', '', 'Database query language.'],
  ['DTS 304', 'vz5az6N86DY', 'watch', 'Introduction to E-R Model (Part 1)', '', 'Conceptual models.'],
  ['DTS 304', 'WI9dE8-TFAc', 'watch', 'Introduction to Relational Databases', '', 'Relational data models.'],
  ['DTS 304', '76v3gRns28U', 'watch', 'Basics of Relational Algebra', '', 'Relational theory and languages.'],
  ['DTS 304', 'LpqnU533v3M', 'watch', 'Database Design', '', 'Database Design.'],
  ['DTS 304', 'QBN8H9CfYzs', 'watch', 'Data Control Language (DCL)', '', 'Database security and integrity.'],
  ['DTS 304', 'acn8_F98ruk', 'watch', 'Transaction Control Language (TCL)', '', 'Introduction to concurrency and recovery.'],
  ['DTS 304', 'LHU6NRf98oI', 'watch', 'Introduction to DBMS - Solved Questions', '', 'Lab work: Practical exercise on information representation, capture, storage and retrieval.'],
  ['DTS 304', 'RGIVS8RGBaI', 'watch', 'Aggregate Functions in SQL', '', 'Learn how to analyse data and index for easy searching and indexing.'],
  ['DTS 304', 'Jtai4ogSsB4', 'watch', 'DDL Commands - CREATE', '', 'Practical on creating database files and models.'],
  ['DTS 304', '7V95C43ujlU', 'watch', 'ER Diagram for University Database', '', 'How to create and use various database designs.'],
  ['DTS 304', 'j0uODdyercM', 'watch', 'SQL - Solved Problem 1', '', 'How to query the created database.'],
  ['DTS 304', 'KqBiGOdce74', 'watch', 'Constraints in SQL (Example Queries)', '', 'Learn how to secure the database.'],
  ['DTS 316', 'uzkc-qNVoOk', 'watch', 'Probability explained', '', 'Experiments, sample spaces, outcomes and events.'],
  ['DTS 316', 'obZzOq_wSCg', 'watch', 'Probability with playing cards and Venn diagrams', '', 'Generation of Statistical events from set theory (Venn diagrams).'],
  ['DTS 316', '6E_NVnboMB8', 'watch', 'Probability (part 2)', '', 'Concepts and principles of Probability (probability axioms).'],
  ['DTS 316', 'IYdiKeQ9xEI', 'watch', 'Introduction to Random Variables', '', 'Random variables.'],
  ['DTS 316', '9wCnvr7Xw4E', 'watch', 'Bayes\' Theorem, Clearly Explained!!!!', '', 'The Law of Total Probability, Bayes’ Theorem, Independence.'],
  ['DTS 316', 'XqQTXW7XfYA', 'watch', 'Permutations', '', 'Permutation and Combination.'],
  ['DTS 316', 'cqK3uRoPtk0', 'watch', 'Constructing a probability distribution for random variable', '', 'Introduction to Probability and distribution functions.'],
  ['DTS 316', 'Fvi9A_tEmXQ', 'watch', 'Probability density functions', '', 'The probability density function.'],
  ['DTS 316', 'WWv0RUxDfbs', 'watch', 'Binomial distribution', '', 'Basic distributions: Bernoulli Trials, Binomial, Hyper geometric, Poisson, and Normal.'],
  ['DTS 316', 'qBigTkBLU6g', 'watch', 'StatQuest: Histograms, Clearly Explained', '', 'Exploratory data analysis.'],
  ['DTS 316', 'ccrYD6iX_SY', 'watch', 'Example: Combinatorics and probability', '', 'Combinatorial analysis.'],
  ['DTS 316', 'KLs_7b7SKi4', 'watch', 'Expected Values, Main Ideas!!!', '', 'Probability models for the study of random phenomena in finite sample generating functions and its properties.'],
  ['DTS 316', 'VpuN8vCQ--M', 'watch', 'Law of large numbers', '', 'Chebyshev’s inequality and limit theorems in probability.'],
  ['DTS 316', 'YAlJCEDH2uY', 'watch', 'The Central Limit Theorem, Clearly Explained!!!', '', 'Central limit theorem.'],
  ['DTS 316', '_IgyaD7vOOA', 'watch', 'Conditional Probabilities, Clearly Explained!!!', '', 'Bivariate, marginal and conditional distributions.'],
  ['DTS 316', 'qtaqvPAeEJY', 'watch', 'Covariance, Clearly Explained!!!', '', 'Variance and covariance.'],
  ['DTS 316', 'Ctytn4a6zjw', 'watch', 'Probability of making 2 shots in 6 attempts', '', 'Probability mass function.'],
  ['DTS 316', '5VMTeBoEcQg', 'watch', 'Geometric Distributions and The Birthday Paradox: Crash Course Statistics #16', '', 'Geometric distribution.'],
  ['DTS 316', 'XLCWeSVzHUU', 'watch', 'Sampling from a Distribution, Clearly Explained!!!', '', 'Sampling with and without replacement.'],
  ['DTS 316', 'udyAvvaMjfM', 'watch', 'Fisher\'s Exact Test and the Hypergeometric Distribution', '', 'Hypergeometric distribution.'],
  ['DTS 316', 'wtLQUjfomig', 'watch', 'The Exponential Distribution', '', 'The exponential distribution, moments, memoryless property, hazard function.'],
  ['DTS 316', 'rLdoKZ7w0xI', 'watch', 'Variance of differences of random variables', '', 'Mean and variance of linear combination of two random variables.'],
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
