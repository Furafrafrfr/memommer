# Memomer

シンプルなメモ管理システム。Markdownベースのメモをタグとディレクトリで整理し、セマンティック検索ができます。

## 特徴

- Markdownフロントマターでタグ管理
- ディレクトリ構造によるメモ整理
- Gemini APIを使ったセマンティック検索
- 外部サーバー不要（SQLiteベース）

## インストール

```bash
npm install
npm run build
```

## 使い方

```bash
export GEMINI_API_KEY=your-api-key

# メモを作成
npx memomer create /work/meeting -c "会議の内容" -t "work,meeting"

# メモを取得
npx memomer get /work/meeting

# メモを検索
npx memomer search "会議"
npx memomer search -t "work"
npx memomer search -d "/work"

# メモ一覧
npx memomer list
npx memomer list --tree

# インデックス再構築
npx memomer prepare

# メモを削除
npx memomer delete /work/meeting
```

## 環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `GEMINI_API_KEY` | Gemini APIキー（必須） | - |
| `MEMOMER_DIR` | メモ保存ディレクトリ | `~/.memomer/memos` |
| `MEMOMER_DB_PATH` | 検索インデックスDB | `~/.memomer/search.db` |

## パッケージ構成

```
packages/
├── core/     # ドメインモデルとビジネスロジック
├── storage/  # ファイルシステムストレージ
├── search/   # 検索エンジン（SQLite/ChromaDB）
└── cli/      # コマンドラインインターフェース
```

## 技術スタック

- TypeScript
- Node.js
- npm workspaces
- sql.js（SQLite WebAssembly）
- Gemini Embedding API

## ライセンス

MIT
