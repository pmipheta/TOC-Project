const input = document.getElementById('data');
const exampleButton = document.getElementById('load-example-btn');
const status = document.getElementById('action-status');
const result = document.getElementById('mask_text');
const resultSection = document.getElementById('result-section');
const example = [
    '1234-5678-9012-3456',
    'somchai.d@company.com',
    '093-245-7894',
    'DOB:25/12/2549',
    'Address: 689 ซอยลาดกระบัง 19 ถนนลาดกระบัง',
].join('\n');

function clearResult() {
    if (result) result.value = '';
    if (resultSection) resultSection.hidden = true;
    status.textContent = '';
}

input.addEventListener('input', clearResult);
exampleButton.addEventListener('click', () => {
    if (input.value !== '' &&
        !window.confirm('แทนที่ข้อความปัจจุบันด้วยตัวอย่างหรือไม่?')) return;
    input.value = example;
    clearResult();
    status.textContent = 'โหลดตัวอย่างแล้ว กด Mask Data เพื่อประมวลผล';
    input.focus();
});
exampleButton.hidden = false;

const copyButton = document.getElementById('copy-result-btn');
if (copyButton) {
    copyButton.addEventListener('click', async () => {
        const text = result.value;
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            if (result.value === text) status.textContent = 'คัดลอกผลลัพธ์แล้ว';
        } catch {
            if (result.value === text) {
                status.textContent = 'คัดลอกอัตโนมัติไม่ได้ โปรดเลือกข้อความผลลัพธ์และคัดลอกเอง';
            }
        }
    });
    copyButton.hidden = false;
}
