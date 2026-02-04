import { describe, it, expect } from "vitest";

describe("CLI", () => {
  it("パッケージが正しく読み込まれる", async () => {
    // CLIの基本的なインポートテスト
    const { createMemoService, createMemo } = await import("@memomer/core");
    const { createFileStorage } = await import("@memomer/storage");
    const { createChromaSearch, createGeminiEmbedding } = await import(
      "@memomer/search"
    );

    expect(createMemoService).toBeDefined();
    expect(createMemo).toBeDefined();
    expect(createFileStorage).toBeDefined();
    expect(createChromaSearch).toBeDefined();
    expect(createGeminiEmbedding).toBeDefined();
  });
});
