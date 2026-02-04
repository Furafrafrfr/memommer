# @memomer/core

メモ管理システムのコアパッケージ。ドメインモデルとビジネスロジックを提供します。

## インストール

```bash
npm install @memomer/core
```

## API

### Memo

```typescript
import { createMemo, parseMemo, serializeMemo } from "@memomer/core";

// メモを作成
const memo = createMemo("/work/meeting", "会議の内容", ["work", "meeting"]);

// Markdownからパース
const memo = parseMemo("/work/meeting", `---
tags:
  - work
  - meeting
---
会議の内容`);

// Markdownにシリアライズ
const markdown = serializeMemo(memo);
```

### MemoService

```typescript
import { createMemoService } from "@memomer/core";

const service = createMemoService(storage, search);

await service.save(memo);
await service.get("/work/meeting");
await service.delete("/work/meeting");
await service.search({ text: "会議", tags: ["work"] });
await service.list();
await service.rebuildIndex();
```

### インターフェース

#### Storage

```typescript
type Storage = {
  save: (memo: Memo) => Promise<void>;
  get: (name: string) => Promise<Memo | null>;
  delete: (name: string) => Promise<void>;
  getAll: () => Promise<readonly Memo[]>;
  listNames: () => Promise<readonly string[]>;
};
```

#### Search

```typescript
type Search = {
  search: (query: SearchQuery) => Promise<readonly SearchResult[]>;
  rebuildIndex: () => Promise<void>;
  indexMemo: (name: string, content: string, tags: readonly string[]) => Promise<void>;
  removeFromIndex: (name: string) => Promise<void>;
};
```
