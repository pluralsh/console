CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY,
  doc_id TEXT,
  embedding vector(512) NOT NULL,
  datatype TEXT NOT NULL,
  data JSONB NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  user_ids TEXT[] NOT NULL DEFAULT '{}',
  group_ids TEXT[] NOT NULL DEFAULT '{}',
  inserted_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS embeddings_doc_id_idx ON embeddings (doc_id);
CREATE INDEX IF NOT EXISTS embeddings_datatype_idx ON embeddings (datatype);
CREATE INDEX IF NOT EXISTS embeddings_inserted_at_idx ON embeddings (inserted_at);
CREATE INDEX IF NOT EXISTS embeddings_user_ids_idx ON embeddings USING GIN (user_ids);
CREATE INDEX IF NOT EXISTS embeddings_group_ids_idx ON embeddings USING GIN (group_ids);
CREATE INDEX IF NOT EXISTS embeddings_embedding_hnsw_idx ON embeddings USING hnsw (embedding vector_cosine_ops);
