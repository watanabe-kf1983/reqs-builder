# リレーション一覧

{% for rel in source.relations -%}
- {{ rel.from }} → {{ rel.to }} ({{ rel.cardinality }})
{% endfor %}
