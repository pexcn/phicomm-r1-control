"""Independent frontend regression against synthetic device messages and a static Pages artifact."""
import base64
import functools
import json
import os
from pathlib import Path
import shutil
import struct
import threading
import unittest
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import zlib
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def screen_png(width=720, height=480):
    def chunk(kind, data):
        return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data))
    pixels = b''.join(b'\0' + bytes([235, 241, 237]) * width for _ in range(height))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', width, height, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(pixels)) + chunk(b'IEND', b'')


class ArtifactHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        if path.startswith('/project/'):
            path = path.removeprefix('/project')
        return super().translate_path(path)

    def log_message(self, *_):
        pass


@unittest.skipUnless((ROOT / 'dist/index.html').exists(), 'Run npm run build before browser regression')
class NewWebTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(ArtifactHandler, directory=str(ROOT / 'dist')))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.origin = f'http://127.0.0.1:{cls.server.server_port}'
        cls.base = cls.origin + '/project/'
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'), headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def setUp(self):
        self.context = self.browser.new_context(service_workers='block', color_scheme='light')
        image = 'data:image/png;base64,' + base64.b64encode(screen_png()).decode()
        self.context.add_init_script('window.mockScreen=' + json.dumps(image) + ';\n' + (ROOT / 'tests/web/mock-device.js').read_text())
        self.context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(self.origin) else route.abort())
        self.context.route('https://r1.wxfsq.com/music**', lambda route: route.fulfill(json={
            'code': 1, 'data': {'lrc': '[00:00.00]城市的灯火慢慢远去\n[01:30.00]夜色里有一条安静的航线', 'list': [{'id': 'search:1', 'name': '搜索结果', 'artist': '示例歌手'}]}}))
        self.page = self.context.new_page()
        self.page.set_default_timeout(6000)
        self.errors, self.missing = [], []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.on('response', lambda response: self.missing.append(response.url) if response.status == 404 else None)

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])
        self.assertEqual(self.missing, [])

    def start(self, version=1873, address='192.0.2.10'):
        self.page.goto(self.base)
        self.page.evaluate('(value)=>window.mockVersion=value', version)
        self.page.get_by_role('main').get_by_role('button', name='连接音箱', exact=True).click()
        self.page.get_by_label('音箱地址', exact=True).fill(address)
        self.page.locator('#connection-dialog').get_by_role('button', name='连接', exact=True).click()
        self.page.get_by_role('heading', name='夜航', exact=True).wait_for()

    def sent(self):
        return self.page.evaluate('mockSockets.at(-1).sent')

    def mock_music(self, **changes):
        self.page.evaluate('''changes => {
          const socket = mockSockets.at(-1);
          if (!socket.musicOverride) {
            socket.musicOverride = {};
            const reply = socket.reply.bind(socket);
            socket.reply = message => {
              if (message.type === 'get_info') message = {...message, data: {
                ...message.data, ...socket.musicOverride,
                music_info: {...message.data.music_info, ...socket.musicOverride.music_info},
              }};
              reply(message);
            };
          }
          socket.musicOverride = {...socket.musicOverride, ...changes,
            music_info: {...socket.musicOverride.music_info, ...changes.music_info}};
          socket.send(JSON.stringify({type:'get_info'}));
        }''', changes)

    def test_standalone_build_theme_and_isolated_storage(self):
        self.page.goto(self.base)
        self.assertEqual(self.page.evaluate('mockSockets.length'), 0)
        self.assertEqual(self.page.evaluate('typeof R1WS'), 'undefined')
        self.assertEqual(self.page.evaluate('typeof R1Config'), 'undefined')
        self.assertEqual(self.page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()"), '#007a50')
        self.page.evaluate("localStorage.setItem('r1_last_ip','legacy'); localStorage.setItem('phicomm-r1:upstream:ip','author')")
        self.page.get_by_role('button', name='跟随系统', exact=True).click()
        self.page.get_by_role('button', name='浅色模式', exact=True).click()
        self.page.wait_for_function("document.querySelector('#theme-toggle').getAttribute('aria-busy') !== 'true'")
        self.assertEqual(self.page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()"), '#55dfa5')
        self.page.reload()
        self.assertEqual(self.page.evaluate('document.documentElement.dataset.theme'), 'dark')
        self.page.get_by_role('button', name='选择或连接音箱').click()
        self.assertEqual(self.page.get_by_label('音箱地址', exact=True).input_value(), '')
        self.assertEqual(self.page.evaluate("localStorage.getItem('r1_last_ip')"), 'legacy')
        self.assertEqual(self.page.locator('a[href$="/project/upstream/"]').count(), 1)
        self.assertEqual(self.page.get_by_text('登录', exact=True).count(), 0)

    def test_theme_cycle_tracks_system_and_restores_saved_mode(self):
        self.page.emulate_media(color_scheme='dark')
        self.page.goto(self.base)
        self.assertEqual(self.page.locator('#theme-toggle').get_by_role('button').get_attribute('aria-label'), '跟随系统')
        self.assertEqual(self.page.evaluate('document.documentElement.dataset.theme'), 'dark')
        self.page.emulate_media(color_scheme='light')
        self.page.wait_for_function('document.documentElement.dataset.theme === "light"')
        self.page.locator('#theme-toggle').click()
        self.assertEqual(self.page.locator('#theme-toggle').get_by_role('button').get_attribute('aria-label'), '浅色模式')
        self.page.emulate_media(color_scheme='dark')
        self.assertEqual(self.page.evaluate('document.documentElement.dataset.theme'), 'light')
        self.page.locator('#theme-toggle').click()
        self.page.wait_for_function("document.querySelector('#theme-toggle').getAttribute('aria-busy') !== 'true'")
        self.assertEqual(self.page.locator('#theme-toggle').get_by_role('button').get_attribute('aria-label'), '深色模式')
        self.page.locator('#theme-toggle').click()
        self.assertEqual(self.page.locator('#theme-toggle').get_by_role('button').get_attribute('aria-label'), '跟随系统')
        self.page.reload()
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('phicomm-r1:web:theme'))"), 'system')
        self.assertEqual(self.page.locator('#theme-toggle').get_by_role('button').get_attribute('aria-label'), '跟随系统')
        self.assertEqual(self.page.evaluate('document.documentElement.dataset.theme'), 'dark')
        self.page.emulate_media(color_scheme='light')
        self.page.wait_for_function('document.documentElement.dataset.theme === "light"')

    def test_theme_reveal_keyboard_origin_rapid_clicks_and_settings(self):
        self.page.goto(self.base)
        toggle = self.page.locator('#theme-toggle')
        toggle.click()
        toggle.focus()
        box = toggle.bounding_box()
        self.page.keyboard.press('Enter')
        self.page.wait_for_function("document.querySelector('style[data-theme-reveal]')")
        self.assertTrue(self.page.evaluate("document.getAnimations().some(animation=>animation.effect?.pseudoElement?.includes('theme-reveal') && animation.playState === 'running')"))
        origin = self.page.evaluate("getComputedStyle(document.documentElement, '::view-transition-group(theme-reveal)').transformOrigin.split(' ').slice(0, 2).map(parseFloat)")
        self.assertAlmostEqual(origin[0], box['x'] + box['width'] / 2, delta=1)
        self.assertAlmostEqual(origin[1], box['y'] + box['height'] / 2, delta=1)
        toggle.evaluate('el=>{el.click(); el.click();}')
        self.page.wait_for_function("document.querySelector('#theme-toggle').getAttribute('aria-busy') !== 'true'")
        self.assertEqual(toggle.get_by_role('button').get_attribute('aria-label'), '深色模式')
        self.assertEqual(self.page.locator('style[data-theme-reveal]').count(), 0)
        self.assertEqual(self.page.evaluate("document.documentElement.style.getPropertyValue('view-transition-name')"), '')
        self.page.get_by_role('button', name='打开设置', exact=True).click()
        self.page.locator('#settings-dialog').get_by_role('button', name='浅色模式', exact=True).click()
        self.page.wait_for_function("document.querySelector('#theme-toggle').getAttribute('aria-busy') !== 'true'")
        self.assertEqual(toggle.get_by_role('button').get_attribute('aria-label'), '浅色模式')
        self.assertEqual(self.page.evaluate('document.documentElement.dataset.theme'), 'light')
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('phicomm-r1:web:theme'))"), 'light')

    def test_theme_reveal_uses_control_center_for_pointer_and_touch(self):
        def assert_center(page, box):
            page.wait_for_function("document.querySelector('style[data-theme-reveal]')")
            origin = page.evaluate("getComputedStyle(document.documentElement, '::view-transition-group(theme-reveal)').transformOrigin.split(' ').slice(0, 2).map(parseFloat)")
            self.assertAlmostEqual(origin[0], box['x'] + box['width'] / 2, delta=0.1)
            self.assertAlmostEqual(origin[1], box['y'] + box['height'] / 2, delta=0.1)
            page.wait_for_function("!document.documentElement.classList.contains('theme-transition')")

        self.page.goto(self.base)
        toggle = self.page.locator('#theme-toggle')
        toggle.click()
        box = toggle.bounding_box()
        toggle.click(position={'x':8, 'y':5})
        assert_center(self.page, box)
        self.page.get_by_role('button', name='打开设置', exact=True).click()
        light = self.page.locator('#settings-dialog').get_by_role('button', name='浅色模式', exact=True)
        light.click(trial=True)
        box = light.bounding_box()
        light.click(position={'x':8, 'y':5})
        assert_center(self.page, box)

        context = self.browser.new_context(has_touch=True, color_scheme='light', viewport={'width':390, 'height':844})
        try:
            page = context.new_page()
            page.set_default_timeout(6000)
            page.on('pageerror', lambda error: self.errors.append(str(error)))
            page.goto(self.base)
            toggle = page.locator('#theme-toggle')
            toggle.tap()
            box = toggle.bounding_box()
            page.touchscreen.tap(box['x'] + 8, box['y'] + 5)
            assert_center(page, box)
        finally:
            context.close()

    def test_theme_fallbacks_for_reduced_motion_and_unavailable_transition(self):
        self.page.emulate_media(reduced_motion='reduce')
        self.page.goto(self.base)
        self.page.evaluate("() => {window.themeTransitions=0; document.startViewTransition=()=>{themeTransitions++; throw new Error('transition unavailable');};}")
        toggle = self.page.locator('#theme-toggle')
        toggle.click()
        toggle.click()
        self.assertEqual(self.page.evaluate('document.documentElement.dataset.theme'), 'dark')
        self.assertEqual(self.page.evaluate('themeTransitions'), 0)
        self.assertFalse(self.page.evaluate("document.documentElement.classList.contains('theme-transition')"))
        self.page.emulate_media(reduced_motion='no-preference')
        self.page.evaluate('document.startViewTransition=undefined')
        toggle.click()
        self.assertEqual(toggle.get_by_role('button').get_attribute('aria-label'), '跟随系统')
        self.assertEqual(self.page.evaluate('document.documentElement.dataset.theme'), 'light')
        self.page.evaluate("() => {document.startViewTransition=()=>{throw new Error('transition failed');};}")
        toggle.click()
        toggle.click()
        self.page.wait_for_function("document.querySelector('#theme-toggle').getAttribute('aria-busy') !== 'true'")
        self.assertEqual(self.page.evaluate('document.documentElement.dataset.theme'), 'dark')
        self.assertEqual(self.page.locator('style[data-theme-reveal]').count(), 0)

    def test_color_scheme_is_independent_of_mode_and_persists_with_favicon(self):
        self.page.goto(self.base)
        self.page.get_by_role('button', name='打开设置', exact=True).click()
        green = self.page.get_by_role('radio', name='翡翠绿', exact=True)
        blue = self.page.get_by_role('radio', name='蓝色', exact=True)
        self.assertTrue(green.is_checked())
        green.focus()
        self.page.keyboard.press('ArrowRight')
        self.page.wait_for_function("!document.documentElement.classList.contains('theme-transition') && document.documentElement.dataset.colorScheme === 'blue'")
        self.assertTrue(blue.is_checked())
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('phicomm-r1:web:theme'))"), 'system')
        self.assertEqual(self.page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()"), '#415f91')
        self.assertIn('fill="#415f91"', self.page.locator('link[rel="icon"]').evaluate("el=>decodeURIComponent(el.href.split(',')[1])"))
        self.page.get_by_role('button', name='完成', exact=True).click()
        self.page.reload()
        self.assertEqual(self.page.evaluate('document.documentElement.dataset.colorScheme'), 'blue')
        self.page.emulate_media(color_scheme='dark')
        self.page.wait_for_function("getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() === '#aac7ff'")
        self.assertEqual(self.page.locator('#theme-toggle').get_by_role('button').get_attribute('aria-label'), '跟随系统')
        self.page.locator('#theme-toggle').click()
        self.page.wait_for_function("document.querySelector('#theme-toggle').getAttribute('aria-busy') !== 'true'")
        self.assertEqual(self.page.evaluate('document.documentElement.dataset.theme'), 'light')
        self.assertEqual(self.page.evaluate('document.documentElement.dataset.colorScheme'), 'blue')
        self.page.locator('#theme-toggle').click()
        self.page.wait_for_function("document.querySelector('#theme-toggle').getAttribute('aria-busy') !== 'true'")
        self.page.reload()
        self.assertEqual(self.page.evaluate('document.documentElement.dataset.theme'), 'dark')
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('phicomm-r1:web:color-scheme'))"), 'blue')
        self.assertIn('fill="#aac7ff"', self.page.locator('link[rel="icon"]').evaluate("el=>decodeURIComponent(el.href.split(',')[1])"))

    def test_custom_color_validation_restore_and_independent_mode(self):
        self.page.emulate_media(color_scheme='dark')
        self.page.set_viewport_size({'width':390,'height':844})
        self.page.goto(self.base)
        self.page.get_by_role('button', name='打开设置', exact=True).click()
        self.page.get_by_role('radio', name='自定义', exact=True).check()
        self.page.wait_for_function("!document.documentElement.classList.contains('theme-transition') && document.documentElement.dataset.colorScheme === 'custom'")
        code = self.page.get_by_label('主色代码', exact=True)
        code.fill('not-a-color')
        self.page.get_by_role('button', name='应用颜色', exact=True).click()
        self.page.get_by_role('alert').get_by_text('请输入 #RRGGBB 格式的颜色代码，例如 #6750A4。', exact=True).wait_for()
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('phicomm-r1:web:custom-color'))"), '#007a50')
        code.fill('#FF0000')
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('phicomm-r1:web:custom-color'))"), '#007a50')
        code.press('Enter')
        self.page.wait_for_function("!document.documentElement.classList.contains('theme-transition') && JSON.parse(localStorage.getItem('phicomm-r1:web:custom-color')) === '#ff0000'")
        dark_accent = self.page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()")
        self.assertNotEqual(dark_accent, '#ff0000')
        self.page.get_by_role('button', name='完成', exact=True).click()
        self.page.reload()
        self.assertEqual(self.page.evaluate('document.documentElement.dataset.colorScheme'), 'custom')
        self.assertEqual(self.page.evaluate('document.documentElement.dataset.theme'), 'dark')
        self.assertIn('fill="' + dark_accent + '"', self.page.locator('link[rel="icon"]').evaluate("el=>decodeURIComponent(el.href.split(',')[1])"))
        self.page.get_by_role('button', name='打开设置', exact=True).click()
        self.assertEqual(code.input_value(), '#ff0000')
        self.page.get_by_role('button', name='浅色模式', exact=True).click()
        self.page.wait_for_function("!document.documentElement.classList.contains('theme-transition') && document.documentElement.dataset.theme === 'light'")
        light_accent = self.page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()")
        self.assertNotEqual(light_accent, dark_accent)
        self.page.get_by_role('radio', name='蓝色', exact=True).check()
        self.page.wait_for_function("!document.documentElement.classList.contains('theme-transition') && document.documentElement.dataset.colorScheme === 'blue'")
        self.page.get_by_role('radio', name='自定义', exact=True).check()
        self.page.wait_for_function("!document.documentElement.classList.contains('theme-transition') && document.documentElement.dataset.colorScheme === 'custom'")
        self.assertEqual(code.input_value(), '#ff0000')
        self.assertEqual(self.page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()"), light_accent)
        self.page.get_by_role('button', name='恢复默认配色', exact=True).click()
        self.page.wait_for_function("!document.documentElement.classList.contains('theme-transition') && document.documentElement.dataset.colorScheme === 'green'")
        self.assertEqual(self.page.evaluate('document.documentElement.dataset.theme'), 'light')
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('phicomm-r1:web:custom-color'))"), '#007a50')
        self.page.get_by_role('button', name='完成', exact=True).click()
        self.page.reload()
        self.assertEqual(self.page.evaluate('document.documentElement.dataset.colorScheme'), 'green')

    def test_custom_color_picker_narrow_layout_and_invalid_saved_color(self):
        self.page.emulate_media(reduced_motion='reduce')
        self.page.set_viewport_size({'width':320,'height':720})
        self.page.goto(self.base)
        self.page.evaluate("localStorage.setItem('phicomm-r1:web:color-scheme', JSON.stringify('custom')); localStorage.setItem('phicomm-r1:web:custom-color', JSON.stringify({bad:true})); localStorage.setItem('phicomm-r1:web:theme', JSON.stringify('dark'))")
        self.page.reload()
        self.assertEqual(self.page.evaluate('document.documentElement.dataset.colorScheme'), 'green')
        self.assertEqual(self.page.evaluate('document.documentElement.dataset.theme'), 'dark')
        self.page.get_by_role('button', name='打开设置', exact=True).click()
        self.page.get_by_role('radio', name='自定义', exact=True).check()
        picker = self.page.get_by_label('选取自定义主色', exact=True)
        picker.evaluate("el=>{el.value='#0000ff';el.dispatchEvent(new Event('input',{bubbles:true}));}")
        self.assertEqual(self.page.get_by_label('主色代码', exact=True).input_value(), '#0000ff')
        self.page.get_by_role('button', name='应用颜色', exact=True).click()
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('phicomm-r1:web:custom-color'))"), '#0000ff')
        self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'), 320)
        self.page.get_by_label('主色代码', exact=True).fill('#ffffff')
        self.page.get_by_role('button', name='完成', exact=True).click()
        self.page.get_by_role('button', name='打开设置', exact=True).click()
        self.assertEqual(self.page.get_by_label('主色代码', exact=True).input_value(), '#0000ff')
        self.page.get_by_role('button', name='恢复默认配色', exact=True).click()
        self.assertEqual(self.page.evaluate('document.documentElement.dataset.theme'), 'dark')
        self.page.get_by_role('radio', name='自定义', exact=True).check()
        self.assertEqual(self.page.get_by_label('主色代码', exact=True).input_value(), '#007a50')

    def test_color_fallback_and_separate_api_save_in_mobile_settings(self):
        self.page.goto(self.base)
        self.page.evaluate("localStorage.setItem('phicomm-r1:web:color-scheme', JSON.stringify('removed-preset')); localStorage.setItem('phicomm-r1:web:theme', JSON.stringify('dark'))")
        self.page.set_viewport_size({'width':390,'height':844})
        self.page.reload()
        self.assertEqual(self.page.evaluate('document.documentElement.dataset.colorScheme'), 'green')
        self.assertEqual(self.page.evaluate('document.documentElement.dataset.theme'), 'dark')
        self.page.get_by_role('button', name='打开设置', exact=True).click()
        settings = self.page.locator('#settings-dialog')
        self.assertTrue(settings.get_by_role('button', name='保存接口', exact=True).is_disabled())
        settings.get_by_role('radio', name='蓝色', exact=True).check()
        self.page.wait_for_function("!document.documentElement.classList.contains('theme-transition') && document.documentElement.dataset.colorScheme === 'blue'")
        self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'), 390)
        api = self.page.get_by_label('音乐接口地址', exact=True)
        api.fill('not a valid URL')
        settings.get_by_role('button', name='保存接口', exact=True).click()
        settings.get_by_role('alert').wait_for()
        self.assertIsNone(self.page.evaluate("localStorage.getItem('phicomm-r1:web:music-api')"))
        api.fill('https://music.example/api')
        settings.get_by_role('button', name='保存接口', exact=True).click()
        settings.get_by_role('status').get_by_text('音乐接口已保存。', exact=True).wait_for()
        self.assertTrue(settings.locator('dialog').evaluate('el=>el.open'))
        api.fill('https://unsaved.example/api')
        settings.get_by_role('button', name='完成', exact=True).click()
        self.page.get_by_role('button', name='打开设置', exact=True).click()
        self.assertEqual(api.input_value(), 'https://music.example/api')
        self.assertTrue(settings.get_by_role('radio', name='蓝色', exact=True).is_checked())
        self.page.keyboard.press('Escape')
        self.page.reload()
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('phicomm-r1:web:music-api'))"), 'https://music.example/api')
        self.assertEqual(self.page.evaluate('document.documentElement.dataset.colorScheme'), 'blue')

    def test_playback_volume_seek_and_no_account_requests(self):
        self.start()
        self.page.get_by_role('button', name='暂停播放', exact=True).click()
        self.page.get_by_role('button', name='下一首', exact=True).click()
        self.page.locator('#music-volume').evaluate("el=>{el.value=0;el.dispatchEvent(new Event('change',{bubbles:true}));}")
        self.page.locator('#music-progress').evaluate("el=>{el.value=120000;el.dispatchEvent(new Event('change',{bubbles:true}));}")
        sent = self.sent()
        self.assertIn({'type': 'send_message', 'what': 4, 'arg1': 2, 'arg2': -1, 'obj': True}, sent)
        self.assertIn({'type': 'set_vol', 'vol': 0}, sent)
        self.assertIn({'type': 'set_position', 'position': 120000}, sent)
        self.assertEqual(self.page.get_by_role('button', name='删除 晚风').count(), 0)
        self.assertFalse(any('login' in str(message).lower() or message['type'] == 'send_to_unisound' for message in sent))

    def test_reload_restores_last_successful_endpoint_and_reads_fresh_state(self):
        address = 'wss://speaker.example/room/ws?key=a%2Fb'
        self.start(1887, address)
        self.assertEqual(self.page.get_by_role('button', name='删除 晚风', exact=True).count(), 1)
        # Addresses saved before automatic restore was introduced must also work.
        self.page.evaluate("localStorage.removeItem('phicomm-r1:web:auto-connect')")
        self.page.reload()
        self.page.get_by_role('heading', name='夜航', exact=True).wait_for()
        self.assertEqual(self.page.evaluate('mockSockets.length'), 1)
        self.assertEqual(self.page.evaluate('mockSockets[0].url'), address)
        self.assertTrue({'get_info', 'max_vol', 'list'} <= {message['type'] for message in self.sent()})
        self.assertEqual(self.page.get_by_role('button', name='删除 晚风', exact=True).count(), 0)
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('phicomm-r1:web:auto-connect'))"), True)

    def test_turntable_moves_inward_and_preserves_rotation_on_pause(self):
        self.start()
        rotor = self.page.locator('.turntable-rotor')
        needle = self.page.locator('.turntable-needle')
        self.assertTrue(self.page.get_by_role('button', name='放大当前歌曲封面', exact=True).is_disabled())
        angles = []
        for position in [0, 50000, 99000]:
            self.mock_music(music_info={'position': position, 'duration': 100000})
            self.page.wait_for_function('(value)=>document.querySelector("#music-progress").value === value', arg=position)
            self.page.wait_for_function("!document.querySelector('.turntable-needle').getAnimations().some(a=>a.playState === 'running')")
            angles.append(needle.evaluate('el=>Math.atan2(new DOMMatrix(getComputedStyle(el).transform).b, new DOMMatrix(getComputedStyle(el).transform).a) * 180 / Math.PI'))
        self.assertTrue(angles[0] < angles[1] < angles[2])
        self.page.wait_for_function("document.querySelector('.turntable-rotor').getAnimations()[0]?.playState === 'running'")
        before = rotor.evaluate('el=>el.getAnimations()[0].currentTime')
        self.mock_music(play_state=False)
        self.page.get_by_role('button', name='继续播放', exact=True).wait_for()
        self.page.wait_for_function("document.querySelector('.turntable-rotor').getAnimations()[0]?.playState === 'paused'")
        self.page.evaluate('() => new Promise(requestAnimationFrame)')
        paused = rotor.evaluate('el=>el.getAnimations()[0].currentTime')
        self.assertGreaterEqual(paused, before - 2)
        self.page.wait_for_timeout(100)
        self.assertAlmostEqual(rotor.evaluate('el=>el.getAnimations()[0].currentTime'), paused, delta=2)
        self.page.wait_for_function("!document.querySelector('.turntable-needle').getAnimations().some(a=>a.playState === 'running')")
        parked = needle.evaluate('el=>Math.atan2(new DOMMatrix(getComputedStyle(el).transform).b, new DOMMatrix(getComputedStyle(el).transform).a) * 180 / Math.PI')
        self.assertAlmostEqual(parked, -28.5, delta=.01)
        self.mock_music(play_state=True)
        self.page.wait_for_function("document.querySelector('.turntable-rotor').getAnimations()[0]?.playState === 'running'")
        self.assertGreaterEqual(rotor.evaluate('el=>el.getAnimations()[0].currentTime'), paused - 2)
        self.mock_music(music_info={'position':100000})
        self.page.wait_for_function("document.querySelector('.turntable-rotor').getAnimations()[0]?.playState === 'paused'")
        self.page.emulate_media(reduced_motion='reduce')
        self.mock_music(music_info={'position':0, 'duration':0})
        self.page.wait_for_function("getComputedStyle(document.querySelector('.turntable-rotor')).animationName === 'none'")

    def test_cover_viewer_preserves_full_image_and_handles_missing_artwork(self):
        self.start()
        self.context.route('https://artwork.test/cover.png', lambda route: route.fulfill(body=screen_png(), content_type='image/png'))
        self.context.route('https://artwork.test/broken.png', lambda route: route.fulfill(body=b'not an image', content_type='image/png'))
        self.mock_music(music_info={'albumUrl':'https://artwork.test/cover.png'})
        cover = self.page.get_by_role('button', name='放大当前歌曲封面', exact=True)
        self.page.wait_for_function("!document.querySelector('.turntable-cover').disabled")
        self.assertEqual(self.page.get_by_text('点击封面查看大图', exact=True).count(), 0)
        commands = [m for m in self.sent() if m['type'] not in ['get_info', 'max_vol', 'list']]
        cover.click()
        viewer = self.page.get_by_role('dialog', name='歌曲封面大图', exact=True)
        self.assertTrue(viewer.evaluate("el=>el.matches(':modal')"))
        image = viewer.locator('img')
        self.page.wait_for_function("document.querySelector('.cover-viewer-content img').naturalWidth > 0")
        ratio = image.evaluate('el=>({natural:el.naturalWidth/el.naturalHeight, display:el.clientWidth/el.clientHeight, animations:el.getAnimations().length})')
        self.assertAlmostEqual(ratio['natural'], ratio['display'], places=2)
        self.assertEqual(ratio['animations'], 0)
        self.assertEqual(self.page.evaluate('getComputedStyle(document.body).overflow'), 'hidden')
        self.page.keyboard.press('Escape')
        viewer.wait_for(state='hidden')
        self.assertTrue(cover.evaluate("el=>el.matches(':focus')"))
        cover.click()
        viewer.get_by_role('button', name='关闭封面大图', exact=True).click()
        viewer.wait_for(state='hidden')
        cover.click()
        viewer.click(position={'x':5,'y':300})
        viewer.wait_for(state='hidden')
        self.assertEqual([m for m in self.sent() if m['type'] not in ['get_info', 'max_vol', 'list']], commands)
        cover.click()
        self.mock_music(music_info={'id':'mock:new-track','albumUrl':'https://artwork.test/broken.png'})
        viewer.wait_for(state='hidden')
        self.page.locator('.turntable-placeholder').wait_for()
        self.assertTrue(cover.is_disabled())
        self.mock_music(music_info={'albumUrl':'https://artwork.test/cover.png'})
        self.page.wait_for_function("!document.querySelector('.turntable-cover').disabled")

    def test_manual_disconnect_stays_disconnected_after_reload_until_reconnected(self):
        self.start()
        self.page.locator('.sidebar a[href="#/device"]').click()
        self.page.get_by_role('button', name='断开连接', exact=True).click()
        self.page.reload()
        self.page.get_by_role('main').get_by_role('button', name='连接音箱', exact=True).wait_for()
        self.assertEqual(self.page.evaluate('mockSockets.length'), 0)
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('phicomm-r1:web:auto-connect'))"), False)
        self.page.get_by_role('main').get_by_role('button', name='连接音箱', exact=True).click()
        self.assertEqual(self.page.get_by_label('音箱地址', exact=True).input_value(), 'ws://192.0.2.10:8080/')
        self.page.locator('#connection-dialog').get_by_role('button', name='连接', exact=True).click()
        self.page.get_by_role('heading', name='客厅音箱', exact=True).wait_for()
        self.page.reload()
        self.page.get_by_role('heading', name='客厅音箱', exact=True).wait_for()
        self.assertEqual(self.page.evaluate('mockSockets.length'), 1)

    def test_queue_capability_and_stale_connection_are_not_carried_to_next_device(self):
        self.start(1887)
        self.page.get_by_role('button', name='上移 晚风', exact=True).click()
        self.assertIn({'type': 'send_message', 'what': 4, 'arg1': 28, 'arg2': -1, 'obj': '{"from":1,"to":0}'}, self.sent())
        self.page.get_by_role('button', name='选择或连接音箱').click()
        self.page.evaluate('window.mockVersion=1873')
        self.page.get_by_label('音箱地址', exact=True).fill('wss://speaker.example/room/ws?key=a%2Fb')
        self.page.locator('#connection-dialog').get_by_role('button', name='连接', exact=True).click()
        self.page.wait_for_function('mockSockets.length===2 && mockSockets.at(-1).readyState===1')
        self.page.evaluate("mockSockets[0].reply({type:'get_info',data:{ver:9999}})")
        self.assertEqual(self.page.get_by_role('button', name='上移 晚风', exact=True).count(), 0)
        self.assertEqual(self.page.evaluate('mockSockets.at(-1).url'), 'wss://speaker.example/room/ws?key=a%2Fb')

    def test_screen_navigation_touch_and_cleanup(self):
        self.start()
        self.page.goto(self.base + '#/screen')
        self.page.get_by_role('img', name='音箱实时屏幕，可点击与滑动').wait_for()
        self.page.get_by_role('button', name='音箱返回', exact=True).click()
        self.page.get_by_role('button', name='音箱 Home', exact=True).click()
        self.page.get_by_role('button', name='音箱菜单', exact=True).click()
        for code in [4, 3, 82]:
            self.assertIn({'type': 'input', 'input': f'keyevent {code}'}, self.sent())
        image = self.page.get_by_role('img', name='音箱实时屏幕，可点击与滑动')
        box = image.bounding_box()
        self.assertAlmostEqual(box['width'] / box['height'], 1.5, places=2)
        image.click(position={'x': box['width']/2, 'y': box['height']/2})
        self.assertIn({'type': 'input', 'input': 'tap 360 240'}, self.sent())
        smaller = 'data:image/png;base64,' + base64.b64encode(screen_png(360, 240)).decode()
        self.page.evaluate('(data)=>mockSockets.at(-1).reply({type:"screencap",data})', smaller)
        self.page.wait_for_function('document.querySelector(".device-display img").naturalWidth===360')
        self.page.evaluate('mockSockets.at(-1).sent.length=0')
        image.click(position={'x': box['width']/2, 'y': box['height']/2})
        self.assertIn({'type': 'input', 'input': 'tap 360 240'}, self.sent())
        self.page.locator('.sidebar nav a[href="#/music"]').click()
        self.page.wait_for_function('mockSockets.at(-1).sent.some(message=>message.type==="stop_screencap")')
        self.assertIn({'type': 'stop_screencap'}, self.sent())

    def test_local_music_scan_filter_and_direct_play_on_1873(self):
        self.start(1873)
        self.page.locator('.quick-card').filter(has_text='本地音乐').click()
        dialog = self.page.locator('#local-music-dialog')
        before = len(self.sent())
        dialog.get_by_role('button', name='扫描目录', exact=True).click()
        dialog.get_by_text('找到 2 个音频文件，当前显示 2 个', exact=True).wait_for()
        self.assertFalse(any(m['type']=='play_local_music' or (m['type']=='send_message' and m.get('arg1')==15) for m in self.sent()[before:]))
        dialog.get_by_label('搜索本地音乐', exact=True).fill('晚风')
        self.assertEqual(dialog.locator('.local-file-list li').count(), 1)
        dialog.get_by_role('button', name='播放本地 /sdcard/Music/子目录/晚风.flac', exact=True).click()
        message = next(m for m in reversed(self.sent()) if m['type']=='send_message' and m.get('arg1')==15)
        self.assertEqual(json.loads(message['obj'])['itemList'][0]['url'], '/sdcard/Music/子目录/晚风.flac')
        dialog.get_by_role('button', name='播放路径', exact=True).click()
        self.assertIn({'type':'play_local_music','path':'/sdcard/Music','play':True}, self.sent())
        dialog.get_by_label('音乐目录或文件路径', exact=True).fill('relative')
        dialog.get_by_role('button', name='扫描目录', exact=True).click()
        dialog.get_by_role('alert').wait_for()

    def test_local_scan_is_discarded_after_close_or_reconnect(self):
        self.start()
        self.page.evaluate('window.mockHoldLocal=true')
        self.page.locator('.quick-card').filter(has_text='本地音乐').click()
        dialog = self.page.locator('#local-music-dialog')
        dialog.get_by_role('button', name='扫描目录', exact=True).click()
        request = next(m for m in reversed(self.sent()) if m['type']=='shell' and '__R1_LOCAL_BEGIN__' in m['shell'])
        dialog.get_by_role('button', name='关闭', exact=True).click()
        self.page.get_by_role('button', name='选择或连接音箱').click()
        self.page.get_by_label('音箱地址', exact=True).fill('192.0.2.20')
        self.page.locator('#connection-dialog').get_by_role('button', name='连接', exact=True).click()
        self.page.wait_for_function('mockSockets.length===2 && mockSockets.at(-1).readyState===1')
        self.page.evaluate('(request)=>mockSockets[0].reply({type:"shell",type_id:request.type_id,code:200,data:"__R1_LOCAL_BEGIN__\\n/sdcard/Music/stale.mp3\\n__R1_LOCAL_END__"})',request)
        self.page.locator('.quick-card').filter(has_text='本地音乐').click()
        self.assertEqual(dialog.locator('.local-file-list li').count(),0)
        self.assertTrue(dialog.get_by_role('button',name='扫描目录',exact=True).is_enabled())

    def test_atmosphere_light_controls_and_mobile_layout(self):
        self.page.set_viewport_size({'width':320,'height':844})
        self.start(1873)
        self.page.locator('.quick-card').filter(has_text='氛围灯').click()
        dialog = self.page.locator('#atmosphere-light-dialog')
        dialog.locator('md-slider').nth(0).evaluate("el=>{el.value=120;el.dispatchEvent(new Event('change',{bubbles:true}));}")
        self.assertIn({'type':'send_message','what':4,'arg1':65,'arg2':120,'obj':''}, self.sent())
        dialog.locator('md-slider').nth(1).evaluate("el=>{el.value=8;el.dispatchEvent(new Event('change',{bubbles:true}));}")
        dialog.locator('md-outlined-select').click()
        dialog.get_by_role('option',name='单色效果',exact=True).click()
        self.page.wait_for_function('mockSockets.at(-1).light.music_light_mode===4')
        dialog.get_by_label('灯光颜色',exact=True).fill('#12ab34')
        dialog.get_by_role('button',name='应用',exact=True).click()
        self.assertIn({'type':'send_message','what':4,'arg1':70,'arg2':0x12ab34,'obj':''}, self.sent())
        dialog.get_by_label('启用氛围灯',exact=True).click()
        self.assertFalse(self.page.evaluate('mockSockets.at(-1).light.music_light_enable'))
        self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),320)

    def test_queue_long_titles_fit_without_horizontal_scroll(self):
        self.start(1887)
        self.page.evaluate('''() => mockSockets.at(-1).reply({type:'list',data:{playIndex:0,
          playList:Array.from({length:60},(_,i)=>({id:'long-'+i,title:'Song of Wings -As One- '+ '长标题'.repeat(60),artist:'VeryLongArtistName'.repeat(20),duration:248000}))
        }})''')
        self.page.wait_for_function("document.querySelectorAll('.track-list li').length===60")
        for width in [1600, 1024, 390, 320]:
            with self.subTest(width=width):
                self.page.set_viewport_size({'width':width,'height':844})
                if width == 390:
                    self.page.locator('.mobile-queue-toggle').click()
                queue = self.page.locator('.track-list')
                self.assertLessEqual(queue.evaluate('el=>el.scrollWidth'), queue.evaluate('el=>el.clientWidth'))
                self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'), width)
                queue.evaluate('el=>{el.scrollLeft=100;el.scrollTop=el.scrollHeight;}')
                self.assertEqual(queue.evaluate('el=>el.scrollLeft'), 0)
                self.assertGreater(queue.evaluate('el=>el.scrollTop'), 0)
                self.page.locator('.track-main').last.click()
                self.assertIn({'type':'play','index':59}, self.sent())
                self.page.locator('.track-actions md-icon-button').last.focus()
                self.assertLessEqual(queue.evaluate('el=>el.scrollWidth'), queue.evaluate('el=>el.clientWidth'))

    def test_mobile_layout_all_pages_and_green_light_palette(self):
        self.page.set_viewport_size({'width': 390, 'height': 844})
        self.start()
        for route, label in [('music', '音乐'), ('screen', '屏幕'), ('sound', '音效'), ('bluetooth', '蓝牙'), ('device', '设备')]:
            self.page.locator('.bottom-nav').get_by_role('link', name=label, exact=True).click()
            self.page.wait_for_url('**/#/' + route)
            self.page.locator(f'.{route}-page').wait_for()
            self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'), 390)
        self.assertEqual(self.page.get_by_role('heading', name='账号与音乐服务').count(), 0)
        self.page.get_by_text('1.8.73', exact=True).wait_for()
        self.page.set_viewport_size({'width': 320, 'height': 844})
        self.page.locator('.bottom-nav').get_by_role('link', name='音乐', exact=True).click()
        self.page.get_by_role('button', name='打开设置', exact=True).click()
        self.page.get_by_role('button', name='完成', exact=True).wait_for()
        self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'), 320)

    def test_eq_preset_uses_device_band_ids_and_scoped_browser_storage(self):
        self.start()
        self.page.locator('.sidebar a[href="#/sound"]').click()
        self.page.get_by_label('EQ 频段 0', exact=True).wait_for()
        self.page.locator('#eq-band-0').evaluate("el=>{el.value=350;el.dispatchEvent(new Event('change',{bubbles:true}));}")
        self.assertIn({'type': 'set_eq_bandlevel', 'band': 0, 'level': 350}, self.sent())
        self.page.get_by_role('button', name='保存为预设', exact=True).click()
        self.page.get_by_label('预设名称', exact=True).fill('晚间')
        self.page.locator('#eq-preset-dialog').get_by_role('button', name='保存', exact=True).click()
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('phicomm-r1:web:eq-presets'))[0].name"), '晚间')
        self.assertIsNone(self.page.evaluate("localStorage.getItem('custom_eqs')"))

    def test_https_pages_subdirectory_keeps_wss_endpoint_and_local_assets(self):
        base = 'https://r1-control.test/project/'
        def resource(route):
            name = urlsplit(route.request.url).path.removeprefix('/project/') or 'index.html'
            target = ROOT / 'dist' / name
            route.fulfill(path=target) if target.is_file() else route.fulfill(status=404)
        self.context.route(base + '**', resource)
        self.base = base
        endpoint = 'wss://speaker.example/room/ws?key=a%2Fb'
        self.start(1887, endpoint)
        self.assertTrue(self.page.url.startswith(base))
        self.assertEqual(self.page.evaluate('mockSockets.at(-1).url'), endpoint)
        self.page.locator('.sidebar nav a[href="#/device"]').click()
        self.page.get_by_role('heading', name='设备概览').wait_for()
        self.assertGreater(self.page.locator('a[href$="/project/upstream/"]').count(), 0)
        self.assertFalse((ROOT / 'dist/tools').exists())
        self.assertTrue((ROOT / 'dist/THIRD-PARTY-LICENSES.md').is_file())
        for private in ['original', 'overlays', 'source.json', 'patches.json', 'sync.py', 'AGENTS.md']:
            self.assertFalse((ROOT / 'dist/upstream' / private).exists(), private)

    def test_published_routes_only_keep_new_web_and_upstream(self):
        self.page.goto(self.base)
        self.page.locator('.sidebar').get_by_role('link', name='原作者版本', exact=True).wait_for()
        for retired in ['legacy.html', 'pages', 'assets', 'site.webmanifest', 'service-worker.js']:
            with self.subTest(path=retired):
                self.assertFalse((ROOT / 'dist' / retired).exists())
                response = self.context.request.get(self.base + retired)
                self.assertEqual(response.status, 404)
        self.assertEqual(self.context.request.get(self.base + 'upstream/').status, 200)
        self.assertEqual(self.context.request.get(self.base + 'upstream/newui/').status, 200)

    def test_material_selects_preserve_search_source_and_stream_interval(self):
        self.start(1887)
        requests = []
        self.page.on('request', lambda request: requests.append(request.url) if 'keyword=' in request.url else None)
        self.page.get_by_role('button', name='搜索音乐', exact=True).click()
        self.page.get_by_label('歌曲、歌手或专辑', exact=True).fill('夜航')
        self.page.get_by_role('combobox', name='搜索来源', exact=True).click()
        self.page.get_by_role('option', name='网易云音乐', exact=True).click()
        self.page.locator('.search-dialog').get_by_role('button', name='搜索', exact=True).click()
        self.page.locator('.search-results').get_by_text('搜索结果', exact=True).wait_for()
        self.assertTrue(any('source=netease' in url for url in requests))
        self.page.locator('.search-dialog').get_by_role('button', name='关闭', exact=True).click()
        self.page.locator('.sidebar nav a[href="#/screen"]').click()
        self.page.get_by_role('combobox', name='推流帧率', exact=True).click()
        self.page.get_by_role('option', name='省流 · 1 FPS', exact=True).click()
        self.page.wait_for_function('mockSockets.at(-1).sent.some(message=>message.type==="start_screencap" && message.interval===1000)')


if __name__ == '__main__':
    unittest.main()
