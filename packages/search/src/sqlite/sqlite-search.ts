import type { Search, SearchQuery, SearchResult, Storage } from "@memomer/core";
import type { EmbeddingFn } from "../types.js";
import initSqlJs from "sql.js";
import type { Database } from "sql.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";

type MemoRow = { name: string; score: number; tags: string[] };

/**
 * SqliteSearch設定
 */
export type SqliteSearchConfig = {
  readonly storage: Storage;
  readonly embeddingFn: EmbeddingFn;
  readonly dbPath: string;
};

/**
 * コサイン類似度を計算する
 */
const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
};

/**
 * Float64ArrayをBase64文字列に変換
 */
const embeddingToBase64 = (embedding: number[]): string => {
  const float64Array = new Float64Array(embedding);
  const buffer = Buffer.from(float64Array.buffer);
  return buffer.toString("base64");
};

/**
 * Base64文字列をnumber[]に変換
 */
const base64ToEmbedding = (base64: string): number[] => {
  const buffer = Buffer.from(base64, "base64");
  const float64Array = new Float64Array(buffer.buffer, buffer.byteOffset, buffer.length / 8);
  return Array.from(float64Array);
};

/**
 * データベースを初期化する
 */
const initDatabase = async (
  dbPath: string
): Promise<{ db: Database; saveFn: () => Promise<void> }> => {
  const SQL = await initSqlJs();

  let db: Database;

  try {
    const fileBuffer = await fs.readFile(dbPath);
    db = new SQL.Database(fileBuffer);
  } catch {
    db = new SQL.Database();
  }

  // テーブル作成
  db.run(`
    CREATE TABLE IF NOT EXISTS memos (
      name TEXT PRIMARY KEY,
      embedding TEXT NOT NULL,
      tags TEXT NOT NULL
    )
  `);

  const saveFn = async (): Promise<void> => {
    const data = db.export();
    const buffer = Buffer.from(data);
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    await fs.writeFile(dbPath, buffer);
  };

  return { db, saveFn };
};

/**
 * SQLiteベースの検索機能を作成する
 */
export const createSqliteSearch = async (
  config: SqliteSearchConfig
): Promise<Search> => {
  const { storage, embeddingFn, dbPath } = config;
  const { db, saveFn } = await initDatabase(dbPath);

  return {
    search: async (query: SearchQuery): Promise<readonly SearchResult[]> => {
      // テキスト検索なしでタグやディレクトリのみの場合
      if (!query.text) {
        return filterByTagsAndDirectory(db, query.tags, query.directory);
      }

      // テキスト検索
      const queryEmbedding = await embeddingFn(query.text);

      // 全メモを取得してコサイン類似度を計算
      const rows = db.exec("SELECT name, embedding, tags FROM memos");
      if (rows.length === 0 || rows[0].values.length === 0) {
        return [];
      }

      let results: { name: string; score: number; tags: string[] }[] = rows[0].values
        .map((row) => {
          const name = row[0] as string;
          const embeddingBase64 = row[1] as string;
          const tagsStr = row[2] as string;
          const embedding = base64ToEmbedding(embeddingBase64);
          const tags = tagsStr ? tagsStr.split(",") : [];
          const score = cosineSimilarity(queryEmbedding, embedding);
          return { name, score, tags };
        })
        .sort((a, b) => b.score - a.score);

      // タグとディレクトリでフィルター
      if (query.tags && query.tags.length > 0) {
        results = results.filter((r) =>
          query.tags!.every((tag) => r.tags.includes(tag))
        );
      }

      if (query.directory) {
        results = results.filter((r) => r.name.startsWith(query.directory!));
      }

      return results.map(({ name, score }) => ({ name, score }));
    },

    rebuildIndex: async (): Promise<void> => {
      // 既存データを削除
      db.run("DELETE FROM memos");

      // 全メモをインデックス
      const memos = await storage.getAll();
      for (const memo of memos) {
        const embedding = await embeddingFn(memo.content);
        const embeddingBase64 = embeddingToBase64(embedding);
        const tagsStr = memo.tags.join(",");

        db.run(
          "INSERT OR REPLACE INTO memos (name, embedding, tags) VALUES (?, ?, ?)",
          [memo.name, embeddingBase64, tagsStr]
        );
      }

      await saveFn();
    },

    indexMemo: async (
      name: string,
      content: string,
      tags: readonly string[]
    ): Promise<void> => {
      const embedding = await embeddingFn(content);
      const embeddingBase64 = embeddingToBase64(embedding);
      const tagsStr = tags.join(",");

      db.run(
        "INSERT OR REPLACE INTO memos (name, embedding, tags) VALUES (?, ?, ?)",
        [name, embeddingBase64, tagsStr]
      );

      await saveFn();
    },

    removeFromIndex: async (name: string): Promise<void> => {
      db.run("DELETE FROM memos WHERE name = ?", [name]);
      await saveFn();
    },
  };
};

/**
 * タグとディレクトリのみでフィルターする（テキスト検索なし）
 */
const filterByTagsAndDirectory = (
  db: Database,
  tags?: readonly string[],
  directory?: string
): readonly SearchResult[] => {
  const rows = db.exec("SELECT name, tags FROM memos");
  if (rows.length === 0 || rows[0].values.length === 0) {
    return [];
  }

  let results = rows[0].values.map((row) => ({
    name: row[0] as string,
    tags: (row[1] as string) ? (row[1] as string).split(",") : [],
    score: 1.0,
  }));

  if (tags && tags.length > 0) {
    results = results.filter((r) => tags.every((tag) => r.tags.includes(tag)));
  }

  if (directory) {
    results = results.filter((r) => r.name.startsWith(directory));
  }

  return results.map(({ name, score }) => ({ name, score }));
};
