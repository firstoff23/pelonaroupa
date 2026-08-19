import { mkdir, readFile, writeFile } from "node:fs/promises";

const summaryPath = new URL(
  "../coverage/coverage-summary.json",
  import.meta.url,
);
const badgeDirectory = new URL("../badges/", import.meta.url);
const badgePath = new URL("../badges/client-coverage.json", import.meta.url);

const summary = JSON.parse(await readFile(summaryPath, "utf8"));
const coverage = Number(summary.total?.lines?.pct);

if (!Number.isFinite(coverage)) {
  throw new Error(
    "Não foi possível determinar a cobertura de linhas do cliente.",
  );
}

const color =
  coverage >= 80
    ? "brightgreen"
    : coverage >= 60
      ? "yellow"
      : coverage >= 40
        ? "orange"
        : "red";
const badge = {
  schemaVersion: 1,
  label: "cobertura client",
  message: `${coverage.toFixed(2)}%`,
  color,
};

await mkdir(badgeDirectory, { recursive: true });
await writeFile(badgePath, `${JSON.stringify(badge, null, 2)}\n`);

console.log(`Badge de cobertura do cliente atualizado: ${badge.message}`);
