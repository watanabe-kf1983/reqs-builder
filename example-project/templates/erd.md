---
pagination:
  data: toc.erds
  size: 1
  alias: entry
permalink: "{{ entry.permalink }}"
---
# {{ entry.title }}

{% set entities = source.entities | selectattr("category", "eq", entry.id) %}

## エンティティ一覧

{% for entity in entities %}
### {{ entity.name }}

{{ entity.description }}

| フィールド | 型 | 備考 |
|-----------|-----|------|
{% for field in entity.fields -%}
| {{ field.name }} | {{ field.type }} | {{ "PK" if field.pk }}{{ "FK → " + field.fk if field.fk }} |
{% endfor %}

{% endfor %}

---

[← トップに戻る](../_index.md)
