# @memomer/cli

メモ管理システムのコマンドラインインターフェース。

## インストール

```bash
npm install -g @memomer/cli
```

## 環境変数

```bash
export GEMINI_API_KEY=your-api-key
export MEMOMER_DIR=/path/to/memos       # オプション（デフォルト: カレントディレクトリ）
export MEMOMER_DB_PATH=/path/to/db      # オプション（デフォルト: {MEMOMER_DIR}/.memomer.db）
```

## コマンド

### create

メモを作成・更新します。タグはフロントマターで管理します。

```bash
# 内容を直接指定
memomer create /work/meeting -c "会議の内容"

# ファイルから読み込み（フロントマター付き）
memomer create /work/meeting -f ./meeting.md

# 空のメモを作成
memomer create /work/meeting
```

### get

メモの内容を表示します。

```bash
memomer get /work/meeting
```

### delete

メモを削除します。

```bash
memomer delete /work/meeting
```

### search

メモを検索します。

```bash
# テキスト検索
memomer search "会議"

# タグフィルター
memomer search -t "work,meeting"

# ディレクトリフィルター
memomer search -d "/work"

# 組み合わせ
memomer search "会議" -t "work" -d "/work/project"
```

### list

全メモを一覧表示します。

```bash
# フラット表示
memomer list

# ツリー表示
memomer list --tree
```

出力例（ツリー表示）:
```
├── personal
│   └── diary
└── work
    ├── meeting
    └── project
        └── task
```

### prepare

検索インデックスを再構築します。

```bash
memomer prepare
```
