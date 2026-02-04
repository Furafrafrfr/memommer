import { describe, it, expect } from "vitest";
import { createMemo, parseMemo, serializeMemo } from "./memo.js";

describe("Memo", () => {
  describe("createMemo", () => {
    it("名前と内容からメモを作成できる", () => {
      const memo = createMemo("/work/project/meeting", "会議の内容です");

      expect(memo.name).toBe("/work/project/meeting");
      expect(memo.content).toBe("会議の内容です");
      expect(memo.tags).toEqual([]);
    });

    it("タグ付きのメモを作成できる", () => {
      const memo = createMemo("/work/project/meeting", "会議の内容です", [
        "work",
        "meeting",
      ]);

      expect(memo.name).toBe("/work/project/meeting");
      expect(memo.content).toBe("会議の内容です");
      expect(memo.tags).toEqual(["work", "meeting"]);
    });
  });

  describe("parseMemo", () => {
    it("フロントマター付きMarkdownからメモをパースできる", () => {
      const markdown = `---
tags:
  - work
  - meeting
---
会議の内容です`;

      const memo = parseMemo("/work/project/meeting", markdown);

      expect(memo.name).toBe("/work/project/meeting");
      expect(memo.content).toBe("会議の内容です");
      expect(memo.tags).toEqual(["work", "meeting"]);
    });

    it("フロントマターなしのMarkdownからメモをパースできる", () => {
      const markdown = "シンプルなメモです";

      const memo = parseMemo("/notes/simple", markdown);

      expect(memo.name).toBe("/notes/simple");
      expect(memo.content).toBe("シンプルなメモです");
      expect(memo.tags).toEqual([]);
    });

    it("空のフロントマターを持つMarkdownからメモをパースできる", () => {
      const markdown = `---
---
内容のみ`;

      const memo = parseMemo("/notes/empty-frontmatter", markdown);

      expect(memo.name).toBe("/notes/empty-frontmatter");
      expect(memo.content).toBe("内容のみ");
      expect(memo.tags).toEqual([]);
    });
  });

  describe("serializeMemo", () => {
    it("メモをMarkdown形式にシリアライズできる", () => {
      const memo = createMemo("/work/project/meeting", "会議の内容です", [
        "work",
        "meeting",
      ]);

      const markdown = serializeMemo(memo);

      expect(markdown).toBe(`---
tags:
  - work
  - meeting
---
会議の内容です`);
    });

    it("タグなしのメモはフロントマターなしでシリアライズされる", () => {
      const memo = createMemo("/notes/simple", "シンプルなメモです");

      const markdown = serializeMemo(memo);

      expect(markdown).toBe("シンプルなメモです");
    });
  });
});
