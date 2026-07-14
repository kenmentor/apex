import { MongoClient } from 'mongodb'

const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz'

const THEORY_REFERENCES = [
  {
    courseCode: 'GSS 212',
    section: 'Philosophy',
    id: 'TH-001',
    question: 'Explain the difference between inductive and deductive reasoning. Provide examples of each.',
    keywords: ['inductive', 'deductive', 'specific', 'general', 'conclusion', 'premise', 'observation', 'probability', 'certain'],
    mainConcepts: [
      'Inductive reasoning moves from specific observations to broader generalizations',
      'Deductive reasoning moves from general premises to specific conclusions',
      'Inductive conclusions are probable but not guaranteed',
      'Deductive conclusions are certain if premises are true',
      'Example of inductive: observing repeated patterns to form a theory',
      'Example of deductive: syllogism like All men are mortal, Socrates is a man, therefore Socrates is mortal'
    ],
    referenceAnswer: 'Inductive reasoning is a method of reasoning where specific observations are used to form broader generalizations and theories. It moves from particular cases to general conclusions. The conclusions reached through induction are probable but not absolutely certain. For example, observing that the sun has risen every morning leads to the inductive conclusion that it will rise tomorrow.\n\nDeductive reasoning, on the other hand, moves from general premises or established principles to specific, logically certain conclusions. If the premises are true and the logic is valid, the conclusion must be true. A classic example is the syllogism: All men are mortal; Socrates is a man; therefore, Socrates is mortal.',
    difficulty: 'medium',
    maxPoints: 10,
  },
  {
    courseCode: 'GSS 212',
    section: 'Philosophy',
    id: 'TH-002',
    question: 'What is the Socratic method? How is it used in philosophical inquiry?',
    keywords: ['socratic', 'method', 'questioning', 'dialogue', 'critical', 'thinking', 'knowledge', 'ignorance', 'elenchus', 'cross-examination'],
    mainConcepts: [
      'The Socratic method is a form of cooperative argumentative dialogue',
      'It uses questioning to stimulate critical thinking and illuminate ideas',
      'Socrates claimed to know nothing (Socratic ignorance)',
      'The method exposes contradictions in beliefs to arrive at clearer understanding',
      'It involves cross-examination (elenchus) of claims and definitions',
      'The goal is not to win but to pursue truth and wisdom together'
    ],
    referenceAnswer: 'The Socratic method, named after the philosopher Socrates, is a form of cooperative argumentative dialogue based on asking and answering questions to stimulate critical thinking and to draw out ideas and underlying presumptions. Socrates used this technique in Plato\'s dialogues, where he would engage others in conversation, asking probing questions about their beliefs.\n\nThe method works by: (1) asking the interlocutor to define a concept, (2) presenting cases that test the definition, (3) showing contradictions or inadequacies, and (4) refining the understanding. Socrates famously claimed that his only wisdom was knowing that he knew nothing, and through this questioning method, he helped others recognize their own ignorance as a starting point for genuine learning.',
    difficulty: 'medium',
    maxPoints: 10,
  },
  {
    courseCode: 'GSS 212',
    section: 'Logic',
    id: 'TH-003',
    question: 'Define formal logic. Explain the structure of a valid syllogism with an example.',
    keywords: ['formal logic', 'syllogism', 'premise', 'conclusion', 'valid', 'major', 'minor', 'middle', 'argument', 'deductive'],
    mainConcepts: [
      'Formal logic is the study of reasoning forms and argument structure',
      'A syllogism is a form of deductive reasoning with two premises and a conclusion',
      'A valid syllogism has a major premise, minor premise, and conclusion',
      'The middle term appears in both premises but not in the conclusion',
      'Validity means the conclusion follows necessarily from the premises',
      'Soundness requires both valid form and true premises'
    ],
    referenceAnswer: 'Formal logic is the branch of logic that studies the forms of reasoning and argument structure, focusing on the validity of arguments rather than their content. It uses symbolic notation to analyze and evaluate the correctness of deductive arguments.\n\nA syllogism is a form of deductive reasoning consisting of two premises and a conclusion. The structure includes:\n1. Major premise: A general statement (e.g., "All mammals are warm-blooded")\n2. Minor premise: A specific statement (e.g., "All dogs are mammals")\n3. Conclusion: What follows logically (e.g., "Therefore, all dogs are warm-blooded")\n\nThe middle term ("mammals") connects the major and minor terms. An argument is valid if the conclusion necessarily follows from the premises, regardless of whether the premises are actually true.',
    difficulty: 'easy',
    maxPoints: 10,
  },
  {
    courseCode: 'GSS 212',
    section: 'Philosophy',
    id: 'TH-004',
    question: 'What are the main branches of philosophy? Discuss at least three with their key concerns.',
    keywords: ['metaphysics', 'epistemology', 'ethics', 'logic', 'aesthetics', 'political', 'knowledge', 'reality', 'morality', 'beauty', 'truth'],
    mainConcepts: [
      'Metaphysics deals with the nature of reality and existence',
      'Epistemology is the study of knowledge and justified belief',
      'Ethics examines moral values, right and wrong conduct',
      'Logic studies valid reasoning and argument structure',
      'Aesthetics concerns beauty, art, and taste',
      'Political philosophy deals with justice, rights, and government'
    ],
    referenceAnswer: 'The main branches of philosophy include:\n\n1. Metaphysics: Concerns the fundamental nature of reality, existence, time, space, and being. Questions include: What exists? What is the nature of reality? Is there a God?\n\n2. Epistemology: Studies knowledge, belief, and justification. Key questions: What can we know? How do we know it? What is the difference between belief and knowledge? What are the limits of human understanding?\n\n3. Ethics: Examines moral principles and values. It addresses questions about right and wrong, good and evil, justice and injustice. Major areas include meta-ethics, normative ethics, and applied ethics.\n\n4. Logic: The study of valid reasoning and argumentation. It provides tools for evaluating whether conclusions follow from premises.\n\n5. Aesthetics: Concerns beauty, art, and taste. It asks what beauty is and how we judge artistic value.\n\n6. Political Philosophy: Explores concepts of justice, liberty, democracy, and the proper role of government.',
    difficulty: 'medium',
    maxPoints: 10,
  },
  {
    courseCode: 'GSS 212',
    section: 'Logic',
    id: 'TH-005',
    question: 'What is a logical fallacy? Describe three common fallacies with examples.',
    keywords: ['fallacy', 'logical', 'error', 'argument', 'ad hominem', 'straw man', 'appeal', 'false dilemma', 'circular', 'hasty generalization'],
    mainConcepts: [
      'A logical fallacy is an error in reasoning that weakens an argument',
      'Formal fallacies involve errors in the logical structure of an argument',
      'Informal fallacies involve errors in content, context, or language',
      'Ad hominem attacks the person instead of their argument',
      'Straw man misrepresents someone\'s position to attack it',
      'False dilemma presents only two options when more exist'
    ],
    referenceAnswer: 'A logical fallacy is an error in reasoning that undermines the logic of an argument. Fallacies can be formal (structural errors) or informal (errors in content or context).\n\nThree common fallacies:\n\n1. Ad Hominem: Attacking the person making the argument rather than the argument itself. Example: "You can\'t trust John\'s opinion on economics because he dropped out of school." John\'s education level doesn\'t necessarily invalidate his economic knowledge.\n\n2. Straw Man: Misrepresenting someone\'s argument to make it easier to attack. Example: Person A says "We should have some regulations on pollution." Person B responds "So you want to shut down all industry and destroy the economy?" This distorts the original moderate position.\n\n3. False Dilemma (Either/Or Fallacy): Presenting only two options when more exist. Example: "You\'re either with us or against us." This ignores the possibility of neutrality or partial agreement.',
    difficulty: 'easy',
    maxPoints: 10,
  },
  {
    courseCode: 'GSS 212',
    section: 'Philosophy',
    id: 'TH-006',
    question: 'Explain Plato\'s Theory of Forms. What is the significance of the Allegory of the Cave?',
    keywords: ['plato', 'forms', 'cave', 'ideal', 'reality', 'shadow', 'knowledge', 'sensory', 'intellectual', 'world', 'enlightenment'],
    mainConcepts: [
      'Plato\'s Theory of Forms posits that abstract, perfect Forms exist beyond the physical world',
      'The physical world is a shadow or imperfect copy of the eternal Forms',
      'The Allegory of the Cave illustrates the journey from ignorance to knowledge',
      'Prisoners in the cave see only shadows and mistake them for reality',
      'The philosopher who escapes the cave gains true knowledge of the Forms',
      'The allegory represents education and enlightenment as liberation from illusion'
    ],
    referenceAnswer: 'Plato\'s Theory of Forms (or Ideas) proposes that the physical world we perceive through our senses is not the real world. Instead, the true reality consists of perfect, eternal, and unchanging abstract entities called Forms or Ideas. The physical objects we see are merely imperfect copies or shadows of these ideal Forms. For example, every beautiful thing we see participates in the Form of Beauty itself.\n\nThe Allegory of the Cave (from The Republic) illustrates this theory dramatically. Plato describes prisoners chained in a cave since childhood, facing a wall. Behind them is a fire, and objects cast shadows on the wall. The prisoners believe these shadows are reality. When one prisoner is freed and sees the real world (representing the world of Forms), he initially struggles to adjust but eventually understands the true nature of reality. Upon returning to the cave, the other prisoners think he is mad.\n\nThe allegory represents the philosopher\'s journey from ignorance to enlightenment, the difficulty of educating others about truth, and the philosopher\'s duty to return and help others even at personal cost.',
    difficulty: 'hard',
    maxPoints: 10,
  },
]

async function main() {
  const client = new MongoClient(URI, { connectTimeoutMS: 10000, serverSelectionTimeoutMS: 10000 })
  await client.connect()
  const db = client.db()
  console.log('Connected to MongoDB.')

  const col = db.collection('theory_references')

  let inserted = 0
  let skipped = 0

  for (const ref of THEORY_REFERENCES) {
    const existing = await col.findOne({ courseCode: ref.courseCode, id: ref.id })
    if (existing) {
      console.log(`  ${ref.id} already exists. Skipping.`)
      skipped++
      continue
    }
    await col.insertOne({ ...ref, createdAt: new Date().toISOString() })
    console.log(`  ${ref.id} — "${ref.question.slice(0, 60)}..."`)
    inserted++
  }

  await client.close()
  console.log(`\nDone! ${inserted} inserted, ${skipped} skipped.`)
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1) })
