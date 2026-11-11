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
