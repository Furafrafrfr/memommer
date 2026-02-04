// Types
export type { EmbeddingFn } from "./types.js";

// Chroma implementation
export { createChromaSearch } from "./chroma/index.js";
export type { ChromaSearchConfig } from "./chroma/index.js";

// SQLite implementation
export { createSqliteSearch } from "./sqlite/index.js";
export type { SqliteSearchConfig } from "./sqlite/index.js";

// Embedding functions
export { createGeminiEmbedding } from "./gemini-embedding.js";
export type { GeminiEmbeddingConfig } from "./gemini-embedding.js";
