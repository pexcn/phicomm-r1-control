"""浏览器回归：在本地静态站点与合成连接中验证，不连接真实音箱。"""
import functools
import json
import os
from pathlib import Path
import shutil
import threading
import unittest
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class BrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler = functools.partial(SimpleHTTPRequestHandler, directory=str(ROOT.parent))
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.origin = f"http://127.0.0.1:{cls.server.server_port}"
        cls.base = cls.origin + "/" + ROOT.name + "/"
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

    def classic(self):
        self.page.goto(self.base + "?no_auto_connect")
        self.page.wait_for_selector("#input")

    def fake_connection(self):
        self.page.evaluate("""() => {
            state.ver = 1887; state.ip = '192.0.2.10:8080';
            state.ws = {readyState: WebSocket.OPEN};
            window.sent = []; window.sendWs = message => sent.push(message);
            confirmEchoVersion({ver:1887});
        }""")

    def test_subdirectory_navigation_and_ip_validation(self):
        self.classic()
        self.assertTrue(self.page.url.startswith(self.base))
        self.page.locator("#input").fill("invalid")
        self.page.get_by_role("button", name="连接音箱", exact=True).click()
        self.assertIn("请输入正确的IP", self.page.locator("body").inner_text())
        self.page.get_by_role("button", name="确定", exact=True).click()
        self.page.get_by_role("button", name="进入配网页面", exact=True).click()
        self.page.wait_for_selector("#ssid")
        self.assertTrue(self.page.url.startswith(self.base + "config_wifi/"))
        self.assertEqual(self.page.locator("#encryption option").count(), 3)

    def test_queue_deletion_uses_current_confirmed_connection(self):
        self.classic()
        self.fake_connection()
        self.page.evaluate("confirmQueueRemove(1, {title:'测试歌曲'})")
        self.page.get_by_role("button", name="删除", exact=True).click()
        message = self.page.evaluate("sent.pop()")
        self.assertEqual((message["type"], message["what"], message["arg1"]), ("send_message", 4, 29))
        self.assertEqual(json.loads(message["obj"]), {"index": 1})
        self.page.evaluate("confirmQueueRemove(1, {title:'旧会话'})")
        self.page.evaluate("state.ip = '192.0.2.11:8080'; sent.length = 0")
        self.page.get_by_role("button", name="删除", exact=True).click()
        self.assertEqual(self.page.evaluate("sent.length"), 0)
        self.assertFalse(self.page.evaluate("hasMusicQueueCapability()"))

    def test_old_and_unconfirmed_versions_disable_queue(self):
        self.classic()
        self.fake_connection()
        self.page.evaluate("confirmEchoVersion({ver:1886})")
        self.assertFalse(self.page.evaluate("hasMusicQueueCapability()"))
        self.page.evaluate("state.ver=1887; resetEchoVersionConfirmation()")
        self.assertFalse(self.page.evaluate("hasMusicQueueCapability()"))

    def test_custom_eq_save_reload_and_apply(self):
        self.classic()
        setup = """() => {
            state.ver=1887; window.sent=[]; window.sendWs=m=>sent.push(m);
            buildSoundEffectsPanel(); ui.soundEffects.style.display='block';
            state.soundEffectsData={eq:{Bands:{list:[{Band:0,BandLevel:250}]}}};
            renderEqPreset({Preset_list:[{Preset:0,Name:'Normal'}],Current_Preset:0});
        }"""
        self.page.evaluate(setup)
        self.page.get_by_role("button", name="保存EQ", exact=True).click()
        self.page.get_by_placeholder("EQ 名称").fill("回归预设")
        self.page.get_by_role("button", name="确定", exact=True).click()
        saved = self.page.evaluate("JSON.parse(localStorage.custom_eqs)")
        self.assertEqual(saved[0]["name"], "自定义[回归预设]")
        self.page.reload()
        self.page.wait_for_selector("#input")
        self.page.evaluate(setup)
        self.page.locator("#preset_list").select_option(label="自定义[回归预设]")
        self.assertIn({"type": "set_eq_bandlevel", "band": 0, "level": 250}, self.page.evaluate("sent"))

    def test_modern_panels_at_mobile_width(self):
        self.page.set_viewport_size({"width": 390, "height": 900})
        self.page.goto(self.base + "newui/")
        self.page.get_by_role("button", name="关闭", exact=True).click()
        for name in ["音乐", "屏幕", "音效", "蓝牙", "设备"]:
            self.page.get_by_role("button", name=name, exact=True).filter(visible=True).click()
        self.assertIn("尚未连接设备", self.page.locator(".page").inner_text())
        self.assertEqual(self.page.evaluate("document.documentElement.scrollWidth"), 390)

    def test_scan_abort_closes_sockets_and_settles_promise(self):
        self.page.goto(self.base + "newui/")
        self.page.wait_for_function("typeof R1WS !== 'undefined'")
        result = self.page.evaluate("""async () => {
            const sockets=[];
            window.WebSocket=class {
                constructor(url) { this.url=url; sockets.push(this); }
                close() { this.closed=true; }
            };
            const scan=R1WS.scanLocalDevices({ip:'192.0.2.10',ports:[8080],timeout:50});
            scan.abort();
            return {result:await scan, sockets:sockets.map(s=>({url:s.url,closed:s.closed}))};
        }""")
        self.assertTrue(result["result"]["cancelled"])
        self.assertEqual(result["sockets"], [{"url": "ws://192.0.2.10:8080", "closed": True}])

    def test_device_loader_keeps_fork_asset_base(self):
        self.page.add_init_script("""window.WebSocket=class {
            static OPEN=1; static CLOSED=3;
            constructor() { this.readyState=0; }
            close() { this.readyState=3; }
        };""")
        self.context.route(self.origin + "/device/**", lambda route: route.fulfill(
            content_type="text/html", body=f'<html><head></head><body><script src="{self.base}new_r1_control.js"></script></body></html>'))
        self.page.goto(self.origin + "/device/?no_jump")
        self.page.wait_for_function("typeof App !== 'undefined'")
        self.assertEqual(self.page.evaluate("R1Config.assetBaseUrl"), self.base)

    def test_https_subdirectory_keeps_apple_entry_on_site(self):
        base = "https://r1-control.test/project/"
        def resource(route):
            path = urlsplit(route.request.url).path.removeprefix("/project/")
            if not path or path.endswith("/"):
                path += "index.html"
            target = ROOT / path
            route.fulfill(path=target) if target.is_file() else route.fulfill(status=404)
        self.context.route(base + "**", resource)
        self.page.add_init_script("Object.defineProperty(navigator,'userAgent',{value:'iPhone Safari'})")
        self.page.goto(base + "?no_auto_connect")
        self.page.wait_for_selector("#input")
        self.assertTrue(self.page.url.startswith(base))
        self.page.goto(base + "newui/")
        self.page.get_by_role("button", name="关闭", exact=True).wait_for()
        self.assertEqual(self.page.url, base + "newui/")
        self.assertEqual(self.page.evaluate("R1Config.assetBaseUrl"), base)


if __name__ == "__main__":
    unittest.main()
