import * as path from "node:path";

/**
 * メモ保存ディレクトリを取得する
 * 1. 環境変数 MEMOMER_DIR が設定されていればそれを使用
 * 2. それ以外はカレントディレクトリを使用
 */
export const getDefaultMemoDir = (): string => {
  return process.env.MEMOMER_DIR ?? process.cwd();
};

/**
 * 検索インデックスDBのパスを取得する
 * 1. 環境変数 MEMOMER_DB_PATH が設定されていればそれを使用
 * 2. それ以外はメモディレクトリ/.memomer.db を使用
 */
export const getDefaultDbPath = (): string => {
  const memoDir = getDefaultMemoDir();
  return process.env.MEMOMER_DB_PATH ?? path.join(memoDir, ".memomer.db");
};
