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
    listNames: vi.fn().mockResolvedValue([]),
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

  describe("index", () => {
    it("メモをインデックスに追加する", async () => {
      const storage = createMockStorage();
      const dbPath = path.join(testDir, "test.db");
      const search = await createSqliteSearch({
        storage,
        embeddingFn: mockEmbeddingFn,
        dbPath,
      });

      await search.index("/work/meeting", "会議メモ", ["work"]);

      expect(mockEmbeddingFn).toHaveBeenCalledWith("会議メモ");
    });
  });

  describe("search", () => {
    it("テキストで検索する", async () => {
      const storage = createMockStorage();
      const dbPath = path.join(testDir, "test.db");
      const search = await createSqliteSearch({
        storage,
        embeddingFn: mockEmbeddingFn,
        dbPath,
      });

      await search.index("/work/meeting", "会議メモ", ["work"]);
      await search.index("/personal/diary", "日記を書く", ["personal"]);

      const results = await search.search({ text: "会議" });

      expect(results.length).toBeGreaterThan(0);
      expect(mockEmbeddingFn).toHaveBeenCalledWith("会議");
    });

    it("タグでフィルターする", async () => {
      const storage = createMockStorage();
      const dbPath = path.join(testDir, "test.db");
      const search = await createSqliteSearch({
        storage,
        embeddingFn: mockEmbeddingFn,
        dbPath,
      });

      await search.index("/work/meeting", "会議メモ", ["work"]);
      await search.index("/personal/diary", "日記", ["personal"]);

      const results = await search.search({ tags: ["work"] });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("/work/meeting");
    });

    it("ディレクトリでフィルターする", async () => {
      const storage = createMockStorage();
      const dbPath = path.join(testDir, "test.db");
      const search = await createSqliteSearch({
        storage,
        embeddingFn: mockEmbeddingFn,
        dbPath,
      });

      await search.index("/work/project/meeting", "会議メモ", ["work"]);
      await search.index("/work/project/task", "タスク", ["work"]);
      await search.index("/personal/diary", "日記", ["personal"]);

      const results = await search.search({ directory: "/work" });

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.name)).toContain("/work/project/meeting");
      expect(results.map((r) => r.name)).toContain("/work/project/task");
    });

    it("テキストとタグを組み合わせて検索する", async () => {
      const storage = createMockStorage();
      const dbPath = path.join(testDir, "test.db");
      const search = await createSqliteSearch({
        storage,
        embeddingFn: mockEmbeddingFn,
        dbPath,
      });

      await search.index("/work/meeting", "会議メモ", ["work", "meeting"]);
      await search.index("/work/task", "タスク管理", ["work"]);
      await search.index("/personal/meeting", "友人との約束", [
        "personal",
        "meeting",
      ]);

      const results = await search.search({ text: "会議", tags: ["work"] });

      // workタグを持つメモのみがフィルターされる
      expect(results.every((r) => r.name.startsWith("/work"))).toBe(true);
    });
  });

  describe("remove", () => {
    it("メモをインデックスから削除する", async () => {
      const storage = createMockStorage();
      const dbPath = path.join(testDir, "test.db");
      const search = await createSqliteSearch({
        storage,
        embeddingFn: mockEmbeddingFn,
        dbPath,
      });

      await search.index("/work/meeting", "会議メモ", ["work"]);
      await search.remove("/work/meeting");

      const results = await search.search({ text: "会議" });
      expect(results).toHaveLength(0);
    });
  });

  describe("rebuild", () => {
    it("全メモからインデックスを再構築する", async () => {
      const storage = createMockStorage();
      const memo1 = createMemo("/work/meeting", "会議メモ", ["work"]);
      const memo2 = createMemo("/personal/diary", "日記", ["personal"]);
      vi.mocked(storage.listNames).mockResolvedValue(["/work/meeting", "/personal/diary"]);
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

      await search.rebuild();

      // embedding関数が各メモに対して呼ばれる
      expect(mockEmbeddingFn).toHaveBeenCalledWith("会議メモ");
      expect(mockEmbeddingFn).toHaveBeenCalledWith("日記");
    });
  });

  describe("persistence", () => {
    it("データベースが永続化される", async () => {
      const storage = createMockStorage();
      const dbPath = path.join(testDir, "test.db");

      // 最初のインスタンスでインデックス作成
      const search1 = await createSqliteSearch({
        storage,
        embeddingFn: mockEmbeddingFn,
        dbPath,
      });
      await search1.index("/work/meeting", "会議メモ", ["work"]);

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
