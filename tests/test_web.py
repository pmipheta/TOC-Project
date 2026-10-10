import unittest
from html.parser import HTMLParser

from app import app


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.elements = {}
        self.scripts = []
        self.code = []
        self.summary = []
        self.pre = []
        self.current_text_tag = None
        self.textareas = {}
        self.current_link = None
        self.current_textarea = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.elements[attrs['id']] = {'tag': tag, 'attrs': attrs}
        if tag == 'script':
            self.scripts.append(attrs)
        if tag in ('code', 'summary', 'pre'):
            getattr(self, tag).append('')
            self.current_text_tag = tag
        if tag == 'a':
            self.links.append({'href': attrs.get('href'), 'text': ''})
            self.current_link = self.links[-1]
        elif tag == 'textarea':
            self.current_textarea = attrs.get('id')
            self.textareas[self.current_textarea] = ''

    def handle_data(self, data):
        if self.current_text_tag:
            getattr(self, self.current_text_tag)[-1] += data
        if self.current_link is not None:
            self.current_link['text'] += data
        if self.current_textarea is not None:
            self.textareas[self.current_textarea] += data

    def handle_endtag(self, tag):
        if tag == self.current_text_tag:
            self.current_text_tag = None
        if tag == 'a':
            self.current_link = None
        elif tag == 'textarea':
            self.current_textarea = None


class WebTests(unittest.TestCase):
    def test_result_views(self):
        with app.test_client() as client:
            for response in (client.get('/'), client.post('/mask', data={'data': ''})):
                page = PageParser()
                page.feed(response.get_data(as_text=True))
                self.assertNotIn('result-view-toggle', page.elements)
            text = '\nDOB:25/12/2549\n<script>alert(1)</script>\n'
            response = client.post('/mask', data={'data': text})
        page = PageParser()
        html = response.get_data(as_text=True)
        page.feed(html)
        self.assertIn('result-view-toggle', page.elements)
        attrs = page.elements['result-view-toggle']['attrs']
        self.assertEqual(attrs['type'], 'button')
        self.assertEqual(attrs['aria-pressed'], 'false')
        self.assertEqual(attrs['aria-controls'], 'result-text result-categories')
        self.assertIn('hidden', attrs)
        self.assertIn('hidden', page.elements['result-categories']['attrs'])
        self.assertIn('hidden', page.elements['mask_text']['attrs'])
        self.assertEqual(page.pre, [text.replace('25/12/2549', 'XX/XX/25XX')])
        self.assertNotIn('<script>', html)

    def test_copy_control(self):
        with app.test_client() as client:
            for response in (client.get('/'), client.post('/mask', data={'data': ''})):
                page = PageParser()
                page.feed(response.get_data(as_text=True))
                self.assertNotIn('copy-result-btn', page.elements)
            response = client.post('/mask', data={'data': 'DOB:25/12/2549'})
        page = PageParser()
        page.feed(response.get_data(as_text=True))
        self.assertIn('copy-result-btn', page.elements)
        button = page.elements['copy-result-btn']
        self.assertEqual(button['tag'], 'button')
        self.assertEqual(button['attrs']['type'], 'button')
        self.assertIn('hidden', button['attrs'])
        self.assertIn('readonly', page.elements['mask_text']['attrs'])

    def test_regex_guide(self):
        patterns = (
            r'\b\d{4}-\d{4}-\d{4}-(\d{4})\b',
            r'\b\d{4}\d{4}\d{4}(\d{4})\b',
            r'XXXX-XXXX-XXXX-\1',
            r'\b\d{3}-\d{3}-(\d{4})\b',
            r'\b\d{3}\d{3}(\d{4})\b',
            r'XXX-XXX-\1',
            r'\b([a-zA-Z0-9._%+-])([a-zA-Z0-9._%+-]+)([a-zA-Z0-9._%+-])@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b',
            r'(DOB:[ \t]*)\d{2}/\d{2}/(\d{2})\d{2}(?!\d)',
            r'\g<1>XX/XX/\g<2>XX',
            r'(Address:[ \t]*)\d+(?:/\d+)*(?=\s|$)',
            r'\g<1>XXX',
            'mask_email',
        )
        with app.test_client() as client:
            responses = (client.get('/'), client.post('/mask', data={'data': 'abc'}))
        for response in responses:
            with self.subTest(response=response):
                self.assertEqual(response.status_code, 200)
                page = PageParser()
                html = response.get_data(as_text=True)
                page.feed(html)
                self.assertIn('regex-guide', page.elements)
                guide = page.elements['regex-guide']
                self.assertEqual(guide['tag'], 'details')
                self.assertNotIn('open', guide['attrs'])
                self.assertIn('Regex ทำงานอย่างไร', page.summary)
                for pattern in patterns:
                    self.assertIn(pattern, page.code)
                for text in ('บัตรเครดิต', 'อีเมล', 'โทรศัพท์', 'วันเกิด', 'ที่อยู่',
                             'เก็บตัวแรกและตัวสุดท้าย', 'โดเมน',
                             'แทนตัวกลางด้วย * ตามจำนวน', 'ไม่ตรวจวันจริง',
                             'ไม่แปลงปี', 'ตัวเลขหรือเลขคั่น /',
                             'ไม่ครอบคลุมข้อมูลส่วนบุคคลทุกชนิด'):
                    self.assertIn(text, html)

    def test_example_controls(self):
        with app.test_client() as client:
            responses = (client.get('/'), client.post('/mask', data={'data': 'abc'}))
        for response in responses:
            with self.subTest(response=response):
                self.assertEqual(response.status_code, 200)
                page = PageParser()
                html = response.get_data(as_text=True)
                page.feed(html)
                self.assertIn('load-example-btn', page.elements)
                button = page.elements['load-example-btn']
                self.assertEqual(button['tag'], 'button')
                self.assertEqual(button['attrs']['type'], 'button')
                self.assertIn('hidden', button['attrs'])
                self.assertIn('โหลดตัวอย่าง', html)
                status = page.elements['action-status']['attrs']
                self.assertEqual(status['role'], 'status')
                self.assertEqual(status['aria-live'], 'polite')
                self.assertTrue(any(s.get('src') == '/static/app.js' and 'defer' in s
                                    for s in page.scripts))

    def test_example_masking(self):
        original = '\n'.join((
            '1234-5678-9012-3456', 'somchai.d@company.com', '093-245-7894',
            'DOB:25/12/2549', 'Address: 689 ซอยลาดกระบัง 19 ถนนลาดกระบัง',
        ))
        expected = '\n'.join((
            'XXXX-XXXX-XXXX-3456', 's*******d@company.com', 'XXX-XXX-7894',
            'DOB:XX/XX/25XX', 'Address: XXX ซอยลาดกระบัง 19 ถนนลาดกระบัง',
        ))
        with app.test_client() as client:
            response = client.post('/mask', data={'data': original})
        self.assertEqual(response.status_code, 200)
        page = PageParser()
        page.feed(response.get_data(as_text=True))
        self.assertEqual(page.textareas['data'], original)
        self.assertEqual(page.textareas['mask_text'], expected)

    def test_combined_output(self):
        original = '\n'.join((
            '1234-5678-9012-3456',
            'somchai.d@company.com',
            '093-245-7894',
            'DOB:25/12/2549',
            'Address: 689 ซอยลาดกระบัง 19 ถนนลาดกระบัง แขวงลาดกระบัง เขตลาดกระบัง กรุงเทพฯ',
        ))
        expected = '\n'.join((
            'XXXX-XXXX-XXXX-3456',
            's*******d@company.com',
            'XXX-XXX-7894',
            'DOB:XX/XX/25XX',
            'Address: XXX ซอยลาดกระบัง 19 ถนนลาดกระบัง แขวงลาดกระบัง เขตลาดกระบัง กรุงเทพฯ',
        ))
        with app.test_client() as client:
            response = client.post('/mask', data={'data': original})
        self.assertEqual(response.status_code, 200)
        page = PageParser()
        page.feed(response.get_data(as_text=True))
        self.assertEqual(page.textareas['data'], original)
        self.assertEqual(page.textareas['mask_text'], expected)

    def test_html_escaping(self):
        original = '<script>alert(1)</script> DOB:25/12/2549'
        with app.test_client() as client:
            response = client.post('/mask', data={'data': original})
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertNotIn('<script>', html)
        page = PageParser()
        page.feed(html)
        self.assertEqual(page.textareas['data'], original)
        self.assertEqual(
            page.textareas['mask_text'],
            '<script>alert(1)</script> DOB:XX/XX/25XX',
        )

    def test_source_link(self):
        with app.test_client() as client:
            responses = (
                client.get('/'),
                client.post('/mask', data={'data': 'DOB:25/12/2549'}),
            )
        for method, response in zip(('GET', 'POST'), responses):
            with self.subTest(method=method):
                self.assertEqual(response.status_code, 200)
                page = PageParser()
                page.feed(response.get_data(as_text=True))
                self.assertIn(
                    {'href': 'https://github.com/pmipheta/TOC-Project',
                     'text': 'Source code on GitHub'},
                    page.links,
                )
