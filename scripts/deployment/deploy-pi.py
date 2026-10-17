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
    return subprocess.run(args, env=env, check=True, text=True,
                          stdout=subprocess.PIPE if capture else None).stdout


def image_for(service):
    name = f'homesystem-v3-{service}-1'
    return run('docker', 'inspect', '--format', '{{.Image}}', name, capture=True).strip()


def verify_health():
    for attempt in range(12):
        try:
            for port in (8080, 8088):
                with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health', timeout=5) as response:
                    body = json.load(response)
                    if body.get('service') != 'HomeSystem.ControlServer' or body.get('status') != 'ready':
                        raise ValueError('Unexpected health response')
            return
        except (OSError, ValueError):
            if attempt == 11:
                raise
            time.sleep(2)


def deploy(repository, commit):
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repository):
        raise ValueError('Invalid repository')
    if not re.fullmatch(r'[0-9a-f]{40}', commit):
        raise ValueError('Expected a full Git commit SHA')
    if not (STACK / '.server.env').is_file():
        raise RuntimeError('Existing private server environment is required')
    source = Path(__file__).with_name('pi.registry.compose.yaml')
    env = dict(os.environ,
               CONTROL_SERVER_IMAGE=f'ghcr.io/{repository.lower()}/control-server:{commit}',
               WEB_UI_IMAGE=f'ghcr.io/{repository.lower()}/web-ui:{commit}')
    command = ('docker', 'compose', '-f', str(source))
    run(*command, 'config', '-q', env=env)
    # Pull both first: a registry/build failure must leave the live stack untouched.
    run(*command, 'pull', env=env)
    previous = [image_for(service) for service in SERVICES]
    rollback_env = dict(env, CONTROL_SERVER_IMAGE=previous[0], WEB_UI_IMAGE=previous[1])
    try:
        # Recreate both: nginx must resolve the new server container's address.
        run(*command, 'up', '-d', '--no-build', '--pull', 'never', '--force-recreate',
            '--wait', '--wait-timeout', '180', env=env)
        verify_health()
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
    args = parser.parse_args()
    # Avoid races with another invocation outside GitHub's concurrency group.
    with (STACK / '.deployment.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        deploy(args.repository, args.commit)
