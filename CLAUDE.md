# Structured Document Generator

## Overview

任意の関連するオブジェクト群とドキュメントテンプレートから、整合性の取れた構造的ドキュメントを生成する汎用ツール。

- 製品ビジョン: [docs/product.md](docs/product.md)
- アーキテクチャ: [docs/architecture.md](docs/architecture.md)

## Technical Stack

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

## Project Structure

### アプリケーション構成

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

## Specifications

- スキーマ定義: [docs/specs/schema-spec.md](docs/specs/schema-spec.md)
- レポート仕様: [docs/specs/reports-spec.md](docs/specs/reports-spec.md)
- テンプレート仕様: [docs/specs/template-spec.md](docs/specs/template-spec.md)
- API設計（将来）: [docs/specs/api-design.md](docs/specs/api-design.md)

## Development

### 開発方針

1. **既存ツールを最大限活用** - 車輪の再発明を避ける
2. **スキーマ定義は言語非依存な資産** - YAML/JSON Schema として Git 管理
3. **周辺ツールは差し替え可能に** - 出力形式、プレビューツール等は疎結合に
4. **クエリ構文は JSONPath に統一** - CLI、テンプレート、MCP で一貫性

### Roadmap

#### Phase 1: 出力確認環境

1. MkDocs セットアップ

#### Phase 2: Generator

2. 単一テンプレートから Markdown 生成（ダミーデータで）
3. ファイル監視と統合起動コマンド（reqs-builder dev）
4. データ（YAML）の読み込み
5. レポート定義の読み込み
6. レポートの入れ子（children）処理
7. foreach による複数出力の連結
8. 標準テンプレート（ER図、DFD、CRUDマトリクス）
9. テンプレートオーバライド
10. JSONPath フィルタ（テンプレート内での複雑なクエリ）

#### Phase 3: Validator

11. スキーマ定義（YAML）のパースと参照整合性チェック
12. 検証結果ファイル（.validation-result.yaml）の生成
13. ファイル監視（schema/data → Validator、validation-result → Generator）

#### 将来

- MCP サーバ対応
- 多言語スキーマ生成（Zod ↔ Pydantic）
- FP 法計測の自動化（要件定義ユースケース向け）
