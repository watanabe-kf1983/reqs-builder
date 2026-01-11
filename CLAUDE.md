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
[クエリ]           JSONPath でデータアクセス
       ↓
[テンプレート]     Jinja2 / Nunjucks + JSONPath フィルタ
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

- **データストア方針**
  - 最初は参照チェックのみ（インメモリで十分）
  - クエリは JSONPath で対応
  - 複雑な JOIN・集計が必要になったら SQLite 導入を検討
  - GraphQL は実装コストが高いため見送り

## 技術スタック

- 言語: TypeScript または Python（検討中）
  - TypeScript: MCP 配布が容易（npx）、Nunjucks との親和性
  - Python: Pydantic が強力、プロトタイピングが速い
- スキーマ検証: Zod（TS）または Pydantic v2（Python）
- YAML 処理: js-yaml / PyYAML
- テンプレート: Nunjucks（TS）/ Jinja2（Python）
- クエリ: JSONPath（jsonpath-plus / jsonpath-ng）
- ドキュメントプレビュー: MkDocs または AsciiDoctor + watchexec

## テンプレート仕様

### 基本構造

11ty (Eleventy) ライクな仕様を採用：

```yaml
---
foreach: "$.entities[*]"       # JSONPath でイテレート対象を指定
as: entity                     # テンプレート内での変数名
output: "docs/entities/{{ entity.id }}.md"  # 出力パス
---
# {{ entity.name }}

{{ entity.description }}
```

### データアクセス

**JSONPath を統一的なクエリ構文として採用：**

- CLI からのクエリ: `reqs-builder query "$.entities[?@.type=='master']"`
- テンプレート内: `{{ data | jsonpath("$.relations[?@.from==entity.id]") }}`
- MCP API: 同じ JSONPath 構文

Jinja2/Nunjucks のネイティブ構文（`entity.name` 等）も使用可能だが、
複雑なフィルタリングには JSONPath を推奨。

### テンプレートのオーバライド

特定のデータに対してカスタムテンプレートを使用可能：

```
templates/
  entity.md.j2              # デフォルトテンプレート

data/
  entities/
    user.yaml               # デフォルトテンプレートを使用
    payment.yaml
    payment.md.j2           # payment 専用テンプレート（オーバライド）
```

- データと同じディレクトリに `{id}.md.j2` を置くとオーバライド
- オーバライドテンプレートは完全に独立（継承なし）
- 親テンプレートの変更には手動追従が必要（割り切り）

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

## MCP サーバ（将来）

### API 設計方針

- スキーマから基本的な CRUD API を自動生成
- 複雑なクエリは JSONPath を受け付ける汎用 API で対応
- スキーマ変更時は MCP サーバ再起動で対応（動的リロードは将来検討）

```python
# 自動生成される API 例
def list_entities(type: str = None) -> list[Entity]: ...
def get_entity(id: str) -> Entity: ...

# 汎用クエリ API
def query(jsonpath: str) -> list[dict]: ...
def get_schema() -> dict: ...
```

## 開発方針

1. **既存ツールを最大限活用** - 車輪の再発明を避ける
2. **スキーマ定義は言語非依存な資産** - YAML/JSON Schema として Git 管理
3. **周辺ツールは差し替え可能に** - 出力形式、プレビューツール等は疎結合に
4. **クエリ構文は JSONPath に統一** - CLI、テンプレート、MCP で一貫性

## 実装優先順位

### Phase 1: 最小限の動作確認

1. スキーマ定義（YAML）のパース
2. データ（YAML）の読み込みと参照整合性チェック
3. 単一テンプレートからの Markdown 生成

### Phase 2: 実用機能

4. 複数ファイル生成（foreach によるイテレーション）
5. テンプレートオーバライド
6. JSONPath フィルタ
7. 図記法への変換ロジック（1-N → Mermaid 記法等）

### Phase 3: 統合

8. MkDocs / AsciiDoctor 連携
9. MCP サーバ対応
10. CLI の整備

### 将来

- 11ty の pagination 相当の機能
- 多言語スキーマ生成（Zod ↔ Pydantic）
- FP 法計測の自動化（要件定義ユースケース向け）
