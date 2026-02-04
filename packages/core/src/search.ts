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
   * 検索インデックスを再構築する
   */
  readonly rebuildIndex: () => Promise<void>;

  /**
   * 特定のメモをインデックスに追加/更新する
   */
  readonly indexMemo: (
    name: string,
    content: string,
    tags: readonly string[]
  ) => Promise<void>;

  /**
   * 特定のメモをインデックスから削除する
   */
  readonly removeFromIndex: (name: string) => Promise<void>;
};
