---
pagination:
  data: toc.erds
  size: 1
  alias: entry
permalink: "{{ entry.permalink }}"
---
# {{ entry.title }}

## エンティティ一覧

{% for entity in source.entities %}{% if entity.category == entry.id %}
### {{ entity.name }}

{{ entity.description }}

| フィールド | 型 | 備考 |
|-----------|-----|------|
{% for field in entity.fields -%}
| {{ field.name }} | {{ field.type }} | {{ "PK" if field.pk }}{{ "FK → " + field.fk if field.fk }} |
{% endfor %}

{% endif %}{% endfor %}

---

[← トップに戻る](../_index.md)
