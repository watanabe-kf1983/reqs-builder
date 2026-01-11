# Structured Document Generator

## プロジェクト概要

任意の関連するオブジェクト群とドキュメントテンプレートから、整合性の取れた構造的ドキュメントを生成する汎用ツール。

### 背景と経緯

元々は「要件定義を省力化するツール（reqs-builder）」として構想。
ERD、DFD、CRUDマトリクス等の要件定義成果物を生成しようとしていた。

議論の過程で、本質的に必要なのは以下だと気づいた：

- DFD/ERD等のスキーマ定義は「設定データ」に過ぎない
- 整合性チェックは FK 制約として汎用的に表現できる
- 作るべきは**汎用ドキュメントジェネレータ**である

詳細な経緯: [docs/reqs-builder-original.md](docs/reqs-builder-original.md)

## アーキテクチャ

### 概念レベル

```
[スキーマ定義]     OpenAPI/JSON Schema ベース + x-ref 拡張
       ↓
[データ]           YAML ファイル群（Git管理）
       ↓
[検証]             参照整合性チェック（FK制約相当）
       ↓
[レポート定義]     何を、どこに、どういう構造で出力するか
       ↓
[テンプレート]     Nunjucks + JSONPath フィルタ（見た目の定義）
       ↓
[出力]             複数 Markdown/AsciiDoc ファイル
       ↓
[プレビュー]       MkDocs / AsciiDoctor + 監視ツール（既存ツール利用）
```

### 実行時構成

Validator と Generator を疎結合にし、検証結果ファイルを介して連携する：

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CLI Watcher (schema/, data/ を監視)                          │
│    watchexec -w schema/ -w data/ --debounce 500                 │
└─────────────────────┬───────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Validator APP  ★スクラッチ開発                               │
│    ・ハッシュ取得 (folder-hash等)                                │
│    ・データ読み込み                                              │
│    ・ハッシュ再取得 → 不一致ならやり直し                          │
│    ・検証実施                                                    │
│    ・結果 + ハッシュを .validation-result.yaml に書き込み        │
└─────────────────────┬───────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. CLI Watcher (.validation-result.yaml, reports/, templates/ を監視) │
│    watchexec -w .validation-result.yaml -w reports/ -w templates/     │
└─────────────────────┬───────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Generator APP  ★スクラッチ開発                               │
│    ・検証結果 + データYAML + レポート定義読み込み                │
│    ・ハッシュ突合 → 不一致なら待機 or 警告ページ生成             │
│    ・レポート定義に従いドキュメント生成 (Nunjucks)               │
└─────────────────────┬───────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. CLI Watcher (生成ドキュメントを監視)                          │
│    MkDocs/AsciiDoctor 内蔵 or watchexec                         │
└─────────────────────┬───────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. Markdown Web Server                                           │
│    mkdocs serve / asciidoctor + live-server 等                  │
└─────────────────────────────────────────────────────────────────┘
```

### 検証結果ファイル

Validator と Generator の「契約」として機能：

```yaml
# .validation-result.yaml
status: valid  # or invalid
content_hash: "a1b2c3..."  # schema/ + data/ のハッシュ
timestamp: "2024-01-15T10:30:00Z"
errors: []  # invalid時はエラー一覧
```

**ハッシュ計算方法**:
- ファイルパス + 内容を連結してハッシュ（リネーム・削除も検出可能）
- ライブラリ: folder-hash (Node.js) / filehash (Python)

```bash
# シェルで同等の処理
find schema/ data/ -name '*.yaml' | sort | while read f; do echo "$f"; cat "$f"; done | sha256sum
```

### 設計判断

- **Validator と Generator を分離する理由**
  - 別プロセス・別言語で実装可能
  - Generator は検証ロジックを持たない（11ty等への丸投げが容易）
  - 検証結果ファイルが「正しいデータの証明」として機能

- **ハッシュで整合性を担保する理由**
  - mtime では削除・リネームを検出できない
  - ハッシュならファイル一覧 + 内容の完全な状態を捉えられる
  - debounce と組み合わせて、編集中の不整合を回避

- **Generator が invalid 時にエラーページを生成する理由**
  - 壊れたリンクを含むドキュメントを出力しない
  - 読者に「データが壊れている」ことを明示できる

### 開発モード起動スクリプト（例）

```bash
#!/bin/bash
# reqs-builder dev

watchexec -w schema/ -w data/ --debounce 500 -- reqs-builder validate &
watchexec -w .validation-result.yaml -w reports/ -w templates/ --debounce 300 -- reqs-builder generate &
mkdocs serve &

wait
```

## スキーマ定義

OpenAPI/JSON Schema 互換 + `x-ref` 拡張で外部キー参照を表現：

```yaml
components:
  schemas:
    Entity:
      type: object
      required: [id, name]
      properties:
        id:
          type: string
        name:
          type: string
        description:
          type: string

    DataStore:
      type: object
      required: [id, entity_ref]
      properties:
        id:
          type: string
        entity_ref:
          type: string
          x-ref:
            target: Entity
            field: id
```

### 設計判断

- **OpenAPI/JSON Schema ベースを採用した理由**
  - 業界標準、ドキュメント豊富
  - 各言語への型生成ツールが既存（Python/Pydantic, TypeScript/Zod 等）
  - `x-` プレフィックスで独自拡張可能（既存ツールは無視するだけ）

- **データストア方針**
  - 最初は参照チェックのみ（インメモリで十分）
  - クエリは JSONPath で対応
  - 複雑な JOIN・集計が必要になったら SQLite 導入を検討
  - GraphQL は実装コストが高いため見送り

## 技術スタック

- **言語: TypeScript**
- ランタイム: Node.js
- スキーマ検証: Zod
- YAML 処理: js-yaml
- テンプレート: Nunjucks
- クエリ: jsonpath-plus
- ディレクトリハッシュ: folder-hash
- ファイル監視: chokidar（または外部ツール watchexec）
- ドキュメントプレビュー: MkDocs または AsciiDoctor

### TypeScript を選択した理由

- **MCP 配布が容易**: `npx reqs-builder` で即実行、pip + 仮想環境の説明不要
- **エコシステム**: chokidar, folder-hash 等の監視・ハッシュ系ライブラリが成熟
- **単一パッケージで CLI + MCP**: Node の `bin` フィールドで CLI、MCP SDK も npm で導入可能
- **AI との協調**: 型定義が「仕様書」として機能し、Claude Code がコードの意図を理解しやすい
- **Nunjucks**: 11ty でも使われている実績、Jinja2 互換で知識流用可能

### プロジェクト構成

```
reqs-builder/
  package.json
  tsconfig.json
  src/
    cli.ts                # エントリポイント
    commands/
      validate.ts         # reqs-builder validate
      generate.ts         # reqs-builder generate
      dev.ts              # reqs-builder dev (統合起動)
      mcp-server.ts       # reqs-builder mcp-server（将来）
    lib/
      hash.ts             # ディレクトリハッシュ計算
      yaml-loader.ts      # YAML 読み込み
      schema-validator.ts # 参照整合性チェック
      report-processor.ts # レポート定義の処理・入れ子展開
      template-engine.ts  # Nunjucks ラッパー
    templates/            # 標準テンプレート（アプリ同梱）
      er.md.j2            # Mermaid ER図
      dfd.md.j2           # DFD
      crud-matrix.md.j2   # CRUDマトリクス
```

### ユーザプロジェクト構成（例）

```
my-project/
  schema/                 # スキーマ定義
    entities.yaml
    relations.yaml
  data/                   # データ
    entities/
      user.yaml
      order.yaml
    relations.yaml
  reports/                # レポート定義
    system-overview.yaml
    entities-chapter.yaml
  templates/              # ユーザ定義テンプレート（オーバーライド用）
    entities-chapter.md.j2
  docs/                   # 出力先（生成される）
    system-overview.md
    entities.md
```

## Reports 仕様

`reports/` ディレクトリに「出力単位の定義」を配置する。

### 役割分担

- **スキーマ (schema/)**: データ構造と参照制約を定義
- **データ (data/)**: 実際の値
- **レポート (reports/)**: 何を、どこに、どういう構造で出力するか
- **テンプレート (templates/)**: 見た目（純粋な表示ロジック）

### 基本構造

```yaml
# reports/entities-chapter.yaml
template: entities-chapter    # 使用するテンプレート
output: "docs/entities.md"    # 出力先
data:                         # テンプレートに渡すデータ（JSONPath）
  entities: "$.entities[*]"
  relations: "$.relations[*]"
```

### 入れ子（children）

レポートは子レポートを持てる。子の出力結果は親テンプレートに埋め込まれる：

```yaml
# reports/entities-chapter.yaml
template: entities-chapter
output: "docs/entities.md"
children:
  - name: er
    template: er              # 標準のER図テンプレート
    data:
      nodes: "$.entities[*]"
      edges: "$.relations[*]"
  - name: details
    template: entity-detail
    foreach: "$.entities[*]"
    as: entity
```

親テンプレートからの参照：

```jinja2
{# templates/entities-chapter.md.j2 #}
# エンティティ一覧

## ER図
{{ children.er }}

## 各エンティティ
{{ children.details }}
```

子レポートの出力結果が `children.er` や `children.details` として親テンプレートからアクセスできる。

### foreach による複数出力

子レポートに `foreach` を指定すると、その結果が連結される：

```yaml
children:
  - name: details
    template: entity-detail
    foreach: "$.entities[*]"
    as: entity
```

→ 全エンティティの詳細が `children.details` に連結されて入る

### 標準テンプレート

アプリは以下の標準テンプレートを提供（ユーザはコピーしてカスタマイズ可能）：

- `er`: Mermaid ER図
- `dfd`: Mermaid/PlantUML DFD
- `crud-matrix`: CRUD マトリクス表
- （他、必要に応じて追加）

### 設計判断

- **レポートとテンプレートを分離した理由**
  - テンプレートは純粋に「見た目」だけを担当
  - レポートが「何を、どこに」を担当
  - 同じテンプレートを複数のレポートで再利用可能

- **入れ子構造を採用した理由**
  - 1つの出力ファイルに複数の図・セクションを含められる
  - 章の中にER図、その下に詳細一覧、といった構造が自然に表現できる
  - 図の生成ロジック（標準テンプレート）を再利用しやすい

## テンプレート仕様

### データアクセス

**JSONPath を統一的なクエリ構文として採用：**

- CLI からのクエリ: `reqs-builder query "$.entities[?@.type=='master']"`
- テンプレート内: `{{ data | jsonpath("$.relations[?@.from==entity.id]") }}`
- MCP API: 同じ JSONPath 構文

Nunjucks のネイティブ構文（`entity.name` 等）も使用可能だが、
複雑なフィルタリングには JSONPath を推奨。

### テンプレートのオーバライド

`templates/` ディレクトリにユーザ定義のテンプレートを配置：

```
templates/
  entity-detail.md.j2     # ユーザ定義テンプレート
  er.md.j2                # 標準テンプレートをオーバーライド
```

- 標準テンプレートと同名のファイルを置くとオーバーライド
- 標準テンプレートをコピーして編集することを推奨

### YAML 内の Markdown

description 等の長文フィールドには YAML のリテラルブロックを使用：

```yaml
entities:
  - id: user
    name: ユーザー
    description: |
      システムを利用する人物を表す。

      - `email`: ログインIDとしても使用
      - `status`: 有効/無効/仮登録の3状態
```

**注意**: description 内に見出し（`##`）を使う場合、
テンプレート側で見出しレベルが競合しないよう設計が必要。
複雑な構造はスキーマで表現することを推奨。

## MCP サーバ / CLI（将来）

### 提供形式

同一機能を2つのインターフェースで提供：

- **CLI**: 人間向け、シェルスクリプト連携用
- **MCP サーバ**: AI エージェント向け（ツール定義が構造化されて提供される）

### なぜ両方必要か

- CLI のみだと AI は使い方を README や --help から推測する必要がある
- MCP はツールの引数・型・説明が構造化されており、AI が迷わず使える
- 人間は CLI の方が使いやすい場面も多い

### API 設計方針

**JSONPath + Patch 方式**を採用し、スキーマに依存しない汎用 CRUD を提供：

- **Read**: JSONPath クエリ
- **Create/Update/Delete**: JSON Patch (RFC 6902) の操作 + JSONPath によるパス指定

#### Read（クエリ）

```typescript
function query(jsonpath: string): unknown[];
// 例: query("$.screens[?@.entity_ref=='User']")
```

#### Create/Update/Delete（ミューテーション）

JSON Patch の `op` と JSONPath の `path` を組み合わせた方式：

```typescript
interface Operation {
  op: 'add' | 'replace' | 'remove';
  path: string;  // JSONPath
  value?: unknown;  // remove 時は不要
}

function mutate(operations: Operation[]): MutateResult;

// 例:
// 追加
{ op: "add", path: "$.screens", value: { id: "customer-list", name: "お客様一覧", entity_ref: "User" } }

// 更新
{ op: "replace", path: "$.screens[?@.id=='customer-list'].name", value: "顧客一覧画面" }

// 削除
{ op: "remove", path: "$.screens[?@.id=='customer-list']" }
```

#### 検証

```typescript
interface ValidationError {
  path: string;
  message: string;
  code: string;
}

function validate(): ValidationError[];
// mutate() は内部で自動的に検証を実行し、エラー時はロールバック
```

### 設計判断

- **CUD を API 経由にする理由**
  - 検証が必ず実行される（忘れない）
  - LLM の認知負荷を下げる（YAML 構造を理解する必要がない）
  - 1回の呼び出しで完結（編集→検証→エラー修正ループが不要）

- **YAML 直接編集も許容**
  - 人間や LLM が直接編集しても構わない
  - その場合は `validate` コマンド/API で事後検証

- **JSONPath + Patch 方式を採用した理由**
  - Read で使う JSONPath をそのまま CUD にも流用できる
  - スキーマから個別の CRUD API を生成する必要がない（汎用）
  - JSON Patch (RFC 6902) の操作セマンティクスを借用し学習コストを下げる
  - GraphQL は実装コストが高いため見送り（将来必要になれば検討）

## 開発方針

1. **既存ツールを最大限活用** - 車輪の再発明を避ける
2. **スキーマ定義は言語非依存な資産** - YAML/JSON Schema として Git 管理
3. **周辺ツールは差し替え可能に** - 出力形式、プレビューツール等は疎結合に
4. **クエリ構文は JSONPath に統一** - CLI、テンプレート、MCP で一貫性

## 実装優先順位

### Phase 1: 最小限の動作確認

1. スキーマ定義（YAML）のパース
2. データ（YAML）の読み込みと参照整合性チェック
3. レポート定義の読み込みと単一テンプレートからの Markdown 生成

### Phase 2: 実用機能

4. レポートの入れ子（children）処理
5. foreach による複数出力の連結
6. 標準テンプレート（ER図、DFD、CRUDマトリクス）
7. テンプレートオーバライド
8. JSONPath フィルタ

### Phase 3: 統合

9. MkDocs / AsciiDoctor 連携
10. MCP サーバ対応
11. CLI の整備

### 将来

- 多言語スキーマ生成（Zod ↔ Pydantic）
- FP 法計測の自動化（要件定義ユースケース向け）
