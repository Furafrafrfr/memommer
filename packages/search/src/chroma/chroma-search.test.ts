import { describe, it, expect, vi, beforeEach } from "vitest";
import { createChromaSearch } from "./chroma-search.js";
import type { Storage } from "@memomer/core";
import { createMemo } from "@memomer/core";

// ChromaDBとEmbeddingのモック
vi.mock("chromadb", () => {
  const mockCollection = {
    add: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    upsert: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue({
      ids: [["memo1", "memo2"]],
      distances: [[0.1, 0.2]],
    }),
    get: vi.fn().mockResolvedValue({ ids: [] }),
  };

  return {
    ChromaClient: vi.fn().mockImplementation(() => ({
      getOrCreateCollection: vi.fn().mockResolvedValue(mockCollection),
    })),
  };
});

describe("ChromaSearch", () => {
  const createMockStorage = (): Storage => ({
    save: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([]),
    listNames: vi.fn().mockResolvedValue([]),
  });

  const mockEmbeddingFn = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);

  describe("indexMemo", () => {
    it("メモをインデックスに追加する", async () => {
      const storage = createMockStorage();
      const search = await createChromaSearch({
        storage,
        embeddingFn: mockEmbeddingFn,
      });

      await search.indexMemo("/work/meeting", "会議メモ", ["work"]);

      expect(mockEmbeddingFn).toHaveBeenCalledWith("会議メモ");
    });
  });

  describe("search", () => {
    it("テキストで検索する", async () => {
      const storage = createMockStorage();
      const search = await createChromaSearch({
        storage,
        embeddingFn: mockEmbeddingFn,
      });

      const results = await search.search({ text: "会議" });

      expect(results.length).toBeGreaterThan(0);
      expect(mockEmbeddingFn).toHaveBeenCalledWith("会議");
    });

    it("タグでフィルターする", async () => {
      const storage = createMockStorage();
      vi.mocked(storage.getAll).mockResolvedValue([
        createMemo("/work/meeting", "会議メモ", ["work"]),
        createMemo("/personal/diary", "日記", ["personal"]),
      ]);
      const search = await createChromaSearch({
        storage,
        embeddingFn: mockEmbeddingFn,
      });

      const results = await search.search({ tags: ["work"] });

      // タグフィルターの結果を検証（モックの動作による）
      expect(results).toBeDefined();
    });

    it("ディレクトリでフィルターする", async () => {
      const storage = createMockStorage();
      vi.mocked(storage.getAll).mockResolvedValue([
        createMemo("/work/project/meeting", "会議メモ", ["work"]),
        createMemo("/work/project/task", "タスク", ["work"]),
        createMemo("/personal/diary", "日記", ["personal"]),
      ]);
      const search = await createChromaSearch({
        storage,
        embeddingFn: mockEmbeddingFn,
      });

      const results = await search.search({ directory: "/work" });

      expect(results).toBeDefined();
    });
  });

  describe("removeFromIndex", () => {
    it("メモをインデックスから削除する", async () => {
      const storage = createMockStorage();
      const search = await createChromaSearch({
        storage,
        embeddingFn: mockEmbeddingFn,
      });

      await expect(
        search.removeFromIndex("/work/meeting")
      ).resolves.not.toThrow();
    });
  });

  describe("rebuildIndex", () => {
    it("全メモからインデックスを再構築する", async () => {
      const storage = createMockStorage();
      vi.mocked(storage.getAll).mockResolvedValue([
        createMemo("/work/meeting", "会議メモ", ["work"]),
        createMemo("/personal/diary", "日記", ["personal"]),
      ]);
      const search = await createChromaSearch({
        storage,
        embeddingFn: mockEmbeddingFn,
      });

      await expect(search.rebuildIndex()).resolves.not.toThrow();
    });
  });
});
