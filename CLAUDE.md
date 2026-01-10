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

```
[スキーマ定義]     OpenAPI/JSON Schema ベース + x-ref 拡張
       ↓
[データ]           YAML ファイル群（Git管理）
       ↓
[検証]             参照整合性チェック（FK制約相当）
       ↓
[変換ロジック]     オブジェクト → 図記法（Mermaid/PlantUML）
       ↓
[テンプレート]     Jinja2等
       ↓
[出力]             複数 Markdown/AsciiDoc ファイル
       ↓
[プレビュー]       MkDocs / AsciiDoctor + 監視ツール（既存ツール利用）
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

- **SQLite を使わない理由**
  - 検証したいのは実質 FK 制約（参照の存在チェック）のみ
  - 単純な参照チェックに RDBMS は過剰
  - 複雑なクエリが必要になったら再検討

## 技術スタック

- 言語: Python 3.11+
- スキーマ検証: Pydantic v2（スキーマ定義 YAML から生成）
- YAML処理: PyYAML
- テンプレート: Jinja2
- ドキュメントプレビュー: MkDocs または AsciiDoctor + watchexec

### 多言語対応（将来）

スキーマ定義 YAML から各言語向けの型/バリデータを生成：

- Python: Pydantic モデル
- TypeScript: Zod スキーマ
- Java: 検討中

## 開発方針

1. **既存ツールを最大限活用** - 車輪の再発明を避ける
2. **スキーマ定義は言語非依存な資産** - YAML/JSON Schema として Git 管理
3. **周辺ツールは差し替え可能に** - 出力形式、プレビューツール等は疎結合に

## 実装優先順位

### Phase 1: 最小限の動作確認

1. スキーマ定義（YAML）のパース
2. データ（YAML）の読み込みと参照整合性チェック
3. 単一テンプレートからの Markdown 生成

### Phase 2: 実用機能

4. 複数ファイル生成（エンティティごとのページ等）
5. 図記法への変換ロジック（1-N → Mermaid記法等）
6. MkDocs 連携

### 将来

- MCP サーバ対応（Claude Code との対話的ドキュメント編集）
- 多言語スキーマ生成
- FP法計測の自動化（要件定義ユースケース向け）
