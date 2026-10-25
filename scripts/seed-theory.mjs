import { MongoClient } from 'mongodb'

const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz'

const THEORY_REFERENCES = [
  {
    courseCode: 'GSS 212',
    section: 'Philosophy',
    id: 'TH-001',
    question: 'Critically examine the strengths and weaknesses of utilitarianism as a moral theory. In your answer, discuss the distinction between act and rule utilitarianism and evaluate whether the theory can adequately address the problem of justice.',
    keywords: ['utilitarianism', 'consequentialist', 'greatest happiness', 'act utilitarianism', 'rule utilitarianism', 'justice', 'pleasure', 'utility', 'harm', 'aggregate', ' Bentham', 'Mill'],
    mainConcepts: [
      'Utilitarianism is a consequentialist theory holding that the right action maximizes overall happiness or utility',
      'Bentham\'s quantitative hedonism versus Mill\'s qualitative distinction between pleasures',
      'Act utilitarianism evaluates each action individually by its consequences',
      'Rule utilitarianism evaluates actions by whether they follow rules that generally produce good outcomes',
      'The theory faces the problem of justice — it can justify sacrificing minorities for the greater good',
      'The experience machine objection (Nozick) challenges whether pleasure is the only intrinsic good',
      'Supererogation and demandingness problems — utilitarianism may demand too much of agents'
    ],
    referenceAnswer: 'Utilitarianism, as articulated by Jeremy Bentham and John Stuart Mill, is a consequentialist moral theory that holds the right action is the one producing the greatest happiness for the greatest number. Its strength lies in its egalitarian impartiality — each person\'s happiness counts equally — and its intuitive appeal that outcomes matter morally.\n\nBentham proposed a quantitative hedonistic calculus, measuring pleasure by intensity, duration, certainty, and extent. Mill refined this by arguing some pleasures (intellectual, aesthetic) are qualitatively superior to others, famously stating it is "better to be Socrates dissatisfied than a fool satisfied."\n\nThe distinction between act and rule utilitarianism is crucial. Act utilitarianism (AU) requires evaluating each individual action by its consequences. Rule utilitarianism (RU) instead asks which rules, if generally followed, would produce the best outcomes. RU was developed partly to address AU\'s counterintuitive implications.\n\nHowever, both face serious challenges. The justice objection — most powerfully articulated by Rawls — argues that utilitarianism can justify harming minorities if this maximizes aggregate welfare. For example, framing an innocent person to prevent riots could be utilitarianly justified. RU mitigates this somewhat by requiring that just rules generally produce good outcomes, but it still struggles when rule-following clearly produces bad results in specific cases.\n\nAdditional weaknesses include the demandingness objection (agents must always maximize utility, leaving no room for personal projects), the measurement problem (how to compare pleasures across persons), and the problem of integrity ( Bernard Williams\' argument that utilitarianism alienates agents from their deepest commitments). Despite these criticisms, utilitarianism remains influential in public policy, economics, and applied ethics precisely because of its systematic, outcome-focused approach.',
    difficulty: 'hard',
    maxPoints: 10,
  },
  {
    courseCode: 'GSS 212',
    section: 'Philosophy',
    id: 'TH-002',
    question: 'Compare and contrast the epistemological positions of rationalism and empiricism. Which position, if any, offers a more satisfactory account of the origin and justification of human knowledge? Defend your answer with reference to at least two thinkers from each tradition.',
    keywords: ['rationalism', 'empiricism', 'innate ideas', 'sense experience', 'a priori', 'a posteriori', 'Descartes', 'Leibniz', 'Locke', 'Hume', 'justification', 'knowledge'],
    mainConcepts: [
      'Rationalism holds that reason is the primary source of knowledge, independent of sensory experience',
      'Empiricism holds that all knowledge derives from sense experience',
      'Descartes\' method of doubt and the cogito as the foundation of certain knowledge',
      'Leibniz\'s doctrine of innate ideas and the principle of sufficient reason',
      'Locke\'s tabula rasa — the mind as a blank slate at birth',
      'Hume\'s radical empiricism and the problem of induction',
      'Kant\'s synthesis attempting to reconcile both traditions',
      'The a priori versus a posteriori distinction as central to the debate'
    ],
    referenceAnswer: 'Rationalism and empiricism represent the two major epistemological traditions in Western philosophy, differing fundamentally about the source and justification of knowledge.\n\nThe rationalist tradition, championed by Descartes, Spinoza, and Leibniz, holds that reason is the primary source of knowledge. Descartes, in his Meditations, employed methodological doubt to strip away all uncertain beliefs, arriving at the cogito ("I think, therefore I am") as an indubitable foundation. From this rational intuition, he attempted to rebuild knowledge through clear and distinct ideas. Leibniz further developed rationalism through his doctrine of innate ideas — the notion that certain concepts (God, identity, causality) are not derived from experience but are inherent in the mind. His principle of sufficient reason holds that everything must have a reason or cause, knowable through rational inquiry.\n\nThe empiricist tradition, represented by Locke, Berkeley, and Hume, counters that all knowledge originates in sense experience. Locke\'s Essay Concerning Human Understanding attacked the doctrine of innate ideas, proposing instead that the mind at birth is a tabula rasa (blank slate). All complex ideas, he argued, are built from simple ideas received through sensation and reflection. Hume radicalized this position, arguing that even our concept of causation is merely a habit of the mind formed by observing constant conjunctions — we never directly perceive necessary connection.\n\nThe strengths of empiricism lie in its alignment with scientific methodology and its caution against metaphysical speculation. However, it struggles to account for mathematical and logical truths, which appear necessarily true yet are not empirically derived. Rationalism better explains a priori knowledge but faces the challenge of explaining how pure reason alone can yield knowledge about the world.\n\nKant\'s Critique of Pure Reason attempted a synthesis, arguing that while all knowledge begins with experience, it does not all arise from experience. The mind actively structures experience through innate categories (causality, substance, unity), making both a priori concepts and empirical content necessary for knowledge. This transcendent idealism suggests that neither rationalism nor empiricism alone is sufficient, and a satisfactory epistemology must account for both the rational and experiential dimensions of human knowledge.',
    difficulty: 'hard',
    maxPoints: 10,
  },
  {
    courseCode: 'GSS 212',
    section: 'Logic',
    id: 'TH-003',
    question: 'Explain the difference between validity and soundness in deductive arguments. Construct an argument that is valid but unsound, and another that is both valid and sound. Why is this distinction important in philosophical reasoning?',
    keywords: ['validity', 'soundness', 'deductive', 'premise', 'conclusion', 'form', 'truth', 'argument', 'syllogism', 'structure', 'false premise'],
    mainConcepts: [
      'Validity is a property of argument form — the conclusion follows necessarily from the premises',
      'Soundness requires both validity and the truth of all premises',
      'A valid argument with at least one false premise is unsound',
      'A sound argument guarantees a true conclusion',
      'Validity concerns logical structure, not content or truth',
      'The distinction matters because valid reasoning from false premises can lead to false conclusions'
    ],
    referenceAnswer: 'Validity and soundness are fundamental concepts in deductive logic that distinguish between the structural correctness of an argument and its actual truth-producing capacity.\n\nAn argument is valid if and only if it is impossible for the premises to be true and the conclusion false simultaneously. Validity is purely a property of logical form — it depends on the structure of the argument, not on whether the premises are actually true. For example:\n\nPremise 1: All fish can fly.\nPremise 2: A salmon is a fish.\nConclusion: Therefore, a salmon can fly.\n\nThis argument is valid because the conclusion follows necessarily from the premises by the form of categorical syllogism (All A are B; C is A; therefore C is B). However, it is unsound because Premise 1 is false — fish cannot fly.\n\nA sound argument is one that is both valid and has all true premises:\n\nPremise 1: All mammals are warm-blooded.\nPremise 2: All dolphins are mammals.\nConclusion: Therefore, all dolphins are warm-blooded.\n\nThis argument is valid (correct syllogistic form) and sound (both premises are true), guaranteeing a true conclusion.\n\nThe distinction is crucial in philosophical reasoning for several reasons. First, it prevents the fallacy of equating logical correctness with truth — a formally impeccable argument can still yield false conclusions if it begins from false assumptions. Second, it directs philosophical attention to premise evaluation: once we establish that an argument is valid, the remaining question is whether its premises are true. Third, it reveals the limits of formal logic alone — logic can guarantee truth-preservation but not truth-production. This is why philosophical inquiry must combine logical rigor with careful examination of foundational assumptions, a point central to critical thinking and the evaluation of philosophical systems.',
    difficulty: 'medium',
    maxPoints: 10,
  },
  {
    courseCode: 'GSS 212',
    section: 'Philosophy',
    id: 'TH-004',
    question: 'Discuss Aristotle\'s concept of the golden mean and its application to virtue ethics. How does this framework compare with deontological and consequentialist approaches to morality? Use specific examples to illustrate your answer.',
    keywords: ['Aristotle', 'golden mean', 'virtue ethics', 'character', 'hexis', 'deontology', 'consequentialism', 'courage', 'temperance', 'excess', 'deficiency', 'eudaimonia'],
    mainConcepts: [
      'Aristotle\'s virtue ethics focuses on character rather than rules or consequences',
      'The golden mean is the desirable middle ground between two extremes (excess and deficiency)',
      'Virtue is a hexis — a stable disposition acquired through habituation',
      'Courage is the mean between recklessness and cowardice',
      'The mean is relative to the individual and the situation, not a mathematical average',
      'Eudaimonia (human flourishing) is the ultimate goal of the virtuous life',
      'Contrast with Kantian deontology (duty-based) and utilitarianism (consequence-based)',
      'Virtue ethics asks "what kind of person should I be?" rather than "what should I do?"'
    ],
    referenceAnswer: 'Aristotle\'s concept of the golden mean, articulated in the Nicomachean Ethics, represents one of the most influential frameworks in virtue ethics. Aristotle argued that virtue (arete) lies at a mean between two vices — one of excess and one of deficiency. This mean is not a mathematical average but a contextually appropriate middle ground determined by practical wisdom (phronesis).\n\nConsider courage: Aristotle identifies it as the mean between recklessness (excess) and cowardice (deficiency). The courageous person faces danger appropriately — neither recklessly rushing into every threat nor avoiding all risk. Similarly, generosity is the mean between prodigality (excess) and stinginess (deficiency). The generous person gives the right amount, to the right person, at the right time, for the right reason.\n\nCrucially, Aristotle holds that virtue is a hexis — a stable disposition of character developed through repeated practice. We become brave by performing brave acts, just as we become skilled musicians through practice. The ultimate goal is eudaimonia, often translated as "happiness" or "human flourishing," which consists in the activity of the soul in accordance with virtue over a complete life.\n\nThis framework contrasts sharply with deontological and consequentialist approaches. Kant\'s deontology, for instance, grounds morality in duty and the categorical imperative — an action is right if it conforms to a universalizable maxim, regardless of consequences. For Kant, the motivation behind an action matters more than its outcome or the character of the agent. Utilitarianism, by contrast, judges actions solely by their consequences — the right action maximizes aggregate happiness.\n\nAristotle\'s approach differs from both by focusing on the agent\'s character rather than specific actions or outcomes. While Kant asks "what should I do?" and the utilitarian asks "what produces the best results?", Aristotle asks "what kind of person should I be?" This character-based approach has gained renewed influence in contemporary ethics, particularly through thinkers like Alasdair MacIntyre and Philippa Foot, who argue that rule-based and consequence-based theories are inadequate for capturing the richness of moral life. However, critics note that virtue ethics struggles to provide clear action-guidance in moral dilemmas and may be culturally relative in its specification of virtues.',
    difficulty: 'hard',
    maxPoints: 10,
  },
  {
    courseCode: 'GSS 212',
    section: 'Logic',
    id: 'TH-005',
    question: 'What is the problem of induction as formulated by David Hume? Why is it considered one of the most significant challenges in epistemology? Discuss at least two attempted solutions and explain why each has been criticized.',
    keywords: ['induction', 'Hume', 'problem of induction', 'justification', 'uniformity of nature', 'probability', 'Popper', 'falsification', 'pragmatic', 'Kant', 'synthetic a priori'],
    mainConcepts: [
      'Hume argued that inductive reasoning cannot be rationally justified',
      'Induction relies on the assumption that the future will resemble the past (uniformity of nature)',
      'This assumption cannot be proven without circular reasoning',
      'The problem threatens the foundations of empirical science and everyday reasoning',
      'Popper\'s solution: science advances through falsification, not induction',
      'Pragmatic justification: induction works in practice even if not theoretically justified',
      'Kant\'s attempt: the uniformity of nature is a synthetic a priori truth',
      'The problem remains unresolved in contemporary epistemology'
    ],
    referenceAnswer: 'David Hume\'s problem of induction, articulated in A Treatise of Human Nature and An Enquiry Concerning Human Understanding, challenges the rational foundation of inductive reasoning — the practice of drawing general conclusions from specific observations.\n\nHume observed that all empirical reasoning depends on an implicit assumption: that the future will resemble the past, or more precisely, that nature is uniform. When we observe that the sun has risen every day and conclude it will rise tomorrow, we presuppose that past regularities will continue. Hume argued this assumption cannot be justified through deductive reasoning — it is logically conceivable that nature could change arbitrarily tomorrow. Nor can it be justified through induction (arguing that induction has worked in the past, so it will work in the future) without committing a circular argument.\n\nThis problem is epistemologically devastating because it undermines the rational basis for all empirical knowledge, scientific laws, and everyday predictions. If we cannot justify induction, then the entire edifice of empirical science rests on an irrational foundation.\n\nSeveral solutions have been proposed. Karl Popper\'s falsificationism attempted to dissolve the problem by arguing that science does not actually use induction. Instead, scientific theories are tested by attempting to falsify them through deductive modus tollens: if a theory predicts observation P, and P is not observed, the theory is false. Popper claimed scientists advance by eliminating false theories, not by confirming true ones. However, critics argue this is unrealistic — scientists do regard repeated successful predictions as evidence for theories, and the decision to test one theory rather than another seems to involve inductive reasoning.\n\nThe pragmatic justification, associated with Reichenbach and others, argues that while we cannot prove induction will succeed, we can note that if any method of predicting the future will work, induction will. Therefore, we have pragmatic reason to use it. Critics respond that this does not provide epistemic justification — it merely argues that induction is our best bet, not that it is rational.\n\nKant offered a more ambitious solution, arguing that the uniformity of nature is a synthetic a priori truth — a necessary condition for the possibility of experience itself. However, this solution has been criticized for relying on Kant\'s controversial transcendental framework and for not adequately explaining why nature must conform to our cognitive expectations.\n\nThe problem of induction remains one of the deepest unsolved problems in epistemology, continuing to generate debate about the nature of scientific reasoning, probability, and the foundations of empirical knowledge.',
    difficulty: 'hard',
    maxPoints: 10,
  },
  {
    courseCode: 'GSS 212',
    section: 'Philosophy',
    id: 'TH-006',
    question: 'Analyze John Rawls\' concept of the "original position" and the "veil of ignorance" as a thought experiment for deriving principles of justice. What are the strengths and limitations of this approach? How might a libertarian critic like Robert Nozick respond?',
    keywords: ['Rawls', 'original position', 'veil of ignorance', 'justice', 'fairness', 'difference principle', 'equality', 'liberty', 'Nozick', 'libertarian', 'entitlement', 'redistribution'],
    mainConcepts: [
      'The original position is a hypothetical scenario where rational agents choose principles of justice',
      'The veil of ignorance ensures impartiality by hiding each agent\'s social position, talents, and conception of the good',
      'Rawls derives two principles: equal basic liberties and the difference principle',
      'The difference principle allows inequalities only if they benefit the least advantaged members of society',
      'The approach aims to model fairness as impartiality',
      'Nozick\'s entitlement theory of justice rejects redistributive principles',
      'Nozick argues justice is about historical process, not end-state patterns',
      'Criticisms include whether the original position is truly impartial and whether it produces the right principles'
    ],
    referenceAnswer: 'John Rawls\' A Theory of Justice (1971) presents one of the most influential modern accounts of justice through the thought experiment of the original position and the veil of ignorance.\n\nThe original position is a hypothetical situation in which rational, self-interested agents come together to choose the principles that will govern their society. Crucially, they do so behind a "veil of ignorance" — they do not know their own social position, natural talents, intelligence, strength, race, gender, religion, or conception of the good life. Rawls argues this ignorance ensures impartiality, as no one can tailor principles to benefit themselves specifically.\n\nFrom this position, Rawls argues, rational agents would choose two principles of justice: (1) each person has an equal right to the most extensive basic liberties compatible with similar liberties for all, and (2) social and economic inequalities are permissible only if they satisfy the difference principle — they must be arranged to benefit the least advantaged members of society. The first principle (equal liberty) takes priority over the second.\n\nThe strengths of Rawls\' approach are significant. It provides a systematic, principled foundation for justice that balances liberty and equality. The veil of ignorance is an elegant device for modeling impartiality, and the resulting principles have intuitive appeal — they protect fundamental freedoms while permitting inequalities that improve everyone\'s position.\n\nHowever, the approach faces several limitations. First, critics question whether the original position is truly neutral — it may smuggle in assumptions about rationality, risk aversion, and individualism that favor certain conceptions of justice. Second, the difference principle may be too demanding on the talented, requiring them to serve the interests of others. Third, the framework focuses on distributional outcomes rather than processes.\n\nRobert Nozick, in Anarchy, State, and Utopia (1974), offers a powerful libertarian critique. Nozick argues that justice is not about achieving a particular pattern of distribution (as Rawls assumes) but about respecting individual rights through a just historical process. His entitlement theory holds that a distribution is just if it arises from just acquisitions and voluntary transfers, regardless of the resulting pattern. Under this view, redistributive taxation to achieve Rawls\' difference principle is morally equivalent to forced labor — it violates individuals\' right to the fruits of their efforts. Nozick\'s famous Wilt Chamberlain argument illustrates this: if people voluntarily pay to watch a basketball player, the resulting inequality is just because it arose from free choices, even if it violates the difference principle.\n\nThe Rawls-Nozick debate remains central to political philosophy, reflecting the fundamental tension between equality-based and liberty-based conceptions of justice.',
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

  // Delete old demo questions
  const deleted = await col.deleteMany({ courseCode: 'GSS 212' })
  console.log(`Deleted ${deleted.deletedCount} old questions.`)

  let inserted = 0
  for (const ref of THEORY_REFERENCES) {
    await col.insertOne({ ...ref, createdAt: new Date().toISOString() })
    console.log(`  ${ref.id} — "${ref.question.slice(0, 70)}..."`)
    inserted++
  }

  await client.close()
  console.log(`\nDone! ${inserted} exam-standard questions inserted.`)
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1) })
