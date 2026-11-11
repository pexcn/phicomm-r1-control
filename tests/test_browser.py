"""原作者版浏览器回归：验证入口、部署和存储，不连接真实音箱。"""
import functools
import os
from pathlib import Path
import shutil
import threading
import unittest
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "dist"


@unittest.skipUnless((SITE / "upstream/index.html").exists(), "Run npm run build before browser regression")
class BrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler = functools.partial(SimpleHTTPRequestHandler, directory=str(SITE.parent))
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.origin = f"http://127.0.0.1:{cls.server.server_port}"
        cls.base = cls.origin + "/" + SITE.name + "/"
        cls.playwright = sync_playwright().start()
        executable = os.environ.get("CHROMIUM_PATH") or shutil.which("chromium")
        cls.browser = cls.playwright.chromium.launch(executable_path=executable, headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def setUp(self):
        self.context = self.browser.new_context(service_workers="block")
        self.context.route("**/*", lambda route: route.continue_()
                           if route.request.url.startswith(self.origin) else route.abort())
        self.page = self.context.new_page()
        self.page.set_default_timeout(5000)
        self.errors = []
        self.page.on("pageerror", lambda error: self.errors.append(str(error)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def test_upstream_original_entries_and_navigation(self):
        self.page.goto(self.base + "upstream/?no_auto_connect")
        self.page.wait_for_selector("#input")
        reference = self.base + "upstream/"
        self.assertTrue(self.page.url.startswith(reference))
        self.assertEqual(self.page.evaluate("R1Upstream.baseUrl"), reference)
        self.assertEqual(self.page.evaluate("typeof R1Config"), "undefined")
        self.assertEqual(self.page.locator("#qun_div, #beian_div").count(), 0)
        self.assertEqual(self.page.locator('script[src*="js/r1_control.min.js"]').count(), 1)
        self.page.get_by_role("button", name="进入新UI", exact=True).click()
        self.page.get_by_role("button", name="关闭", exact=True).wait_for()
        self.assertTrue(self.page.url.startswith(reference + "newui/"))
        self.page.goto(reference + "config_wifi/")
        self.page.wait_for_selector("#ssid")
        self.assertEqual(self.page.evaluate("jQuery.fn.jquery"), "3.6.0")

    def test_upstream_storage_is_isolated_and_clear_is_scoped(self):
        self.context.route(self.base + "storage-probe.html", lambda route: route.fulfill(content_type="text/html", body="<!doctype html>"))
        self.page.goto(self.base + "storage-probe.html")
        self.page.evaluate("localStorage.setItem('ip','192.0.2.5'); localStorage.setItem('phicomm-r1:web:address','new-web'); localStorage.custom_eqs='root'")
        self.page.goto(self.base + "upstream/?no_auto_connect")
        self.page.wait_for_selector("#input")
        self.assertEqual(self.page.locator("#input").input_value(), "")
        self.page.evaluate("localStorage.setItem('ip','192.0.2.10'); localStorage.custom_eqs='author'")
        self.assertEqual(self.page.evaluate("localStorage.getItem('custom_eqs')"), "author")
        self.page.goto(self.base + "upstream/newui/")
        self.page.wait_for_function("typeof R1Core !== 'undefined'")
        self.assertEqual(self.page.evaluate("localStorage.getItem('ip')"), "192.0.2.10")
        self.page.evaluate("localStorage.clear()")
        self.assertEqual(self.page.evaluate("localStorage.length"), 0)
        self.page.goto(self.base + "storage-probe.html")
        self.assertEqual(self.page.evaluate("localStorage.getItem('ip')"), "192.0.2.5")
        self.assertEqual(self.page.evaluate("localStorage.custom_eqs"), "root")
        self.assertEqual(self.page.evaluate("localStorage.getItem('phicomm-r1:web:address')"), "new-web")

    def test_upstream_device_loader_uses_its_own_snapshot(self):
        self.page.add_init_script("""window.WebSocket=class {
            static OPEN=1; static CLOSED=3;
            constructor() { this.readyState=0; }
            close() { this.readyState=3; }
        };""")
        self.context.route(self.origin + "/device/**", lambda route: route.fulfill(
            content_type="text/html", body=f'<html><head></head><body><script '
            f'src="{self.base}upstream/new_r1_control.js"></script></body></html>'))
        self.page.goto(self.origin + "/device/?no_jump")
        self.page.wait_for_function("typeof App !== 'undefined'")
        self.assertEqual(self.page.evaluate("R1Upstream.baseUrl"), self.base + "upstream/")

    def test_fixed_device_entry_loads_upstream(self):
        self.page.add_init_script("""window.WebSocket=class {
            static OPEN=1; static CLOSED=3;
            constructor() { this.readyState=0; }
            close() { this.readyState=3; }
        };""")
        self.context.route(self.origin + "/device/**", lambda route: route.fulfill(
            content_type="text/html", body=f'<html><head></head><body><script '
            f'src="{self.base}new_r1_control.js"></script></body></html>'))
        self.page.goto(self.origin + "/device/?no_jump")
        self.page.wait_for_function("typeof App !== 'undefined'")
        self.assertEqual(self.page.evaluate("R1Upstream.baseUrl"), self.base + "upstream/")
        self.assertEqual(self.page.evaluate("typeof R1Config"), "undefined")

    def test_upstream_keeps_https_and_project_subdirectory(self):
        base = "https://reference.test/project/"
        def resource(route):
            name = urlsplit(route.request.url).path.removeprefix("/project/")
            if not name or name.endswith("/"):
                name += "index.html"
            target = SITE / name
            route.fulfill(path=target) if target.is_file() else route.fulfill(status=404)
        self.context.route(base + "**", resource)
        self.page.add_init_script("Object.defineProperty(navigator,'userAgent',{value:'iPhone Safari'})")
        self.page.goto(base + "upstream/?no_auto_connect")
        self.page.wait_for_selector("#input")
        self.assertTrue(self.page.url.startswith(base + "upstream/"))
        self.assertEqual(self.page.evaluate("R1Upstream.baseUrl"), base + "upstream/")
        self.page.goto(base + "upstream/newui/")
        self.page.get_by_role("button", name="关闭", exact=True).wait_for()
        self.assertEqual(self.page.url, base + "upstream/newui/")


if __name__ == "__main__":
    unittest.main()
