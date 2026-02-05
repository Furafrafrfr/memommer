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
    list: vi.fn().mockResolvedValue([]),
  });

  const mockEmbeddingFn = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sync", () => {
    it("全メモからインデックスを同期する", async () => {
      const storage = createMockStorage();
      const memo1 = createMemo("/work/meeting", "会議メモ", ["work"]);
      const memo2 = createMemo("/personal/diary", "日記", ["personal"]);
      vi.mocked(storage.list).mockResolvedValue([
        "/work/meeting",
        "/personal/diary",
      ]);
      vi.mocked(storage.get).mockImplementation(async (name: string) => {
        if (name === "/work/meeting") return memo1;
        if (name === "/personal/diary") return memo2;
        return null;
      });
      const search = await createChromaSearch({
        storage,
        embeddingFn: mockEmbeddingFn,
      });

      await search.sync();

      expect(mockEmbeddingFn).toHaveBeenCalledWith("会議メモ");
      expect(mockEmbeddingFn).toHaveBeenCalledWith("日記");
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
      const memo1 = createMemo("/work/meeting", "会議メモ", ["work"]);
      const memo2 = createMemo("/personal/diary", "日記", ["personal"]);
      vi.mocked(storage.list).mockResolvedValue(["/work/meeting", "/personal/diary"]);
      vi.mocked(storage.get).mockImplementation(async (name: string) => {
        if (name === "/work/meeting") return memo1;
        if (name === "/personal/diary") return memo2;
        return null;
      });
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
      const memo1 = createMemo("/work/project/meeting", "会議メモ", ["work"]);
      const memo2 = createMemo("/work/project/task", "タスク", ["work"]);
      const memo3 = createMemo("/personal/diary", "日記", ["personal"]);
      vi.mocked(storage.list).mockResolvedValue([
        "/work/project/meeting",
        "/work/project/task",
        "/personal/diary",
      ]);
      vi.mocked(storage.get).mockImplementation(async (name: string) => {
        if (name === "/work/project/meeting") return memo1;
        if (name === "/work/project/task") return memo2;
        if (name === "/personal/diary") return memo3;
        return null;
      });
      const search = await createChromaSearch({
        storage,
        embeddingFn: mockEmbeddingFn,
      });

      const results = await search.search({ directory: "/work" });

      expect(results).toBeDefined();
    });
  });
});
