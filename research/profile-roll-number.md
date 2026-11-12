# Profile details from VIT roll numbers

2026-10-20. Boss requested the VERP rules and exactly Bio-med, EXCS, EXTC, CMPN and IT for vboard profiles.

Reference: [VERP roll-number implementation](https://github.com/voss-labs/verp/blob/963d54704c09ceb7ae3feb280acaf83e0ffa8ba3/src/lib/roll-number.ts) and its tests at the same commit.

- Format: two admission-year digits, three branch digits, one division letter and four class-number digits, for example `23108A0054`.
- Codes: 101 IT, 102 CMPN, 104 EXTC, 105 BIOMED and 108 EXCS. Legacy 103 also maps to EXCS. Bio-med is the display label for BIOMED.
- Any division letter A–Z is accepted for every branch; the number of divisions changes by batch and is not validated. An earlier rule (C only for IT and CMPN, nothing past C) rejected a real first-year EXCS roll number (`26108C0085`, 2026-11-12). Unlike VERP's college-wide importer, this profile boundary rejects unknown branches because only these five departments are supported.
- Class numbers from 2000 indicate direct-second-year admission. Their academic cohort starts one year before their admission year.
- Academic years progress FE/SE/TE/BE at the June boundary. Outside those four years, no current year is inferred. Admission data alone does not establish graduation or repeated-year status.

The profile shows live, read-only department, division and academic year. The server validates and normalizes the roll number and derives the persisted department independently. Division and academic year are derived rather than stored, so year advancement needs no database migration. The render date uses the campus calendar and stays consistent during hydration.

Existing profiles are preserved until edited. Legacy roll formats need correction on edit; an empty roll remains allowed for profiles without student details. Bio editing, actor-bound writes and existing transactional audit remain in place. No production data migration, reseed or auth change is needed.
