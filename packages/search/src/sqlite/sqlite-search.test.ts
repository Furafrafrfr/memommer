import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSqliteSearch } from "./sqlite-search.js";
import type { Storage } from "@memomer/core";
import { createMemo } from "@memomer/core";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

describe("SqliteSearch", () => {
  let testDir: string;

  const createMockStorage = (): Storage => ({
    save: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
  });

  // 簡単なモックembedding関数（3次元ベクトル）
  const mockEmbeddingFn = vi.fn().mockImplementation(async (text: string) => {
    // テキストの長さに基づく簡単なベクトル生成
    const len = text.length;
    return [len * 0.1, len * 0.2, len * 0.3];
  });

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "memomer-sqlite-test-"));
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("sync", () => {
    it("ストレージの全メモをインデックスに同期する", async () => {
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
      const dbPath = path.join(testDir, "test.db");
      const search = await createSqliteSearch({
        storage,
        embeddingFn: mockEmbeddingFn,
        dbPath,
      });

      await search.sync();

      // embedding関数が各メモに対して呼ばれる
      expect(mockEmbeddingFn).toHaveBeenCalledWith("会議メモ");
      expect(mockEmbeddingFn).toHaveBeenCalledWith("日記");
    });
  });

  describe("search", () => {
    it("テキストで検索する", async () => {
      const storage = createMockStorage();
      const memo1 = createMemo("/work/meeting", "会議メモ", ["work"]);
      const memo2 = createMemo("/personal/diary", "日記を書く", ["personal"]);
      vi.mocked(storage.list).mockResolvedValue([
        "/work/meeting",
        "/personal/diary",
      ]);
      vi.mocked(storage.get).mockImplementation(async (name: string) => {
        if (name === "/work/meeting") return memo1;
        if (name === "/personal/diary") return memo2;
        return null;
      });
      const dbPath = path.join(testDir, "test.db");
      const search = await createSqliteSearch({
        storage,
        embeddingFn: mockEmbeddingFn,
        dbPath,
      });

      await search.sync();
      const results = await search.search({ text: "会議" });

      expect(results.length).toBeGreaterThan(0);
      expect(mockEmbeddingFn).toHaveBeenCalledWith("会議");
    });

    it("タグでフィルターする", async () => {
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
      const dbPath = path.join(testDir, "test.db");
      const search = await createSqliteSearch({
        storage,
        embeddingFn: mockEmbeddingFn,
        dbPath,
      });

      await search.sync();
      const results = await search.search({ tags: ["work"] });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("/work/meeting");
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
      const dbPath = path.join(testDir, "test.db");
      const search = await createSqliteSearch({
        storage,
        embeddingFn: mockEmbeddingFn,
        dbPath,
      });

      await search.sync();
      const results = await search.search({ directory: "/work" });

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.name)).toContain("/work/project/meeting");
      expect(results.map((r) => r.name)).toContain("/work/project/task");
    });

    it("テキストとタグを組み合わせて検索する", async () => {
      const storage = createMockStorage();
      const memo1 = createMemo("/work/meeting", "会議メモ", ["work", "meeting"]);
      const memo2 = createMemo("/work/task", "タスク管理", ["work"]);
      const memo3 = createMemo("/personal/meeting", "友人との約束", [
        "personal",
        "meeting",
      ]);
      vi.mocked(storage.list).mockResolvedValue([
        "/work/meeting",
        "/work/task",
        "/personal/meeting",
      ]);
      vi.mocked(storage.get).mockImplementation(async (name: string) => {
        if (name === "/work/meeting") return memo1;
        if (name === "/work/task") return memo2;
        if (name === "/personal/meeting") return memo3;
        return null;
      });
      const dbPath = path.join(testDir, "test.db");
      const search = await createSqliteSearch({
        storage,
        embeddingFn: mockEmbeddingFn,
        dbPath,
      });

      await search.sync();
      const results = await search.search({ text: "会議", tags: ["work"] });

      // workタグを持つメモのみがフィルターされる
      expect(results.every((r) => r.name.startsWith("/work"))).toBe(true);
    });
  });

  describe("persistence", () => {
    it("データベースが永続化される", async () => {
      const storage = createMockStorage();
      const memo1 = createMemo("/work/meeting", "会議メモ", ["work"]);
      vi.mocked(storage.list).mockResolvedValue(["/work/meeting"]);
      vi.mocked(storage.get).mockResolvedValue(memo1);
      const dbPath = path.join(testDir, "test.db");

      // 最初のインスタンスで同期
      const search1 = await createSqliteSearch({
        storage,
        embeddingFn: mockEmbeddingFn,
        dbPath,
      });
      await search1.sync();

      // 新しいインスタンスで検索
      const search2 = await createSqliteSearch({
        storage,
        embeddingFn: mockEmbeddingFn,
        dbPath,
      });
      const results = await search2.search({ text: "会議" });

      expect(results.length).toBeGreaterThan(0);
    });
  });
});
