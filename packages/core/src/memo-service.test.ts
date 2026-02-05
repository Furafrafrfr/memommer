import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoService } from "./memo-service.js";
import type { Storage } from "./storage.js";
import type { Search } from "./search.js";
import { createMemo } from "./memo.js";

describe("MemoService", () => {
  const createMockStorage = (): Storage => ({
    save: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
  });

  const createMockSearch = (): Search => ({
    search: vi.fn().mockResolvedValue([]),
    rebuild: vi.fn().mockResolvedValue(undefined),
    index: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  });

  describe("save", () => {
    it("メモを保存する（インデックスは更新しない）", async () => {
      const storage = createMockStorage();
      const search = createMockSearch();
      const service = createMemoService(storage, search);

      const memo = createMemo("/work/meeting", "会議メモ", ["work"]);
      await service.save(memo);

      expect(storage.save).toHaveBeenCalledWith(memo);
      expect(search.index).not.toHaveBeenCalled();
    });
  });

  describe("get", () => {
    it("メモを取得する", async () => {
      const storage = createMockStorage();
      const search = createMockSearch();
      const memo = createMemo("/work/meeting", "会議メモ", ["work"]);
      vi.mocked(storage.get).mockResolvedValue(memo);

      const service = createMemoService(storage, search);
      const result = await service.get("/work/meeting");

      expect(result).toEqual(memo);
      expect(storage.get).toHaveBeenCalledWith("/work/meeting");
    });
  });

  describe("delete", () => {
    it("メモを削除する（インデックスからは削除しない）", async () => {
      const storage = createMockStorage();
      const search = createMockSearch();
      const service = createMemoService(storage, search);

      await service.delete("/work/meeting");

      expect(storage.delete).toHaveBeenCalledWith("/work/meeting");
      expect(search.remove).not.toHaveBeenCalled();
    });
  });

  describe("search", () => {
    it("検索クエリで検索する", async () => {
      const storage = createMockStorage();
      const search = createMockSearch();
      vi.mocked(search.search).mockResolvedValue([
        { name: "/work/meeting", score: 0.9 },
      ]);

      const service = createMemoService(storage, search);
      const results = await service.search({ text: "会議" });

      expect(results).toEqual([{ name: "/work/meeting", score: 0.9 }]);
      expect(search.search).toHaveBeenCalledWith({ text: "会議" });
    });
  });

  describe("list", () => {
    it("全てのメモ名を取得する", async () => {
      const storage = createMockStorage();
      const search = createMockSearch();
      vi.mocked(storage.list).mockResolvedValue([
        "/work/meeting",
        "/personal/diary",
      ]);

      const service = createMemoService(storage, search);
      const names = await service.list();

      expect(names).toEqual(["/work/meeting", "/personal/diary"]);
    });
  });

  describe("rebuild", () => {
    it("検索インデックスを再構築する", async () => {
      const storage = createMockStorage();
      const search = createMockSearch();
      const service = createMemoService(storage, search);

      await service.rebuild();

      expect(search.rebuild).toHaveBeenCalled();
    });
  });
});
