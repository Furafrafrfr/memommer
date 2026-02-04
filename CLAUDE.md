# AGENT.md

このプロジェクトでAIエージェントが作業する際のガイドライン。

## 開発方針

### TDD（テスト駆動開発）

t-wada流のTDDサイクルを遵守する。

1. **Red**: テストを先に書き、失敗することを確認
2. **Green**: テストが通る最小限の実装を書く
3. **Refactor**: コードを整理（テストは通ったまま）

```bash
# テスト実行
npm test -w @memomer/core
npm test -w @memomer/storage
npm test -w @memomer/search
npm test -w @memomer/cli
```

### 関数型プログラミング指向

- 純粋関数を優先し、副作用を最小限に抑える
- イミュータブルなデータ構造を使用（`readonly`）
- 副作用は関数の境界に押し出す
- クラスより関数とオブジェクトリテラルを使う

```typescript
// Good: ファクトリ関数 + オブジェクトリテラル
export const createMemo = (name: string, content: string): Memo => ({
  name,
  content,
  tags: [],
});

// Avoid: クラス
class Memo { ... }
```

## プロジェクト構成

### モノレポ（npm workspaces）

```
packages/
├── core/     # ドメインモデル、インターフェース定義
├── storage/  # Storage実装（ファイルシステム）
├── search/   # Search実装（SQLite, ChromaDB）
└── cli/      # CLIアプリケーション
```

### 依存関係

```
cli → core, storage, search
storage → core
search → core
```

### ビルド

```bash
npm install
npm run build
```

## コーディング規約

### TypeScript

- `type` を優先（`interface` より）
- `readonly` を積極的に使用
- 明示的な戻り値型を記述
- `any` は使わない

```typescript
// Good
export type Memo = {
  readonly name: string;
  readonly content: string;
  readonly tags: readonly string[];
};

export const createMemo = (name: string, content: string): Memo => ({ ... });
```

### ファイル構成

- `*.ts` - 実装
- `*.test.ts` - テスト（同じディレクトリに配置）
- `index.ts` - パッケージのエントリーポイント

### インポート

- `.js` 拡張子を使用（ESM）
- 型のみのインポートは `import type` を使用

```typescript
import type { Memo } from "./memo.js";
import { createMemo } from "./memo.js";
```

## テスト

### Vitest

```typescript
import { describe, it, expect, vi } from "vitest";

describe("機能名", () => {
  it("日本語でテストケースを記述", () => {
    expect(actual).toBe(expected);
  });
});
```

### モック

```typescript
const mockStorage: Storage = {
  save: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue(null),
  // ...
};
```

## Git

### コミットメッセージ

```
<type>: <subject>

<body>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### ブランチ

- `main` - メインブランチ

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `GEMINI_API_KEY` | Gemini APIキー |
| `MEMOMER_DIR` | メモ保存ディレクトリ |
| `MEMOMER_DB_PATH` | 検索インデックスDB |
