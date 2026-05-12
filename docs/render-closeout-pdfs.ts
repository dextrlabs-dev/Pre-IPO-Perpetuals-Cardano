/**
 * Render the close-off documentation set to PDFs with Mermaid support.
 * From repo root: deno run -A docs/render-closeout-pdfs.ts
 *
 * Renders:
 *   - docs/FINAL-TECHNICAL-DOCUMENTATION.md  → docs/FINAL-TECHNICAL-DOCUMENTATION.pdf
 *   - docs/POST-LAUNCH-OPERATIONS.md         → docs/POST-LAUNCH-OPERATIONS.pdf
 *   - docs/CLOSE-OUT-REPORT.md               → docs/CLOSE-OUT-REPORT.pdf
 *
 * Prerequisites: Chrome for Puppeteer — `npx puppeteer browsers install chrome`
 */
import { marked } from "npm:marked@12.0.2";
import puppeteer from "npm:puppeteer@23.6.0";

const MERMAID_CDN =
  "https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js";

function findPuppeteerChrome(): string | undefined {
  const fromEnv = Deno.env.get("PUPPETEER_EXECUTABLE_PATH");
  if (fromEnv) {
    try {
      Deno.statSync(fromEnv);
      return fromEnv;
    } catch { /* fall through */ }
  }
  const home = Deno.env.get("HOME") ?? "";
  const base = `${home}/.cache/puppeteer/chrome`;
  try {
    const dirs = [...Deno.readDirSync(base)]
      .filter((e) => e.isDirectory && e.name.startsWith("linux-"))
      .map((e) => e.name)
      .sort()
      .reverse();
    for (const d of dirs) {
      const p = `${base}/${d}/chrome-linux64/chrome`;
      try {
        Deno.statSync(p);
        return p;
      } catch { /* next */ }
    }
  } catch { /* missing cache */ }
  return undefined;
}

function injectMermaidPlaceholders(md: string): { md: string; sources: string[] } {
  const sources: string[] = [];
  const next = md.replace(/```mermaid\n([\s\S]*?)```/g, (_, inner) => {
    const idx = sources.length;
    sources.push(inner.trim());
    return `\n\n<p class="mermaid-ph" data-idx="${idx}"></p>\n\n`;
  });
  return { md: next, sources };
}

const STYLE = `
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; max-width: 900px; margin: 24px auto; padding: 0 16px; line-height: 1.5; color: #111; font-size: 11pt; }
  h1 { font-size: 1.75rem; border-bottom: 2px solid #333; padding-bottom: 0.25em; }
  h2 { font-size: 1.35rem; margin-top: 1.75em; border-bottom: 1px solid #ccc; padding-bottom: 0.15em; }
  h3 { font-size: 1.1rem; margin-top: 1.25em; }
  code, pre { font-family: ui-monospace, "Cascadia Code", monospace; font-size: 0.88em; }
  pre { background: #f4f4f4; padding: 10px 12px; overflow-x: auto; border: 1px solid #ddd; border-radius: 4px; white-space: pre-wrap; word-break: break-word; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 0.92em; }
  th, td { border: 1px solid #bbb; padding: 6px 8px; text-align: left; vertical-align: top; word-break: break-word; }
  th { background: #eee; }
  a { color: #0366d6; word-break: break-all; }
  .mermaid { margin: 1.25em 0; text-align: center; page-break-inside: avoid; }
  .mermaid svg { max-width: 100% !important; height: auto !important; }
  p.mermaid-ph { display: none; }
  @media print { body { max-width: 100%; } h2 { break-after: avoid; } pre { break-inside: avoid; } }
`;

async function renderMarkdownToPdf(mdPath: string, outPdf: string, title: string, browser: any) {
  const rawMd = await Deno.readTextFile(mdPath);
  const { md: mdWithPh, sources: mermaidSources } = injectMermaidPlaceholders(rawMd);
  const body = await marked.parse(mdWithPh, { gfm: true });

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>${title}</title><style>${STYLE}</style></head><body>${body}</body></html>`;

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "domcontentloaded" });

  await page.evaluate((sources: string[]) => {
    document.querySelectorAll("p.mermaid-ph").forEach((p) => {
      const idx = Number((p as HTMLElement).dataset.idx);
      const div = document.createElement("div");
      div.className = "mermaid";
      div.textContent = sources[idx] ?? "";
      p.replaceWith(div);
    });
  }, mermaidSources);

  if (mermaidSources.length > 0) {
    await page.addScriptTag({ url: MERMAID_CDN });
    await page.waitForFunction(
      () => typeof (globalThis as unknown as { mermaid?: unknown }).mermaid !== "undefined",
      { timeout: 30_000 },
    );
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        mermaid: {
          initialize: (o: Record<string, unknown>) => void;
          run: (o?: { querySelector?: string }) => Promise<void>;
        };
      };
      w.mermaid.initialize({
        startOnLoad: false,
        theme: "neutral",
        securityLevel: "loose",
        fontFamily: "system-ui, sans-serif",
      });
      await w.mermaid.run({ querySelector: ".mermaid" });
    });
    await new Promise((r) => setTimeout(r, 800));
  }

  const pdfBuf = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "18mm", bottom: "18mm", left: "14mm", right: "14mm" },
  });
  await page.close();
  await Deno.writeFile(outPdf, pdfBuf);
  console.log(`Wrote ${outPdf} (${mermaidSources.length} Mermaid diagram(s))`);
}

const root = new URL(".", import.meta.url).pathname;
const targets: Array<{ md: string; pdf: string; title: string }> = [
  {
    md: `${root}FINAL-TECHNICAL-DOCUMENTATION.md`,
    pdf: `${root}FINAL-TECHNICAL-DOCUMENTATION.pdf`,
    title: "Final Technical Documentation",
  },
  {
    md: `${root}POST-LAUNCH-OPERATIONS.md`,
    pdf: `${root}POST-LAUNCH-OPERATIONS.pdf`,
    title: "Post-Launch Operations",
  },
  {
    md: `${root}CLOSE-OUT-REPORT.md`,
    pdf: `${root}CLOSE-OUT-REPORT.pdf`,
    title: "Close-Out Report",
  },
];

const chromePath = findPuppeteerChrome();
if (!chromePath) {
  console.error("No Chrome found. Run: npx puppeteer browsers install chrome");
  Deno.exit(1);
}
console.log("Using Chrome:", chromePath);

const browser = await puppeteer.launch({
  headless: true,
  executablePath: chromePath,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

for (const t of targets) {
  await renderMarkdownToPdf(t.md, t.pdf, t.title, browser);
}

await browser.close();
console.log("Done.");
