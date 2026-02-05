import type { Storage, Memo } from "@memomer/core";
import { parseMemo, serializeMemo } from "@memomer/core";
import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * メモ名からファイルパスを生成する
 */
const nameToFilePath = (baseDir: string, name: string): string => {
  const relativePath = name.startsWith("/") ? name.slice(1) : name;
  return path.join(baseDir, `${relativePath}.md`);
};

/**
 * ファイルパスからメモ名を生成する
 */
const filePathToName = (baseDir: string, filePath: string): string => {
  const relativePath = path.relative(baseDir, filePath);
  const withoutExt = relativePath.replace(/\.md$/, "");
  return `/${withoutExt.replace(/\\/g, "/")}`;
};

/**
 * ディレクトリを再帰的に作成する
 */
const ensureDir = async (dirPath: string): Promise<void> => {
  await fs.mkdir(dirPath, { recursive: true });
};

/**
 * ディレクトリ内の全ての.mdファイルを再帰的に取得する
 */
const getAllMarkdownFiles = async (dir: string): Promise<string[]> => {
  const files: string[] = [];

  const exists = await fs
    .access(dir)
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    return files;
  }

  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await getAllMarkdownFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
};

/**
 * ファイルシステムベースのストレージを作成する
 */
export const createFileStorage = (baseDir: string): Storage => ({
  save: async (memo: Memo): Promise<void> => {
    const filePath = nameToFilePath(baseDir, memo.name);
    const dirPath = path.dirname(filePath);
    await ensureDir(dirPath);

    const content = serializeMemo(memo);
    await fs.writeFile(filePath, content, "utf-8");
  },

  get: async (name: string): Promise<Memo | null> => {
    const filePath = nameToFilePath(baseDir, name);

    try {
      const content = await fs.readFile(filePath, "utf-8");
      return parseMemo(name, content);
    } catch {
      return null;
    }
  },

  delete: async (name: string): Promise<void> => {
    const filePath = nameToFilePath(baseDir, name);

    try {
      await fs.unlink(filePath);
    } catch {
      // ファイルが存在しない場合は何もしない
    }
  },

  listNames: async (): Promise<readonly string[]> => {
    const files = await getAllMarkdownFiles(baseDir);
    return files.map((filePath) => filePathToName(baseDir, filePath));
  },
});
