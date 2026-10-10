import unittest
from html.parser import HTMLParser

from app import app


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.elements = {}
        self.scripts = []
        self.textareas = {}
        self.current_link = None
        self.current_textarea = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.elements[attrs['id']] = {'tag': tag, 'attrs': attrs}
        if tag == 'script':
            self.scripts.append(attrs)
        if tag == 'a':
            self.links.append({'href': attrs.get('href'), 'text': ''})
            self.current_link = self.links[-1]
        elif tag == 'textarea':
            self.current_textarea = attrs.get('id')
            self.textareas[self.current_textarea] = ''

    def handle_data(self, data):
        if self.current_link is not None:
            self.current_link['text'] += data
        if self.current_textarea is not None:
            self.textareas[self.current_textarea] += data

    def handle_endtag(self, tag):
        if tag == 'a':
            self.current_link = None
        elif tag == 'textarea':
            self.current_textarea = None


class WebTests(unittest.TestCase):
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
