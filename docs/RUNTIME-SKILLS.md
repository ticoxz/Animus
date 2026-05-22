# Skills autocreados (Hermes procedural memory)

Referencia: https://hermes-agent.nousresearch.com/docs/user-guide/features/skills

## Fase 2 (activo)

| Feature | Comando / comportamiento |
|---------|--------------------------|
| Listar | `/skills` |
| Crear | «quiero un skill que …» |
| Export SKILL.md | `/export-skill nombre` |
| Curator (30d) | `/curator` + cron diario |
| Restaurar archivado | `/restore-skill nombre` |
| Nudge | Tras tarea compleja (2+ tools): «¿Guardo esto como skill?» |
| Migrar chat | `/migrate-to-skills` — guarda la charla como skill (coach o HTTP) |

## Migraciones

```sql
005_runtime_skills.sql
006_skill_curator.sql   -- last_used_at, archived_at, skill_nudges
```

## SKILL.md (agentskills.io)

Cada skill guarda YAML frontmatter + instrucciones + tools HTTP.
Se genera al crear y al archivar (curator).

## Curator

Archiva skills con `use_count = 0` creados hace +30d, o sin uso (`last_used_at`) +30d.
Variable: `SKILL_CURATOR_DAYS=30` (default).

## Nudge

Después de un agent run con varias tools o respuesta larga, Telegram muestra botones inline.
**Sí** → genera skill desde el contexto de la conversación.

## Seguridad

- Solo HTTP GET/POST a URLs https
- Timeout 12s
- Sin código arbitrario
