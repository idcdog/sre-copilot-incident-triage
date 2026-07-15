import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const blockedExtensions = new Set([
  ".ppt",
  ".pptx",
  ".key",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".mov",
  ".mp4",
  ".env"
]);

const allowedMatches = [
  /credentials?[,.\s]/i,
  /API keys?[,.\s]/i,
  /billing details/i,
  /private system names/i,
  /internal screenshots/i,
  /production-changing/i,
  /production integrations/i
];

const sensitivePatterns = [
  { label: "OpenAI API key", pattern: /sk-[A-Za-z0-9_-]{20,}/ },
  { label: "GitHub token", pattern: /(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}/ },
  { label: "AWS access key", pattern: /AKIA[0-9A-Z]{16}/ },
  { label: "Google API key", pattern: /AIza[0-9A-Za-z_-]{20,}/ },
  { label: "Slack token", pattern: /xox[baprs]-[A-Za-z0-9-]{20,}/ },
  { label: "private key", pattern: /BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY/ },
  { label: "personal email", pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { label: "environment variable secret", pattern: /(?:OPENAI_API_KEY|API_KEY|ACCESS_TOKEN|REFRESH_TOKEN|CLIENT_SECRET|PRIVATE_KEY)\s*=/i }
];

const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".txt"
]);

const findings = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;

    const filePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await walk(filePath);
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    const relativePath = path.relative(root, filePath);

    if (blockedExtensions.has(extension) || entry.name.startsWith(".env")) {
      findings.push(`${relativePath}: blocked file type`);
      continue;
    }

    if (!textExtensions.has(extension)) continue;

    const fileStat = await stat(filePath);
    if (fileStat.size > 500_000) {
      findings.push(`${relativePath}: unexpectedly large text file`);
      continue;
    }

    const content = await readFile(filePath, "utf8");
    for (const { label, pattern } of sensitivePatterns) {
      for (const match of content.matchAll(new RegExp(pattern, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`))) {
        const matchedText = match[0];
        if (allowedMatches.some((allowed) => allowed.test(matchedText))) continue;

        const line = content.slice(0, match.index).split("\n").length;
        findings.push(`${relativePath}:${line}: ${label}: ${matchedText.slice(0, 80)}`);
      }
    }
  }
}

await walk(root);

if (findings.length > 0) {
  console.error("Public safety validation failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Public safety validation passed.");
