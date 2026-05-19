import Link from "next/link";

/**
 * No hay UI de producto en MVP: Telegram es la interfaz.
 * Esta página es solo status / docs para quien despliega.
 */
export default function HomePage() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 560 }}>
      <h1>Animus</h1>
      <p>
        El backend vive en <strong>Next.js API Routes</strong>. Los usuarios
        hablan con el bot en Telegram.
      </p>
      <ul>
        <li>
          <Link href="/api/health">GET /api/health</Link>
        </li>
      </ul>
    </main>
  );
}
