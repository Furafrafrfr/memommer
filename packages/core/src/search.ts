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
   * ストレージの全メモとインデックスを同期する
   * （全削除→全追加）
   */
  readonly sync: () => Promise<void>;
};
