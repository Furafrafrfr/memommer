import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createFileStorage } from "./file-storage.js";
import { createMemo } from "@memomer/core";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

describe("FileStorage", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "memomer-test-"));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("save", () => {
    it("メモをファイルに保存する", async () => {
      const storage = createFileStorage(testDir);
      const memo = createMemo("/work/meeting", "会議メモ", ["work"]);

      await storage.save(memo);

      const filePath = path.join(testDir, "work", "meeting.md");
      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toBe("---\ntags:\n  - work\n---\n会議メモ");
    });

    it("タグなしメモを保存する", async () => {
      const storage = createFileStorage(testDir);
      const memo = createMemo("/notes/simple", "シンプルなメモ");

      await storage.save(memo);

      const filePath = path.join(testDir, "notes", "simple.md");
      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toBe("シンプルなメモ");
    });

    it("ルートディレクトリにメモを保存する", async () => {
      const storage = createFileStorage(testDir);
      const memo = createMemo("/root-memo", "ルートメモ");

      await storage.save(memo);

      const filePath = path.join(testDir, "root-memo.md");
      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toBe("ルートメモ");
    });
  });

  describe("get", () => {
    it("保存したメモを取得する", async () => {
      const storage = createFileStorage(testDir);
      const memo = createMemo("/work/meeting", "会議メモ", ["work"]);
      await storage.save(memo);

      const result = await storage.get("/work/meeting");

      expect(result).toEqual({
        name: "/work/meeting",
        content: "---\ntags:\n  - work\n---\n会議メモ",
        tags: ["work"],
      });
    });

    it("存在しないメモはnullを返す", async () => {
      const storage = createFileStorage(testDir);

      const result = await storage.get("/nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("メモを削除する", async () => {
      const storage = createFileStorage(testDir);
      const memo = createMemo("/work/meeting", "会議メモ", ["work"]);
      await storage.save(memo);

      await storage.delete("/work/meeting");

      const result = await storage.get("/work/meeting");
      expect(result).toBeNull();
    });

    it("存在しないメモの削除はエラーにならない", async () => {
      const storage = createFileStorage(testDir);

      await expect(storage.delete("/nonexistent")).resolves.not.toThrow();
    });
  });

  describe("list", () => {
    it("全てのメモ名を取得する", async () => {
      const storage = createFileStorage(testDir);
      await storage.save(createMemo("/work/meeting", "会議メモ"));
      await storage.save(createMemo("/personal/diary", "日記"));

      const names = await storage.list();

      expect(names).toHaveLength(2);
      expect(names).toContain("/work/meeting");
      expect(names).toContain("/personal/diary");
    });
  });
});
