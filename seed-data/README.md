# seed-data/

Per-course seeders + theory/reference JSONs.

- `*-theory.json` — theory questions, references, readings source.
- `*-mcq.json` — cleaned MCQ banks (e.g. `ent211-*`, `clp211-*`, `mls161-*`).
- `seed-*.mjs` — one seeder per course. Run individually:
  `node seed-data/seed-phy108.mjs` (needs `MONGODB_URI`).
- `seed-all.mjs` — bulk seeder for the 100-level set (PHY 102, CSC 102/162/182/203,
  GSS 112, BCM 242). Reads MCQ from `../data/courses/`, theory from here.
- `register-*.mjs`, `build-*.mjs`, `combine-*.mjs`, `gen-*.mjs`, `fix-*.mjs` —
  builders/transformers that produced the banks. Keep for provenance.
- `cos202-exam-2024-2025.txt`, `csc282-exam-2024-2025.txt`, `ins202-exam-2024-2025.txt` —
  raw exam pastes used to build banks.

Convention: seeders resolve MCQ via
`join(__dirname, '..', 'data', 'courses', file)` and theory via
`join(__dirname, theoryFile)`.
