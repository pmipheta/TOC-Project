import json
import re
import unittest
from pathlib import Path

from app import app
import app as module


class HighlightTests(unittest.TestCase):
    def test_spans_and_unicode(self):
        text = '🙂 hello 1234567890123456 DOB: 25/12/2549 Address: 689/12 ถนน test@example.com'
        result = module.mask_with_highlights(text)
        self.assertEqual(result['text'], '🙂 hello XXXX-XXXX-XXXX-3456 DOB: XX/XX/25XX Address: XXX ถนน t**t@example.com')
        self.assertEqual([text[s['start']:s['end']] for s in result['input_spans']],
                         ['1234567890123456', 'DOB: 25/12/2549', 'Address: 689/12', 'test@example.com'])
        self.assertEqual([result['text'][s['start']:s['end']] for s in result['output_spans']],
                         ['XXXX-XXXX-XXXX-3456', 'DOB: XX/XX/25XX', 'Address: XXX', 't**t@example.com'])

    def test_no_match_and_all_existing_cases(self):
        from test_regex_100 import CASES
        for text, expected in [case for cases in CASES.values() for case in cases]:
            result = module.mask_with_highlights(text)
            self.assertEqual(result['text'], expected)
            for key, value in [('input_spans', text), ('output_spans', expected)]:
                end = 0
                for span in result[key]:
                    self.assertGreaterEqual(span['start'], end)
                    self.assertLessEqual(span['end'], len(value))
                    self.assertLess(span['start'], span['end'])
                    end = span['end']
        for text in ['nothing', 'a@site.com ab@site.com', 'XXXX-XXXX-XXXX-3456 DOB:XX/XX/25XX']:
            self.assertEqual(module.mask_with_highlights(text)['input_spans'], [])

    def test_endpoint_validation(self):
        client = app.test_client()
        response = client.post('/highlight', json={'text': '🙂 0932457894'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, {'input_spans': [{'start': 2, 'end': 12, 'kind': 'phone'}]})
        for payload in [{}, {'text': None}, {'text': 2}, [], 'text']:
            self.assertEqual(client.post('/highlight', json=payload).status_code, 400)
        self.assertEqual(client.post('/highlight', data='{', content_type='application/json').status_code, 400)
        self.assertEqual(client.post('/highlight', data='raw').status_code, 415)

    def test_long_log_and_metadata(self):
        fixtures = Path(__file__).parent / 'fixtures'
        text = (fixtures / 'long_log.txt').read_text(encoding='utf-8')
        expected = (fixtures / 'long_log_masked.txt').read_text(encoding='utf-8')
        examples = json.loads((fixtures.parent.parent / 'static/examples.json').read_text(encoding='utf-8'))
        self.assertEqual(examples['long_log'], text)
        self.assertEqual(module.mask_data(text), expected)
        from test_web import PageParser
        response = app.test_client().post('/mask', data={'data': text})
        parser = PageParser()
        parser.feed(response.get_data(as_text=True))
        self.assertEqual(parser.textareas['data'], text)
        self.assertEqual(parser.textareas['mask_text'], expected)
        self.assertIn('highlight-data', parser.elements)
        self.assertIn('clear-input-btn', parser.elements)

    def test_metadata_script_escape(self):
        html = app.test_client().post('/mask', data={'data': '</script><script>alert(1)</script> DOB:25/12/2549'}).get_data(as_text=True)
        self.assertNotIn('<script>alert(1)', html)

    def test_form_newlines_use_browser_display_offsets(self):
        from test_web import PageParser
        text = '\r\n🙂 line\r\nDOB:25/12/2549\r\n0932457894'
        response = app.test_client().post('/mask', data={'data': text})
        page = PageParser()
        page.feed(response.get_data(as_text=True))
        normalized = text.replace('\r\n', '\n')
        self.assertEqual(page.textareas['data'], normalized)
        self.assertEqual(page.textareas['mask_text'], module.mask_data(normalized))
        match = re.search(r'<script id="highlight-data" type="application/json">(.*?)</script>', response.get_data(as_text=True), re.S)
        metadata = json.loads(match.group(1))
        self.assertEqual(metadata['input_spans'], module.mask_with_highlights(normalized)['input_spans'])
        self.assertEqual(module.mask_data(text), '\r\n🙂 line\r\nDOB:XX/XX/25XX\r\nXXX-XXX-7894')

    def test_overlapping_rules_merge_and_many_matches(self):
        text = '1234567890123456@example.com'
        result = module.mask_with_highlights(text)
        self.assertEqual(result['input_spans'], [{'start': 0, 'end': len(text), 'kind': 'card'}])
        self.assertEqual(result['output_spans'], [{'start': 0, 'end': len(result['text']), 'kind': 'card'}])
        repeated = module.mask_with_highlights('0932457894\n' * 2000)
        self.assertEqual(len(repeated['input_spans']), 2000)
        self.assertEqual(len(repeated['output_spans']), 2000)
