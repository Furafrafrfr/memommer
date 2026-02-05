/**
 * 検索クエリ
 */
export type SearchQuery = {
  /** テキスト検索クエリ */
  readonly text?: string;
  /** タグでフィルター */
  readonly tags?: readonly string[];
  /** ディレクトリでフィルター（前方一致） */
  readonly directory?: string;
};

/**
 * 検索結果
 */
export type SearchResult = {
  /** メモの名前 */
  readonly name: string;
  /** 検索スコア（高いほど関連度が高い） */
  readonly score: number;
};

/**
 * 検索モジュールのインターフェース
 */
export type Search = {
  /**
   * メモを検索する
   */
  readonly search: (query: SearchQuery) => Promise<readonly SearchResult[]>;

  /**
   * インデックスを再構築する
   */
  readonly rebuild: () => Promise<void>;

  /**
   * メモをインデックスに追加/更新する
   */
  readonly index: (
    name: string,
    content: string,
    tags: readonly string[]
  ) => Promise<void>;

  /**
   * メモをインデックスから削除する
   */
  readonly remove: (name: string) => Promise<void>;
};
