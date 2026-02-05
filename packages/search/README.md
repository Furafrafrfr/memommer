# @memomer/search

メモ管理システムの検索パッケージ。ベクトル検索機能を提供します。

## インストール

```bash
npm install @memomer/search
```

## 実装

### SQLite（推奨）

外部サーバー不要。sql.js（WebAssembly）を使用してNode.jsプロセス内で完結します。

```typescript
import { createSqliteSearch, createGeminiEmbedding } from "@memomer/search";

const embeddingFn = createGeminiEmbedding({
  apiKey: process.env.GEMINI_API_KEY,
});

const search = await createSqliteSearch({
  storage,
  embeddingFn,
  dbPath: "/path/to/search.db",
});
```

### ChromaDB

ChromaDBサーバーが必要です。

```typescript
import { createChromaSearch, createGeminiEmbedding } from "@memomer/search";

const search = await createChromaSearch({
  storage,
  embeddingFn,
  chromaPath: "http://localhost:8000",
});
```

## API

### Search

```typescript
// テキスト検索
const results = await search.search({ text: "会議" });

// タグフィルター
const results = await search.search({ tags: ["work"] });

// ディレクトリフィルター
const results = await search.search({ directory: "/work" });

// 組み合わせ
const results = await search.search({
  text: "会議",
  tags: ["work"],
  directory: "/work/project",
});

// インデックス操作
await search.index("/work/meeting", "会議の内容", ["work"]);
await search.remove("/work/meeting");
await search.rebuild();
```

### Embedding

```typescript
import { createGeminiEmbedding } from "@memomer/search";

const embeddingFn = createGeminiEmbedding({
  apiKey: "your-api-key",
  model: "text-embedding-004", // オプション
});

const vector = await embeddingFn("テキスト");
```
