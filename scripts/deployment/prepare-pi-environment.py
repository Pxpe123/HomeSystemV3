"""Copy only existing integration configuration; never print secret values.

Run as the deployment user after creating an owned, private stack directory.
This does not stop, edit or replace the old running container.
"""
import json
import os
from pathlib import Path
import subprocess

stack = Path('/opt/stacks/homesystem-v3')
destination = stack / '.server.env'
if not stack.is_dir() or destination.exists():
    raise SystemExit('Expected a new, owned stack directory without .server.env')
container = json.loads(subprocess.check_output(
    ['docker', 'inspect', 'homesystem-centralserver-1'], text=True))[0]
existing = dict(item.split('=', 1) for item in container['Config'].get('Env', []) if '=' in item)
keys = ['WEATHER_API_KEY', 'SpotifyClientID', 'SpotifyClientSecret', 'PC']
settings = {key: existing[key] for key in keys if key in existing}
settings.update(PORT='8080', HOMESYSTEM_DATA='/var/lib/homesystem',
                WebUI_URL='http://192.168.50.27:8088/', WEATHER_LOCATION='Liverpool', DEVMODE='false')
# Single quoting preserves dollar signs and JSON in Compose dotenv values.
def quote(value):
    if '\n' in value or '\r' in value or '\x00' in value:
        raise ValueError('Multiline environment values need manual review')
    return "'" + value.replace('\\', '\\\\').replace("'", "\\'") + "'"

descriptor = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(descriptor, 'w', encoding='utf-8') as output:
    output.write(''.join(f'{key}={quote(value)}\n' for key, value in settings.items()))
print('Private server environment prepared; integration values were not printed.')
