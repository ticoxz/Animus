import { MindGraph } from "@/app/mind/MindGraph";

export default async function MindPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return <MindGraph error={params.error ?? null} />;
}
