# {{ source.entity.name }}

ID: `{{ source.entity.id }}`

## フィールド

{% for field in source.entity.fields -%}
- {{ field.name }}: {{ field.type }}{% if field.pk %} (PK){% endif %}{% if field.fk %} (FK → {{ field.fk }}){% endif %}
{% endfor %}
