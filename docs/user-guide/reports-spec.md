# Reports Specification

レポート定義の仕様。何を、どこに、どういう構造で出力するかを定義する。

## 概要

`reports/` ディレクトリに「出力単位の定義」を配置する。

## 役割分担

- **スキーマ (schema/)**: データ構造と参照制約を定義
- **データ (data/)**: 実際の値
- **レポート (reports/)**: 何を、どこに、どういう構造で出力するか
- **テンプレート (templates/)**: 見た目（純粋な表示ロジック）

## 基本構造

```yaml
# reports/entities-chapter.yaml
template: entities-chapter    # 使用するテンプレート
output: "docs/entities.md"    # 出力先
data:                         # テンプレートに渡すデータ（JSONPath）
  entities: "$.entities[*]"
  relations: "$.relations[*]"
```

## 入れ子（children）

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

## foreach による複数出力

子レポートに `foreach` を指定すると、その結果が連結される：

```yaml
children:
  - name: details
    template: entity-detail
    foreach: "$.entities[*]"
    as: entity
```

→ 全エンティティの詳細が `children.details` に連結されて入る

## 標準テンプレート

アプリは以下の標準テンプレートを提供（ユーザはコピーしてカスタマイズ可能）：

- `er`: Mermaid ER図
- `dfd`: Mermaid/PlantUML DFD
- `crud-matrix`: CRUD マトリクス表
- （他、必要に応じて追加）

標準テンプレートの実装例は [template-spec.md](template-spec.md) を参照。

## 設計判断

### レポートとテンプレートを分離した理由

- テンプレートは純粋に「見た目」だけを担当
- レポートが「何を、どこに」を担当
- 同じテンプレートを複数のレポートで再利用可能

### 入れ子構造を採用した理由

- 1つの出力ファイルに複数の図・セクションを含められる
- 章の中にER図、その下に詳細一覧、といった構造が自然に表現できる
- 図の生成ロジック（標準テンプレート）を再利用しやすい

## 図記法・出力形式の選択（未決定）

以下は実装を進めながら決定する：

- **図記法**: Mermaid vs PlantUML
- **出力形式**: Markdown vs AsciiDoc
- **生成物のGit管理**: する vs しない（.gitignore）

### トレードオフ

| 選択肢 | メリット | デメリット |
|--------|---------|-----------|
| Mermaid + Markdown | GitHub上で直接表示可能 | 図内リンクがCSPでブロックされる |
| PlantUML + AsciiDoc | 図内リンク可能（SVG）、表現力高い | GitHub表示不可、ビルド必須 |
| 生成物をGit管理 | レビューしやすい | Diffがうるさい |
| 生成物はignore | Diffがクリーン | 閲覧にビルド必要 |

### 現時点の方針

- **Mermaid + Markdown** で開始
- 図内リンクの制約が問題になった時点で PlantUML + AsciiDoc への移行を検討
- 設計上、テンプレートと出力形式は差し替え可能にしておく
