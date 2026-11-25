"""Exercise real Service Workers, including update and offline behavior."""
import functools
import json
import os
from pathlib import Path
import shutil
import struct
import subprocess
import tempfile
import threading
import unittest
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class PwaHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        if path.startswith('/project/'):
            path = path.removeprefix('/project')
        return super().translate_path(path)

    def do_GET(self):
        if self.path.split('?')[0] in ['/music', '/project/music']:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"live":true}')
            return
        try:
            super().do_GET()
        except (BrokenPipeError, ConnectionResetError):
            pass  # Failed precache batches can abort their remaining downloads.

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *_):
        pass


@unittest.skipUnless((ROOT / 'dist/service-worker.js').exists(), 'Run npm run build first')
class PwaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'), headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='r1-pwa-')
        self.site = Path(self.temporary.name) / 'site'
        shutil.copytree(ROOT / 'dist', self.site)
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(PwaHandler, directory=str(self.site)))
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.origin = f'http://127.0.0.1:{self.server.server_port}'
        self.context = self.browser.new_context(service_workers='allow')
        self.page = self.context.new_page()
        self.page.set_default_timeout(12000)
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))

    def tearDown(self):
        self.context.close()
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temporary.cleanup()
        self.assertEqual(self.errors, [])

    def open_app(self, path='/project/'):
        self.page.goto(self.origin + path)
        self.page.locator('.brand').wait_for()
        self.page.evaluate('async () => { await navigator.serviceWorker.ready; }')
        self.page.wait_for_function('!!navigator.serviceWorker.controller')

    def release(self, version):
        html = (self.site / 'index.html').read_text()
        html = html.replace('</head>', f'<meta name="pwa-test-build" content="{version}"></head>')
        (self.site / 'index.html').write_text(html)
        subprocess.run([shutil.which('node'), '--input-type=module', '-e',
                        'import { buildPwa } from "./scripts/build-pwa.mjs"; buildPwa(process.argv[1]);', str(self.site)],
                       cwd=ROOT, check=True, capture_output=True)

    def request_update(self):
        self.page.evaluate('async () => { await (await navigator.serviceWorker.getRegistration()).update(); }')
        self.page.wait_for_function('async () => !!(await navigator.serviceWorker.getRegistration()).waiting')

    def apply_update(self, version):
        self.page.locator('.pwa-update').get_by_role('button', name='更新并重新加载', exact=True).click()
        self.page.wait_for_function('(version) => [...document.querySelectorAll("meta[name=pwa-test-build]")].at(-1)?.content === version', arg=str(version))
        self.page.locator('.brand').wait_for()

    def test_install_metadata_and_offline_shell_keep_api_and_upstream_uncached(self):
        for path in ['/', '/project/']:
            with self.subTest(path=path):
                if path != '/':
                    self.context.close()
                    self.context = self.browser.new_context(service_workers='allow')
                    self.page = self.context.new_page()
                    self.page.on('pageerror', lambda error: self.errors.append(str(error)))
                self.open_app(path)
                session = self.context.new_cdp_session(self.page)
                manifest = session.send('Page.getAppManifest')
                self.assertEqual(manifest['errors'], [])
                data = json.loads(manifest['data'])
                self.assertEqual(data['display'], 'standalone')
                self.assertEqual(data['scope'], './')
                for icon in data['icons']:
                    response = self.context.request.get(self.origin + path + icon['src'])
                    size = int(icon['sizes'].split('x')[0])
                    self.assertEqual(struct.unpack('!II', response.body()[16:24]), (size, size))
                self.assertEqual(self.page.evaluate('async () => (await navigator.serviceWorker.getRegistration()).scope'), self.origin + path)
                self.page.evaluate('async () => { await fetch("music", {cache:"no-store"}); await fetch("upstream/", {cache:"no-store"}); }')
                keys = self.page.evaluate('async () => (await Promise.all((await caches.keys()).map(async key => (await (await caches.open(key)).keys()).map(r=>r.url)))).flat()')
                self.assertFalse(any('/upstream/' in key or key.endswith('/music') for key in keys))
                self.context.set_offline(True)
                self.page.goto(self.origin + path + '?offline=1#/device')
                self.page.get_by_role('heading', name='设备概览', exact=True).wait_for()
                for resource in ['music', 'upstream/']:
                    self.assertTrue(self.page.evaluate('async path => { try { await fetch(path, {cache:"no-store"}); return false; } catch { return true; } }', resource))
                self.context.set_offline(False)

    def test_update_waits_for_user_preserves_other_tabs_and_scoped_caches(self):
        self.open_app()
        self.page.evaluate('async () => { await (await caches.open("unrelated-app")).put("/sentinel", new Response("keep")); window.pageMarker="first"; }')
        other = self.context.new_page()
        other.goto(self.origin + '/project/')
        other.evaluate('window.pageMarker="other"')
        self.release(2)
        self.request_update()
        self.assertEqual(self.page.evaluate('window.pageMarker'), 'first')
        self.apply_update(2)
        self.assertEqual(other.evaluate('window.pageMarker'), 'other')
        self.assertEqual(self.page.evaluate('async () => await (await (await caches.open("unrelated-app")).match("/sentinel")).text()'), 'keep')
        self.release(3)
        self.request_update()
        self.apply_update(3)
        keys = self.page.evaluate('caches.keys()')
        self.assertEqual(len([key for key in keys if key.startswith('r1-control:/project/:')]), 2)
        self.context.set_offline(True)
        self.page.reload()
        self.page.wait_for_function('[...document.querySelectorAll("meta[name=pwa-test-build]")].at(-1)?.content === "3"')
        self.page.locator('.brand').wait_for()

    def test_failed_precache_leaves_installed_build_usable_offline(self):
        self.open_app()
        original = self.page.evaluate('caches.keys()')
        self.release('broken')
        # A successful HTTP response with mismatched bytes must also fail atomically.
        manifest = json.loads((self.site / 'site.webmanifest').read_text())
        icon = self.site / manifest['icons'][0]['src']
        icon.write_bytes(icon.read_bytes() + b'changed-during-deploy')
        self.page.evaluate('''async () => {
          const registration = await navigator.serviceWorker.getRegistration();
          registration.addEventListener('updatefound', () => {
            const worker = registration.installing;
            worker.addEventListener('statechange', () => { if(worker.state==='redundant') window.updateFailed=true; });
          });
          await registration.update();
        }''')
        self.page.wait_for_function('window.updateFailed === true')
        self.assertEqual(self.page.evaluate('caches.keys()'), original)
        self.context.set_offline(True)
        self.page.reload()
        self.page.locator('.brand').wait_for()
        self.assertEqual(self.page.locator('meta[name=pwa-test-build]').count(), 0)


if __name__ == '__main__':
    unittest.main()
