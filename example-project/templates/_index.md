# システム設計ドキュメント

## ER図（カテゴリ別）

{% for entry in toc.erds -%}
- [{{ entry.title }}](./{{ entry.permalink }})
{% endfor %}

## リレーション一覧

| From | To | Cardinality | Description |
|------|-----|-------------|-------------|
{% for rel in source.relations -%}
| {{ rel.from }} | {{ rel.to }} | {{ rel.cardinality }} | {{ rel.description }} |
{% endfor %}
