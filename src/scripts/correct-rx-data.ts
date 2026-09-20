import { createClient } from "@libsql/client";
import { correctRxData, RX_SOURCES } from "../lib/rx-data-corrections";

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--apply")) throw new Error("使用法: npm run db:correct-rx -- [--apply]（省略時は読み取りのみ）");
  if (!process.env.TURSO_DATABASE_URL) throw new Error("TURSO_DATABASE_URLを設定してください");
  const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
  try {
    const apply = args.includes("--apply");
    const changes = await correctRxData(client, apply);
    console.log(JSON.stringify({ mode: apply ? "applied" : "dry-run", sources: RX_SOURCES, changes }, null, 2));
  } finally {
    client.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "RXデータ修正に失敗しました");
  process.exitCode = 1;
});
