const { test } = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const example = [
    '1234-5678-9012-3456', 'somchai.d@company.com', '093-245-7894',
    'DOB:25/12/2549', 'Address: 689 ซอยลาดกระบัง 19 ถนนลาดกระบัง',
].join('\n');

function page({ value = '', result = false, approve = true } = {}) {
    const elements = {};
    for (const id of ['data', 'load-example-btn', 'action-status',
        ...(result ? ['mask_text', 'result-section'] : [])]) {
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
