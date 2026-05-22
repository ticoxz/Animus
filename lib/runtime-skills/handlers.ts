import {
  listArchivedRuntimeSkills,
  restoreArchivedSkill,
  runCuratorForUser,
} from "@/lib/runtime-skills/curator";
import {
  getRuntimeSkillByName,
  listActiveRuntimeSkills,
} from "@/lib/runtime-skills/db";
import { buildSkillMarkdown } from "@/lib/runtime-skills/skill-md";
import { handleSkillNudgeCallback } from "@/lib/runtime-skills/nudge";
import { migrateChatToRuntimeSkill } from "@/lib/runtime-skills/migrate";
import { generateAndCreateRuntimeSkill, wantsCreateRuntimeSkill } from "@/lib/runtime-skills/generate";

export async function handleRuntimeSkillsCommand(
  userId: string,
  text: string,
): Promise<string | null> {
  if (text === "/skills" || text === "/mis-skills-runtime") {
    const rows = await listActiveRuntimeSkills(userId);
    const archived = await listArchivedRuntimeSkills(userId);

    if (!rows.length && !archived.length) {
      return (
        "No tenés skills autocreados.\n\n" +
        "Pedime: «quiero un skill que …» · <code>/migrate-to-skills</code> (guarda el chat) · nudge post-tarea"
      );
    }

    let out = "<b>Skills activos</b>\n\n";
    if (rows.length) {
      out += rows
        .map(
          (r) =>
            `• <b>${r.name}</b> — ${r.description}\n  ${r.keywords.join(", ")} · usos: ${r.use_count}`,
        )
        .join("\n");
    } else {
      out += "(ninguno)";
    }

    if (archived.length) {
      out +=
        "\n\n<b>Archivados</b> (curator " +
        `${process.env.SKILL_CURATOR_DAYS ?? "30"}d)\n` +
        archived
          .map((a) => `• ${a.name} — ${a.description.slice(0, 60)}`)
          .join("\n") +
        "\n\nRestaurar: <code>/restore-skill nombre</code>";
    }

    out += "\n\nExportar: <code>/export-skill nombre</code> · Curator: <code>/curator</code>";
    return out;
  }

  if (text === "/migrate-to-skills" || text === "migrate-to-skills") {
    return migrateChatToRuntimeSkill(userId);
  }

  if (text === "/curator") {
    const archived = await runCuratorForUser(userId);
    if (!archived.length) {
      return "Curator: no había skills viejos para archivar. Todo al día.";
    }
    return (
      `<b>Curator</b> archivó ${archived.length} skill(s):\n` +
      archived.map((n) => `• ${n}`).join("\n") +
      "\n\nExport guardado en cada skill. Restaurá con /restore-skill si querés."
    );
  }

  const exportMatch = text.match(/^\/export-skill\s+([\w-]+)/i);
  if (exportMatch) {
    const name = exportMatch[1].toLowerCase();
    const skill = await getRuntimeSkillByName(userId, name, true);
    if (!skill) {
      return `No encontré el skill <code>${name}</code>.`;
    }
    const md =
      skill.skill_md?.trim() || buildSkillMarkdown(skill);
    const truncated = md.length > 3500 ? `${md.slice(0, 3497)}…` : md;
    return (
      `<b>SKILL.md</b> — <code>${name}</code> (agentskills.io)\n\n` +
      `<pre>${truncated.replace(/</g, "&lt;")}</pre>`
    );
  }

  const restoreMatch = text.match(/^\/restore-skill\s+([\w-]+)/i);
  if (restoreMatch) {
    const name = restoreMatch[1].toLowerCase();
    const ok = await restoreArchivedSkill(userId, name);
    return ok
      ? `✅ Skill <b>${name}</b> restaurado.`
      : `No pude restaurar <code>${name}</code> (¿está archivado?).`;
  }

  if (wantsCreateRuntimeSkill(text)) {
    return generateAndCreateRuntimeSkill(userId, text);
  }

  return null;
}

export async function handleRuntimeCallback(
  userId: string,
  data: string,
): Promise<string | null> {
  const parts = data.split(":");
  if (parts[0] !== "runtime") return null;

  if (parts[1] === "nudge" && parts[2] && parts[3]) {
    const accept = parts[2] === "yes";
    return handleSkillNudgeCallback(userId, parts[3], accept);
  }

  return null;
}
