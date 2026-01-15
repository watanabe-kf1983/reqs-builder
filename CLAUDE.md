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
- ファイル監視: chokidar
- ドキュメントプレビュー: Hugo (hugo-bin 経由)

### TypeScript を選択した理由

- **MCP 配布が容易**: `npx reqs-builder` で即実行、pip + 仮想環境の説明不要
- **エコシステム**: chokidar, folder-hash 等の監視・ハッシュ系ライブラリが成熟
- **単一パッケージで CLI + MCP**: Node の `bin` フィールドで CLI、MCP SDK も npm で導入可能
- **AI との協調**: 型定義が「仕様書」として機能し、Claude Code がコードの意図を理解しやすい
- **Nunjucks**: 11ty でも使われている実績、Jinja2 互換で知識流用可能

### Hugo を選択した理由

- **Node.js で完結**: hugo-bin により `npm install` 時にバイナリ自動取得、Python/Ruby 不要
- **高速**: Go 製シングルバイナリ、大量ファイルでも高速ビルド
- **ライブリロード**: `hugo server` で変更を即座にブラウザ反映
- **静的エクスポート**: `hugo` コマンドで HTML 一式を出力、ポータブルに配布可能
- **Mermaid 対応**: ER図、シーケンス図、フローチャート等を描画可能
- **将来**: AsciiDoc プレビュー環境への差し替えも検討（Asciidoctor.js または外部サーバ連携）

### 図表記の方針

- 基本: Mermaid（ER図、シーケンス図、フローチャート等）
- Mermaid 非対応の図（ユースケース図等）は代替記法で対応
- 将来: PlantUML 対応を検討（Java 依存のため優先度低）

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

### テスト方針

- **テスト対象**: `src/lib/` 配下のビジネスロジック
- **カバレッジ目標**: 85%以上
- **アプローチ**: テストファースト（TDD）を予定
- **対象外**: `src/cli.ts`, `src/commands/` - CLIフレームワーク（commander）への設定層のため

### Roadmap

各タスクは「1タスク・1 Git ブランチ・1 Claude Code セッション」で進める。完了したらチェックを入れてmainにマージ。

#### Phase 1: 出力確認環境

- [x] 1. 統合起動コマンドの作成（reqs-builder dev）
- [ ] 2. Hugo セットアップ (hugo-bin)

#### Phase 2: Generator

- [ ] 3. 単一テンプレートから Markdown 生成（ダミーデータで）
- [ ] 4. ファイル監視機能の追加
- [ ] 5. データ（YAML）の読み込み
- [ ] 6. レポート定義の読み込み
- [ ] 7. レポートの入れ子（children）処理
- [ ] 8. foreach による複数出力の連結
- [ ] 9. 標準テンプレート（ER図、DFD、CRUDマトリクス）
- [ ] 10. テンプレートオーバライド
- [ ] 11. JSONPath フィルタ（テンプレート内での複雑なクエリ）

#### Phase 3: Validator

- [ ] 12. スキーマ定義（YAML）のパースと参照整合性チェック
- [ ] 13. 検証結果ファイル（.validation-result.yaml）の生成
- [ ] 14. ファイル監視（schema/data → Validator、validation-result → Generator）

#### 将来

- MCP サーバ対応
- 多言語スキーマ生成（Zod ↔ Pydantic）
- FP 法計測の自動化（要件定義ユースケース向け）
