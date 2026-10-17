"""Pull a tested image pair before touching containers; restore previous pair on failure.

Only trusted main-branch automation should execute this on the Docker host.
Provider credentials stay in the existing private .server.env, never in GitHub.
"""
import argparse
import fcntl
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time
import urllib.request


STACK = Path('/opt/stacks/homesystem-v3')
SERVICES = ('homesystem-server', 'homesystem-ui')


def run(*args, env=None, capture=False):
    print(f"Running: {' '.join(args)}", flush=True)

    result = subprocess.run(
        args,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )

    if result.stdout:
        print(result.stdout, flush=True)

    result.check_returncode()
    return result.stdout if capture else result

def image_for(service):
    name = f'homesystem-v3-{service}-1'
    return run('docker', 'inspect', '--format', '{{.Image}}', name, capture=True).strip()


def verify_build_pair(server, web, expected_commit, expected_build_id=None):
    fields = ('version', 'buildId', 'commit', 'builtAtUtc')
    if not isinstance(server, dict) or not isinstance(web, dict):
        raise ValueError('Missing build metadata')
    if any(not server.get(field) or server.get(field) != web.get(field) for field in fields):
        raise ValueError('Server and WebUI build identities do not match')
    if server['commit'] != expected_commit:
        raise ValueError('Running build does not match the expected Git commit')
    if expected_build_id and server['buildId'] != expected_build_id:
        raise ValueError('Running build does not match the expected workflow run')


def require_latest(repository, commit):
    request = urllib.request.Request(
        f'https://api.github.com/repos/{repository}/git/ref/heads/main',
        headers={'Accept': 'application/vnd.github+json', 'User-Agent': 'HomeSystem-Deployment',
                 **({'Authorization': f'Bearer {os.environ["REGISTRY_TOKEN"]}'}
                    if os.environ.get('REGISTRY_TOKEN') else {})})
    with urllib.request.urlopen(request, timeout=15) as response:
        latest = json.load(response)['object']['sha']
    if latest != commit:
        raise RuntimeError(f'Main has advanced to {latest}; refusing stale build {commit}. Wait for the latest build.')
    print(f'Confirmed latest main commit: {latest}', flush=True)


def verify_health(expected_commit=None, expected_build_id=None):
    for attempt in range(12):
        try:
            for port in (8080, 8088):
                with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health', timeout=5) as response:
                    body = json.load(response)
                    if body.get('service') != 'HomeSystem.ControlServer' or body.get('status') != 'ready':
                        raise ValueError('Unexpected health response')
            if expected_commit:
                with urllib.request.urlopen('http://127.0.0.1:8088/build-info.json', timeout=5) as response:
                    verify_build_pair(body.get('build'), json.load(response), expected_commit, expected_build_id)
            return
        except (OSError, ValueError):
            if attempt == 11:
                raise
            time.sleep(2)


def deploy(repository, commit, expected_build_id=None, latest_only=False):
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repository):
        raise ValueError('Invalid repository')
    if not re.fullmatch(r'[0-9a-f]{40}', commit):
        raise ValueError('Expected a full Git commit SHA')
    if not (STACK / '.server.env').is_file():
        raise RuntimeError('Existing private server environment is required')
    if latest_only:
        require_latest(repository, commit)
    source = Path(__file__).with_name('pi.registry.compose.yaml')
    env = dict(os.environ,
               CONTROL_SERVER_IMAGE=f'ghcr.io/{repository.lower()}/control-server:{commit}',
               WEB_UI_IMAGE=f'ghcr.io/{repository.lower()}/web-ui:{commit}')
    command = ('docker', 'compose', '-f', str(source))
    run(*command, 'config', '-q', env=env)
    # Pull both first: a registry/build failure must leave the live stack untouched.
    run(*command, 'pull', env=env)
    previous = [image_for(service) for service in SERVICES]
    # Pulls can be slow; check GitHub again immediately before touching containers.
    if latest_only:
        require_latest(repository, commit)
    rollback_env = dict(env, CONTROL_SERVER_IMAGE=previous[0], WEB_UI_IMAGE=previous[1])
    try:
        # Recreate both: nginx must resolve the new server container's address.
        run(*command, 'up', '-d', '--no-build', '--pull', 'never', '--force-recreate',
            '--wait', '--wait-timeout', '180', env=env)
        verify_health(commit, expected_build_id)
    except Exception:
        print('Deployment failed; restoring the previous image pair.', flush=True)
        run(*command, 'up', '-d', '--no-build', '--pull', 'never', '--force-recreate',
            '--wait', '--wait-timeout', '180', env=rollback_env)
        verify_health()
        raise
    # Retain a working, secret-free compose entry point for manual operations.
    shutil.copyfile(source, STACK / 'compose.yaml')
    image_env = STACK / '.env'
    temporary = STACK / '.env.next'
    temporary.write_text(f'CONTROL_SERVER_IMAGE={env["CONTROL_SERVER_IMAGE"]}\n'
                         f'WEB_UI_IMAGE={env["WEB_UI_IMAGE"]}\n', encoding='utf-8')
    temporary.replace(image_env)
    print(f'Deployed {commit}; both health routes are ready.', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repository', required=True)
    parser.add_argument('--commit', required=True)
    parser.add_argument('--build-id')
    parser.add_argument('--require-latest', action='store_true')
    args = parser.parse_args()
    # Avoid races with another invocation outside GitHub's concurrency group.
    with (STACK / '.deployment.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        deploy(args.repository, args.commit, args.build_id, args.require_latest)
