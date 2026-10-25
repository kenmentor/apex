import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const P2 = {
  id: 'UNICAL-P2',
  year: '2025',
  qs: [
    ['Which of the following is a cause of hospital acquired acute kidney injury?', ['Acute post-operative haemorrhage', 'Indomethacin', 'Diabetes mellitus', 'HIV infection'], [0]],
    ['Which of these parameters of clinical diagnostic performance is used for screening?', ['Clinical sensitivity', 'Clinical Specificity', 'Positive predictive value', 'Negative predictive value'], [0]],
    ['Which of these is not applicable to hormones?', ['Hormones are synthesized by ductless glands.', 'They act on target organs', 'All hormones need second messenger', 'Tetraiodothyronine is amino acid derived'], [2]],
    ['Which of these is a pre-analytical factor that can cause factitiously elevated protein?', ['The use of EDTA bottle', 'Patient\'s posture in phlebotomy', 'Tourniquet time', 'Size of blood collection needle'], [3]],
    ['The following is not a product of phenylalanine hydroxylase deficiency:', ['Phenyllactic acid', 'Phenylacetic acid', 'Phenylpyruvic acid', 'Phenyluric acid'], [3]],
    ['Which of these drugs is not indicated for Therapeutic Drug Monitoring?', ['Digoxin', 'Carbamazepine', 'Piroxicam', 'Salbutamol'], [2]],
    ['Which of these methods is suitable treatment of aspirin toxicity?', ['Use of antidotes', 'Alkalinization of urine', 'Activated charcoal', 'Peritoneal dialysis'], [1, 2]],
    ['Which of the following is not a component of pharmacokinetics?', ['Half life of the drug', 'Sublingual route of administration', 'First pass effect', 'Drug elimination'], [0]],
    ['Which of these supports absorption of calcium in GIT?', ['Cortisol', 'Gluten intake', 'Calcitriol', 'Calcitonin'], [2]],
    ['Which of these drugs can cause nephrogenic diabetes insipidus?', ['Gentamycin', 'Erythromycin', 'Lithium', 'Ciprofloxacin'], [2]],
    ['Which of these parameters cannot be applied in decision making for a patient with diabetes mellitus?', ['Critical value', 'Diagnostic principle', 'Reference interval', 'Diagnostic criteria'], [1]],
    ['Which of these cannot cause Pancreatitis?', ['Severe diarrhoea', 'Alcohol', 'Hypercalcaemia', 'Gall stone'], [0]],
    ['Which of these is not needed in the calculation of Creatinine clearance?', ['Time of the day', 'Urine volume', 'Patient age', 'Plasma Creatinine'], [0]],
    ['What is Cockroff and Gault formula used for?', ['Creatinine clearance', 'Creatinine estimation', 'Measurement of Glomerular filtration rate', 'Estimated glomerular filtration rate'], [3]],
    ['Anaemia is a condition resulting from:', ['Stage 2 chronic kidney disease', 'Stage 3a chronic kidney disease', 'Stage 3b chronic kidney disease', 'Stage 4 chronic kidney disease'], [2]],
    ['All of these except one is involved in innate immunity:', ['Natural killer cell', 'Dendritic cell', 'Cytotoxic T cell', 'Neutrophil'], [2]],
    ['Which of these functions of the kidney is homeostatic?', ['Metabolism', 'Acid-base balance', 'Excretion', 'Endocrine'], [1]],
    ['Which of these cells plays a pivotal role in antigen presentation?', ['Dendritic cells', 'B lymphocytes', 'Helper T cells', 'Macrophages'], [0]],
    ['Which of these is a benefit of passive natural immunization before birth?', ['Prevention of Tetanus in pregnancy', 'Prevention of Rhesus incompatibility in pregnancy', 'Prevention of autoimmune disease in pregnancy', 'Prevention of poisoning from scorpion bite in pregnancy'], [0]],
    ['Which of these hormones does not have cholesterol branch chain?', ['Testosterone', 'Cortisol', 'Progesterone', 'Thyroxine'], [3]],
    ['Which of these disease conditions is associated with hypocalcaemia?', ['Paget\'s disease of the bone', 'Osteitis fibrosa cystica', 'Osteomalacia', 'Osteoporosis'], [2]],
    ['Which of these does not affect laboratory results?', ['Male gender', 'Routine night duty', 'Patient\'s height', 'Patient\'s age'], [2]],
    ['Which of these is found in stomach?', ['Ghrelin', 'Gastrin', 'Preline', 'Statin'], [0]],
    ['Which of these urine preservatives is specific for uric acid?', ['Thymol', '20% formal saline', 'Boric acid', 'Concentrated hydrochloric acid'], [3]],
    ['Which of these complement proteins are involved in Classical pathway?', ['2a, 3a and 5a', '3a, 5a and 5b form membrane attack complex', 'C5, 6, 7, 8, 9', 'Complements C1, C2, C3, C4'], [0, 3]],
    ['Concerning Oral glucose tolerance test, impaired glucose tolerance is a feature of all except:', ['Use of combined oral contraceptives', 'Acromegaly', 'Adrenal hyperfunction', 'Thyrotoxicosis'], [3]],
    ['Regarding OGTT curves, flat curve can be found in:', ['Gastrectomy', 'Malabsorption syndrome', 'Late Pregnancy', 'Diabetes mellitus'], [1]],
    ['Anthropometric measurements adopted for the management of diabetes mellitus include all except:', ['Waist circumference', 'Waist-hip ratio', 'Body Surface Area', 'Hip circumference'], [2]],
    ['Insulin independent glucose uptake cells include all except:', ['Brain', 'Liver cells', 'Kidney', 'Muscle'], [3]],
    ['Regarding insulin:', ['Increased levels are seen in insulinoma', 'Increased C-peptide are seen in insulinoma', 'C-peptide levels are low in exogenous insulin administration', 'Elevated C-peptide levels are seen in hypoglycemia'], [0, 2]],
    ['Endocrine conditions associated with the etiology of diabetes mellitus include all except:', ['Glucagonoma', 'Conn\'s syndrome', 'Hypothyroidism', 'Phaeochromocytoma'], [2]],
    ['Which of the following investigations cannot be used to differentiate between type 1DM and Type 2 DM?', ['C-peptide', 'Fasting insulin assay', 'Insulin autoantibodies', 'Oral glucose tolerance test'], [3]],
    ['Medications capable of enhancing hyperglycemia include all except:', ['Propanolol', 'Thiazides', 'Dexamethasone', 'Saxagliptin'], [3]],
    ['The causes of hyperprolactinemia include all except:', ['Polycystic ovarian syndrome', 'Dopamine agonist', 'Hypothyroidism', 'Chronic kidney disease'], [1]],
    ['In adults, the auto antibodies used for assessing patients with type 1DM all except include:', ['Glutamic acid decarboxylase 65', 'Zinc transporter 8 autoantibody', 'Islet cell cytoplasmic autoantibodies', 'Insulinoma associated auto antibody'], [3]],
    ['Causes of raised cortisol levels include:', ['Severe alcohol intake', 'Obesity', 'Endogenous depression', 'Addison\'s diseases'], [2]],
    ['Findings that are usually seen in diabetic ketoacidosis include all except:', ['Hyperglycemia', 'Hyponatremia', 'Increased osmolality', 'Hypophosphatemia'], [1]],
    ['Risk factors for gestational diabetes mellitus (GDM):', ['Macrosomia', 'A previous GDM', 'Body mass index greater than 30kg/m2', 'Positive family history of gestational diabetes mellitus'], [3]],
    ['Concerning diabetes mellitus, which option below is false?', ['HLA DR2 is protective against diabetes mellitus', 'HLA DR3/DR4 are associated with type 1DM', 'Hereditary spherocytosis patients with well controlled glucose can have glycated hemoglobin assay done', 'Type 1DM is less common than Type 2 DM'], [2]],
    ['Findings associated with primary aldosteronism include:', ['Hyperkalemia', 'Kaliuria', 'Hyponatremia', 'Metabolic acidosis'], [1]],
    ['The aetiology of Cushing\'s syndrome is associated with all except:', ['Cushing\'s diseases', 'Idiopathic cause', 'Iatrogenic Steroid use', 'Ectopic ACTH production'], [1]],
    ['Patient results: Na=118 mmol/L, K=5.9 mmol/L, early morning cortisol=89 umol/L, buccal mucosa pigmentation present. What is the most likely diagnosis?', ['Addison\'s disease', 'Adrenal crisis', 'Conn\'s syndrome', 'Cushing\'s syndrome'], [0]],
    ['Which of the following is not a point of care testing device?', ['i-stat', 'Alere epoch', 'Weighing scale', 'Ovulation test kit'], [2]],
    ['Neuroglycopenic symptoms of hypoglycemia include:', ['Tremor', 'Pallor', 'Convulsion', 'Tachycardia'], [2]],
    ['Microvascular complications of diabetes mellitus include:', ['Coronary artery disease', 'Stroke', 'Lactic acidosis', 'Retinopathy'], [3]],
    ['The following facts about diabetes mellitus holds true:', ['Insulinopenia is a constant feature of type 2 DM', 'Cellular mediated immunity by CD8 T-cells and macrophages underlies the pathophysiology of Type 1 DM', 'Type 2DM is accelerated by environmental factors more than genetic factors', 'Latent autoimmune diabetes in adults (LADA) is a form of type 2 DM'], [1]],
    ['One of the following assesses ovulation in the luteal phase of the menstrual cycle:', ['Day 21 progesterone', 'Follicle stimulating hormone', 'Antimullerian hormone', 'Gonadal assay'], [0]],
    ['One of the following is not a marker of ovarian reserve:', ['Antimullerian hormone', 'Basal serum oestradiol', 'Basal serum follicle stimulating hormone', 'Thyroid stimulating hormone'], [3]],
    ['Concerning fertility, which statement below is wrong?', ['Sperm count expected to enhance fertility in men is >=20million', 'Oncofertility enables cancer patients to still have their own children after cancer survival following treatment', 'A hormonal test of LH/FSH ratio greater than 3 can cause infertility in women of child bearing age', 'Severe hyperthyroidism can lead to hyperprolactinemia'], [2]],
    ['Which of the following statements holds true?', ['Normal fasting plasma glucose is 3.5-5.0mmol/L', 'Insulin resistance is a complication of diabetes mellitus', 'The most useful tool in the diagnosis of hyper- and hypothyroidism is free T4', 'Whipple\'s triad is diagnostic of hypoglycemia'], [3]],
  ]
}

const P1 = {
  id: 'UNICAL-P1',
  year: '2025',
  qs: [
    ['Metabolic acidosis is primarily a problem of:', ['Excess bicarbonate', 'Base deficit', 'Excess hydrogen ions', 'Acid deficit'], [1, 2]],
    ['Types of automation do not include:', ['Total laboratory automation', 'Modular integrated system', 'Mid-end automation', 'Stand-alone automation'], [2]],
    ['An effective physiologic buffer is:', ['Buffer with pKa closer to the pH of plasma', 'Buffer with high pKa', 'Buffer with low pKa', 'All of the above'], [0]],
    ['A goal of automation is to:', ['Prolong turnaround time', 'Shortened turnaround time', 'Eliminate turnaround time', 'Increase turnaround time'], [1]],
    ['Conjugated hyperbilirubinaemia is seen in a congenital disorder such as:', ['Lucey Driscoll disease', 'Rotor syndrome', 'Crigler Najjar syndrome', 'Gilbert\'s disease'], [1]],
    ['Investigations that are helpful in the management of diabetic patients include all except:', ['Fasting lipid profile', 'Glycated hemoglobin', 'Microalbuminuria', 'Heparin assay'], [3]],
    ['Which of the following is likely to cause hyponatraemia?', ['Failure to drink', 'Diuretic therapy', 'Diabetes insipidus', 'Cushing\'s syndrome'], [1]],
    ['One of these represents post-collection analytical variables:', ['Blood samples for bilirubin assay require transport in an ice slurry to avoid haemolysis', 'Centrifuge performance should be checked periodically', 'Specimen should be stored at 2-8°C if analysis is delayed', 'Choosing the appropriate sample bottle is critical'], [2]],
    ['De Ritis ratio is:', ['The relationship of AST and ALT in the cytosol', 'The relationship of AST and ALP in the cytosol', 'The relationship of AST and ALT in the mitochondria', 'Relevant in the discrimination of chronic liver cirrhosis from chronic hepatitis'], [3]],
    ['Chain of custody:', ['Is important in tracing results outcome', 'Is important in forensic samples', 'Is the collection of evidence for medicolegal reasons', 'Is the ability to safeguard samples'], [2]],
    ['Sample collected in the following container will not cause pseudohypernatraemia:', ['Sodium heparin bottle', 'Sodium citrate bottle', 'Lithium heparin bottle', 'Heparinized sodium bottle'], [2]],
    ['Lesch Nyhan syndrome is:', ['X-link recessive', 'Autosomal dominant', 'Autosomal recessive', 'X-link dormant'], [0]],
    ['In hyperuricaemia:', ['Xanthine oxidase activity is defective', 'Xanthine reductase is impaired', 'The salvage pathway is not affected', 'Uricase activity is low'], [0]],
    ['All acute porphyrias are not autosomal recessive except:', ['Acute intermittent porphyria', 'Hereditary coproporphyria', 'Amino levulonic acid dehydratase deficiency porphyria', 'Porphyria variegata'], [2]],
    ['The following is autosomal recessive:', ['ALA dehydratase deficiency porphyria', 'Porphyria cutanae tarda', 'Protoporphyria', 'Congenital erythropoietic porphyria'], [3]],
    ['Coproporphyrin and protoporphyrin can be used to differentiate between:', ['Variegate porphyria and hereditary coproporphyria', 'Porphyria variegata and congenital erythropoietic porphyria', 'Porphobilinogen and amino levulonic acid', 'Porphyria cutanae tarda and Gunther\'s disease'], [0]],
    ['Concerning heme biosynthesis:', ['Porphobilinogen is synthesized in the mitochondria', 'Condensation of SCoA and glycine is necessary', 'Heme synthesis is regulated by positive feedback inhibition', 'Protoporphyrinogen is the oxidized form of protoporphyrin'], [1]],
    ['Which of the following can be demonstrated in faecal sample?', ['Uroporphyrin', 'Protoporphyrin', 'Corproporphyrinogen oxidase', 'Congenital erythropoietic porphyria'], [1]],
    ['Conjugated hyperbilirubinaemia is present in one of the following conditions:', ['Lucey Driscoll disease', 'Gilbert\'s syndrome', 'Criggler Najjar syndrome type 2', 'Dubin Johnson syndrome'], [3]],
    ['Bilirubin from non-haemoglobin sources is:', ['Delta bilirubin', 'Indirect bilirubin', 'Shunt bilirubin', 'Gamma bilirubin'], [2]],
    ['The most water soluble porphyrin is:', ['Uroporphyrin', 'Corproporphyrin', 'Protoporhyrin', 'Erythroporphyrin'], [0]],
    ['Acute porphyrias have neurovisceral symptoms and are commoner in:', ['Adults', 'Boys', 'Women', 'Men'], [2]],
    ['Accessioning is:', ['Pre-collection pre-analytical variable', 'Post-collection pre-analytical variable', 'Post-analytical pre-collection variable', 'Collection pre-analytical variable'], [0]],
    ['Physiological jaundice:', ['Appears within 24 hours', 'Appears within 28 days', 'Appears within 48 hours', 'Appears after 48 days'], [2, 3]],
    ['Pathological jaundice may result from one of the following:', ['ABO compatibility', 'Rhesus compatibility', 'Congenital hepatitis', 'Breast milk effect'], [2]],
    ['The most soluble purine metabolite is:', ['Uric acid', 'Urate', 'Allantoin', 'Monosodium urate'], [2]],
    ['One of these is a uricosuric agent:', ['Allantoin', 'Probenecid', 'Allopurinol', 'Hydrochlorothiazide'], [1]],
    ['Concerning transcellular fluid:', ['Interstitial fluid compartments exchange freely', 'CSF glucose timing after LP', 'In newborns CSF protein is 3 times adult level', 'Ascitic fluid is an example of transcellular fluid'], [2]],
    ['Light\'s criteria for exudate except:', ['Pleural fluid LDH >200 IU/L', 'Pleural fluid LDL > 200 mg/dL', 'Pleural fluid plasma protein ratio >0.5', 'Pleural fluid:plasma LDH ratio > 0.6'], [1]],
    ['Ascitic fluid examination:', ['SAAG sensitivity', 'Primary bacterial peritonitis ALP', 'Ascetic fluid/serum LDH ratio >0.6', 'Lactate levels in hepatic/malignant ascites'], [2]],
    ['Changes in renal function in pregnancy:', ['Serum creatinine is significantly (70%) lower during pregnancy', 'eGFR usually increased', 'Urate levels pattern', 'Urea levels remain same'], [0]],
    ['Metabolic changes in pregnancy:', ['Glycosuria is not clinically significant', 'Low density cholesterol', 'Plasma aldosterone concentration increase 10-15 fold', 'Cholesterol and triglyceride levels increase'], [0]],
    ['Biochemical markers of cardiac disease:', ['50-70% total CK as CK-MB', 'Myoglobin short half-life', 'Highly sensitive methods detect troponins', 'Elevated troponin levels suggestive of IHD'], [2]],
    ['Novel markers of acute coronary syndrome include the following except:', ['Apolipoprotein B-100', 'Lipoprotein(a)', 'Coronary artery calcium', 'Fibrinogen'], [2]],
    ['High BNP levels in absence of CCF except:', ['Age', 'Sex', 'Myocardial infarction', 'Lung disease'], [3]],
    ['Low BNP levels with CCF include all except:', ['Stable NYHA class 1 patient with high EF', 'Obesity', 'CCF secondary to upstream causes', 'Flash pulmonary oedema'], [0]],
    ['Gastrin has a stimulatory effect on:', ['Gastric acid secretion by G-cells', 'Gastric motility and bowel mucosa growth', 'Gastric pepsinogen', 'Pancreatic bicarbonate'], [0]],
    ['Raised gastrin level associated with all except:', ['Hypercalcaemia', 'Achlohydria', 'Treatment with H2 agonist', 'Zollinger-Ellison syndrome'], [1]],
    ['Characteristics that will NOT enhance Immunogenicity:', ['Molecular Size', 'Shape', 'Conformation and accessibility', 'Complexity'], [1]],
    ['Positive criteria for diagnosis of metabolic syndrome except:', ['Low HDL-C <40 mg/dL M, <50 mg/dL F', 'Patient on insulin', 'BMI >30 kg/m2 or WC >102 M, >88 F', 'Patient of fibrates'], [1]],
    ['Analytical factors improving quality in chemical pathology lab except:', ['Reagent storage at 2-8°C', 'Frequent equipment maintenance', 'Appropriate QC materials', 'Freezer storage at -20°C for unanalyzed samples'], [3]],
    ['Presence of substances in high concentration resulting in high osmolal gap except:', ['Glucose', 'Ethanol', 'Lactate', 'Mannitol'], [0]],
    ['Hyponatremia:', ['Associated with low osmolality', 'Caused by diarrhea with hypokalemic acidosis', 'Pseudohyponatremia with hypoglycemia', 'SIADH mechanism'], [1]],
    ['Hypernatremia associated with following conditions except:', ['Conn\'s syndrome', 'Cushing syndrome', 'None of the above', 'Sodium bicarbonate infusion'], [2]],
    ['Hyperkalemia is likely to result from following conditions except:', ['Patients taking non-steroidal anti-inflammatory drugs (NSAID)', 'Burns', 'Hyperglycemia', 'Addison\'s disease'], [1]],
    ['Hypokalemia is likely to result from following conditions except:', ['Diarrhea', 'Primary aldosteronism (Conn\'s syndrome)', 'Oral contraceptive therapy', 'Periodic paralysis'], [2]],
    ['Very low density lipoprotein:', ['Synthesized in liver', 'Assayed from plasma by routine methods', 'Reflect light and account for turbidity', 'Contain apo B-100 as major lipoprotein'], [3]],
    ['Low density lipoprotein:', ['May be low in severe haemolysis due to dilutional effect', 'Levels same in males and females', 'Grossly affected by fasting', 'All of the above'], [1]],
    ['Concerning lipids:', ['Phospholipids contain two fatty acid residues 14-24 C long and are amphipathic', 'Cholesterol converted in adrenals and testes', 'Poly-unsaturated fatty acid double bonds', 'Triglycerides derived from animals'], [0]],
    ['Obesity:', ['Up to 20% subcutaneous adipose tissue needed', 'BMR accounts for 60-65% daily energy expenditure', 'About 0.2 kg liver fat required for insulin resistance', 'ob gene mutation'], [1]],
  ]
}

const P4 = {
  id: 'UNICAL-P4',
  year: '2024',
  qs: [
    ['Low density lipoprotein (LDL):', ['It is more cholesterol rich than other apo B-containing lipoproteins', 'Metabolism through receptor-dependent pathway results in formation of foam cells', 'They can scatter light and are responsible for turbidity of post prandial plasma', 'Small dense LDL are relatively triglyceride poor'], [0]],
    ['Concerning Diabetes Mellitus, one of these methods is used to measure glucose routinely in UCTH:', ['Glucose oxidase method', 'Glucose dehydrogenase method', 'Glucose pyruvate method', 'Glucose Hexokinase method'], [0]],
    ['Concerning complications of Diabetes Mellitus:', ['Hypoglycemia is a concern following treatment', 'Glucose is decreased in hyperosmolar hyperglycemic state', 'Plasma glucose in DKA is greater than in hyperglycemic hypoglycemic state', 'Prolactin levels are moderately high'], [0]],
    ['Concerning drug management of diabetes mellitus:', ['High C-peptide levels are seen in exogenous insulin administration', 'Lente insulin administration leads to hyperinsulinemic hyperglycemia', 'Growth hormone excess are usually seen in some forms of diabetes', 'MEN syndrome type 2 is a distinct complication'], [2]],
    ['A 40-year-old female with anterior neck mass has TSH 100 IU/L, fT4 20 pmol/L, fT3 25 pmol/L. The most accurate diagnosis is:', ['Sick euthyroid syndrome', 'Subclinical hypothyroidism', 'Thyroid hormone resistance', 'Primary hypothyroidism'], [2]],
    ['Cholesterol:', ['Cholesterol esters do not contain polar groups making them hydrophobic', 'They are synthesized by all cells of the body', 'Insulin inhibits HMG-CoA reductase activity', 'It is a very good source of fuel'], [0]],
    ['One of the following conditions predisposes to hypoglycaemia:', ['Acanthosis nigricans', 'Polycystic ovarian syndrome', 'Phaeochromocytoma', 'Insulinoma'], [3]],
    ['Laboratory findings seen in diabetic ketoacidosis include:', ['Hypoglycaemia', 'Stress', 'Trauma', 'Ketonuria'], [3]],
  ]
}

const papers = [P2, P1, P4]

let n = 0
const questions = []
for (const p of papers) {
  for (const [question, options, correct] of p.qs) {
    n++
    questions.push({
      id: `CLP-U${String(n).padStart(3, '0')}`,
      year: p.year,
      question,
      options,
      correct_answer: correct.length === 1 ? correct[0] : correct,
      xmulti: correct.length > 1,
    })
  }
}

const sections = [
  {
    section_title: 'Medical Student',
    year: 'all',
    questions: shuffle(questions),
  },
]

writeFileSync(join(__dirname, 'clp211-unical-mcq.json'), JSON.stringify({ sections }, null, 2))
console.log('Written', questions.length, 'questions (shuffled)')