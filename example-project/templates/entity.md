---
pagination:
  data: source.entities
  size: 1
  alias: entity
permalink: "entities/{{ entity.id }}.md"
---
# {{ entity.name }}

{{ entity.description }}

## フィールド

| フィールド | 型 | 備考 |
|-----------|-----|------|
{% for field in entity.fields -%}
| {{ field.name }} | {{ field.type }} | {{ "PK" if field.pk }}{{ "FK → " + field.fk if field.fk }} |
{% endfor %}

---

[← エンティティ一覧に戻る](../_index.md)