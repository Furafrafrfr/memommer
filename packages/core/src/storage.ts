import type { Memo } from "./memo.js";

/**
 * ストレージモジュールのインターフェース
 */
export type Storage = {
  /**
   * メモを保存する（新規作成・更新兼用）
   */
  readonly save: (memo: Memo) => Promise<void>;

  /**
   * メモを取得する
   */
  readonly get: (name: string) => Promise<Memo | null>;

  /**
   * メモを削除する
   */
  readonly delete: (name: string) => Promise<void>;

  /**
   * 全てのメモ名を取得する
   */
  readonly list: () => Promise<readonly string[]>;
};
