import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const deployments = path.join(root, 'Deployments');
export const local = path.join(root, '.local');
export const staging = path.join(local, 'staging');
export function deploymentPath(value) {
  const result = path.resolve(value);
  if (!result.startsWith(deployments + path.sep)) throw new Error('Output must be a child of Deployments/');
  return result;
}
export function run(command, args, env = process.env, cwd = root) {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(command)} failed (${result.status ?? result.signal})`);
}
export function npm(args, extraEnv = {}) {
  const cli = process.env.npm_execpath || path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  run(process.execPath, [cli, ...args], { ...process.env, ...extraEnv });
}
export function localBuildConfig() {
  const location = path.join(root, 'apps/display-client/build.local.json');
  return existsSync(location) ? JSON.parse(readFileSync(location, 'utf8')) : {};
}
export function displayToolchain() {
  const local = localBuildConfig();
  const qtPrefix = process.env.HOMESYSTEM_QT_PREFIX || local.qtPrefix;
  if (!qtPrefix || !existsSync(path.join(qtPrefix, 'lib/cmake/Qt6WebEngineWidgets/Qt6WebEngineWidgetsConfig.cmake'))) {
    throw new Error('Configure a Qt desktop kit with WebEngineWidgets in apps/display-client/build.local.json. Android-only kits cannot build the desktop display.');
  }
  let env = { ...process.env };
  const vcvars = process.env.HOMESYSTEM_VCVARS || local.vcvars;
  if (process.platform === 'win32' && vcvars) {
    if (!existsSync(vcvars) || /["&|<>^%!\r\n]/.test(vcvars)) throw new Error('Invalid MSVC environment script path');
    const result = spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `""${vcvars}" >nul && set"`], { encoding: 'utf8', windowsHide: true, windowsVerbatimArguments: true });
    if (result.status !== 0) throw new Error('Could not load the MSVC build environment');
    for (const line of result.stdout.split(/\r?\n/)) {
      const separator = line.indexOf('=');
      if (separator <= 0) continue;
      const key = line.slice(0, separator);
      for (const existing of Object.keys(env)) if (existing.toLowerCase() === key.toLowerCase()) delete env[existing];
      env[key] = line.slice(separator + 1);
    }
  }
  const cmake = process.env.HOMESYSTEM_CMAKE || local.cmake || 'cmake';
  const ninja = process.env.HOMESYSTEM_NINJA || local.ninja;
  return { qtPrefix, cmake, ninja, env };
}
export function buildDisplay(output, tools = displayToolchain()) {
  output = path.resolve(output);
  if (![deployments, staging].some(base => output.startsWith(base + path.sep))) throw new Error('Build output must stay in Deployments or local staging');
  const kit = `${path.basename(path.dirname(tools.qtPrefix))}-${path.basename(tools.qtPrefix)}`.replace(/[^a-zA-Z0-9_.-]/g, '-');
  const build = path.join(local, 'build/display-client', kit + '-release');
  mkdirSync(build, { recursive: true });
  const configure = ['-S', path.join(root, 'apps/display-client'), '-B', build, '-G', 'Ninja', '-DCMAKE_BUILD_TYPE=Release', `-DCMAKE_PREFIX_PATH=${tools.qtPrefix}`];
  if (tools.ninja) configure.push(`-DCMAKE_MAKE_PROGRAM=${tools.ninja}`);
  run(tools.cmake, configure, tools.env);
  run(tools.cmake, ['--build', build, '--config', 'Release', '--parallel', '4'], tools.env);
  run(tools.cmake, ['--install', build, '--config', 'Release', '--prefix', output], tools.env);
  if (process.platform === 'win32') {
    run(path.join(tools.qtPrefix, 'bin/windeployqt.exe'), ['--release', '--no-translations', path.join(output, 'bin/HomeSystemV3.exe')], tools.env);
    for (const file of ['bin/Qt6Core.dll', 'bin/QtWebEngineProcess.exe']) {
      if (!existsSync(path.join(output, file))) throw new Error(`Qt runtime packaging incomplete: ${file}`);
    }
  }
}
