import unittest

from app import mask_data


class MaskDataTests(unittest.TestCase):
    def test_dob(self):
        cases = (
            ('DOB:25/12/2549', 'DOB:XX/XX/25XX'),
            ('DOB: 25/12/2549', 'DOB: XX/XX/25XX'),
            ('DOB:\t25/12/2549', 'DOB:\tXX/XX/25XX'),
            ('25/12/2549', '25/12/2549'),
            ('DOB:25/12/25490', 'DOB:25/12/25490'),
            ('DOB:\n25/12/2549', 'DOB:\n25/12/2549'),
        )
        for text, expected in cases:
            with self.subTest(text=text):
                self.assertEqual(mask_data(text), expected)

    def test_phone(self):
        for text in ('093-245-7894', '0932457894'):
            with self.subTest(text=text):
                self.assertEqual(mask_data(text), 'XXX-XXX-7894')

    def test_existing_card_email(self):
        cases = (
            ('1234-5678-9012-3456', 'XXXX-XXXX-XXXX-3456'),
            ('1234567890123456', 'XXXX-XXXX-XXXX-3456'),
            ('somchai.d@company.com', 's*******d@company.com'),
        )
        for text, expected in cases:
            with self.subTest(text=text):
                self.assertEqual(mask_data(text), expected)
