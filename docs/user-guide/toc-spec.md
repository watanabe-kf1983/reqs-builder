# ToC (Table of Contents) Specification

目次定義の仕様。ドキュメント単位を導出するクエリを定義する。

## 概要

`toc/` ディレクトリに Nunjucks テンプレート（`.yaml.njk`）を配置し、生データからドキュメント単位を導出する。

## 役割分担

| 層 | 責務 |
|---|---|
| **source/** | ドメインの真実（正規化されたデータ） |
| **toc/** | ドキュメント単位の導出（何がドキュメントになるか） |
| **templates/** | 表示（どう見せるか） |

toc はドキュメント単位を定義するが、それをページとして出力するかどうかはテンプレートが決める。

## 依存関係

```
Source（生データ）
  ↓ 参照
ToC（ドキュメント単位）
  ↓ pagination.data で参照
Template（表示）
```

テンプレートが toc を参照する。toc はテンプレートを知らない。

## ファイル形式

YAML の Nunjucks テンプレート（`.yaml.njk`）。

```
toc/
  erds.yaml.njk
  crud-matrices.yaml.njk
  ...
```

拡張子を `.yaml.njk` にする理由：
- `.yaml` だとエディタが YAML としてパースし、Nunjucks 構文にエラーを出す
- `.yaml.njk` なら Nunjucks テンプレートとして認識される

## 基本構造

```yaml
# toc/erds.yaml.njk
erds:
  {% for cat in source.entities | map(attribute="category") | unique %}
  - id: {{ cat }}
    title: {{ cat }} の ER図
    sectionId: {{ cat }}
    permalink: erds.md
  {% endfor %}
```

- `source` オブジェクトにアクセス可能（source/ から読み込まれた全データ）
- Nunjucks のフィルタが使える（`map`, `unique`, `selectattr` など）
- 出力は YAML としてパースされ、`toc` オブジェクトにマージされる

### エントリの構造

各 toc エントリは以下のプロパティを持つ：

| プロパティ | 必須 | 説明 |
|-----------|------|------|
| `id` | ○ | エントリの識別子 |
| `title` | ○ | 表示用タイトル |
| `sectionId` | ○ | アンカー用ID（見出しに付与） |
| `permalink` | ○ | 含まれるページのパス（ルートからの相対パス） |

`sectionId` と `permalink` を分けることで、ページ分割とセクション展開の両方に対応できる。

## テンプレートからの参照

### ページ分割パターン

各エントリを別ページとして出力する場合：

```yaml
# toc/erds.yaml.njk
erds:
  {% for cat in source.entities | map(attribute="category") | unique %}
  - id: {{ cat }}
    title: {{ cat }} の ER図
    sectionId: {{ cat }}
    permalink: erds/{{ cat }}.md
  {% endfor %}
```

```yaml
# templates/erd.md
---
pagination:
  data: toc.erds
  size: 1
  alias: entry
permalink: "{{ entry.permalink }}"
---

# {{ entry.title }} {#{{ entry.sectionId }}}

{% set entities = source.entities | selectattr("category", "eq", entry.id) %}
{% for e in entities %}
- {{ e.name }}
{% endfor %}
```

### セクション展開パターン

全エントリを一つのページ内にセクションとして展開する場合：

```yaml
# toc/erds.yaml.njk
erds:
  {% for cat in source.entities | map(attribute="category") | unique %}
  - id: {{ cat }}
    title: {{ cat }} の ER図
    sectionId: {{ cat }}
    permalink: erds.md
  {% endfor %}
```

```yaml
# templates/erds-all.md
---
permalink: "erds.md"
---

# ER図一覧

{% for entry in toc.erds %}
## {{ entry.title }} {#{{ entry.sectionId }}}

{% set entities = source.entities | selectattr("category", "eq", entry.id) %}
{% for e in entities %}
- {{ e.name }}
{% endfor %}

{% endfor %}
```

### 参照ルール

- `toc.erds` で目次を参照
- `entry` は toc の各エントリ（`id`, `title`, `sectionId`, `permalink` を持つ）
- `permalink` は toc で定義したものを使用
- 見出しには `{#{{ entry.sectionId }}}` でアンカーを付与
- `source.entities` で生データも参照可能
- クエリ/フィルタはテンプレート側で行う

## 処理フロー

1. `source/` から YAML を読み込み、`source` オブジェクトを構築
2. `toc/*.yaml.njk` を `source` を渡してレンダリング
3. レンダリング結果を YAML としてパース
4. 全ファイルの結果をマージして `toc` オブジェクトを構築
5. テンプレートに `{ source, toc }` を渡す

## 設計判断

### toc の責務を「ドキュメント単位の導出」に限定した理由

- データの成形はテンプレートの責務
- toc は「何がドキュメントになるか」だけを定義
- 責務を絞ることで、toc 定義がシンプルになる

### Nunjucks テンプレートを採用した理由

- 独自 DSL を発明しなくて済む
- `unique`, `map`, `selectattr` など既存のフィルタが使える
- 必要なら入れ子構造も表現できる柔軟性がある

### pagination との関係

テンプレートの `pagination.data` で生データを直接参照すると、View が「何を見せるか」を決めることになる。toc 層を挟むことで責務を分離する。

```yaml
# 良い: toc がドキュメント単位を定義
pagination:
  data: toc.erds

# 避けたい: テンプレートがクエリロジックを持つ
pagination:
  data: source.entities | groupby("category")
```

## ページ間リンク

### permalink の定義

各 toc エントリには `permalink` を定義できる：

```yaml
# toc/erds.yaml.njk
erds:
  {% for cat in source.entities | map(attribute="category") | unique %}
  - id: {{ cat }}
    title: {{ cat }} の ER図
    permalink: erds/{{ cat }}.md
  {% endfor %}
```

permalink はルートからの相対パスで指定する。

### relativeFrom フィルタ

ページ間リンクを張るとき、相対パスの計算が必要になる。`relativeFrom` カスタムフィルタを使用する：

```jinja2
{% set target = toc.entities | selectattr("id", "eq", "User") | first %}
<a href="{{ target.permalink | relativeFrom(entry.permalink) }}#{{ target.sectionId }}">
  {{ target.title }}
</a>
```

- `relativeFrom` でページパスの相対パスを計算
- `#{{ target.sectionId }}` でアンカーを付与

**動作例：**

| from (現在のページ) | to (リンク先) | 結果 |
|---------------------|---------------|------|
| `index.md` | `entities/User.md` | `entities/User.md` |
| `erds/user-mgmt.md` | `entities/User.md` | `../entities/User.md` |
| `deep/nested/page.md` | `entities/User.md` | `../../entities/User.md` |

**実装（template-expander.ts への追加）：**

```typescript
config.addFilter('relativeFrom', (to: string, from: string) => {
  const fromDir = from.split('/').slice(0, -1);
  const toParts = to.split('/');

  // 共通プレフィックスを除去
  while (fromDir.length > 0 && toParts.length > 1 && fromDir[0] === toParts[0]) {
    fromDir.shift();
    toParts.shift();
  }

  const up = '../'.repeat(fromDir.length);
  return up + toParts.join('/') || './';
});
```

## 例

### 例1: カテゴリ別 ERD（ページ分割）

```yaml
# source/entities.yaml
- id: User
  name: User
  category: user-management
- id: Role
  name: Role
  category: user-management
- id: Order
  name: Order
  category: order-management
```

```yaml
# toc/erds.yaml.njk
erds:
  {% for cat in source.entities | map(attribute="category") | unique %}
  - id: {{ cat }}
    title: {{ cat }} の ER図
    sectionId: {{ cat }}
    permalink: erds/{{ cat }}.md
  {% endfor %}
```

```yaml
# templates/erd.md
---
pagination:
  data: toc.erds
  size: 1
  alias: entry
permalink: "{{ entry.permalink }}"
---

# {{ entry.title }} {#{{ entry.sectionId }}}

{% set entities = source.entities | selectattr("category", "eq", entry.id) %}
...
```

### 例2: 明示的に定義された DFD（ページ分割）

```yaml
# source/dfds.yaml
- id: user-flow
  name: User Flow
  scope:
    entities: [User, Profile, Session]
- id: order-flow
  name: Order Flow
  scope:
    entities: [Order, Item, Payment]
```

```yaml
# toc/dfds.yaml.njk
dfds:
  {% for dfd in source.dfds %}
  - id: {{ dfd.id }}
    title: {{ dfd.name }}
    sectionId: {{ dfd.id }}
    permalink: dfds/{{ dfd.id }}.md
  {% endfor %}
```

```yaml
# templates/dfd.md
---
pagination:
  data: toc.dfds
  size: 1
  alias: entry
permalink: "{{ entry.permalink }}"
---

# {{ entry.title }} {#{{ entry.sectionId }}}

{% set dfd = source.dfds | selectattr("id", "eq", entry.id) | first %}
{% set entities = source.entities | selectattr("id", "in", dfd.scope.entities) %}
...
```

### 例3: セクション展開（全 DFD を一ページに）

```yaml
# toc/dfds.yaml.njk（例2と同じだが permalink が異なる）
dfds:
  {% for dfd in source.dfds %}
  - id: {{ dfd.id }}
    title: {{ dfd.name }}
    sectionId: {{ dfd.id }}
    permalink: dfds.md
  {% endfor %}
```

```yaml
# templates/dfds-all.md
---
permalink: "dfds.md"
---

# DFD 一覧

{% for entry in toc.dfds %}
## {{ entry.title }} {#{{ entry.sectionId }}}

{% set dfd = source.dfds | selectattr("id", "eq", entry.id) | first %}
{% set entities = source.entities | selectattr("id", "in", dfd.scope.entities) %}
...

{% endfor %}
```