const input = document.getElementById('data');
const exampleButton = document.getElementById('load-example-btn');
const status = document.getElementById('action-status');
const result = document.getElementById('mask_text');
const resultSection = document.getElementById('result-section');
const resultText = document.getElementById('result-text');
const categories = document.getElementById('result-categories');
const viewToggle = document.getElementById('result-view-toggle');
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
    if (resultText) resultText.textContent = '';
    if (categories) categories.replaceChildren();
    if (viewToggle) setResultView(false);
    status.textContent = '';
}

function setResultView(list) {
    resultText.hidden = list;
    categories.hidden = !list;
    viewToggle.setAttribute('aria-pressed', String(list));
    viewToggle.textContent = list ? 'แสดงข้อความเต็ม' : 'แสดงแบบรายการ';
}

if (viewToggle) {
    const groups = new Map();
    for (const line of result.value.split(/\r?\n/)) {
        const text = line.trim();
        if (!text) continue;
        let label = 'ข้อความอื่น';
        let value = line;
        if (/^XXXX-XXXX-XXXX-\d{4}$/.test(text)) label = 'Credit Card';
        else if (/^XXX-XXX-\d{4}$/.test(text)) label = 'Phone Number';
        else if (/^[^\s@]+@[^\s@]+$/.test(text)) label = 'Email';
        else if (/^DOB:[ \t]*XX\/XX\/\d{2}XX$/.test(text)) {
            label = 'Date of Birth';
            value = text.replace(/^DOB:[ \t]*/, '');
        } else if (/^Address:[ \t]*XXX(?:\s|$)/.test(text)) {
            label = 'Address';
            value = text.replace(/^Address:[ \t]*/, '');
        }
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label).push(value);
    }
    for (const [label, values] of groups) {
        const section = document.createElement('section');
        const heading = document.createElement('h3');
        heading.textContent = label;
        section.append(heading);
        for (const value of values) {
            const item = document.createElement('p');
            item.textContent = value;
            section.append(item);
        }
        categories.append(section);
    }
    viewToggle.addEventListener('click', () => {
        if (result.value) setResultView(categories.hidden);
    });
    viewToggle.hidden = false;
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
                if (viewToggle) setResultView(false);
                status.textContent = 'คัดลอกอัตโนมัติไม่ได้ โปรดเลือกข้อความผลลัพธ์และคัดลอกเอง';
            }
        }
    });
    copyButton.hidden = false;
}
