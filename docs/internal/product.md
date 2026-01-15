# Product Vision

製品ビジョンと背景。

## What

任意の関連するオブジェクト群とドキュメントテンプレートから、整合性の取れた構造的ドキュメントを生成する汎用ツール。

## Why

### 背景と経緯

元々は「要件定義を省力化するツール（reqs-builder）」として構想。
ERD、DFD、CRUDマトリクス等の要件定義成果物を生成しようとしていた。

議論の過程で、本質的に必要なのは以下だと気づいた：

- DFD/ERD等のスキーマ定義は「設定データ」に過ぎない
- 整合性チェックは FK 制約として汎用的に表現できる
- 作るべきは**汎用ドキュメントジェネレータ**である

詳細な経緯: [reqs-builder-original.md](reqs-builder-original.md)

## Key Concepts

- **Schema**: データ構造と参照制約を定義（OpenAPI/JSON Schema + x-ref 拡張）
- **Data**: 実際の値（YAML ファイル群、Git管理）
- **Reports**: 何を、どこに、どういう構造で出力するか
- **Templates**: 見た目の定義（Nunjucks + JSONPath）
- **Validation**: 参照整合性チェック（FK制約相当）
