import type { Memo } from "./memo.js";
import type { Storage } from "./storage.js";
import type { Search, SearchQuery, SearchResult } from "./search.js";

/**
 * メモサービスのインターフェース
 */
export type MemoService = {
  readonly save: (memo: Memo) => Promise<void>;
  readonly get: (name: string) => Promise<Memo | null>;
  readonly delete: (name: string) => Promise<void>;
  readonly search: (query: SearchQuery) => Promise<readonly SearchResult[]>;
  readonly list: () => Promise<readonly string[]>;
  readonly rebuild: () => Promise<void>;
};

/**
 * メモサービスを作成する
 */
export const createMemoService = (
  storage: Storage,
  search: Search
): MemoService => ({
  save: async (memo: Memo): Promise<void> => {
    await storage.save(memo);
  },

  get: async (name: string): Promise<Memo | null> => {
    return storage.get(name);
  },

  delete: async (name: string): Promise<void> => {
    await storage.delete(name);
  },

  search: async (query: SearchQuery): Promise<readonly SearchResult[]> => {
    return search.search(query);
  },

  list: async (): Promise<readonly string[]> => {
    return storage.listNames();
  },

  rebuild: async (): Promise<void> => {
    await search.rebuild();
  },
});
