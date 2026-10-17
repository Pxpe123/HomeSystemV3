"""Offline rollout tests: no Docker commands or network requests are executed."""
import importlib.util
from pathlib import Path
import subprocess
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

# Windows developers can exercise rollout logic without Linux's file-lock module.
if sys.platform == 'win32':
    sys.modules.setdefault('fcntl', types.SimpleNamespace())
spec = importlib.util.spec_from_file_location('deploy_pi', Path(__file__).with_name('deploy-pi.py'))
deployment = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deployment)


class RolloutTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.stack = Path(self.directory.name)
        (self.stack / '.server.env').write_text('PRIVATE=value\n')
        (self.stack / 'compose.yaml').write_text('previous-compose')
        self.calls = []
        self.stack_patch = patch.object(deployment, 'STACK', self.stack)
        self.stack_patch.start()
        self.addCleanup(self.stack_patch.stop)

    def fake_run(self, *args, **kwargs):
        self.calls.append((args, kwargs.get('env')))
        if 'inspect' in args:
            return 'sha256:previous-server' if args[-1].endswith('server-1') else 'sha256:previous-ui'
        return ''

    def test_success_pulls_before_restart_and_keeps_credentials(self):
        with patch.object(deployment, 'run', side_effect=self.fake_run), patch.object(deployment, 'verify_health'):
            deployment.deploy('Owner/Repo', 'a' * 40)
        commands = [call[0] for call in self.calls]
        self.assertLess(next(i for i, c in enumerate(commands) if 'pull' in c),
                        next(i for i, c in enumerate(commands) if 'up' in c))
        self.assertIn('ghcr.io/owner/repo/control-server:' + 'a' * 40, (self.stack / '.env').read_text())
        self.assertEqual((self.stack / '.server.env').read_text(), 'PRIVATE=value\n')

    def test_failed_health_restores_both_previous_images_and_fails_job(self):
        with patch.object(deployment, 'run', side_effect=self.fake_run), \
                patch.object(deployment, 'verify_health', side_effect=[ValueError('unhealthy'), None]):
            with self.assertRaisesRegex(ValueError, 'unhealthy'):
                deployment.deploy('owner/repo', 'a' * 40)
        restarts = [(cmd, env) for cmd, env in self.calls if 'up' in cmd]
        self.assertEqual(len(restarts), 2)
        self.assertEqual(restarts[-1][1]['CONTROL_SERVER_IMAGE'], 'sha256:previous-server')
        self.assertEqual(restarts[-1][1]['WEB_UI_IMAGE'], 'sha256:previous-ui')
        self.assertEqual((self.stack / 'compose.yaml').read_text(), 'previous-compose')
        self.assertFalse((self.stack / '.env').exists())

    def test_pull_failure_never_restarts_live_containers(self):
        def fail_pull(*args, **kwargs):
            self.fake_run(*args, **kwargs)
            if 'pull' in args:
                raise subprocess.CalledProcessError(1, args)
        with patch.object(deployment, 'run', side_effect=fail_pull):
            with self.assertRaises(subprocess.CalledProcessError):
                deployment.deploy('owner/repo', 'a' * 40)
        self.assertFalse(any('up' in cmd for cmd, _ in self.calls))

    def test_invalid_commit_or_repository_rejected_before_docker(self):
        with patch.object(deployment, 'run') as run:
            for repository, commit in [('owner/repo', 'main'), ('owner/repo;bad', 'a' * 40)]:
                with self.assertRaises(ValueError):
                    deployment.deploy(repository, commit)
            run.assert_not_called()


if __name__ == '__main__':
    unittest.main()
