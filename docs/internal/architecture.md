# Architecture

システムアーキテクチャの詳細。

## 概念レベル

```
[スキーマ定義]     OpenAPI/JSON Schema ベース + x-ref 拡張
       ↓
[Source]           YAML ファイル群（Git管理）
       ↓
[検証]             参照整合性チェック（FK制約相当）
       ↓
[ToC定義]          ドキュメント単位の導出（何がドキュメントになるか）
       ↓
[テンプレート]     Nunjucks + JSONPath フィルタ（見た目の定義）
       ↓
[出力]             複数 Markdown ファイル
       ↓
[レンダリング]     Hugo (hugo-bin 経由)、将来 AsciiDoc 対応も検討
```

## 実行時構成

Validator と Generator を疎結合にし、検証結果ファイルを介して連携する：

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CLI Watcher (schema/, source/ を監視)                        │
│    chokidar -w schema/ -w source/ --debounce 500               │
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
│ 3. CLI Watcher (.validation-result.yaml, toc/, templates/ を監視)    │
│    chokidar -w .validation-result.yaml -w toc/ -w templates/         │
└─────────────────────┬───────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Generator APP  ★スクラッチ開発                               │
│    ・検証結果 + source YAML + toc定義読み込み                    │
│    ・ハッシュ突合 → 不一致なら待機 or 警告ページ生成             │
│    ・toc + source をテンプレートに渡してドキュメント生成          │
└─────────────────────┬───────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Render Server                                                 │
│    hugo server (hugo-bin 経由で自動取得)                         │
│    将来: AsciiDoc 対応も検討                                     │
└─────────────────────────────────────────────────────────────────┘
```

## 検証結果ファイル

Validator と Generator の「契約」として機能：

```yaml
# .validation-result.yaml
status: valid  # or invalid
content_hash: "a1b2c3..."  # schema/ + source/ のハッシュ
timestamp: "2024-01-15T10:30:00Z"
errors: []  # invalid時はエラー一覧
```

### ハッシュ計算方法

- ファイルパス + 内容を連結してハッシュ（リネーム・削除も検出可能）
- ライブラリ: folder-hash (Node.js) / filehash (Python)

```bash
# シェルで同等の処理
find schema/ source/ -name '*.yaml' | sort | while read f; do echo "$f"; cat "$f"; done | sha256sum
```

## 設計判断

### Validator と Generator を分離する理由

- 別プロセス・別言語で実装可能
- Generator は検証ロジックを持たない（11ty等への丸投げが容易）
- 検証結果ファイルが「正しいデータの証明」として機能

### ハッシュで整合性を担保する理由

- mtime では削除・リネームを検出できない
- ハッシュならファイル一覧 + 内容の完全な状態を捉えられる
- debounce と組み合わせて、編集中の不整合を回避

### Generator が invalid 時にエラーページを生成する理由

- 壊れたリンクを含むドキュメントを出力しない
- 読者に「データが壊れている」ことを明示できる

## 開発モード起動スクリプト（例）

```bash
#!/bin/bash
# reqs-builder dev

chokidar -w schema/ -w source/ --debounce 500 -- reqs-builder validate &
chokidar -w .validation-result.yaml -w toc/ -w templates/ --debounce 300 -- reqs-builder generate &
hugo server &

wait
```
