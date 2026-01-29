# エンティティ一覧

{% for entity in source.entities -%}
- [{{ entity.name }}](./entities/{{ entity.id }}.md) - {{ entity.description }}
{% endfor %}

# リレーション概要

# リレーション

{% for rel in source.relations -%}
- **{{ rel.from }}** → **{{ rel.to }}** ({{ rel.cardinality }}): {{ rel.description }}
{% endfor %}
