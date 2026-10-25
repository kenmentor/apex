import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import vm from 'vm'

const __dirname = dirname(fileURLToPath(import.meta.url))

const src = readFileSync(join(__dirname, '..', '..', 'ent_bank.js'), 'utf-8').replace('export const BANK', 'const BANK') + '\nthis.BANK = BANK;'
const sandbox = {}
vm.createContext(sandbox)
vm.runInContext(src, sandbox)
const BANK = sandbox.BANK

const MODULE_NUM = {
  'Concept of Entrepreneurship': 1,
  'Innovation and Entrepreneurship': 2,
  'Discovering Business Opportunities': 3,
  'Feasibility Study': 4,
  'Business Planning': 5,
  'Financing the Start-Up': 6,
}

const SECTION_TITLE = {
  'Concept of Entrepreneurship': '1. Concept of Entrepreneurship',
  'Innovation and Entrepreneurship': '2. Innovation and Entrepreneurship',
  'Discovering Business Opportunities': '3. Discovering Business Opportunities',
  'Feasibility Study': '4. Feasibility Study',
  'Business Planning': '5. Business Planning',
  'Financing the Start-Up': '6. Financing the Start-Up',
}

const LETTERS = ['a', 'b', 'c', 'd']

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffledOptions(options, answerIdx, rng) {
  const indices = [0, 1, 2, 3]
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  const newAnswerIdx = indices.indexOf(answerIdx)
  return {
    options: Object.fromEntries(LETTERS.map((L, idx) => [L, options[indices[idx]]])),
    correctAnswer: LETTERS[newAnswerIdx],
  }
}

const EXPLAIN = {
  'Entrepreneurship is best described in the lecture note as': 'The lecture note defines entrepreneurship as the process of designing, launching, and managing a new business venture to generate profits. The other options describe earning a salary or routine trading, which are not entrepreneurship.',
  'Which of the following is NOT listed among the key elements of entrepreneurship in the note?': 'The note lists innovation, risk-taking, and profit-making among the key elements of entrepreneurship. Clerical work is not part of the elements.',
  'An entrepreneur, according to the lecture note, is described as': 'The note describes an entrepreneur as one who identifies opportunities, gathers resources, and takes the risk to create and grow a business. The other options describe wage earners or mere investors.',
  'Which of the following is NOT listed as a key characteristic of an entrepreneur in the note?': 'The note lists risk-taking, creativity and innovation, and self-confidence among the characteristics of an entrepreneur. Laziness is not a characteristic.',
  'Contrariness, as an entrepreneurial trait discussed in the note, refers to': 'The note describes contrariness as the willingness to go against the crowd and conventional wisdom. The other options suggest indecision, conformity, or constant disagreement, which are not the trait described.',
  'The note lists the top five functions of an entrepreneur. Which of these is one of them?': 'Decision making is listed among the top five functions of the entrepreneur in the note. The other options are routine clerical duties, not entrepreneurial functions.',
  'According to the note, which function of the entrepreneur has declined in importance over time?': 'The note states that the undertaking of risks, formerly a key function of the entrepreneur, has declined in importance over time. The other functions remain prominent.',
  'Risks such as competitive risk, management risk and market risk are classified under which type of risk discussed in the note?': 'Competitive, management, and market risks affect a particular business or industry and are classified in the note as unsystematic risk. Systematic risk affects the whole market, while pure and political risks are different categories.',
  'According to the lecture note, which scholar is credited with popularising the idea of the entrepreneur as an innovator?': 'The note credits Joseph Schumpeter with popularising the idea of the entrepreneur as an innovator. The other scholars are associated with different economic ideas.',
  'The entrepreneur who notices the gap between market demand and supply and works to fill it is classified in the note as': 'The note classifies the entrepreneur who notices the gap between demand and supply as the Classic Entrepreneur. The other types do not innovate in this way.',
  'An entrepreneur who is known for starting new businesses repeatedly, even after selling or closing previous ones, is referred to in the note as': 'The note refers to an entrepreneur who repeatedly starts new businesses as a Serial Entrepreneur. The other options describe different entrepreneurial classifications.',
  'Which of these is described in the note as an entrepreneur who incorporates social causes into their business model?': 'The note describes the entrepreneur who incorporates social causes into the business model as a Social Entrepreneur. The other options are not the term used in the note.',
  'Which of the following is NOT listed under the entrepreneurial mindset in the note?': 'The note lists growth mindset, opportunity recognition, and resilience under the entrepreneurial mindset. A fixed mindset that resists change is the opposite of the entrepreneurial mindset and is not listed.',
  'In the Entrepreneur vs Manager comparison table in the note, the entrepreneur\'s primary motivation is': 'The comparison table shows that the entrepreneur is primarily motivated by achievement and profit, while the manager is motivated by salary and security.',
  'According to the Entrepreneur vs Manager table, decision making by the entrepreneur is usually': 'The table describes the entrepreneur\'s decision making as intuitive and daring, while the manager\'s is more cautious and rule-based.',
  'In the comparison table, the risk orientation of the entrepreneur is described as': 'The comparison table describes the entrepreneur as a risk-taker, whereas the manager is risk-averse.',
  'In the Entrepreneur vs Intrapreneur comparison table, who is described as using the resources of an existing organisation?': 'The table shows the intrapreneur as one who uses the resources of an existing organisation, while the entrepreneur sets up his own enterprise.',
  'In the Entrepreneur vs Intrapreneur table, whose risk is described as \'borne by the entrepreneur himself\'?': 'The table shows that the risk in entrepreneurship is borne by the entrepreneur himself, while in intrapreneurship the risk is borne by the employing organisation.',
  'Which of the following is NOT listed among the detailed aspects of entrepreneurial constraints discussed in the note?': 'The note discusses limited access to capital, lack of infrastructure, and lack of entrepreneurial culture among the constraints. Unlimited access to cheap credit is not a constraint and does not feature in the note.',
  'Financial risk, as discussed under entrepreneurial constraints in the note, mainly relates to': 'The note describes financial risk in entrepreneurship as the pressure to repay loans and the fear of losing invested money. The other options are different risk types.',
  'According to the note, \'Decision Fatigue\' is discussed under which entrepreneurial constraint?': 'The note discusses Decision Fatigue under entrepreneurial stress, one of the constraints entrepreneurs face. The other options are different constraint categories.',
  'Which of the following is NOT listed among the factors stimulating entrepreneurship in the note?': 'The note lists financial rewards, independence and autonomy, and self-fulfilment as factors stimulating entrepreneurship. Government apathy discourages rather than stimulates entrepreneurship.',
  'Under section 1.11 of the note (Qualities of a Successful Entrepreneur), which quality is described as involving \'control of sentiments\'?': 'Section 1.11 describes emotional stability as involving the control of sentiments. The other qualities relate to other aspects of the entrepreneur\'s behaviour.',
  'According to the note, goals (unlike vision) should be': 'The note distinguishes goals from vision by stating that goals should be specific and measurable. Vision is long-term and aspirational.',
  'Which entrepreneurial quality is described in the note as \'sticking to decisions taken and not vacillating\'?': 'The note describes firmness as sticking to decisions taken and not vacillating. The other options do not match that description.',
  'The quality described in the note as \'consistency in firmness\' is': 'The note describes steadfastness as consistency in firmness. The other options are not the quality described.',
  'According to section 1.12 of the note, entrepreneurs contribute to government revenue mainly by': 'Section 1.12 states that entrepreneurs contribute to government revenue mainly by paying taxes on their profits and creating employment. The other options are contrary to the note.',
  'Which of the following is listed in the note as one of the roles of entrepreneurship in a developing society?': 'The note lists creation of employment opportunities among the roles of entrepreneurship in a developing society. The other options describe negative effects that the note does not attribute to entrepreneurship.',
  'In the Entrepreneur vs Manager comparison table, under \'Approach to task\', the entrepreneur is described as': 'The comparison table describes the entrepreneur\'s approach to task as direct and involved, whereas the manager delegates and stays detached.',
  'In the Entrepreneur vs Manager table, the \'Status\' of the entrepreneur is described as': 'The table shows the entrepreneur\'s status as Founder/Owner, while the manager is an employee of the firm.',
  'According to the Entrepreneur vs Manager table, the reward of the entrepreneur is': 'The table shows that the reward of the entrepreneur is profit, while the manager earns a salary.',
  '\'He is to determine what to produce, how to produce, and for whom to produce.\' This describes which function of the entrepreneur in the note?': 'Determining what, how, and for whom to produce is described in the note as the Decision Making function of the entrepreneur.',
  'According to the note, \'making necessary arrangements for the division of total income among shareholders, employees, and himself\' describes which function?': 'The note describes the arrangement for dividing total income among shareholders, employees, and the entrepreneur as the Division of Income function.',
  'Which constraint category is described in the note as: \'Entrepreneurship can be a lonely journey; the entrepreneur often works alone and cannot easily share his plans\'?': 'The note describes the lonely nature of entrepreneurship under social/isolation constraints. The other options are different constraint categories.',
  'According to the note, being willing to risk time, money, and reputation for the business describes which characteristic of an entrepreneur?': 'The note describes the willingness to risk time, money, and reputation as the risk-taking characteristic of an entrepreneur.',
  'The characteristic described in the note as the ability to cultivate trust, motivate, and support others toward the achievement of the business goal is': 'The note describes the ability to cultivate trust, motivate, and support others as the leadership characteristic of an entrepreneur.',
  'According to the module, an entrepreneur is fundamentally responsible for': 'The note states that the entrepreneur is fundamentally responsible for combining the factors of production to produce goods and services. The other options describe unrelated roles.',
  'Which of the following best distinguishes an intrapreneur from an entrepreneur according to the note?': 'The note distinguishes them by stating that the intrapreneur uses the resources of an existing organisation while the entrepreneur sets up his own enterprise. The other options are incorrect.',
  'Which factor stimulating entrepreneurship is described in the note as \'the potential for high financial returns or profit\'?': 'The note describes the potential for high financial returns as the financial rewards factor stimulating entrepreneurship. The other options are different factors.',
  'Which factor stimulating entrepreneurship is illustrated in the note by \'many entrepreneurs are motivated by the freedom to make their own decisions\'?': 'The note illustrates independence and autonomy with the freedom to make one\'s own decisions. The other options are different factors.',
  'According to Module 1\'s learning objectives, students should be able to differentiate between entrepreneurs, managers, and': 'Module 1\'s learning objectives require students to differentiate between entrepreneurs, managers, and intrapreneurs. The other options are not part of the objective.',
  'Which of the following best captures the difference in \'Driving force\' between the entrepreneur and the manager as shown in the note\'s table?': 'The table shows that the entrepreneur is driven by achievement and profit while the manager is driven by salary and security. The other options contradict the table.',
  'According to the note, innovation is defined as': 'The note defines innovation as the process of translating an idea or invention into a good or service that creates value. It is not the same as invention, which is only the first-time creation.',
  'In the note, invention is defined as': 'The note defines invention as the creation of a new product or process for the first time, while innovation is its commercialisation. The other options describe later stages.',
  'Which of the following is given in the note as an example of an INNOVATION (as opposed to an invention)?': 'The note gives smartphones as an example of innovation, since they are improvements on earlier inventions. The other options are first-time discoveries or inventions.',
  'According to the note, the type of innovation is dependent on two factors: Technology and': 'The note states that the type of innovation depends on technology and the market. The other options are not the factors given.',
  'Incremental innovation occurs when': 'The note defines incremental innovation as small improvements made to existing products or services. The other options describe more radical changes.',
  'According to the note, each new version of Apple\'s iPhone is an example of': 'The note gives successive iPhone versions as an example of incremental innovation because each version introduces small improvements to the existing product.',
  'Disruptive innovation occurs when': 'The note defines disruptive innovation as a new entrant creating a product or service that displaces the existing market leaders. The other options describe other types of innovation.',
  'Which product is given in the note as an example of disruptive innovation, as it displaced traditional cameras?': 'The note gives the iPad as an example of disruptive innovation, as it displaced traditional cameras. The other options are not the example used in the note.',
  'Architectural innovation occurs when': 'The note defines architectural innovation as changing the overall architecture of a product while keeping the components the same. The other options describe other innovation types.',
  'Which product is given in the note as an example of architectural innovation (combining existing components in a new architecture)?': 'The note gives the smart watch as an example of architectural innovation because it combines existing components in a new architecture. The other options are not the example used.',
  'Radical innovation occurs when': 'The note defines radical innovation as a completely new product or technology replacing an existing one. The other options describe incremental or design changes.',
  'Which invention is given in the note as an example of radical innovation, as it replaced ships as a primary mode of long-distance travel?': 'The note gives the airplane as an example of radical innovation because it replaced ships for long-distance travel. The other options are not the example used.',
  'Which of the following is NOT listed among the sources of innovation within an organisation in section 2.4 of the note?': 'Section 2.4 lists unexpected occurrences, incongruities, and process needs among the sources of innovation within an organisation. Following competitors blindly is not a source listed in the note.',
  '\'Having surplus resources that can be invested in exploring new ideas\' describes which source of innovation within an organisation?': 'The note describes having surplus resources for exploring new ideas as slack resources. The other options are different sources of innovation.',
  'According to the note, which theorist proposed the \'Theory of Creative Destruction\' in 1934?': 'The note credits Joseph Schumpeter with the Theory of Creative Destruction in 1934. The other theorists proposed different theories.',
  'According to Schumpeter\'s Theory of Creative Destruction, innovation': 'Schumpeter\'s theory holds that innovation destroys old products and replaces them with new, better ones. The other options contradict the theory.',
  'Which of the following is given in the note as an example of Schumpeter\'s Theory of Creative Destruction in action?': 'The note gives the iPhone replacing the Blackberry as an example of creative destruction. The other options reverse the direction of replacement.',
  'According to the note, which theorist proposed the \'Diffusion of Innovations\' theory in 1962?': 'The note credits Everett Rogers with the Diffusion of Innovations theory in 1962. The other options are not the theorist.',
  'According to Rogers\' Diffusion of Innovations theory, which group is the smallest and represents about 2.5% of the population?': 'Rogers\' theory assigns the smallest group, about 2.5%, to the Innovators. The other groups are larger.',
  'In Rogers\' theory, the group described as \'trendsetters\' who adopt innovations early but carefully represents about 13.5% of the population. They are the': 'Rogers\' theory describes the Early Adopters (about 13.5%) as trendsetters who adopt innovations early but carefully. The other groups fit other descriptions.',
  'In Rogers\' theory, the group that adopts an innovation \'when its benefits become clear\' and represents about 34% of the population is the': 'Rogers\' theory describes the Early Majority (about 34%) as adopting when benefits become clear. The other options are different adopter categories.',
  'In Rogers\' theory, the group described as \'resistant to change\' and representing about 16% of the population is the': 'Rogers\' theory describes the Laggards (about 16%) as resistant to change. The other options adopt earlier.',
  'According to the note, which theorist proposed the \'Disruptive Innovation\' theory in 1997?': 'The note credits Clayton Christensen with the Disruptive Innovation theory in 1997. The other theorists proposed different theories.',
  'According to Clayton Christensen\'s theory, disruptive innovations typically': 'Christensen\'s theory holds that disruptive innovations start small and gradually replace the established players. The other options contradict the theory.',
  'According to the note, which theorist proposed the \'Open Innovation\' theory in 2003?': 'The note credits Henry Chesbrough with the Open Innovation theory in 2003. The other options are not the theorist.',
  'The key idea of Open Innovation, according to Chesbrough, is that': 'Chesbrough\'s Open Innovation holds that companies should use both internal and external ideas to advance their technology. The other options contradict the theory.',
  'According to the note, which two theorists proposed \'The Blue Ocean Strategy\' in 2005?': 'The note credits W. Chan Kim and Renee Mauborgne with The Blue Ocean Strategy in 2005. The other pairs are not the authors.',
  'The Blue Ocean Strategy encourages businesses to': 'The Blue Ocean Strategy encourages creating uncontested market space by creating and capturing new demand. The other options describe competing in existing red-ocean markets.',
  'According to the note, which organisation is credited with the \'10 Types of Innovation\' framework published in 2013?': 'The note credits Doblin with the 10 Types of Innovation framework published in 2013. The other firms are not credited.',
  'In Doblin\'s 10 Types of Innovation framework, Spotify\'s freemium model (offering free basic service and charging for premium features) is an example of innovation in': 'Spotify\'s freemium model changes how the company makes money, so it is an innovation in the Profit Model. The other types are not the fit.',
  'In Doblin\'s framework, AWS (Amazon Web Services) selling its infrastructure as a service is an example of innovation in': 'AWS selling its infrastructure as a service changes how the firm connects and uses external resources, which is an innovation in Network. The other types do not fit.',
  'In Doblin\'s framework, GitLab\'s remote-first approach is an example of innovation in': 'GitLab\'s remote-first approach changes how the company is organised, making it an innovation in Structure. The other types do not fit.',
  'In Doblin\'s framework, Toyota\'s Lean Manufacturing is an example of innovation in': 'Toyota\'s Lean Manufacturing changes how products are made, making it an innovation in Process. The other types do not fit.',
  'In Doblin\'s framework, Zappos\' exceptional customer service is an example of innovation in': 'Zappos\' outstanding customer service is an innovation in Service. The other types are not the fit.',
  'In Doblin\'s framework, Tesla\'s direct-to-consumer sales model is an example of innovation in': 'Tesla selling directly to consumers changes how the product reaches customers, making it an innovation in Channel. The other types do not fit.',
  'In Doblin\'s framework, Netflix\'s recommendation engine is an example of innovation in': 'Netflix\'s recommendation engine is an innovation in Customer Engagement because it changes how customers interact with the service. The other types do not fit.',
  'The four key phases of innovation described in the note are Ideation, Experimentation, Implementation, and': 'The note lists the four key phases of innovation as Ideation, Experimentation, Implementation, and Scaling. The other options are not among the phases.',
  'According to the note, which phase of innovation is described as \'the birth of innovative ideas\'?': 'The note describes Ideation as the birth of innovative ideas. The other options are later phases.',
  'Which phase of innovation involves testing ideas and developing prototypes according to the note?': 'The note assigns testing ideas and developing prototypes to the Experimentation phase. The other options are other phases.',
  'In the note, Dropbox creating a simple explainer video to test market interest before building the product is given as an example of which phase?': 'Dropbox\'s explainer video tested market interest cheaply before building the product, which the note gives as an example of the Experimentation phase.',
  'Which phase of innovation is described in the note as focusing on expanding the reach of a successful innovation?': 'The note describes expanding the reach of a successful innovation as the Scaling phase. The other options are earlier phases.',
  'According to the note\'s distinction table, creativity adds ___ value while innovation adds ___ value.': 'The note\'s distinction table states that creativity adds potential value while innovation adds practical value. The other pairings are incorrect.',
  'Which of the following is NOT one of the ways innovation manifests in entrepreneurship, as listed in section 2.8 of the note?': 'Section 2.8 lists product, process, and business model innovation as ways innovation manifests. Selling the business immediately is not a way innovation manifests.',
  'According to the note, Business Model Innovation involves changing the way a business': 'The note defines business model innovation as changing the way a business creates, delivers, and captures value. The other options are unrelated activities.',
  'According to Module 2\'s learning objectives, students should be able to differentiate between invention and': 'Module 2\'s learning objectives require students to differentiate between invention and innovation. The other options are not part of the objective.',
  'According to the note, Barringer and Ireland (2012) define an opportunity as': 'The note cites Barringer and Ireland (2012) defining an opportunity as a favourable set of circumstances that creates a need for a new product, service, or business. The other options are not their definition.',
  'In an \'externally stimulated\' business venture, the entrepreneur': 'In an externally stimulated venture, the entrepreneur recognises a market gap and decides to fill it. The other options describe internal stimulation or other situations.',
  'In an \'internally stimulated\' business venture, the entrepreneur': 'In an internally stimulated venture, the entrepreneur starts out of personal passion or interest and then looks for a market. The other options describe external stimulation.',
  'According to the note, an opportunity has four important qualities: attractive, durable, timely, and': 'The note lists attractive, durable, timely, and anchored in a product/service that creates value as the four qualities of an opportunity. The other options are not the qualities.',
  'The \'window of opportunity\' described in the note refers to': 'The note describes the window of opportunity as the period during which an opportunity is available before competition closes in. The other options are literal or unrelated meanings.',
  'In the input-transformation-output analogy used in the note, the business idea represents the': 'In the analogy, the business idea is the input that is transformed into an opportunity (the output). The other options are the wrong stages.',
  'Barringer and Ireland (2012), as cited in the note, define an idea as': 'The note cites Barringer and Ireland defining an idea as a thought, impression, or notion that may or may not meet the criteria of an opportunity. The other options equate an idea with an opportunity.',
  'According to the note, which of the following is described as \'the commonest source\' of business ideas?': 'The note describes copying an existing successful business as the commonest source of business ideas. The other options are not described as such.',
  'According to the note, copying an existing successful business is a good source of business ideas only if': 'The note states that copying works only if there is a market gap or room for improvement in the existing model. Blind copying without any change is not advised.',
  'Which source of business opportunity, described in the note, involves a license granted by a government or company to operate or sell a product?': 'The note describes franchising as a source of business opportunity involving a license to operate or sell a product. The other options are not defined that way.',
  'According to the note, possession of vocational or professional skills such as plumbing, catering, or web design is a source of business opportunity called': 'The note calls possession of vocational or professional skills a source of business opportunity known as vocation. The other options are different sources.',
  '\'Two good brains work better than one\' is used in the note to illustrate which source of business opportunity?': 'The note uses the phrase to illustrate joint effort as a source of business opportunity. The other options are not illustrated by the phrase.',
  'In the note, the example of street food buyers who buy from street vendors because it is cheaper than restaurants illustrates which source of business opportunity?': 'The note uses the street food example to illustrate observation as a source of business opportunity. The other options are different sources.',
  'According to the note, becoming conversant with problems associated with existing products and filling the gap is a source of business opportunity known as': 'The note describes becoming conversant with problems of existing products and filling the gap as work experience as a source of business opportunity. The other options are different sources.',
  'Converting a leisure-time activity into a commercial venture is described in the note as which source of business opportunity?': 'The note describes converting a leisure-time activity into a commercial venture as hobbies as a source of business opportunity. The other options are different sources.',
  'In the note, market survey (or market research) is described as a systematic way of': 'The note describes a market survey as a systematic way of gathering, analysing, and interpreting information about a market, product, or service. The other options are narrower activities.',
  'According to the note, a market survey provides answers to two main sets of questions: the Market Question and the': 'The note states that a market survey answers the Market Question and the Competition Question. The other options are not the categories.',
  'Which of the following questions belongs to the \'Market Question\' category in the note\'s market survey framework?': 'The note puts \'Who are the likely customers?\' under the Market Question. The other options belong to the Competition Question category.',
  'Which of the following questions belongs to the \'Competition Question\' category in the note\'s market survey framework?': 'The note puts questions about existing competitors and their strength under the Competition Question. The other options belong to the Market Question category.',
  'In the note, \'Environmental scanning\' is defined as': 'The note defines environmental scanning as gathering information about events and relationships in the environment to help management plan for the future. The other options are literal or unrelated meanings.',
  'In the note, market research is described as one of the tools of': 'The note describes market research as one of the tools of environmental scanning. The other options are not where market research is placed.',
  'The five elements (\'5 Ps\') of the marketing mix listed in the note are Product, Price, Place, Promotion, and': 'The note lists the 5 Ps of the marketing mix as Product, Price, Place, Promotion, and People. The other options are not among the 5 Ps.',
  'In the note\'s 5 Ps framework, \'What logistics are needed to deliver the product to the customer?\' relates to which element?': 'Logistics for delivering the product to the customer relate to Place (distribution) in the 5 Ps framework. The other options are different elements.',
  'In the note\'s 5 Ps framework, \'What efforts are needed to bring awareness and persuade customers to buy?\' relates to which element?': 'Efforts to bring awareness and persuade customers to buy relate to Promotion in the 5 Ps framework. The other options are different elements.',
  'According to the note, the promotional mix includes advertising, sales promotion, publicity, and': 'The note lists the promotional mix as advertising, sales promotion, publicity, and personal selling. The other options are logistics or product functions.',
  'Which element of the promotional mix is described in the note as \'a non-personal form of promotion that is paid for by the sponsor\'?': 'The note defines advertising as a non-personal form of promotion that is paid for by the sponsor. The other options differ in being personal or not paid.',
  'Which element of the promotional mix is described in the note as aiming \'to marry specific products with specific customers\'?': 'The note describes personal selling as aiming to marry specific products with specific customers. The other options are not described that way.',
  'Which element of the promotional mix is described in the note as being \'concerned with the presentation of the firm\'s image\'?': 'The note describes publicity as being concerned with the presentation of the firm\'s image. The other options are different elements of the promotional mix.',
  'According to the note, which element of the promotional mix includes exhibitions, point-of-sale displays, and discounts?': 'The note lists exhibitions, point-of-sale displays, and discounts under sales promotion. The other options are different elements.',
  'Which of the following is NOT listed among the considerations for choosing a business opportunity in section 3.4 of the note?': 'Section 3.4 lists cost of the opportunity, revenue potential, and match with personal goals among the considerations. The colour of office furniture is not a consideration.',
  'In the note, the requirement for a minimum professional license before an opportunity can be exploited falls under which consideration for choosing a business opportunity?': 'The note places licensing requirements under legal or regulatory constraints when choosing a business opportunity. The other options are different considerations.',
  'According to section 3.1 of the note, entrepreneurs commonly make the mistake of building a business around': 'Section 3.1 states that entrepreneurs commonly build a business around an idea without first confirming it is a viable opportunity. The other options describe correct approaches.',
  'According to the note, the best approach to opportunity recognition is to': 'The note advises identifying a product or service that the market needs and that matches your skills. The other options describe hasty or passive approaches.',
  'According to the note, a business idea, no matter how novel, cannot become a business opportunity if': 'The note states that an idea cannot become an opportunity if it does not meet the test of the market, that is, nobody needs it. The other options are not the condition.',
  'Which of the following is listed in the note among the \'possible business ideas\' in section 3.3.1?': 'Section 3.3.1 lists baby-sitting services among possible business ideas. The other options are not the examples given.',
  'According to the note, \'Consultants\' are described as a major source of business ideas because of their': 'The note describes consultants as a major source of business ideas because of their specialised knowledge and exposure. The other options are not the reasons given.',
  'Which of Module 3\'s learning objectives specifically mentions the ability to conduct a market survey to identify business opportunities?': 'Module 3\'s objective on conducting market surveys specifically requires the ability to identify business opportunities through market surveys. The other options are not among the objectives.',
  'According to the note, for an opportunity\'s window to be available, what condition is required?': 'The note states that the window is available only when the market is not already fully served by competitors. The other options are not the condition given.',
  'The note describes the ability to spot business opportunities that others miss as': 'The note describes spotting opportunities that others miss as a key entrepreneurial skill. The other options contradict the note.',
  'According to the note, which of the following is NOT one of the elements considered under \'Marketing\' in section 3.3.3?': 'Section 3.3.3 considers customer needs, price, and promotion under Marketing. Office rent is a cost element, not a marketing consideration.',
  'According to the note, a feasibility study is defined as': 'The note defines a feasibility study as a project study undertaken to determine the viability of a business idea before committing resources. The other options are unrelated documents.',
  'According to the note, a feasibility study is intended to answer how many basic questions?': 'The note states that a feasibility study answers five basic questions. The other numbers are incorrect.',
  'Which of the following is one of the five basic questions a feasibility study answers, as listed in the note?': 'The note lists \'Is there a sufficient market for the product or service?\' among the five basic questions. The other options are unrelated questions.',
  'According to the comparison table in the note, compared to a business plan, a feasibility study should be': 'The comparison table states that a feasibility study should be concise and short compared to the business plan. The other options contradict the table.',
  'According to the comparison table in the note, a feasibility study is typically conducted': 'The comparison table shows that a feasibility study is conducted before the business plan. The other options are wrong timing.',
  'According to the comparison table in the note, a business plan (unlike a feasibility study) focuses on': 'The comparison table shows that the business plan focuses on the how, when, and where of running the business, while the feasibility study focuses on whether to pursue the idea. The other options are not the contrast given.',
  'Which of the following is one of the objectives of a feasibility study listed in section 4.4 of the note?': 'Section 4.4 lists ascertaining the viability of the project before resources are committed among the objectives of a feasibility study. The other options are different activities.',
  'Under \'Exploring Feasibility\' in section 4.6 of the note, \'Economy\' refers to the ability of the new system to': 'Section 4.6 defines economy as the ability of the new system to reduce costs and be affordable. The other options are not the meaning given.',
  'Under \'Exploring Feasibility\' in the note, \'Control\' refers to': 'The note defines control as the extent to which the system can be controlled and managed. The other options are literal or unrelated meanings.',
  'Under \'Exploring Feasibility\' in the note, \'Performance\' refers to': 'The note defines performance as how well the new system achieves the desired results. The other options are unrelated meanings.',
  'Which type of feasibility study, discussed in the note, investigates whether an idea can be implemented considering the available technology, manpower, and time?': 'The note describes operational feasibility as considering whether the idea can be implemented with available technology, manpower, and time. The other options are different feasibility types.',
  'Which type of feasibility study, discussed in the note, uses cost-benefit analysis tools such as NPV (Net Present Value) and IRR?': 'The note describes economic feasibility as using cost-benefit tools such as NPV and IRR. The other options are different feasibility types.',
  'Which type of feasibility study investigates whether the mandatory deadlines for the project can be met?': 'The note describes scheduling feasibility as investigating whether mandatory deadlines can be met. The other options are different feasibility types.',
  'Which type of feasibility study investigates the existence of enough customers and demand for the product?': 'The note describes market feasibility as investigating the existence of enough customers and demand. The other options are different feasibility types.',
  'Which type of feasibility study establishes how the various stakeholders (employees, customers, suppliers) feel about the project?': 'The note describes operational feasibility as establishing how stakeholders feel about the project. The other options are different feasibility types.',
  'In the investment appraisal table in the note, \'the time required to recover the initial investment\' describes which criterion?': 'The note defines the time required to recover the initial investment as the Payback Period. The other options are different appraisal criteria.',
  'In the investment appraisal table, \'the difference between the present value of benefits and the present value of costs\' describes which criterion?': 'The note defines the difference between present value of benefits and costs as Net Present Value (NPV). The other options are different criteria.',
  'In the investment appraisal table, \'the discount rate that makes the net present value of all cash flows equal to zero\' describes which criterion?': 'The note defines the discount rate that makes NPV zero as the Internal Rate of Return (IRR). The other options are different criteria.',
  'In the investment appraisal table, \'the ratio of benefits to costs\' describes which criterion?': 'The note defines the ratio of benefits to costs as the Profitability Index. The other options are different criteria.',
  'In the note, \'Return on Investment\' (ROI) as an investment appraisal criterion measures': 'The note defines ROI as the profit generated from an investment relative to the amount invested. The other options describe other criteria.',
  'According to the feasibility study outline in the note, which section is \'a summary of all key sections of the feasibility study\'?': 'The note describes the Executive Summary as a summary of all key sections of the feasibility study. The other options are specific sections, not summaries.',
  'According to the feasibility study outline, which section \'lists the key managers, their titles, and responsibilities\'?': 'The note describes the Organization and Management section as listing key managers, their titles, and responsibilities. The other options are different sections.',
  'According to the feasibility study outline, which section describes the direct and indirect competition the business will face?': 'The note describes the Industry Analysis section as covering direct and indirect competition. The other options are different sections.',
  'According to the feasibility study outline, which section outlines the government regulations the business must comply with?': 'The note describes the Legal and Regulatory Requirements section as outlining government regulations the business must comply with. The other options are different sections.',
  'According to the note, the final recommendations section of a feasibility study should be': 'The note advises that the recommendations section should be clear, specific, and actionable. The other options contradict that advice.',
  'Which of the following is listed among the importance of feasibility studies in section 4.9 of the note?': 'Section 4.9 lists avoiding the waste of resources on non-viable projects among the importance of feasibility studies. The other options overstate what a feasibility study does.',
  'According to the note, the first step in conducting a feasibility study (section 4.10) is': 'Section 4.10 lists conducting a preliminary analysis as the first step in a feasibility study. The other options come later.',
  'Which step in the feasibility study process \'evaluates the market potential of the project and determines demand\'?': 'The note describes the market feasibility analysis as evaluating market potential and demand. The other options are different steps.',
  'Which step in the feasibility study process \'determines whether the business has access to the technology and equipment needed\'?': 'The note describes the technical feasibility analysis as determining access to technology and equipment. The other options are different steps.',
  'Which step in the feasibility study process \'considers the organizational structure, staffing requirements, and management team\'?': 'The note describes the organizational feasibility analysis as considering structure, staffing, and management. The other options are different steps.',
  'Which step in the feasibility study process \'involves preparing projected income statements, cash flow forecasts, and balance sheets\'?': 'The note describes the financial feasibility analysis as preparing projected income statements, cash flow forecasts, and balance sheets. The other options are different steps.',
  'According to the note, the final step of the feasibility study process is': 'The note states that the Go/No-Go Decision is the final step of the feasibility study process. The other options are earlier steps.',
  'In the note, SWOT is an acronym for': 'The note defines SWOT as Strengths, Weaknesses, Opportunities, and Threats. The other expansions are incorrect.',
  'In the SWOT analysis in the note, which two components are internal factors?': 'In SWOT analysis, strengths and weaknesses are internal factors. Opportunities and threats are external.',
  'In the SWOT analysis in the note, which two components are external factors?': 'In SWOT analysis, opportunities and threats are external factors. Strengths and weaknesses are internal.',
  'In the SWOT example in the note, \'insufficient capital\' and \'lack of entrepreneurial experience\' are classified under': 'Insufficient capital and lack of experience are internal negatives, so they are classified as weaknesses in SWOT. The other options are not the fit.',
  'In the SWOT example in the note, \'government incentives and grants\' and \'population growth\' are classified under': 'Government incentives and population growth are favourable external factors, so they are opportunities in SWOT. The other options are not the fit.',
  'In the SWOT example in the note, \'intense competition\' and \'political instability\' are classified under': 'Intense competition and political instability are unfavourable external factors, so they are threats in SWOT. The other options are not the fit.',
  'In the SWOT example in the note, \'strong managerial expertise\' and \'proprietary technology or patents\' are classified under': 'Strong managerial expertise and proprietary technology are internal positives, so they are strengths in SWOT. The other options are not the fit.',
  'In the SWOT analysis in the note, the key question for the \'Strengths\' component is': 'The note frames strengths with the question \'What does the business do well?\'. The other questions relate to other SWOT components.',
  'In the SWOT analysis in the note, the key question for the \'Threats\' component is': 'The note frames threats with the question \'What external factors could harm the business?\'. The other questions relate to other SWOT components.',
  'According to the note, a business plan is defined as': 'The note defines a business plan as a written document describing the nature of the business, the sales and marketing strategy, and the financial background, including a projected profit and loss statement. The other options are unrelated documents.',
  'According to the note, a business plan answers four core questions. Which of the following is one of them?': 'The note lists \'What is the current state of the business?\' among the four core questions a business plan answers. The other options are irrelevant questions.',
  'Which use of a business plan is described in the note as serving \'as a basis for discussion and communication with key stakeholders such as banks, investors, and partners\'?': 'The note lists communication as the use of a business plan for discussion with stakeholders. The other options are different uses.',
  'Which use of a business plan is described in the note as forcing \'an entrepreneur to clarify, focus, and research the viability of the business\'?': 'The note lists feasibility reassessment as forcing the entrepreneur to clarify, focus, and research viability. The other options are different uses.',
  'According to the note, \'no professional lender or investor will provide funding without seeing a well-developed business plan\' relates to which use of a business plan?': 'The note links lender and investor requirements to attracting debt or equity financing. The other options are different uses.',
  'Which use of a business plan provides \'management with an objective basis for making day-to-day decisions\'?': 'The note lists strategic guidance as providing an objective basis for day-to-day decisions. The other options are different uses.',
  'Which use of a business plan provides \'a framework against which actual performance can be measured\'?': 'The note lists benchmarking as providing a framework against which performance can be measured. The other options are different uses.',
  'According to the \'who reads a business plan\' table in the note, banks and lenders primarily look for': 'The table shows banks and lenders primarily looking for the ability to repay the loan and a strong cash flow. The other options are not what lenders look for.',
  'According to the \'who reads a business plan\' table, equity investors primarily look for': 'The table shows equity investors primarily looking for high growth potential and a good return on investment. The other options are not what equity investors look for.',
  'According to the \'who reads a business plan\' table, grant providers primarily look for': 'The table shows grant providers primarily looking for the social impact and how the grant will be used. The other options are not what grant providers look for.',
  'According to the \'who reads a business plan\' table, government agencies such as SMEDAN and NEXIM primarily look for': 'The table shows government agencies looking for job creation potential and compliance with government programmes. The other options are personal details, not business concerns.',
  'Which type of business plan, described in the note, is \'a one to three page summary of the key points\' of the business?': 'The note describes the mini plan as a one to three page summary of the key points. The other options are different plan types.',
  'Which type of business plan is \'the complete document with all the sections and detailed financials\' according to the note?': 'The note describes the standard (full) plan as the complete document with all sections and detailed financials. The other options are different plan types.',
  'Which type of business plan focuses on launching a new venture from zero?': 'The note describes the start-up plan as focusing on launching a new venture from zero. The other options are different plan types.',
  'Which type of business plan is described in the note as a \'detailed plan for the day-to-day running of the business\'?': 'The note describes the operational (internal) plan as the detailed plan for day-to-day running. The other options are different plan types.',
  'Which type of business plan is used for \'scaling an existing business to the next level\' according to the note?': 'The note describes the growth (expansion) plan as being used for scaling an existing business. The other options are different plan types.',
  'Which type of business plan \'tests whether an idea is worth pursuing before a full plan is written\'?': 'The note describes the feasibility plan as testing whether an idea is worth pursuing before a full plan is written. The other options are different plan types.',
  'According to the note, entrepreneurs are always advised to write their own business plans mainly in order to': 'The note advises entrepreneurs to write their own plans to understand the business deeply and take ownership. The other options are not the main reason given.',
  'According to the note, which section of a business plan is \'normally the largest part\'?': 'The note states that the situational analysis is normally the largest part of a business plan. The other options are shorter sections.',
  'Which section of a business plan \'defines where the entrepreneur wants to be in the next few years\'?': 'The note describes the business proposition as defining where the entrepreneur wants to be in the next few years. The other options are different sections.',
  'Which section of a business plan describes how the product/service will be packaged, promoted, priced, and distributed?': 'The note describes the marketing and sales plan as covering packaging, promotion, pricing, and distribution. The other options are different sections.',
  'According to the note, common risks for Nigerian SMEs include business risk, financial risk, legal and regulatory risk, and': 'The note lists business, financial, legal and regulatory, and operational risk as common risks for Nigerian SMEs. The other options are not the risks listed.',
  'Which financial statement in the note \'lists the assets and liabilities of the business at the beginning of the venture\'?': 'The note describes the balance sheet as listing the assets and liabilities at the beginning of the venture. The other options are different statements.',
  'Which financial statement in the note \'outlines the projected sales and expenses of the business over time\'?': 'The note describes the projected income statement (profit and loss) as outlining projected sales and expenses. The other options are different statements.',
  'Which financial statement in the note \'forecasts the cash inflows and outflows of the business\'?': 'The note describes the projected cash flow statement as forecasting cash inflows and outflows. The other options are different statements.',
  'According to the note, the break-even point is defined as': 'The note defines the break-even point as the point at which total revenue equals total cost, so there is no profit and no loss. The other options describe different situations.',
  'According to the note, the break-even point is calculated by dividing fixed costs by the': 'The note states that the break-even point is fixed costs divided by the contribution per unit (selling price minus variable cost). The other options are not the divisor.',
  'In the break-even worked example in the note, with a selling price of N1,000 and variable cost of N400, the contribution per unit is': 'Contribution per unit is selling price minus variable cost, which is N1,000 minus N400 equals N600. The other options are not the difference.',
  'In the break-even worked example in the note, with fixed costs of N300,000 and a contribution per unit of N600, the business must sell how many units per month to break even?': 'The break-even point in units is fixed costs divided by contribution per unit: N300,000 divided by N600 equals 500 units. The other options are wrong divisions.',
  'According to the note, \'gross profit as a percentage of revenue\' describes which key financial indicator?': 'The note defines gross profit as a percentage of revenue as the gross profit margin. The other options are different indicators.',
  'According to the note, \'net profit as a percentage of revenue\' describes which key financial indicator?': 'The note defines net profit as a percentage of revenue as the net profit margin. The other options are different indicators.',
  'According to the note, \'how long it takes for cumulative profit to recover the initial investment\' describes which key financial indicator?': 'The note defines the time for cumulative profit to recover the initial investment as the payback period. The other options are different indicators.',
  'According to the note, \'the net gain relative to the amount invested\' describes which key financial indicator?': 'The note defines the net gain relative to the amount invested as Return on Investment (ROI). The other options are different indicators.',
  'According to the note, which source of finance is \'the most common starting capital; it has no interest but is limited in size\'?': 'The note describes personal savings and family as the most common starting capital, with no interest but limited size. The other options are different sources.',
  'According to the note, which source of finance requires collateral and a strong business plan, and attracts interest?': 'The note describes commercial bank loans as requiring collateral and a strong business plan while attracting interest. The other options are different sources.',
  'According to the note, which source of finance is described as \'development finance for SMEs, often at concessional rates\' and is provided by institutions such as the Bank of Industry?': 'The note describes development banks such as the Bank of Industry as providing development finance for SMEs at concessional rates. The other options are different sources.',
  'According to the note, which source of finance is described as providing \'smaller loans for micro and small enterprises\', with examples such as NIRSAL and LAPO?': 'The note describes microfinance banks as providing smaller loans for micro and small enterprises, with NIRSAL and LAPO as examples. The other options are different sources.',
  'According to the note, which source of finance is \'non-repayable\' and is exemplified by the Tony Elumelu Foundation?': 'The note describes grants and competitions as non-repayable, with the Tony Elumelu Foundation as an example. The other options are repayable sources.',
  'According to the note, which source of finance is described as \'group savings and rotating credit\'?': 'The note describes cooperatives and thrift savings as group savings and rotating credit. The other options are different sources.',
  'According to the note, which source of finance is described as \'equity funding for high-growth, scalable ventures\' provided by individuals or firms who take shares?': 'The note describes angel investors and venture capital as equity funding for high-growth, scalable ventures in exchange for shares. The other options are different sources.',
  'According to the note, which source of finance involves suppliers allowing the business to pay for goods after delivery?': 'The note describes trade credit as suppliers allowing the business to pay for goods after delivery. The other options are different sources.',
  'According to the note, the vision of a business is described as the long-term aspiration, while the mission is described as': 'The note contrasts vision (long-term aspiration) with mission as the purpose and reason for the business\'s existence. The other options are not the definition of mission.',
  'According to the note, entrepreneurial finance is defined as': 'The note defines entrepreneurial finance as the application of financial management principles to the funding, investing, and operations of an entrepreneurial venture. The other options are unrelated to the definition.',
  'Unlike traditional corporate finance, entrepreneurial finance focuses on': 'The note states that entrepreneurial finance focuses on start-ups, growth companies, and early-stage ventures, unlike corporate finance. The other options describe corporate finance.',
  'According to the note, which source of entrepreneurial financing is divided into savings and inherited wealth?': 'The note divides personal savings into savings and inherited wealth. The other options are different sources.',
  'According to the note, an entrepreneur\'s willingness to sell off personal assets (such as cars and houses) is considered part of': 'The note treats selling personal assets as part of personal financing for the start-up. The other options are different sources.',
  'Which informal source of financing is popularly called Osusu or Esusu in Nigeria, according to the note?': 'The note identifies rotating savings and credit associations (ROSCA), popularly called Osusu or Esusu, as an informal source of financing. The other options are formal sources.',
  'According to the note, rotating credit schemes can be risky for members because they': 'The note warns that rotating credit schemes depend on trust, so members can disappear with the money. The other options are not the risk described.',
  'According to the note, trade credit is created when': 'The note states that trade credit is created when a new business buys raw materials or goods on credit from suppliers. The other options describe other financing mechanisms.',
  'In the note, trade credit is described as': 'The note describes trade credit as a common informal source of financing for new businesses. The other options are incorrect descriptions.',
  'According to the note, \'accruals\' as a source of financing refer to': 'The note defines accruals as amounts owed by the business for services already received but not yet paid for. The other options are different financing items.',
  'Which source of financing, described in the note, allows people to save gradually and obtain loans from their pooled funds?': 'The note describes microfinance institutions (MFIs) as allowing people to save gradually and obtain loans from pooled funds. The other options are different sources.',
  'Which of the following is listed among the reasons loans may not be granted in section 6.3 of the note?': 'Section 6.3 lists poor accounting records among the reasons loans may not be granted. The other options are not listed as reasons for denial.',
  'According to the note, \'inadequate lead time\' relates to': 'The note relates inadequate lead time to the entrepreneur applying for a loan too close to when the money is needed. The other options are literal or unrelated meanings.',
  'According to the note, which consideration for granting loans relates to determining whether the loan request matches the \'area and scope of operations\' of the lending institution?': 'The note relates the lender\'s area of operation to whether the loan request matches the area and scope of the lending institution. The other options are different considerations.',
  'Which consideration for granting loans, in the note, ensures that the loan amount is \'neither too small nor too big\' relative to the lender\'s limits?': 'The note relates the amount of the loan to ensuring it is neither too small nor too big relative to the lender\'s limits. The other options are different considerations.',
  'According to the note, the higher the proportion of equity in the capital structure of a business, the': 'The note states that a higher proportion of equity lowers the risk of bankruptcy because equity does not have to be repaid with interest. The other options contradict the note.',
  'Which consideration for granting loans relates to whether the entrepreneur can repay both principal and interest from the business\'s cash flow?': 'The note relates the ability to repay to whether the entrepreneur can repay principal and interest from the business\'s cash flow. The other options are different considerations.',
  'Which consideration for granting loans assesses the drive, track record, and qualifications of the entrepreneur?': 'The note relates the character of the entrepreneur to their drive, track record, and qualifications. The other options are different considerations.',
  'According to the note, the \'character\' consideration for loan approval relates to the entrepreneur\'s': 'The note relates the character consideration to the entrepreneur\'s honesty and integrity. The other options are personal attributes, not character as used in lending.',
  'According to the note, \'warehousing\' as a form of collateral security means': 'The note defines warehousing as storing finished goods in a warehouse as security for a loan, with the bank holding the title documents. The other options are literal or unrelated meanings.',
  'According to the note, \'domiciliation of payment\' as a condition for loans means': 'The note defines domiciliation of payment as directing the business\'s income to be paid into the lending bank\'s account to service the loan. The other options are literal or unrelated meanings.',
  'Which of the following is listed among the pitfalls in financing a business enterprise in section 6.5 of the note?': 'Section 6.5 lists using short-term funds to finance fixed assets among the pitfalls in financing a business. The other options are proper practices or different issues.',
  'In the note, using short-term funds to finance fixed assets is described as an error because it': 'The note uses the analogy of a square peg in a round hole: short-term funds must be repaid before the fixed asset yields returns, creating a cash-flow mismatch. The other options are not the reason given.',
  'Which pitfall in financing, described in the note, relates to entrepreneurs venturing into unrelated business activities too soon?': 'The note describes diversifying too early as venturing into unrelated business activities too soon. The other options are different pitfalls.',
  'Which pitfall in financing, described in the note, relates to taking money out of the business to meet increasing social and family commitments?': 'The note describes over-extraction of funds as taking money out of the business for social and family commitments. The other options are different pitfalls.',
  'Which challenge of entrepreneurial financing, discussed in the note, relates to commercial banks charging very high interest rates on loans?': 'The note lists high interest rates as a challenge where commercial banks charge very high rates on loans. The other options are different challenges.',
  'Which challenge of entrepreneurial financing, discussed in the note, relates to the continuous rise in the prices of goods and services?': 'The note lists inflation as the continuous rise in prices. The other options are different challenges.',
  'Which challenge of entrepreneurial financing, discussed in the note, relates to the lengthy, complicated, and bureaucratic loan application procedures?': 'The note lists bureaucracy as the lengthy, complicated loan application procedures. The other options are different challenges.',
  'Which challenge of entrepreneurial financing, discussed in the note, relates to entrepreneurs being required to offer bribes before loans are approved?': 'The note lists corruption as the requirement to offer bribes before loans are approved. The other options are different challenges.',
  'Which challenge of entrepreneurial financing, discussed in the note, relates to entrepreneurs lacking landed property, vehicles, or other acceptable collateral?': 'The note lists lack of collateral as entrepreneurs lacking acceptable security for loans. The other options are different challenges.',
  'Which challenge of entrepreneurial financing, discussed in the note, relates to entrepreneurs lacking adequate knowledge of financial management?': 'The note lists low financial literacy as entrepreneurs lacking adequate knowledge of financial management. The other options are different challenges.',
  'Which challenge of entrepreneurial financing, discussed in the note, relates to frequent and unpredictable changes in taxation, foreign exchange, and other policies?': 'The note lists regulatory instability as frequent and unpredictable policy changes. The other options are different challenges.',
  'According to the note, entrepreneurial financing refers to the various ways an entrepreneur can': 'The note defines entrepreneurial financing as the various ways an entrepreneur can raise funds to start and grow a business. The other options are unrelated meanings.',
  'According to the note, the sources of financing that entrepreneurs commonly use depend largely on': 'The note states that the sources of financing depend largely on the stage of the business and its needs. The other options are irrelevant factors.',
  'According to the note, as the size of a business increases, research shows that the proportion of capital accounted for by personal savings': 'The note states that as the business grows, the proportion of capital from personal savings decreases because external sources become more important. The other options contradict the note.',
  'Which personal assets does the note mention as examples that can be sold or used as capital for a start-up?': 'The note mentions cars, houses, and land as personal assets that can be sold or used as start-up capital. The other options are business assets or securities.',
  'Which source of financing, described in the note, is commonly relied upon by new entrepreneurs and specifically refers to family members and relations providing funds?': 'The note identifies family members and relations as a commonly relied-upon source of financing for new entrepreneurs. The other options are external sources.',
  'In the note, poor accounting records are cited as a reason loans are denied because': 'The note states that poor accounting records cause denial because lenders cannot verify the financial health of the business. The other options contradict the note.',
  'According to the note, corruption weakens entrepreneurial financing partly by': 'The note states that corruption increases the cost of accessing loans and discourages lenders. The other options claim the opposite.',
  'According to the note, weak financial literacy among entrepreneurs often results in': 'The note states that weak financial literacy results in poor financial decisions and higher failure rates. The other options claim the opposite.',
  'According to Module 6\'s learning objectives, students should be able to apply entrepreneurial financing concepts to': 'Module 6\'s learning objectives require students to apply entrepreneurial financing concepts to practical business scenarios. The other options are not part of the objective.',
}

const existing = JSON.parse(readFileSync(join(__dirname, 'ent211-mcq.json'), 'utf-8'))
const existingQuestions = new Set()
for (const s of existing.sections) {
  for (const q of s.questions) existingQuestions.add(q.question)
}

const sectionMap = new Map()
let missing = 0
let dupes = 0
const total = BANK.length

for (const b of BANK) {
  const sectionTitle = SECTION_TITLE[b.m]
  if (!sectionTitle) {
    console.error('UNKNOWN MODULE:', b.m)
    process.exit(1)
  }
  const modNum = MODULE_NUM[b.m]
  if (!sectionMap.has(b.m)) sectionMap.set(b.m, { title: sectionTitle, questions: [] })
  const entry = sectionMap.get(b.m)
  entry.questions.push({
    raw: b,
    modNum,
  })
}

const seen = new Set()
let bankSeq = 0
for (const [m, sec] of sectionMap) {
  sec.questions.forEach((item, i) => {
    if (existingQuestions.has(item.raw.q)) {
      dupes++
      return
    }
    const key = item.raw.q
    if (seen.has(key)) {
      dupes++
      return
    }
    seen.add(key)
    bankSeq++
    const explanation = EXPLAIN[item.raw.q]
    if (!explanation) {
      missing++
      console.error('MISSING EXPLANATION:', item.raw.q.slice(0, 80))
    }
    const sh = shuffledOptions(item.raw.o, item.raw.a, mulberry32(20260813 + bankSeq))
    sec.questions[i].doc = {
      id: `ENT-M${item.modNum}-B${String(bankSeq).padStart(3, '0')}`,
      question: item.raw.q,
      options: sh.options,
      correct_answer: sh.correctAnswer,
      explanation: explanation || 'The correct option is the one that matches the description given in the lecture note.',
    }
  })
}

const outSections = []
let totalOut = 0
for (const [m, sec] of sectionMap) {
  const qs = sec.questions.map(x => x.doc).filter(Boolean)
  totalOut += qs.length
  outSections.push({ section_title: sec.title, questions: qs })
}

const out = {
  course_code: 'ENT 211',
  course_title: 'Entrepreneurship and Innovation',
  study_guide_title: 'ENT 211 Comprehensive Question Bank (All Six Modules)',
  sections: outSections,
}

writeFileSync(join(__dirname, 'ent211-bank.json'), JSON.stringify(out, null, 2), 'utf-8')

console.log(`Total BANK questions: ${total}`)
console.log(`Duplicates skipped: ${dupes}`)
console.log(`Missing explanations: ${missing}`)
console.log(`Output questions: ${totalOut}`)
for (const s of outSections) console.log(`  ${s.section_title}: ${s.questions.length}`)
