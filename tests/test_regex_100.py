import unittest
from contextlib import redirect_stdout
from io import StringIO

from app import app, mask_data
from test_web import PageParser


# Explicit expected values keep the tests independent of the masking regexes.
CASES = {
    'card': (
        ('1234-5678-9012-3456', 'XXXX-XXXX-XXXX-3456'),
        ('1234567890123456', 'XXXX-XXXX-XXXX-3456'),
        ('0000-0000-0000-0000', 'XXXX-XXXX-XXXX-0000'),
        ('0000000000000000', 'XXXX-XXXX-XXXX-0000'),
        ('9999-9999-9999-9999', 'XXXX-XXXX-XXXX-9999'),
        ('Card: 1111-2222-3333-4444', 'Card: XXXX-XXXX-XXXX-4444'),
        ('(1111222233334444)', '(XXXX-XXXX-XXXX-4444)'),
        ('1111-2222-3333-4444.', 'XXXX-XXXX-XXXX-4444.'),
        ('1111-2222-3333-4444\n5555666677778888', 'XXXX-XXXX-XXXX-4444\nXXXX-XXXX-XXXX-8888'),
        ('1111222233334444 5555666677778888', 'XXXX-XXXX-XXXX-4444 XXXX-XXXX-XXXX-8888'),
        ('123456789012345', '123456789012345'),
        ('12345678901234567', '12345678901234567'),
        ('1234-5678-9012-345', '1234-5678-9012-345'),
        ('1234-5678-9012-34567', '1234-5678-9012-34567'),
        ('1234 5678 9012 3456', '1234 5678 9012 3456'),
        ('1234/5678/9012/3456', '1234/5678/9012/3456'),
        ('A1234567890123456', 'A1234567890123456'),
        ('1234567890123456Z', '1234567890123456Z'),
    ),
    'phone': (
        ('093-245-7894', 'XXX-XXX-7894'),
        ('0932457894', 'XXX-XXX-7894'),
        ('000-000-0000', 'XXX-XXX-0000'),
        ('0000000000', 'XXX-XXX-0000'),
        ('999-999-9999', 'XXX-XXX-9999'),
        ('Phone: 081-234-5678', 'Phone: XXX-XXX-5678'),
        ('(0812345678)', '(XXX-XXX-5678)'),
        ('081-234-5678.', 'XXX-XXX-5678.'),
        ('0812345678\n0898765432', 'XXX-XXX-5678\nXXX-XXX-5432'),
        ('081-234-5678 089-876-5432', 'XXX-XXX-5678 XXX-XXX-5432'),
        ('081234567', '081234567'),
        ('08123456789', '08123456789'),
        ('081-234-567', '081-234-567'),
        ('081-234-56789', '081-234-56789'),
        ('081 234 5678', '081 234 5678'),
        ('081/234/5678', '081/234/5678'),
        ('A0812345678', 'A0812345678'),
        ('0812345678Z', '0812345678Z'),
    ),
    'email': (
        ('somchai.d@company.com', 's*******d@company.com'),
        ('abc@example.com', 'a*c@example.com'),
        ('abcd@example.com', 'a**d@example.com'),
        ('a@example.com', '*@example.com'),
        ('ab@example.com', '**@example.com'),
        ('ABC@EXAMPLE.COM', 'A*C@EXAMPLE.COM'),
        ('123@example.com', '1*3@example.com'),
        ('a.b@example.com', 'a*b@example.com'),
        ('a_b@example.com', 'a*b@example.com'),
        ('a+b@example.com', 'a*b@example.com'),
        ('a-b@example.com', 'a*b@example.com'),
        ('a%b@example.com', 'a*b@example.com'),
        ('abc@mail.example.co.th', 'a*c@mail.example.co.th'),
        ('Email: abc@example.com', 'Email: a*c@example.com'),
        ('<abc@example.com>', '<a*c@example.com>'),
        ('abc@example.com def@company.org', 'a*c@example.com d*f@company.org'),
        ('abc@example', 'abc@example'),
        ('abc@example.c', 'abc@example.c'),
    ),
    'dob': (
        ('DOB:25/12/2549', 'DOB:XX/XX/25XX'),
        ('DOB: 25/12/2549', 'DOB: XX/XX/25XX'),
        ('DOB:\t25/12/2549', 'DOB:\tXX/XX/25XX'),
        ('DOB:  \t25/12/2549', 'DOB:  \tXX/XX/25XX'),
        ('DOB:01/01/2500', 'DOB:XX/XX/25XX'),
        ('DOB:31/12/2599', 'DOB:XX/XX/25XX'),
        ('DOB:29/02/2548', 'DOB:XX/XX/25XX'),
        ('DOB:00/00/0000', 'DOB:XX/XX/00XX'),
        ('DOB:99/99/9999', 'DOB:XX/XX/99XX'),
        ('DOB:01/01/2000', 'DOB:XX/XX/20XX'),
        ('DOB:25/12/25490', 'DOB:25/12/25490'),
        ('25/12/2549', '25/12/2549'),
        ('DOB:\n25/12/2549', 'DOB:\n25/12/2549'),
        ('DOB:\r\n25/12/2549', 'DOB:\r\n25/12/2549'),
        ('DOB:1/12/2549', 'DOB:1/12/2549'),
        ('DOB:25/1/2549', 'DOB:25/1/2549'),
        ('DOB:25/12/254', 'DOB:25/12/254'),
        ('DOB:25/12/2549\nDOB:01/01/2500', 'DOB:XX/XX/25XX\nDOB:XX/XX/25XX'),
    ),
    'address': (
        ('Address: 689 ถนนลาดกระบัง', 'Address: XXX ถนนลาดกระบัง'),
        ('Address: 689/12 ถนนลาดกระบัง', 'Address: XXX ถนนลาดกระบัง'),
        ('Address: 1', 'Address: XXX'),
        ('Address:0', 'Address:XXX'),
        ('Address:\t689', 'Address:\tXXX'),
        ('Address:  \t689 Road', 'Address:  \tXXX Road'),
        ('Address: 001 Road', 'Address: XXX Road'),
        ('Address: 12/34/56 Road', 'Address: XXX Road'),
        ('Address: 689 ซอยลาดกระบัง 19', 'Address: XXX ซอยลาดกระบัง 19'),
        ('Address: 12 Road 34 District 56', 'Address: XXX Road 34 District 56'),
        ('Address: ถนนลาดกระบัง', 'Address: ถนนลาดกระบัง'),
        ('Address:\n689 Road', 'Address:\n689 Road'),
        ('Address:\r\n689 Road', 'Address:\r\n689 Road'),
        ('Address: 689abc Road', 'Address: 689abc Road'),
        ('Address: 689/12abc Road', 'Address: 689/12abc Road'),
        ('Address: 689/ Road', 'Address: 689/ Road'),
        ('Address: /689 Road', 'Address: /689 Road'),
        ('Address: 12 Road\nAddress: 34 Lane', 'Address: XXX Road\nAddress: XXX Lane'),
    ),
    'mixed': (
        ('', ''),
        ('Plain text without personal data', 'Plain text without personal data'),
        ('ข้อความภาษาไทย ไม่มีข้อมูลส่วนบุคคล', 'ข้อความภาษาไทย ไม่มีข้อมูลส่วนบุคคล'),
        (' \t\n', ' \t\n'),
        ('Card 1234567890123456 Phone 0932457894', 'Card XXXX-XXXX-XXXX-3456 Phone XXX-XXX-7894'),
        ('abc@example.com DOB:25/12/2549', 'a*c@example.com DOB:XX/XX/25XX'),
        ('Address:\nDOB:25/12/2549', 'Address:\nDOB:XX/XX/25XX'),
        ('<script>alert(1)</script> DOB:25/12/2549', '<script>alert(1)</script> DOB:XX/XX/25XX'),
        ('XXXX-XXXX-XXXX-3456 XXX-XXX-7894 DOB:XX/XX/25XX Address: XXX', 'XXXX-XXXX-XXXX-3456 XXX-XXX-7894 DOB:XX/XX/25XX Address: XXX'),
        ('1234-5678-9012-3456\nsomchai.d@company.com\n093-245-7894\nDOB:25/12/2549\nAddress: 689 Road 19', 'XXXX-XXXX-XXXX-3456\ns*******d@company.com\nXXX-XXX-7894\nDOB:XX/XX/25XX\nAddress: XXX Road 19'),
    ),
}


class Regex100Tests(unittest.TestCase):
    def test_100_cases(self):
        self.assertEqual(sum(len(cases) for cases in CASES.values()), 100)
        inputs = [text for cases in CASES.values() for text, _ in cases]
        self.assertEqual(len(set(inputs)), 100)
        with app.test_client() as client, redirect_stdout(StringIO()):
            for category, cases in CASES.items():
                for number, (text, expected) in enumerate(cases, 1):
                    with self.subTest(category=category, case=number, text=text):
                        self.assertEqual(mask_data(text), expected)
                        response = client.post('/mask', data={'data': text})
                        self.assertEqual(response.status_code, 200)
                        page = PageParser()
                        page.feed(response.get_data(as_text=True))
                        self.assertEqual(page.textareas['data'], text.replace('\r\n', '\n').replace('\r', '\n'))
                        if expected:
                            self.assertEqual(page.textareas['mask_text'], expected.replace('\r\n', '\n').replace('\r', '\n'))
                        else:
                            self.assertNotIn('mask_text', page.textareas)
