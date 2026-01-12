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

OpenAPI/JSON Schema 互換 + `x-ref` 拡張で外部キー参照を表現する。

詳細: [docs/specs/schema-spec.md](docs/specs/schema-spec.md)

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

`reports/` ディレクトリに「出力単位の定義」を配置する。レポートは入れ子構造（children）と foreach による複数出力をサポート。

詳細: [docs/specs/reports-spec.md](docs/specs/reports-spec.md)

## テンプレート仕様

Nunjucks + JSONPath によるテンプレートエンジン。ユーザ定義テンプレートによるオーバーライドをサポート。

詳細: [docs/specs/template-spec.md](docs/specs/template-spec.md)

## MCP サーバ / CLI（将来）

CLI と MCP サーバの両方で同一機能を提供。JSONPath + Patch 方式による汎用 CRUD API。

詳細: [docs/specs/api-design.md](docs/specs/api-design.md)

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
