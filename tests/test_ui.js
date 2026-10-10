const { test } = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const example = [
    '1234-5678-9012-3456', 'somchai.d@company.com', '093-245-7894',
    'DOB:25/12/2549', 'Address: 689 ซอยลาดกระบัง 19 ถนนลาดกระบัง',
].join('\n');

function page({ value = '', result = false, approve = true, clipboard } = {}) {
    const elements = {};
    for (const id of ['data', 'load-example-btn', 'action-status',
        ...(result ? ['mask_text', 'result-section', 'copy-result-btn'] : [])]) {
        elements[id] = {
            value: '', textContent: '', hidden: id === 'load-example-btn',
            handlers: {}, focused: false,
            addEventListener(event, handler) { this.handlers[event] = handler; },
            focus() { this.focused = true; },
        };
    }
    elements.data.value = value;
    if (result) elements.mask_text.value = 'previous result';
    const confirmations = [];
    const script = path.join(__dirname, '../static/app.js');
    assert.ok(existsSync(script), 'static/app.js must exist');
    vm.runInNewContext(readFileSync(script, 'utf8'), {
        document: { getElementById: id => elements[id] ?? null },
        window: { confirm(message) { confirmations.push(message); return approve; } },
        navigator: { clipboard },
    });
    return { elements, confirmations };
}

test('empty input loads the exact example without confirmation or submit', () => {
    const { elements, confirmations } = page();
    assert.equal(elements['load-example-btn'].hidden, false);
    elements['load-example-btn'].handlers.click();
    assert.equal(elements.data.value, example);
    assert.equal(elements.data.focused, true);
    assert.deepEqual(confirmations, []);
    assert.equal(elements['action-status'].textContent,
        'โหลดตัวอย่างแล้ว กด Mask Data เพื่อประมวลผล');
});

test('cancel preserves input and previous result', () => {
    const { elements, confirmations } = page({ value: 'my text', result: true, approve: false });
    elements['load-example-btn'].handlers.click();
    assert.equal(elements.data.value, 'my text');
    assert.equal(elements.mask_text.value, 'previous result');
    assert.equal(elements['result-section'].hidden, false);
    assert.equal(elements.data.focused, false);
    assert.deepEqual(confirmations, ['แทนที่ข้อความปัจจุบันด้วยตัวอย่างหรือไม่?']);
});

test('confirmation replaces input and clears and hides previous result', () => {
    const { elements, confirmations } = page({ value: 'my text', result: true });
    elements['load-example-btn'].handlers.click();
    assert.equal(elements.data.value, example);
    assert.equal(elements.mask_text.value, '');
    assert.equal(elements['result-section'].hidden, true);
    assert.equal(elements.data.focused, true);
    assert.equal(confirmations.length, 1);
});

test('typing or pasting clears stale result and feedback without changing new input', () => {
    const { elements } = page({ value: 'my text', result: true });
    elements['action-status'].textContent = 'old status';
    elements.data.value = 'new text';
    elements.data.handlers.input();
    assert.equal(elements.data.value, 'new text');
    assert.equal(elements.mask_text.value, '');
    assert.equal(elements['result-section'].hidden, true);
    assert.equal(elements['action-status'].textContent, '');
});

test('editing a page without a result is safe', () => {
    const { elements } = page();
    elements.data.value = 'new text';
    elements.data.handlers.input();
    assert.equal(elements.data.value, 'new text');
});

test('copy writes the exact result and reports success only after resolve', async () => {
    let resolve;
    let copied;
    const { elements } = page({ value: 'raw input', result: true,
        clipboard: { writeText(text) { copied = text; return new Promise(r => { resolve = r; }); } } });
    const text = '<script>alert(1)</script>\nDOB:XX/XX/25XX';
    elements.mask_text.value = text;
    const pending = elements['copy-result-btn'].handlers.click();
    assert.equal(copied, text);
    assert.equal(elements['action-status'].textContent, '');
    resolve();
    await pending;
    assert.equal(elements['action-status'].textContent, 'คัดลอกผลลัพธ์แล้ว');
});

test('missing or rejected clipboard reports manual copy', async () => {
    for (const clipboard of [undefined, { writeText: async () => { throw Error('denied'); } }]) {
        const { elements } = page({ result: true, clipboard });
        await elements['copy-result-btn'].handlers.click();
        assert.equal(elements['action-status'].textContent,
            'คัดลอกอัตโนมัติไม่ได้ โปรดเลือกข้อความผลลัพธ์และคัดลอกเอง');
        assert.equal(elements['result-section'].hidden, false);
    }
});

test('editing while copy is pending prevents stale success or failure feedback', async () => {
    for (const fail of [false, true]) {
        let finish;
        const { elements } = page({ result: true, clipboard: {
            writeText: () => new Promise((resolve, reject) => { finish = fail ? reject : resolve; }),
        } });
        const pending = elements['copy-result-btn'].handlers.click();
        elements.data.value = 'new input';
        elements.data.handlers.input();
        elements['action-status'].textContent = 'new status';
        finish();
        await pending;
        assert.equal(elements['action-status'].textContent, 'new status');
        assert.equal(elements['result-section'].hidden, true);
    }
});

test('cleared result cannot be copied', async () => {
    let calls = 0;
    const { elements } = page({ result: true, clipboard: { writeText: async () => { calls++; } } });
    elements['load-example-btn'].handlers.click();
    await elements['copy-result-btn'].handlers.click();
    assert.equal(calls, 0);
});
