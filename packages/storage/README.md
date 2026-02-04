# @memomer/storage

メモ管理システムのストレージパッケージ。ファイルシステムベースのストレージ実装を提供します。

## インストール

```bash
npm install @memomer/storage
```

## API

### createFileStorage

```typescript
import { createFileStorage } from "@memomer/storage";

const storage = createFileStorage("/path/to/memos");

// メモを保存
await storage.save(memo);
// -> /path/to/memos/work/meeting.md が作成される

// メモを取得
const memo = await storage.get("/work/meeting");

// メモを削除
await storage.delete("/work/meeting");

// 全メモを取得
const memos = await storage.getAll();

// 全メモ名を取得
const names = await storage.listNames();
```

## ファイル構造

メモ名がそのままディレクトリ構造にマッピングされます。

```
/path/to/memos/
├── work/
│   ├── meeting.md      <- /work/meeting
│   └── project/
│       └── task.md     <- /work/project/task
└── personal/
    └── diary.md        <- /personal/diary
```

## ファイル形式

タグはMarkdownのフロントマターとして保存されます。

```markdown
---
tags:
  - work
  - meeting
---
会議の内容
```
