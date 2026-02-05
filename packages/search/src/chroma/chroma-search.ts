import type { Search, SearchQuery, SearchResult, Storage } from "@memomer/core";
import { ChromaClient, type Collection } from "chromadb";
import type { EmbeddingFn } from "../types.js";

/**
 * ChromaSearch設定
 */
export type ChromaSearchConfig = {
  readonly storage: Storage;
  readonly embeddingFn: EmbeddingFn;
  readonly collectionName?: string;
  readonly chromaPath?: string;
};

/**
 * メモ名をChromaDBのIDとして使用できる形式に変換
 */
const nameToId = (name: string): string => {
  return name.replace(/\//g, "__");
};

/**
 * ChromaDBのIDをメモ名に戻す
 */
const idToName = (id: string): string => {
  return id.replace(/__/g, "/");
};

/**
 * ChromaDBベースの検索機能を作成する
 */
export const createChromaSearch = async (
  config: ChromaSearchConfig
): Promise<Search> => {
  const { storage, embeddingFn, collectionName = "memos" } = config;

  const client = new ChromaClient({
    path: config.chromaPath,
  });
  const collection = await client.getOrCreateCollection({
    name: collectionName,
  });

  return {
    search: async (query: SearchQuery): Promise<readonly SearchResult[]> => {
      // テキスト検索なしでタグやディレクトリのみの場合
      if (!query.text) {
        return filterByTagsAndDirectory(storage, query.tags, query.directory);
      }

      // テキスト検索
      const embedding = await embeddingFn(query.text);
      const results = await collection.query({
        queryEmbeddings: [embedding],
        nResults: 100,
      });

      if (!results.ids[0] || results.ids[0].length === 0) {
        return [];
      }

      let searchResults: SearchResult[] = results.ids[0].map((id, index) => ({
        name: idToName(id),
        score: 1 - (results.distances?.[0]?.[index] ?? 0),
      }));

      // タグとディレクトリでフィルター
      if (query.tags || query.directory) {
        const names = await storage.listNames();
        const memoMap = new Map<string, { tags: readonly string[] }>();
        for (const name of names) {
          const memo = await storage.get(name);
          if (memo) {
            memoMap.set(name, { tags: memo.tags });
          }
        }

        searchResults = searchResults.filter((result) => {
          const memo = memoMap.get(result.name);
          if (!memo) return false;

          if (query.tags && query.tags.length > 0) {
            const hasAllTags = query.tags.every((tag) =>
              memo.tags.includes(tag)
            );
            if (!hasAllTags) return false;
          }

          if (query.directory) {
            if (!result.name.startsWith(query.directory)) return false;
          }

          return true;
        });
      }

      return searchResults;
    },

    rebuild: async (): Promise<void> => {
      // 既存のコレクションを削除して再作成
      try {
        await client.deleteCollection({ name: collectionName });
      } catch {
        // コレクションが存在しない場合は無視
      }
      const newCollection = await client.getOrCreateCollection({
        name: collectionName,
      });

      // 全メモをインデックス
      const names = await storage.listNames();
      for (const name of names) {
        const memo = await storage.get(name);
        if (!memo) continue;

        const embedding = await embeddingFn(memo.content);
        await newCollection.upsert({
          ids: [nameToId(memo.name)],
          embeddings: [embedding],
          metadatas: [{ tags: memo.tags.join(","), name: memo.name }],
        });
      }
    },

    index: async (
      name: string,
      content: string,
      tags: readonly string[]
    ): Promise<void> => {
      const embedding = await embeddingFn(content);
      await collection.upsert({
        ids: [nameToId(name)],
        embeddings: [embedding],
        metadatas: [{ tags: tags.join(","), name }],
      });
    },

    remove: async (name: string): Promise<void> => {
      try {
        await collection.delete({
          ids: [nameToId(name)],
        });
      } catch {
        // 存在しない場合は無視
      }
    },
  };
};

/**
 * タグとディレクトリのみでフィルターする（テキスト検索なし）
 */
const filterByTagsAndDirectory = async (
  storage: Storage,
  tags?: readonly string[],
  directory?: string
): Promise<readonly SearchResult[]> => {
  const names = await storage.listNames();
  const results: SearchResult[] = [];

  for (const name of names) {
    const memo = await storage.get(name);
    if (!memo) continue;

    if (tags && tags.length > 0) {
      const hasAllTags = tags.every((tag) => memo.tags.includes(tag));
      if (!hasAllTags) continue;
    }

    if (directory) {
      if (!memo.name.startsWith(directory)) continue;
    }

    results.push({
      name: memo.name,
      score: 1.0,
    });
  }

  return results;
};
