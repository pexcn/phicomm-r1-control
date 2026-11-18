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

    def slider_point(self, slider, fraction):
        slider.scroll_into_view_if_needed()
        box = slider.bounding_box()
        return (box['x'] + 24 + (box['width'] - 48) * fraction,
                box['y'] + box['height'] / 2)

    def assert_slider_label(self, slider, text):
        self.page.wait_for_function("([el,text])=>el.valueLabel===text && el.hasAttribute('data-active')", arg=[slider.element_handle(), text])
        self.page.wait_for_timeout(200)
        box = slider.locator('.label').bounding_box()
        self.assertGreater(box['width'], 0)
        self.assertGreaterEqual(box['x'], 7)
        self.assertLessEqual(box['x'] + box['width'], self.page.viewport_size['width'] - 7)

    def test_slider_drag_preserves_draft_and_commits_raw_value_once(self):
        self.start()
        self.page.get_by_role('button', name='关闭提示', exact=True).click()
        slider = self.page.locator('#music-volume')
        x, y = self.slider_point(slider, .6)
        self.page.mouse.move(x, y)
        self.page.mouse.down()
        self.assert_slider_label(slider, '60%')
        self.assertFalse(any(m['type']=='set_vol' for m in self.sent()))
        self.mock_music(vol=3)
        self.page.wait_for_timeout(100)
        self.assertEqual(slider.evaluate('el=>el.value'), 18)
        self.assert_slider_label(slider, '60%')
        self.page.mouse.up()
        self.assertEqual([m for m in self.sent() if m['type']=='set_vol'], [{'type':'set_vol','vol':18}])
        self.page.wait_for_timeout(250)
        self.assertFalse(slider.evaluate('el=>el.hasAttribute("data-active")'))
        self.assertEqual(slider.locator('.label').evaluate('el=>el.getBoundingClientRect().width'), 0)
        progress = self.page.locator('#music-progress')
        x, y = self.slider_point(progress, .5)
        self.page.mouse.move(x, y)
        self.page.mouse.down()
        self.assert_slider_label(progress, '02:04')
        self.page.mouse.up()
        self.assertIn({'type':'set_position','position':124000}, self.sent())
        self.assertIn({'type':'send_message','what':4,'arg1':3,'arg2':-1,'obj':True}, self.sent())
        self.mock_music(music_info={'duration':0, 'position':0})
        self.page.wait_for_function("document.querySelector('#music-progress').disabled")
        count = len([m for m in self.sent() if m['type']=='set_position'])
        progress.click(force=True)
        self.assertFalse(progress.evaluate('el=>el.hasAttribute("data-active")'))
        self.assertEqual(len([m for m in self.sent() if m['type']=='set_position']), count)

    def test_slider_keyboard_compact_units_and_cancel(self):
        self.start(1887)
        self.page.get_by_role('button', name='关闭提示', exact=True).click()
        self.page.locator('.sidebar a[href="#/sound"]').click()
        slider = self.page.locator('#eq-band-0')
        slider.get_by_role('slider').focus()
        self.page.keyboard.down('End')
        self.assert_slider_label(slider, '+15.0 dB')
        self.page.keyboard.up('End')
        self.assertFalse(slider.evaluate('el=>el.hasAttribute("data-active")'))
        self.assertIn({'type':'set_eq_bandlevel','band':0,'level':1500}, self.sent())
        self.assertEqual(slider.locator('.handleNub').evaluate('el=>el.getBoundingClientRect().height'),32)
        mixer = self.page.locator('.mixer-card md-slider').first
        self.page.wait_for_function("!document.querySelector('.mixer-card md-slider').disabled")
        mixer.get_by_role('slider').focus()
        self.page.keyboard.press('End')
        self.page.wait_for_function("mockSockets.at(-1).audio.Mixer['DAC Digital Volume L']===251")
        self.page.wait_for_function("document.querySelector('.mixer-card md-slider').valueLabel === '+20.0 dB'")
        self.assertIn({'type':'setMixerValue','controlName':'DAC Digital Volume L','value':251}, self.sent())
        x, y = self.slider_point(slider, .4)
        count = len([m for m in self.sent() if m['type']=='set_eq_bandlevel'])
        self.page.mouse.move(x,y)
        self.page.mouse.down()
        slider.dispatch_event('pointercancel', {'pointerId':1, 'isPrimary':True})
        self.page.mouse.up()
        self.assertFalse(slider.evaluate('el=>el.hasAttribute("data-active")'))
        self.assertEqual(len([m for m in self.sent() if m['type']=='set_eq_bandlevel']), count)

    def test_slider_touch_labels_fit_mobile_dialog_and_keep_light_units(self):
        self.page.set_viewport_size({'width':320,'height':844})
        self.start()
        self.page.get_by_role('button', name='关闭提示', exact=True).click()
        progress = self.page.locator('#music-progress')
        progress.evaluate('el=>{el.scrollIntoView({block:"start"});window.scrollBy(0,-72);}')
        box = progress.bounding_box()
        fraction = progress.evaluate('el=>el.value/el.max')
        self.page.mouse.move(box['x']+24+(box['width']-48)*fraction,box['y']+box['height']/2)
        self.page.mouse.down()
        self.page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2,steps=3)
        self.assert_slider_label(progress, '02:04')
        self.assertTrue(progress.evaluate('el=>el.hasAttribute("data-below")'))
        self.assertGreaterEqual(progress.locator('.label').bounding_box()['y'],64)
        self.page.mouse.up()
        self.page.locator('.quick-card').filter(has_text='氛围灯').click()
        dialog = self.page.locator('#atmosphere-light-dialog')
        slider = dialog.locator('md-slider').first
        slider.scroll_into_view_if_needed()
        dialog.get_by_role('button', name='关闭', exact=True).click(trial=True)
        self.page.wait_for_timeout(300)
        cdp = self.context.new_cdp_session(self.page)
        try:
            cdp.send('Emulation.setTouchEmulationEnabled', {'enabled':True})
            for fraction, text in [(0,'1%'), (1,'200%')]:
                x,y = self.slider_point(slider, fraction)
                cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
                self.assert_slider_label(slider, text)
                bubble = slider.locator('.label').bounding_box()
                bounds = dialog.get_by_role('dialog').bounding_box()
                self.assertGreaterEqual(bubble['y'], bounds['y'])
                self.assertLessEqual(bubble['y']+bubble['height'], bounds['y']+bounds['height'])
                cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
                self.page.wait_for_function("!document.querySelector('#atmosphere-light-dialog md-slider').hasAttribute('data-active')")
            self.assertIn({'type':'send_message','what':4,'arg1':65,'arg2':200,'obj':''}, self.sent())
            speed = dialog.locator('md-slider').nth(1)
            x,y = self.slider_point(speed, 0)
            cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
            x,y = self.slider_point(speed, .5)
            cdp.send('Input.dispatchTouchEvent', {'type':'touchMove','touchPoints':[{'x':x,'y':y}]})
            self.assert_slider_label(speed, '50')
            cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
            self.assertIn({'type':'send_message','what':4,'arg1':66,'arg2':50,'obj':''}, self.sent())
            self.assertEqual(slider.locator('.handleNub').evaluate('el=>el.getBoundingClientRect().height'),44)
            self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),320)
        finally:
            cdp.detach()

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
        self.page.get_by_role('menuitem', name='添加音箱', exact=True).click()
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
        self.page.get_by_role('menuitem', name='添加音箱', exact=True).click()
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

    def test_auto_restart_uses_native_configuration_and_confirms_readback(self):
        self.start(1873)
        self.page.locator('.sidebar a[href="#/device"]').click()
        card = self.page.locator('.auto-restart-card')
        control = card.get_by_label('每日自动重启',exact=True)
        self.page.wait_for_function("!document.querySelector('.auto-restart-card md-switch').disabled")
        card.get_by_label('每日重启时间',exact=True).fill('04:25')
        control.click()
        card.get_by_role('button',name='保存自动重启',exact=True).click()
        card.get_by_text('已由音箱确认并保存。',exact=True).wait_for()
        commands = [m for m in self.sent() if m['type'].startswith('set_Auto_restart')]
        self.assertEqual([m['type'] for m in commands], ['set_Auto_restart_device_time','set_Auto_restart_device_open'])
        self.assertEqual(commands[0]['times'],'[4,25]')
        self.assertTrue(self.page.evaluate('mockSockets.at(-1).restart.Auto_restart_device_open'))
        self.page.locator('.sidebar nav a[href="#/music"]').click()
        self.page.locator('.sidebar a[href="#/device"]').click()
        self.assertEqual(card.get_by_label('每日重启时间',exact=True).input_value(),'04:25')
        self.page.evaluate('window.mockRestartReject=true')
        control.click()
        card.get_by_role('button',name='保存自动重启',exact=True).click()
        card.get_by_role('alert').wait_for()
        self.assertTrue(self.page.evaluate('mockSockets.at(-1).restart.Auto_restart_device_open'))
        self.assertTrue(card.get_by_role('button',name='保存自动重启',exact=True).is_disabled())
        self.page.locator('summary').filter(has_text='高级操作').click()
        self.page.once('dialog',lambda dialog:dialog.accept())
        self.page.get_by_role('button',name='重启 adbd',exact=True).click()
        self.page.get_by_role('status').filter(has_text='设备已确认重启 adbd。').wait_for()
        self.assertTrue(any(m['type']=='shell' and m['shell']=='stop adbd && start adbd && echo __R1_ADBD_OK__' for m in self.sent()))

    def test_auto_restart_stops_followup_writes_after_navigation(self):
        self.start()
        self.page.locator('.sidebar a[href="#/device"]').click()
        card=self.page.locator('.auto-restart-card')
        self.page.wait_for_function("!document.querySelector('.auto-restart-card md-switch').disabled")
        self.page.evaluate('window.mockHoldRestart=true')
        card.get_by_label('每日重启时间',exact=True).fill('05:10')
        card.get_by_label('每日自动重启',exact=True).click()
        card.get_by_role('button',name='保存自动重启',exact=True).click()
        command=next(m for m in reversed(self.sent()) if m['type']=='set_Auto_restart_device_time')
        self.page.locator('.sidebar nav a[href="#/music"]').click()
        card.wait_for(state='detached')
        self.page.evaluate('(command)=>mockSockets.at(-1).reply({type:command.type,type_id:command.type_id,code:200,data:{set_Auto_restart_device_time:true}})',command)
        self.assertFalse(any(m['type']=='set_Auto_restart_device_open' for m in self.sent()))

    def test_advanced_audio_on_1873_and_mixer_version_gate(self):
        self.start(1873)
        self.page.locator('.sidebar a[href="#/sound"]').click()
        panel=self.page.locator('.advanced-audio')
        self.page.wait_for_function("!document.querySelector('.advanced-audio md-switch').disabled")
        self.assertTrue(panel.locator('.mixer-card md-slider').first.evaluate('el=>el.disabled'))
        panel.locator('.effect-card').nth(0).locator('md-slider').evaluate("el=>{el.value=650;el.dispatchEvent(new Event('change',{bubbles:true}));}")
        self.page.wait_for_function('mockSockets.at(-1).audio.bass.Current_Strength===650')
        panel.get_by_text('低音增强强度 · 65 %',exact=True).wait_for()
        panel.locator('.effect-card').nth(1).locator('md-slider').evaluate("el=>{el.value=-1200;el.dispatchEvent(new Event('change',{bubbles:true}));}")
        panel.get_by_text('响度增益 · -12.0 dB',exact=True).wait_for()
        panel.get_by_label('启用低音增强',exact=True).click()
        self.page.wait_for_function('!mockSockets.at(-1).audio.bass.sound_effects_bass_enable')
        self.page.wait_for_function("!document.querySelector('.advanced-audio md-switch').disabled")
        self.assertTrue(panel.locator('.effect-card').nth(0).locator('md-slider').evaluate('el=>el.disabled'))
        panel.get_by_label('启用 DSP 低音增强',exact=True).click()
        panel.get_by_text('DSP 固件报告增强生效中。',exact=True).wait_for()
        self.assertIn({'type':'send_message','what':16384,'arg1':100,'arg2':0,'obj':1},self.sent())
        self.assertFalse(any(m['type']=='setMixerValue' for m in self.sent()))

    def test_advanced_audio_mixer_and_unsupported_state_in_mobile_layout(self):
        self.page.set_viewport_size({'width':320,'height':844})
        self.start(1887)
        self.page.locator('.bottom-nav a[href="#/sound"]').click()
        panel=self.page.locator('.advanced-audio')
        self.page.wait_for_function("!document.querySelector('.mixer-card md-slider').disabled")
        panel.locator('.mixer-card md-slider').nth(1).evaluate("el=>{el.value=237;el.dispatchEvent(new Event('change',{bubbles:true}));}")
        self.page.wait_for_function("mockSockets.at(-1).audio.Mixer['DAC Digital Volume R']===237")
        panel.get_by_text('高音分路 · 6 dB',exact=True).wait_for()
        self.assertIn({'type':'setMixerValue','controlName':'DAC Digital Volume R','value':237},self.sent())
        self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),320)
        self.page.evaluate('window.mockNoEffects=true;window.mockNoDsp=true')
        panel.get_by_role('button',name='重新读取高级音效',exact=True).click()
        panel.get_by_role('button',name='重新读取 DSP',exact=True).click()
        self.page.wait_for_function("document.querySelector('.advanced-audio md-switch').disabled && document.querySelector('.dsp-card md-switch').disabled")
        self.assertEqual(panel.get_by_text('设备未提供此音效配置。',exact=True).count(),2)

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
        for retired in ['legacy.html', 'pages', 'assets']:
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


    def set_material_value(self, selector, value, event='change'):
        self.page.locator(selector).evaluate('''(element, args) => {
          element.value = args.value;
          element.dispatchEvent(new Event(args.event, {bubbles: true}));
        }''', {'value': value, 'event': event})

    def add_saved_device(self, address='192.0.2.20', name='卧室音箱', connect=False):
        self.page.get_by_role('button', name='选择或连接音箱', exact=True).click()
        self.page.get_by_role('menuitem', name='添加音箱', exact=True).click()
        self.page.get_by_label('设备名称（可选）', exact=True).fill(name)
        self.page.get_by_label('音箱地址', exact=True).fill(address)
        self.page.locator('#connection-dialog').get_by_role('button', name='连接' if connect else '保存', exact=True).click()

    def open_device_manager(self):
        self.page.get_by_role('button', name='选择或连接音箱', exact=True).click()
        self.page.get_by_role('menuitem', name='管理设备', exact=True).click()
        self.page.get_by_role('dialog', name='管理设备', exact=True).wait_for()

    def test_device_picker_saves_switches_and_keeps_only_one_control_connection(self):
        self.start(1887)
        self.add_saved_device()
        self.assertEqual(self.page.evaluate('mockSockets.length'), 1)
        self.page.get_by_role('button', name='选择或连接音箱', exact=True).click()
        menu = self.page.locator('#device-menu')
        self.assertEqual(menu.locator('.current-device').count(), 1)
        menu.locator('md-menu-item').filter(has_text='卧室音箱').click()
        self.page.wait_for_function('mockSockets.length===2 && mockSockets[1].readyState===1')
        self.assertEqual(self.page.evaluate('mockSockets[0].readyState'), 3)
        self.assertEqual(self.page.evaluate('mockSockets.filter(s=>s.readyState===1).length'), 1)
        self.assertEqual(self.page.locator('.connection-label').inner_text(), '卧室音箱')
        old_sent = self.page.evaluate('mockSockets[0].sent')
        self.assertFalse(any(m.get('what')==4 and m.get('arg1')==2 for m in old_sent))
        self.page.get_by_role('button', name='选择或连接音箱', exact=True).click()
        menu.locator('md-menu-item').filter(has_text='卧室音箱').click()
        self.page.wait_for_function('!document.querySelector("#device-menu").open')
        self.page.wait_for_function('getComputedStyle(document.querySelector("#device-menu").shadowRoot.querySelector(".menu")).display === "none"')
        self.assertEqual(self.page.evaluate('mockSockets.length'), 2)
        self.page.get_by_role('button', name='选择或连接音箱', exact=True).click()
        self.page.get_by_role('menuitem', name='添加音箱', exact=True).wait_for()
        self.page.keyboard.press('Escape')
        self.page.wait_for_function('document.querySelector(".connection-chip").getAttribute("aria-expanded") === "false"')
        self.page.reload()
        self.page.get_by_role('heading', name='夜航', exact=True).wait_for()
        self.assertEqual(self.page.evaluate('mockSockets[0].url'), 'ws://192.0.2.20:8080/')
        self.assertEqual(self.page.locator('.connection-label').inner_text(), '卧室音箱')

        self.page.get_by_role('button', name='选择或连接音箱', exact=True).click()
        self.page.get_by_role('menuitem', name='断开连接', exact=True).click()
        self.page.get_by_role('main').get_by_role('button', name='连接音箱', exact=True).wait_for()
        self.page.reload()
        self.page.get_by_role('main').get_by_role('button', name='连接音箱', exact=True).wait_for()
        self.assertEqual(self.page.evaluate('mockSockets.length'), 0)

    def test_device_profile_alias_and_proxy_address_editing(self):
        address = 'wss://speaker.example/room/ws?key=a%2Fb'
        self.start(1887, address)
        self.open_device_manager()
        manager = self.page.locator('#device-manager-dialog')
        self.assertNotIn('key=', manager.inner_text())
        manager.get_by_role('button', name='编辑 客厅音箱', exact=True).click()
        self.page.get_by_label('设备名称（可选）', exact=True).fill('我的客厅')
        self.assertEqual(self.page.get_by_label('音箱地址', exact=True).input_value(), address)
        self.page.locator('#connection-dialog').get_by_role('button', name='保存', exact=True).click()
        self.assertEqual(self.page.evaluate('mockSockets.length'), 1)
        self.page.wait_for_function('document.querySelector(".connection-label").textContent === "我的客厅"')
        self.assertFalse(any(m.get('what')==2 for m in self.sent()))
        self.open_device_manager()
        manager.get_by_role('button', name='编辑 我的客厅', exact=True).click()
        self.page.get_by_label('音箱地址', exact=True).fill('192.0.2.30')
        self.assertEqual(self.page.locator('#connection-dialog').get_by_role('button', name='保存', exact=True).count(), 0)
        self.page.locator('#connection-dialog').get_by_role('button', name='保存并重新连接', exact=True).click()
        self.page.wait_for_function('mockSockets.length===2 && mockSockets.at(-1).readyState===1')
        self.assertEqual(self.page.evaluate('mockSockets.at(-1).url'), 'ws://192.0.2.30:8080/')
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('phicomm-r1:web:devices')).length"), 1)

    def test_device_profile_rejects_duplicates_and_forgetting_never_resurrects_history(self):
        self.start()
        self.add_saved_device('ws://192.0.2.10:8080/', '重复设备')
        self.page.locator('#connection-dialog').get_by_role('alert').filter(has_text='该地址已保存').wait_for()
        self.assertEqual(self.page.evaluate('mockSockets.length'), 1)
        self.page.locator('#connection-dialog').get_by_role('button', name='取消', exact=True).click()
        self.add_saved_device()
        self.page.on('dialog', lambda dialog: dialog.accept())
        self.open_device_manager()
        manager = self.page.locator('#device-manager-dialog')
        manager.get_by_role('button', name='移除 卧室音箱', exact=True).click()
        self.assertEqual(self.page.evaluate('mockSockets[0].readyState'), 1)
        manager.get_by_role('button', name='移除 客厅音箱', exact=True).click()
        self.assertEqual(self.page.evaluate('mockSockets[0].readyState'), 3)
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('phicomm-r1:web:devices'))"), [])
        self.page.reload()
        self.page.get_by_role('main').get_by_role('button', name='连接音箱', exact=True).wait_for()
        self.assertEqual(self.page.evaluate('mockSockets.length'), 0)

    def test_device_profile_migrates_legacy_address_and_ignores_stale_connect_attempt(self):
        self.page.goto(self.base)
        self.page.evaluate("localStorage.setItem('phicomm-r1:web:address', JSON.stringify('192.0.2.10'))")
        self.page.reload()
        self.page.get_by_role('heading', name='夜航', exact=True).wait_for()
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('phicomm-r1:web:devices')).length"), 1)
        self.page.evaluate('window.mockHoldConnect=true')
        self.add_saved_device(connect=True)
        self.page.wait_for_function('mockSockets.length===2')
        self.assertEqual(self.page.locator('.connection-chip.online').count(), 0)
        self.page.reload()
        self.page.get_by_role('heading', name='夜航', exact=True).wait_for()
        self.assertEqual(self.page.evaluate('mockSockets[0].url'), 'ws://192.0.2.10:8080/')
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('phicomm-r1:web:devices')).length"), 2)

    def test_device_picker_mobile_sheet_and_keyboard_do_not_control_speaker(self):
        self.start()
        self.add_saved_device()
        self.page.locator('.sidebar nav a[href="#/screen"]').click()
        self.page.get_by_role('heading', name='屏幕', exact=True).wait_for()
        self.page.set_viewport_size({'width':320, 'height':844})
        self.page.locator('#device-sheet').wait_for(state='attached')
        self.page.get_by_role('button', name='选择或连接音箱', exact=True).click()
        sheet = self.page.locator('#device-sheet').get_by_role('dialog')
        sheet.wait_for()
        self.page.wait_for_function('!document.querySelector("#device-sheet").shadowRoot.querySelector("dialog").getAnimations().some(a=>a.playState==="running")')
        box = sheet.bounding_box()
        self.assertAlmostEqual(box['y']+box['height'], 844, delta=2)
        self.assertGreaterEqual(box['x'],0)
        self.assertLessEqual(box['width'],320)
        commands = [m for m in self.sent() if m['type']=='send_message']
        self.page.keyboard.press('ArrowDown')
        self.page.keyboard.press('Escape')
        sheet.wait_for(state='hidden')
        self.assertEqual([m for m in self.sent() if m['type']=='send_message'],commands)
        self.page.get_by_role('button', name='选择或连接音箱', exact=True).click()
        self.page.locator('#device-sheet .sheet-device').filter(has_text='卧室音箱').click()
        self.page.wait_for_function('mockSockets.length===2 && mockSockets.at(-1).readyState===1')
        self.assertEqual(self.page.locator('.connection-label').inner_text(),'卧室音箱')
        self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),320)

    def test_background_reconnect_does_not_close_an_unrelated_device_editor(self):
        self.start()
        self.add_saved_device()
        self.page.evaluate('window.mockHoldConnect=true; mockSockets[0].close()')
        self.open_device_manager()
        self.page.locator('#device-manager-dialog').get_by_role('button', name='编辑 卧室音箱', exact=True).click()
        self.page.wait_for_function('mockSockets.length===2')
        self.page.evaluate('mockSockets[1].readyState=1; mockSockets[1].onopen()')
        self.page.get_by_role('dialog', name='编辑音箱', exact=True).wait_for()
        self.assertEqual(self.page.get_by_label('音箱地址', exact=True).input_value(),'ws://192.0.2.20:8080/')

    def test_device_profile_retry_reuses_the_newly_saved_record(self):
        self.start()
        self.page.evaluate('window.mockHoldConnect=true')
        self.add_saved_device(connect=True)
        self.page.wait_for_function('mockSockets.length===2')
        saved = self.page.evaluate("JSON.parse(localStorage.getItem('phicomm-r1:web:devices'))")
        self.page.locator('#connection-dialog').get_by_role('button', name='取消连接', exact=True).click()
        self.page.evaluate('window.mockHoldConnect=false')
        self.page.locator('#connection-dialog').get_by_role('button', name='连接', exact=True).click()
        self.page.wait_for_function('mockSockets.length===3 && mockSockets.at(-1).readyState===1')
        self.assertEqual(self.page.locator('.connection-label').inner_text(),'卧室音箱')
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('phicomm-r1:web:devices')).map(d=>d.id)"), [device['id'] for device in saved])

    def test_pwa_install_action_uses_browser_prompt(self):
        self.page.goto(self.base)
        self.page.evaluate('''() => {
          const event = new Event('beforeinstallprompt', {cancelable:true});
          event.prompt = async () => { window.installRequested = true; };
          event.userChoice = Promise.resolve({outcome:'accepted'});
          window.dispatchEvent(event);
        }''')
        self.page.get_by_role('button', name='打开设置', exact=True).click()
        self.page.get_by_role('button', name='安装应用', exact=True).click()
        self.assertTrue(self.page.evaluate('window.installRequested'))
        self.page.get_by_text('已接受安装，请按浏览器提示完成。', exact=True).wait_for()

    def test_device_music_source_and_quality_use_device_readback(self):
        self.start(1887)
        self.set_material_value('#device-music-source', 'netease')
        self.page.get_by_text('已由音箱回读确认。', exact=True).wait_for()
        self.page.wait_for_function('document.querySelector("#device-music-source").value === "netease"')
        self.set_material_value('#playback-quality', '3')
        self.page.wait_for_function('document.querySelector("#playback-quality").value === "3"')
        self.assertTrue(any(m.get('what') == 65536 and m.get('arg2') == 4 and m.get('obj') == 'netease' for m in self.sent()))
        self.assertTrue(any(m['type'] == 'switch_quality' and m['quality'] == 3 for m in self.sent()))
        self.mock_music(Unisound=False, Support_Flac=False)
        self.page.wait_for_function('document.querySelector("#device-music-source").disabled')
        self.assertFalse(self.page.locator('#playback-engine').evaluate('(element)=>element.disabled'))
        self.assertEqual(self.page.locator('#playback-quality md-select-option').count(), 2)

    def test_source_relay_ack_does_not_claim_applied_setting(self):
        self.start(1887)
        self.page.evaluate('window.mockSourceUnchanged=true')
        self.set_material_value('#device-music-source', 'kuwo')
        self.page.get_by_role('alert').filter(has_text='设备尚未回报目标设置').wait_for()
        self.assertEqual(self.page.locator('#device-music-source').evaluate('(element)=>element.value'), 'qq')

    def test_engine_change_reboots_only_after_device_ack(self):
        self.start(1887)
        self.page.on('dialog', lambda dialog: dialog.accept())
        self.page.evaluate('window.mockPlaybackReject=true')
        self.set_material_value('#playback-engine', '1')
        self.page.locator('.playback-settings [role="alert"]').wait_for()
        self.assertFalse(any(m['type'] == 'reboot_echo' for m in self.sent()))
        self.page.evaluate('window.mockPlaybackReject=false')
        self.set_material_value('#playback-engine', '1')
        self.page.wait_for_function('mockSockets.at(-1).sent.some(m=>m.type==="reboot_echo")')
        types = [m['type'] for m in self.sent()]
        self.assertLess(types.index('switch_player'), types.index('reboot_echo'))

    def open_miplay(self):
        self.page.locator('.sidebar nav a[href="#/device"]').click()
        self.page.get_by_role('button', name='MiPlay 控制与诊断', exact=True).click()
        self.page.locator('#miplay-queue').wait_for()

    def test_miplay_local_and_remote_tuning_and_readback(self):
        self.start(1887)
        self.mock_music(Unisound=False)
        self.open_miplay()
        dialog = self.page.locator('#miplay-dialog')
        dialog.get_by_role('button', name='左声道', exact=True).click()
        dialog.get_by_text('已由目标音箱回读确认并保存。', exact=True).wait_for()
        self.set_material_value('#miplay-delay', '-30', 'input')
        dialog.get_by_role('button', name='保存同步延迟', exact=True).click()
        self.page.wait_for_function('mockSockets.at(-1).miPlay.sync_delay_ms === -30')
        self.page.wait_for_function('!document.querySelector("#miplay-target").disabled && !document.querySelector("#miplay-delay").disabled')
        self.set_material_value('#miplay-target', 'remote')
        self.set_material_value('#miplay-ip', '192.0.2.11', 'input')
        dialog.get_by_role('button', name='重新读取诊断', exact=True).click()
        self.page.wait_for_function('document.querySelector("#miplay-queue")?.value === "900"')
        self.set_material_value('#miplay-queue', '1100', 'input')
        dialog.get_by_role('button', name='保存队列目标', exact=True).click()
        dialog.get_by_text('已由目标音箱回读确认并保存。', exact=True).wait_for()
        message = next(m for m in self.sent() if m['type'] == 'Set_MiPlay_Remote_Tuning')
        self.assertEqual((message['ip'], message['queue_target_ms']), ('192.0.2.11', 1100))

    def test_miplay_missing_capability_and_unconfirmed_write(self):
        self.start(1887)
        self.page.evaluate('window.mockMiPlayMissingSync=true; window.mockMiPlayUnchanged=true')
        self.open_miplay()
        self.assertTrue(self.page.locator('#miplay-delay').evaluate('(element)=>element.disabled'))
        self.page.locator('#miplay-dialog').get_by_role('button', name='左声道', exact=True).click()
        self.page.get_by_role('alert').filter(has_text='目标音箱回读未确认设置').wait_for()
        self.assertEqual(self.page.locator('#miplay-queue').count(), 0)

    def test_miplay_target_change_discards_inflight_write(self):
        self.start(1887)
        self.open_miplay()
        self.page.evaluate('window.mockHoldMiPlay=true')
        self.page.locator('#miplay-dialog').get_by_role('button', name='左声道', exact=True).click()
        self.set_material_value('#miplay-target', 'remote')
        self.page.evaluate('''() => {
          const socket = mockSockets.at(-1);
          const message = socket.sent.find(m=>m.type==='Set_MiPlay_Channel');
          socket.reply({type:message.type,type_id:message.type_id,code:200,data:{}});
        }''')
        self.page.wait_for_timeout(150)
        sent = self.sent()
        index = next(i for i, m in enumerate(sent) if m['type'] == 'Set_MiPlay_Channel')
        self.assertFalse(any(m['type'] == 'Get_MiPlay_Diag' for m in sent[index+1:]))

    def test_cast_mode_and_bluetooth_background_permission(self):
        self.start(1887)
        self.page.locator('.sidebar nav a[href="#/device"]').click()
        self.page.get_by_role('switch', name='蓝牙后台服务', exact=True).click()
        self.page.wait_for_function('mockSockets.at(-1).sent.some(m=>m.type==="Set_Bluetooth_Open" && m.open===false)')
        self.page.get_by_role('switch', name='投放连接模式', exact=True).click()
        self.page.wait_for_function('mockSockets.at(-1).sent.some(m=>m.what===64 && m.arg1===1)')
        self.page.wait_for_function('document.querySelector("#cast-connection-mode").selected')

    def test_old_device_does_not_offer_unreported_miplay_or_bluetooth_permission(self):
        self.start(1873)
        self.page.locator('.sidebar nav a[href="#/device"]').click()
        self.assertTrue(self.page.get_by_role('button', name='MiPlay 控制与诊断', exact=True).is_disabled())
        self.assertTrue(self.page.get_by_role('switch', name='蓝牙后台服务', exact=True).is_disabled())
        self.assertFalse(any('MiPlay' in m['type'] for m in self.sent()))


if __name__ == '__main__':
    unittest.main()
