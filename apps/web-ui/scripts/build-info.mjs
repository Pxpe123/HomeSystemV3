import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function createBuildInfo(env = process.env, now = new Date()) {
  const builtAtUtc = env.HOMESYSTEM_BUILD_TIME_UTC || now.toISOString();
  if (!Number.isFinite(Date.parse(builtAtUtc))) throw new Error('Invalid build time');
  let commit = env.HOMESYSTEM_BUILD_COMMIT || env.GITHUB_SHA;
  if (!commit) {
    try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
    catch { commit = 'unknown'; }
  }
  if (commit !== 'unknown' && !/^[a-f0-9]{40}$/i.test(commit)) throw new Error('Invalid build commit');
  const buildId = env.HOMESYSTEM_BUILD_ID || (env.GITHUB_RUN_ID
    ? `${env.GITHUB_RUN_ID}.${env.GITHUB_RUN_ATTEMPT || '1'}`
    : `local.${now.toISOString().replace(/\D/g, '')}`);
  const version = env.HOMESYSTEM_BUILD_VERSION || (env.GITHUB_RUN_NUMBER
    ? `3.0.${env.GITHUB_RUN_NUMBER}+${env.GITHUB_RUN_ATTEMPT || '1'}.${commit.slice(0, 8)}`
    : `3.0.0-${buildId}`);
  if (![buildId, version].every(value => /^[a-zA-Z0-9.+-]+$/.test(value))) throw new Error('Invalid build identity');
  return { version, buildId, commit, builtAtUtc };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const build = createBuildInfo();
  const values = { HOMESYSTEM_BUILD_VERSION: build.version, HOMESYSTEM_BUILD_ID: build.buildId,
    HOMESYSTEM_BUILD_COMMIT: build.commit, HOMESYSTEM_BUILD_TIME_UTC: build.builtAtUtc };
  for (const destination of [process.env.GITHUB_ENV, process.env.GITHUB_OUTPUT].filter(Boolean)) {
    appendFileSync(destination, Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(''));
  }
  console.log(JSON.stringify(build, null, 2));
}
