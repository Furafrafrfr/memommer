/**
 * Embedding関数の型
 */
export type EmbeddingFn = (text: string) => Promise<number[]>;
