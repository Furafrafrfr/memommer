#!/usr/bin/env node
import { Command } from "commander";
import { createMemoService, createMemo, parseMemo } from "@memomer/core";
import { createFileStorage } from "@memomer/storage";
import { createSqliteSearch, createGeminiEmbedding } from "@memomer/search";
import { getDefaultMemoDir, getDefaultDbPath } from "./config.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const getGeminiApiKey = (): string => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  return apiKey;
};

const initService = async () => {
  const memoDir = getDefaultMemoDir();
  const dbPath = getDefaultDbPath();

  // DBディレクトリ作成（メモディレクトリはカレントディレクトリなので作成不要）
  await fs.mkdir(path.dirname(dbPath), { recursive: true });

  const storage = createFileStorage(memoDir);
  const embeddingFn = createGeminiEmbedding({ apiKey: getGeminiApiKey() });
  const search = await createSqliteSearch({
    storage,
    embeddingFn,
    dbPath,
  });

  return createMemoService(storage, search);
};

const program = new Command();

program
  .name("memomer")
  .description("シンプルなメモ管理CLI")
  .version("0.1.0");

program
  .command("create <name>")
  .description("メモを作成・更新する")
  .option("-c, --content <content>", "メモの内容")
  .option("-f, --file <file>", "ファイルから内容を読み込む")
  .action(async (name: string, options: { content?: string; file?: string }) => {
    try {
      const service = await initService();

      let memo;
      if (options.file) {
        const fileContent = await fs.readFile(options.file, "utf-8");
        memo = parseMemo(name, fileContent);
      } else if (options.content) {
        memo = createMemo(name, options.content);
      } else {
        console.error("Error: --content または --file オプションが必要です");
        process.exit(1);
      }

      await service.save(memo);
      console.log(`メモ "${name}" を保存しました`);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("delete <name>")
  .description("メモを削除する")
  .action(async (name: string) => {
    try {
      const service = await initService();
      await service.delete(name);
      console.log(`メモ "${name}" を削除しました`);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("search [text]")
  .description("メモを検索する")
  .option("-t, --tags <tags>", "カンマ区切りのタグでフィルター")
  .option("-d, --directory <directory>", "ディレクトリでフィルター")
  .action(async (text: string | undefined, options: { tags?: string; directory?: string }) => {
    try {
      const service = await initService();

      const tags = options.tags
        ? options.tags.split(",").map((t) => t.trim())
        : undefined;

      const results = await service.search({
        text,
        tags,
        directory: options.directory,
      });

      if (results.length === 0) {
        console.log("検索結果がありません");
        return;
      }

      console.log("検索結果:");
      for (const result of results) {
        console.log(`  ${result.name} (score: ${result.score.toFixed(3)})`);
      }
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("prepare")
  .description("検索インデックスを再構築する")
  .action(async () => {
    try {
      const service = await initService();
      console.log("インデックスを再構築中...");
      await service.rebuildIndex();
      console.log("インデックスの再構築が完了しました");
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("list")
  .description("全てのメモを一覧表示する")
  .option("--tree", "ツリー形式で表示")
  .action(async (options: { tree?: boolean }) => {
    try {
      const service = await initService();
      const names = await service.list();

      if (names.length === 0) {
        console.log("メモがありません");
        return;
      }

      if (options.tree) {
        printTree(names);
      } else {
        for (const name of names) {
          console.log(name);
        }
      }
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("get <name>")
  .description("メモの内容を表示する")
  .action(async (name: string) => {
    try {
      const service = await initService();
      const memo = await service.get(name);

      if (!memo) {
        console.error(`メモ "${name}" が見つかりません`);
        process.exit(1);
      }

      if (memo.tags.length > 0) {
        console.log(`Tags: ${memo.tags.join(", ")}`);
        console.log("---");
      }
      console.log(memo.content);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

/**
 * メモ名をツリー形式で表示する
 */
const printTree = (names: readonly string[]): void => {
  type TreeNode = { [key: string]: TreeNode | null };
  const tree: TreeNode = {};

  // ツリー構造を構築
  for (const name of names) {
    const parts = name.split("/").filter(Boolean);
    let current = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = null; // ファイル
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part] as TreeNode;
      }
    }
  }

  // ツリーを表示
  const printNode = (node: TreeNode, prefix: string, isLast: boolean[]): void => {
    const keys = Object.keys(node).sort();

    keys.forEach((key, index) => {
      const isLastItem = index === keys.length - 1;
      const connector = isLastItem ? "└── " : "├── ";
      const indent = isLast.map((last) => (last ? "    " : "│   ")).join("");

      console.log(`${indent}${connector}${key}`);

      const child = node[key];
      if (child !== null) {
        printNode(child, prefix, [...isLast, isLastItem]);
      }
    });
  };

  printNode(tree, "", []);
};

program.parse();
