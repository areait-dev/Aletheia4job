-- ROLLBACK di 20261111140000_add_search_trgm_indexes (NON eseguito). L'estensione pg_trgm resta installata.
-- Poi: npx prisma migrate resolve --rolled-back 20261111140000_add_search_trgm_indexes
DROP INDEX IF EXISTS "Candidate_firstName_trgm_idx", "Candidate_lastName_trgm_idx", "Candidate_email_trgm_idx",
  "Candidate_city_trgm_idx", "Candidate_role_trgm_idx", "Candidate_sector_trgm_idx", "Candidate_skills_trgm_idx";
