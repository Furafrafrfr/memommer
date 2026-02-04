import type { EmbeddingFn } from "./types.js";

/**
 * Gemini Embedding API設定
 */
export type GeminiEmbeddingConfig = {
  readonly apiKey: string;
  readonly model?: string;
};

/**
 * Gemini Embedding APIを使用するembedding関数を作成する
 */
export const createGeminiEmbedding = (
  config: GeminiEmbeddingConfig
): EmbeddingFn => {
  const { apiKey, model = "text-embedding-004" } = config;
  const baseUrl = "https://generativelanguage.googleapis.com/v1beta";

  return async (text: string): Promise<number[]> => {
    const url = `${baseUrl}/models/${model}:embedContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: `models/${model}`,
        content: {
          parts: [{ text }],
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini Embedding API error: ${response.status} ${error}`);
    }

    const data = (await response.json()) as {
      embedding: { values: number[] };
    };

    return data.embedding.values;
  };
};
