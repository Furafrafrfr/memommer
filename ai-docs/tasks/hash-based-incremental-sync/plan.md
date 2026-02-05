# ハッシュベース差分検出による増分同期の実装

## 概要

現在の `sync()` は全削除→全追加を行うため、全メモに対して embedding を再計算している。
ハッシュベースの差分検出を導入し、変更されたメモのみ embedding を計算する増分同期に変更する。

## 背景・動機

### 現状の課題
- 全メモの embedding を毎回計算するため、メモ数が増えると同期時間が長くなる
- API コスト（Gemini）が無駄に発生する
- 変更のないメモも毎回処理される

### 目標
1. **パフォーマンス改善**: 変更されたメモのみ embedding 計算
2. **API コスト削減**: 必要最小限の embedding 生成
3. **将来の拡張性**: 段落単位のチャンク分割にも対応できる設計

## 設計方針

### ハッシュベースの差分検出

**なぜハッシュか？**
- タイムスタンプより信頼性が高い（ファイルコピー/移動に影響されない）
- コンテンツの変更を確実に検出できる
- チャンク単位の管理に適している

**差分検出のフロー:**
```
1. ストレージから全メモを取得し、ハッシュを計算
2. インデックスから既存のチャンク情報（ハッシュ含む）を取得
3. 比較して3種類の操作に分類:
   - 追加: インデックスにない
   - 更新: ハッシュが異なる
   - 削除: ストレージにない
4. 追加・更新のみ embedding を計算してインデックスに反映
```

### データ構造

#### チャンク（現在は1メモ = 1チャンク）

```typescript
type IndexedChunk = {
  readonly id: string;        // メモ名（例: "/work/meeting"）
  readonly content: string;   // メモの内容
  readonly tags: readonly string[];
  readonly hash: string;      // MD5ハッシュ
};
```

#### 将来の拡張: 段落分割

```typescript
// 1つのメモが複数チャンクに分割される場合
// id: "/work/meeting#0", "/work/meeting#1", ...
// メモ削除時: WHERE id LIKE '/work/meeting#%'
```

### DB スキーマ変更

#### SQLite
```sql
CREATE TABLE memos (
  name TEXT PRIMARY KEY,      -- チャンク ID（現在はメモ名）
  embedding TEXT NOT NULL,
  tags TEXT NOT NULL,
  hash TEXT NOT NULL          -- 新規追加
)
```

#### ChromaDB
```typescript
metadata: {
  tags: string,
  name: string,
  hash: string  // 新規追加
}
```

### ハッシュアルゴリズム

**MD5 を採用:**
- 高速で軽量
- 衝突リスクは実用上問題ない（数千〜数万メモ程度）
- Node.js 標準ライブラリで利用可能

```typescript
import crypto from "node:crypto";

const computeHash = (content: string): string => {
  return crypto.createHash("md5").update(content).digest("hex");
};
```

## 実装ステップ（TDD）

### Phase 1: core パッケージの型定義更新

1. `search.ts` に型を追加
   - `IndexedChunk` 型の定義
   - `getIndexedChunks()` メソッドの追加（内部用）

### Phase 2: sqlite-search の実装

1. **Red**: テストを追加
   - 初回同期: 全追加
   - 2回目同期（変更なし）: embedding 計算されない
   - メモ追加: 新しいメモのみ embedding 計算
   - メモ更新: 更新されたメモのみ embedding 計算
   - メモ削除: インデックスから削除される

2. **Green**: 実装
   - DB スキーマに `hash` カラム追加
   - `getIndexedChunks()` 実装
   - `sync()` を差分検出ロジックに変更

3. **Refactor**: 整理

### Phase 3: chroma-search の実装

同様の手順で ChromaDB 版を実装

### Phase 4: 動作確認

- CLI から `prepare` コマンド実行
- 実際のメモで差分検出が動作することを確認

## テスト設計

### 差分検出のテストケース

```typescript
describe("sync with hash-based diff", () => {
  it("初回同期: 全メモをインデックスに追加", async () => {
    // 2つのメモが存在
    // → 2つとも embedding 計算される
  });

  it("2回目同期（変更なし）: embedding 計算されない", async () => {
    // 1回目: 2つのメモを同期
    // 2回目: 変更なし
    // → embedding 関数が呼ばれない
  });

  it("メモ追加: 新しいメモのみ embedding 計算", async () => {
    // 1回目: 2つのメモを同期
    // 2回目: 1つ追加
    // → 追加されたメモのみ embedding 計算
  });

  it("メモ更新: 更新されたメモのみ embedding 計算", async () => {
    // 1回目: 2つのメモを同期
    // 2回目: 1つの内容を変更
    // → 変更されたメモのみ embedding 計算
  });

  it("メモ削除: インデックスから削除される", async () => {
    // 1回目: 2つのメモを同期
    // 2回目: 1つ削除
    // → インデックスからも削除される
  });

  it("複合: 追加・更新・削除が同時", async () => {
    // 1回目: 3つのメモ
    // 2回目: 1つ削除、1つ更新、1つ追加
    // → 更新と追加のみ embedding 計算
  });
});
```

## 将来の拡張性

### 段落単位のチャンク分割

メモを段落で分割してインデックスする場合：

```typescript
// メモを段落に分割
const chunks = splitIntoChunks(memo);
// chunks = [
//   { id: "/work/meeting#0", content: "第1段落", tags: ["work"] },
//   { id: "/work/meeting#1", content: "第2段落", tags: ["work"] },
// ]

// 各チャンクのハッシュを計算して差分検出
```

**ID の命名規則:**
- メモ全体: `/work/meeting`
- チャンク: `/work/meeting#0`, `/work/meeting#1`, ...

**メモ削除時の処理:**
```sql
-- SQLite
DELETE FROM memos WHERE name LIKE '/work/meeting#%' OR name = '/work/meeting'

-- または正規表現で
DELETE FROM memos WHERE name GLOB '/work/meeting*'
```

### その他の拡張

- **増分バックアップ**: ハッシュの履歴を保持すれば変更履歴も追跡可能
- **並列処理**: 追加・更新の embedding 計算を並列化
- **キャッシュ**: ハッシュ → embedding のキャッシュ層を追加

## 実装上の注意点

### マイグレーション

既存の DB には `hash` カラムがないため：
1. テーブル作成時に `hash` カラムを含める（新規ユーザー）
2. 既存ユーザーは次回 `sync` 時に全再計算される（1回だけ）
   - `hash` カラムが NULL のレコードは「古いデータ」として扱う
   - 全削除→全追加で対応

### パフォーマンス

- MD5 計算は軽量（数KB〜数MB のテキストなら問題なし）
- ボトルネックは embedding 計算なので、その削減効果が大きい

### エラーハンドリング

- ハッシュ計算失敗時: エラーを投げる（データ破損の可能性）
- インデックス取得失敗時: 全再同期にフォールバック

## 実装の優先度

1. **High**: SQLite 版の実装（最も使われる）
2. **Medium**: ChromaDB 版の実装
3. **Low**: 段落分割対応（将来的に検索精度向上が必要になったら）

## 参考

- [Node.js crypto module](https://nodejs.org/api/crypto.html)
- [MD5 vs SHA256](https://stackoverflow.com/questions/2948156/algorithm-complexity-security-md5-or-sha1)
