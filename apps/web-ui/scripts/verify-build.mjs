import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = process.env.HOMESYSTEM_WEB_OUT_DIR || path.resolve(root, "../../Deployments/web-ui");
const assets = path.join(output, "assets");
const entries = await readdir(assets);
const entry = entries.find((name) => /^index-.*\.js$/.test(name));
if (!entry) throw new Error("Build the UI before verifying its budget.");
const script = await readFile(path.join(assets, entry));
if (script.includes(Buffer.from('ws://127.0.0.1:8499'))) throw new Error('Production bundle contains the isolated fixture URL.');
const cssEntries = entries.filter((name) => /^index-.*\.css$/.test(name));
const cssBytes = (
  await Promise.all(cssEntries.map((name) => stat(path.join(assets, name))))
).reduce((sum, file) => sum + file.size, 0);
if (script.length > 430_000)
  throw new Error(
    `Initial JavaScript exceeds the 430 kB budget: ${script.length} bytes.`,
  );
// Home panels are intentionally eager so swipe navigation never shows a loader.
if (cssBytes > 80_000)
  throw new Error(`Initial CSS exceeds the 80 kB budget: ${cssBytes} bytes.`);

async function sources(directory) {
  return (
    await Promise.all(
      (await readdir(directory, { withFileTypes: true })).map((entry) => {
        const location = path.join(directory, entry.name);
        return entry.isDirectory()
          ? sources(location)
          : /\.[jt]sx?$/.test(entry.name)
            ? [location]
            : [];
      }),
    )
  ).flat();
}
const plugins = path.join(root, "src/plugins");
for (const file of await sources(plugins)) {
  const owner = path.relative(plugins, file).split(path.sep)[0];
  const source = await readFile(file, "utf8");
  for (const [, specifier] of source.matchAll(
    /(?:from\s*|import\s*\()['"]([^'"]+)['"]/g,
  )) {
    if (!specifier.startsWith(".")) continue;
    const target = path.relative(
      plugins,
      path.resolve(path.dirname(file), specifier),
    );
    if (!target.startsWith("..") && target.split(path.sep)[0] !== owner)
      throw new Error(
        `Cross-package import in ${file}: ${specifier}. Use a host service contract instead.`,
      );
  }
}
console.log(
  JSON.stringify(
    {
      initialJavaScriptBytes: script.length,
      initialJavaScriptGzipBytes: gzipSync(script).length,
      initialCssBytes: cssBytes,
      lazyScreenChunks: entries.filter((name) => /App-.*\.js$/.test(name))
        .length,
      pluginBoundaries: "pass",
    },
    null,
    2,
  ),
);
