// Contrôles de contenu du site vitrine. Usage : node scripts/check-site.mjs [--links]
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const failures = [];
const fail = (msg) => failures.push(msg);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const sources = ["app", "components", "content"]
  .filter((d) => existsSync(join(root, d)))
  .flatMap((d) => walk(join(root, d)))
  .filter((f) => /\.(tsx?|css)$/.test(f));

// 1. Affirmations interdites (prix inventés, opérateurs, magasins d'applications).
const forbidden = [
  /25 000/, /75 000/, /FCFA\s*\/\s*mois/,
  /Orange Money/, /\bWave\b/, /Disponible sur/, /Prometheus/, /Grafana/,
  /authentification multi-?facteur/i, /\bMFA\b/,
];
for (const f of sources) {
  const text = readFileSync(f, "utf8");
  for (const re of forbidden) {
    if (re.test(text)) fail(`${relative(root, f)} contient une affirmation interdite : ${re}`);
  }
}

// 1b. Contraste du texte secondaire : text-ink/NN avec NN < 65 est trop pâle (minimum text-ink/70).
for (const f of sources) {
  const text = readFileSync(f, "utf8");
  for (const m of text.matchAll(/text-ink\/(\d+)/g)) {
    if (Number(m[1]) < 65) fail(`${relative(root, f)} : texte trop pâle (text-ink/${m[1]}), minimum text-ink/70`);
  }
}

// 1c. Aucun serif : ni Fraunces ni font-serif.
for (const f of sources) {
  const text = readFileSync(f, "utf8");
  if (/Fraunces|font-serif/.test(text)) fail(`${relative(root, f)} : serif interdit (Fraunces / font-serif)`);
}

// 1d. Aucun token transitoire de l'ancienne identité.
for (const f of sources) {
  const text = readFileSync(f, "utf8");
  const m = text.match(/bg-cream|bg-sand|bg-forest|text-forest|border-forest/);
  if (m) fail(`${relative(root, f)} : token de l'ancienne identité (${m[0]})`);
}

// 1e. Aucune mention « à venir » / « simulé » : toutes les fonctions sont présentées comme disponibles.
for (const f of sources) {
  const text = readFileSync(f, "utf8");
  if (/à venir|a venir|Simulé/i.test(text)) fail(`${relative(root, f)} : mention « à venir » / « simulé » interdite`);
}

// 2. Redirections des anciennes pages.
const legacy = [
  "/pourquoi-sira", "/solutions", "/services", "/reservation", "/reseau",
  "/applications", "/entreprises", "/architecture", "/methode", "/faq", "/contact",
];
const config = readFileSync(join(root, "next.config.ts"), "utf8");
for (const path of legacy) {
  if (!config.includes(`"${path}"`)) fail(`next.config.ts : redirection manquante pour ${path}`);
}

// 3. Liens internes (seulement avec --links).
if (process.argv.includes("--links")) {
  const routes = new Set(
    walk(join(root, "app"))
      .filter((f) => /page\.tsx$/.test(f))
      .map((f) => "/" + relative(join(root, "app"), f).replace(/\/?page\.tsx$/, ""))
      .map((r) => (r === "/" ? "/" : r.replace(/\/$/, "")))
  );
  const hrefRe = /href(?:=\{?|:\s*)["'](\/[^"'#?]*)/g;
  for (const f of sources.filter((s) => s.endsWith(".tsx") || s.endsWith(".ts"))) {
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(hrefRe)) {
      const target = m[1].replace(/\/$/, "") || "/";
      if (!routes.has(target)) fail(`${relative(root, f)} : lien vers une page inexistante ${m[1]}`);
    }
  }
}

if (failures.length) {
  console.error(failures.map((f) => "✗ " + f).join("\n"));
  process.exit(1);
}
console.log("OK");
