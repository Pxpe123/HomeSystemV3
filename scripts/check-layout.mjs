import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'apps/control-server/HomeSystem.sln', 'scripts/deployment/compose.yaml', 'README.md',
  'apps/control-server/CentralServer.csproj', 'apps/control-server/src/Program.cs',
  'apps/desktop-agent/PcAgent.csproj', 'apps/desktop-agent/src/Program.cs',
  'apps/display-client/CMakeLists.txt', 'apps/display-client/src/main.cpp',
  'apps/web-ui/package.json', 'apps/web-ui/src/App.jsx',
  'docs/README.md', 'docs/architecture/repository-layout.md',
  'apps/control-server/Dockerfile.artifact', 'apps/web-ui/Dockerfile.artifact',
];
for (const file of required) await access(path.join(root, file));
const solutionRoot = path.join(root, 'apps/control-server');
const solution = await readFile(path.join(solutionRoot, 'HomeSystem.sln'), 'utf8');
for (const [, project] of solution.matchAll(/"([^"\r\n]+\.csproj)"/g)) {
  await access(path.join(solutionRoot, project.replaceAll('\\', '/')));
}
const compose = await readFile(path.join(root, 'scripts/deployment/compose.yaml'), 'utf8');
for (const [, context] of compose.matchAll(/context:\s*(\S+)/g)) {
  const location = path.resolve(root, 'scripts/deployment', context);
  assert.ok(location.startsWith(root + path.sep), 'Docker context must stay in repository');
  await access(path.join(location, 'Dockerfile'));
}
for (const obsolete of ['Deployment', 'Docs', 'out']) {
  const entries = await readdir(root);
  assert.ok(!entries.includes(obsolete), `Obsolete root directory: ${obsolete}`);
}
// The old Packages directory can contain protected Qt Creator metadata only.
async function checkLegacy(directory) {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  for (const entry of entries) {
    if (entry.name === '.qtcreator') continue;
    assert.ok(entry.isDirectory(), `Unexpected source file in legacy Packages: ${entry.name}`);
    await checkLegacy(path.join(directory, entry.name));
  }
}
await checkLegacy(path.join(root, 'Packages'));
console.log(`Repository layout verified: ${required.length} entry points, solution projects and Docker contexts.`);
