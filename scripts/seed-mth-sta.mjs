// MTH 101/102/201/202/203/209 + STA 111/121/201 video banks.
// Sourcing per docs/sourcing-quality-process.txt:
// - ONE winner per topic (order preserved); backups noted in research, NOT imported.
// - MTH: Neso Discrete (set theory/relations), Organic Chemistry Tutor (calc 1/2/3,
//   algebra, precalc, trig), Khan Academy (multivariable, DiffEQ, Euler).
// - STA: Organic Chemistry Tutor Statistics + Khan AP Statistics.
// - Comments proof: OCT calculus "got 84 for the first time" [4.0k]; OCT trig
//   "scored maths 98 and physics 95"; Khan "taught me what my teacher couldn't".
// - GAPS: MTH 202 systems of ODEs, MTH 203 rings/fields + homeomorphics,
//   MTH 209 interpolation, STA 121 time series x2 (no candidate-pool fit).
//   STA 121 junk topics T0/T5 skipped (vacuous titles, need curriculum cleanup).
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
  // ---------- MTH 101 (5 topics) ----------
  ['MTH 101', 'JED4pyrpzas', 'watch', 'Neso: Set Operations with Venn Diagrams', 'Elementary set theory, subsets, intersection, complements.', 'Elementary set theory, subsets, union, intersection, complements, Venn diagrams.'],
  ['MTH 101', 'hNk2xr4MUS8', 'watch', 'Rational and Irrational Numbers', 'Real numbers, integers, rational and irrational numbers.', 'Real numbers, integers, rational and irrational numbers.'],
  ['MTH 101', 'tHNVX3e9zd0', 'watch', 'Mathematical Induction Practice Problems', 'Induction, sequences, series, quadratics, binomial, complex numbers.', 'Mathematical induction, real sequences and series, theory of quadratic equations, binomial theorem, complex numbers, algebra of complex numbers, the argand diagram.'],
  ['MTH 101', 'J6TnZxUUzqU', 'watch', 'De Moivre Theorem and Complex Numbers in Polar Form', 'De Moivre theorem and nth roots of unity.', 'De-Moiré’s theorem, nth roots of unity.'],
  ['MTH 101', '57VrEPD1I', 'watch', 'The Unit Circle, Basic Introduction', 'Circular measure and trigonometric functions of any magnitude.', 'Circular measure, trigonometric functions of angles of any magnitude, addition and factor formulae.'],
  // ---------- MTH 102 (4 topics) ----------
  ['MTH 102', 'YNstP0ESndU', 'watch', 'Calculus 1: Introduction to Limits', 'Functions of a real variable, graphs, limits and continuity.', 'Functions of a real variable, graphs, limits and idea of continuity.'],
  ['MTH 102', '-aTLjoDT1GQ', 'watch', 'Definition of the Derivative', 'The derivative as limit of rate of change.', 'The derivative, as limit of rate of change.'],
  ['MTH 102', 'WCq3sRzsJfs', 'watch', 'Finding Local Maximum and Minimum Values', 'Techniques of differentiation, maxima and minima.', 'Techniques of differentiation, maxima and minima.'],
  ['MTH 102', 'GcQvUB0PkI', 'watch', 'Definite Integral', 'Curve sketching, definite integrals, areas, volumes, trapezium and Simpson.', 'Extreme curve sketching, integration, definite integrals, reduction formulae, application to areas, volumes (including approximate integration: Trapezium and Simpson\'s rule).'],
  // ---------- MTH 201 (9 topics) ----------
  ['MTH 201', 'DrEXTC6mIO8', 'watch', 'Functions: Vertical Line Test and Domain', 'Real-valued functions of a real variable.', 'Real-valued functions of a real variable.'],
  ['MTH 201', 'H71xfyzbkZI', 'watch', 'Applications of Integration Formula Review', 'Review of differentiation and integration and applications.', 'Review of differentiation and integration and their applications.'],
  ['MTH 201', 'SL2RobwU_M4', 'watch', 'Mean Value Theorem', 'Mean value theorem.', 'Mean value theorem.'],
  ['MTH 201', 'LDBNSc4YbA', 'watch', 'Taylor Series and Maclaurin Series', 'Taylor series.', 'Taylor series.'],
  ['MTH 201', 'TrcCbdWwCBc', 'watch', 'Khan: Multivariable Functions', 'Real-valued functions of two and three variables.', 'Real-valued functions of two and three variables.'],
  ['MTH 201', '5-CUqogfPLY', 'watch', 'Lagrange Multipliers', 'Partial derivatives, chain rule, extrema, lagrangian multipliers.', 'Partial derivatives chain rule, extrema, lagrangian multipliers.'],
  ['MTH 201', 'C5RI5eLzVfo', 'watch', 'Differentials and Local Linearization', 'Increments, differentials and linear approximations.', 'Increments, differentials and linear approximations.'],
  ['MTH 201', '_60sKaoRmhU', 'watch', 'Khan: Introduction to the Line Integral', 'Evaluation of line integrals.', 'Evaluation of line integrals.'],
  ['MTH 201', 'BJ_0FURo9RE', 'watch', 'Double Integrals', 'Multiple integrals.', 'Multiple integrals.'],
  // ---------- MTH 202 (5 of 6; systems of ODEs = GAP) ----------
  ['MTH 202', 'H9h-Xg7zjPU', 'watch', 'Khan: Writing a Differential Equation', 'Deriving differential equations from geometry and physics.', 'Derivation of differential equations from primitive geometry, physics etc.'],
  ['MTH 202', '6o7b9yyhH7k', 'watch', 'Khan: Differential Equation Order and Degree', 'Order and degree of differential equations.', 'Order and degree of differential equation.'],
  ['MTH 202', 'gd1FYn86P0c', 'watch', 'First Order Linear Differential Equations', 'Techniques for first and second order linear and non-linear equations.', 'Techniques for solving first and second order linear and non-linear equations.'],
  ['MTH 202', 'uI2xt8nTOlQ', 'watch', 'Second Order Linear Differential Equations', 'Finite linear differential equations.', 'Finite linear differential equations.'],
  ['MTH 202', 'ejEXSjdMpck', 'watch', 'Newton\u2019s Law of Cooling', 'Application of differential equations to geometry and physics.', 'Application to geometry and physics.'],
  // ---------- MTH 203 (4 of 6; rings/fields + homeomorphics = GAP) ----------
  ['MTH 203', 'p2b2Vb-cYs', 'watch', 'Neso: Introduction to Discrete Mathematics', 'Language and concepts of modern mathematics.', 'Introduction to the language and concepts of modern mathematics.'],
  ['MTH 203', '4Caxyh0zt_o', 'watch', 'Neso: Introduction to Relations', 'Set theory, mappings, relations, logic, proof, binary operations.', 'Topics include: basic set theory: mappings, relations, equivalence and other relations, Cartesian products, binary logic, methods of proof, binary operations.'],
  ['MTH 203', 'cLP7INqs3JM', 'watch', 'Khan: Rational and Irrational Numbers', 'Number systems.', 'Number systems;'],
  ['MTH 203', 'a0deCn5QNFI', 'watch', 'Addition Properties: Commutative, Associative, Identity, Inverse', 'Properties of integers, rationals, reals and complex numbers.', 'properties of integers, rationals, real and complex numbers.'],
  // ---------- MTH 209 (7 of 8; interpolation = GAP) ----------
  ['MTH 209', '-5e2cULI3H8', 'watch', 'Newton\u2019s Method for Equations', 'Solution of algebraic and transcendental equations.', 'Solution of algebraic and transcendental equations.'],
  ['MTH 209', 'P8hT5nDai6A', 'watch', 'Linear Regression: Line of Best Fit', 'Curve fitting.', 'Curve fitting.'],
  ['MTH 209', 'JbEo46uV6d4', 'watch', 'Percent Error', 'Error analysis.', 'Error analysis.'],
  ['MTH 209', 'Iaq7z7reznM', 'watch', 'Finding All Zeros with the Rational Zero Theorem', 'Zeros of non-linear equations in one variable.', 'Zeros of non-linear equations ‘in one variable’.'],
  ['MTH 209', 'oKqtgz2eo-Y', 'watch', 'Solving Systems of Equations by Elimination and Substitution', 'Systems of linear equations.', 'Systems of linear equations.'],
  ['MTH 209', 'Rn9Gr52zhrY', 'watch', 'Trapezoidal Rule', 'Numerical differentiation and integration.', 'Numerical differentiation and integration.'],
  ['MTH 209', 'q87L9R9v274', 'watch', 'Khan: Euler\u2019s Method', 'Initial value problems in ordinary differential equations.', 'Initial value problems in ordinary differential equation.'],
  // ---------- STA 111 (5 topics) ----------
  ['STA 111', 'cz4nPSA9rlc', 'watch', 'Continuous vs Discrete Data', 'Statistical data types, sources and collection.', 'Statistical data: types, sources and methods of collection.'],
  ['STA 111', 'AndS0RLdxtk', 'watch', 'Histogram From a Frequency Distribution Table', 'Presentation of data: tables, charts, graphs, errors.', 'Presentation of data: tables, charts and graphs; errors and approximations.'],
  ['STA 111', '6hJGa4Zp62M', 'watch', 'Cumulative Relative Frequency Table', 'Frequency and cumulative distributions.', 'Frequency and cumulative distributions.'],
  ['STA 111', 'A1mQ9kD-i9I', 'watch', 'Mean, Median, Mode and Range', 'Measures of location, partition and dispersion.', 'Measures of location, partition and dispersion.'],
  ['STA 111', 'U0NZu6f5TMI', 'watch', 'Skewness: Right, Left and Symmetric Distributions', 'Skewness, kurtosis, rates, ratios and index numbers.', 'Skewness and kurtosis; rates, ratios and index numbers.'],
  // ---------- STA 121 (10 of 12; junk T0/T5 skipped, time series x2 = GAP) ----------
  ['STA 121', 'cmtBUWCC-6A', 'watch', 'Sample Mean and Population Mean', 'Population vs sample, point vs interval estimates.', 'differentiate population from sample as well as point from interval estimate;'],
  ['STA 121', 'zJ8e_wAWUzE', 'watch', 'Hypothesis Testing: Z Test and T Statistics', 'Tests for mean and proportions, large and small samples.', 'test for hypothesis concerning population mean and proportions for large and small samples;'],
  ['STA 121', 'yMgFHbjbAW8', 'watch', 'Khan: Least Squares Regression', 'Regression and the fitted line.', 'compute regression and obtain the fitted line.'],
  ['STA 121', 'u4ugaNo6v1Q', 'watch', 'Khan: Calculating Correlation Coefficient r', 'Correlation coefficient computation.', 'Likewise, the computation for correlation coefficient well understood;'],
  ['STA 121', '4YLtvNeRIrg', 'watch', 'Central Limit Theorem and Sampling Distributions', 'Population and samples.', 'Population and samples.'],
  ['STA 121', 'Mb9BuEkbaHQ', 'watch', 'Statistic vs Parameter, Population vs Sample', 'Random sampling distributions.', 'Random sampling distributions.'],
  ['STA 121', 'DT-fPG0Hff8', 'watch', 'Z Score, Confidence Interval, Margin of Error', 'Estimation and hypothesis tests for mean and proportion.', 'Estimation (point and interval) and tests of hypotheses concerning population mean and proportion (one and two large sample cases).'],
  ['STA 121', '11c9cs6WpJU', 'watch', 'Correlation Coefficient', 'Regression and correlation.', 'Regression and correlation.'],
  // ---------- STA 201 (11 topics) ----------
  ['STA 201', 'VHYOuWu9jQI', 'watch', 'Descriptive vs Inferential Statistics', 'Scope of statistics in biology and agriculture.', 'Scope for statistical method in biology and agriculture;'],
  ['STA 201', 'zjHfAhcU6kE', 'watch', 'Mean, Median, Mode of Grouped Data', 'Measures of location, partition and dispersion.', 'measures of location, partition and dispersion.'],
  ['STA 201', 'SkidyDQuupA', 'watch', 'Introduction to Probability', 'Elements of probability.', 'elements of probability.'],
  ['STA 201', 'KMLR_lOnVmI', 'watch', 'Probability Distribution Formulas', 'Probability distributions.', 'probability distributions;'],
  ['STA 201', '3PWKQiLK41M', 'watch', 'Binomial Distribution, Mean and Standard Deviation', 'Binomial, Poisson, geometric and other distributions.', 'binomial, Poisson, geometric, hypergeometric, negative binomial and normal, Student’s t and chi-square distributions.'],
  ['STA 201', 'UcZwyzwWU7o', 'watch', 'Hypothesis Testing: Difference of Two Means', 'Estimation and tests for means, proportions, variances.', 'Estimation (point and interval) and tests of hypotheses concerning population means, proportions and variances.'],
  ['STA 201', 'VamMrPZ-8fc', 'watch', 'Khan: Residual Plots', 'Regression and correlation.', 'regression and correlation.'],
  ['STA 201', 'HKDqlYSLt68', 'watch', 'Chi Square Test', 'Non-parametric tests.', 'Non–parametric tests.'],
  ['STA 201', 'sqDVrXq_eh0', 'watch', 'Contingency Tables and Conditional Probability', 'Contingency table analysis.', 'contingency table analysis.'],
  ['STA 201', 'tHFyaoIrV14', 'watch', 'Khan: Types of Statistical Studies', 'Introduction to design of experiments.', 'Introduction to design of experiments.'],
  ['STA 201', 'EFdlFoHI_0I', 'watch', 'Khan: ANOVA 1, Calculating SST', 'Analysis of variance.', 'analysis of variance.'],
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
