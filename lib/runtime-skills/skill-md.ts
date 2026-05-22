import type { RuntimeSkillRow, RuntimeToolConfig } from "@/lib/runtime-skills/types";

/** Formato compatible con agentskills.io / Hermes SKILL.md */
export function buildSkillMarkdown(skill: RuntimeSkillRow): string {
  const tools = skill.config.tools ?? [];
  const keywordsYaml = skill.keywords.map((k) => `"${k}"`).join(", ");

  const frontmatter = [
    "---",
    `name: ${skill.name}`,
    `description: ${escapeYaml(skill.description)}`,
    "metadata:",
    `  category: ${skill.category}`,
    `  keywords: [${keywordsYaml}]`,
    `  use_count: ${skill.use_count}`,
    "---",
    "",
  ].join("\n");

  const body = [
    `# ${skill.name}`,
    "",
    skill.description,
    "",
    "## Cuándo usar",
    "",
    `Activá este skill cuando el usuario mencione: ${skill.keywords.join(", ")}.`,
    "",
    ...(skill.config.instructions
      ? ["## Instructions", "", skill.config.instructions, ""]
      : []),
    "## Tools",
    "",
    ...(tools.length
      ? tools.flatMap((t) => formatToolSection(t))
      : ["_(skill por instrucciones — sin HTTP tools)_"]),
  ].join("\n");

  return frontmatter + body;
}

function escapeYaml(s: string): string {
  if (/[:#\n"]/.test(s)) return JSON.stringify(s);
  return s;
}

function formatToolSection(tool: RuntimeToolConfig): string[] {
  const params = Object.entries(tool.parameters ?? {})
    .map(([k, v]) => `- \`${k}\` (${v.type ?? "string"}): ${v.description}`)
    .join("\n");

  const method = tool.action.method ?? "GET";
  return [
    `### ${tool.name}`,
    "",
    tool.description,
    "",
    `- **HTTP:** \`${method}\` ${tool.action.url}`,
    "",
    "**Parámetros:**",
    params || "- (ninguno)",
    "",
  ];
}
