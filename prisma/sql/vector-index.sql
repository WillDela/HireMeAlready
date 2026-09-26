-- Applied separately from migrations (`npm run db:vector-index`) because Prisma can't
-- represent HNSW indexes and would try to drop one declared in a migration.
-- Only matters for speed once there are thousands of resumes; safe to re-run.
CREATE INDEX IF NOT EXISTS resume_embedding_hnsw ON resume USING hnsw (embedding vector_cosine_ops);

-- Stretch (Tiger Data showcase): pgvectorscale's StreamingDiskANN instead of HNSW.
-- CREATE EXTENSION IF NOT EXISTS vectorscale CASCADE;
-- CREATE INDEX IF NOT EXISTS resume_embedding_diskann ON resume USING diskann (embedding vector_cosine_ops);
