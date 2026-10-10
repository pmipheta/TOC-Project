const { test } = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const example = [
    '1234-5678-9012-3456', 'somchai.d@company.com', '093-245-7894',
    'DOB:25/12/2549', 'Address: 689 ซอยลาดกระบัง 19 ถนนลาดกระบัง',
].join('\n');

function page({ value = '', result = false, approve = true, clipboard, masked = 'previous result' } = {}) {
    const elements = {};
    for (const id of ['data', 'load-example-btn', 'action-status',
        ...(result ? ['mask_text', 'result-section', 'copy-result-btn',
            'result-text', 'result-categories', 'result-view-toggle'] : [])]) {
        elements[id] = {
            value: '', textContent: '', hidden: id === 'load-example-btn',
            handlers: {}, focused: false,
            children: [], attrs: {},
            setAttribute(name, value) { this.attrs[name] = value; },
            append(...children) { this.children.push(...children); },
            replaceChildren(...children) { this.children = children; },
            addEventListener(event, handler) { this.handlers[event] = handler; },
            focus() { this.focused = true; },
        };
    }
    elements.data.value = value;
    if (result) {
        elements.mask_text.value = masked;
        elements['result-text'].textContent = masked;
        elements['result-categories'].hidden = true;
    }
    const confirmations = [];
    const script = path.join(__dirname, '../static/app.js');
    assert.ok(existsSync(script), 'static/app.js must exist');
    vm.runInNewContext(readFileSync(script, 'utf8'), {
        document: {
            getElementById: id => elements[id] ?? null,
            createElement(tag) { return {
                tag, textContent: '', children: [],
                append(...children) { this.children.push(...children); },
            }; },
        },
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

const maskedExample = 'XXXX-XXXX-XXXX-3456\ns*******d@company.com\nXXX-XXX-7894\nDOB:XX/XX/25XX\nAddress: XXX ซอยลาดกระบัง 19 ถนนลาดกระบัง';

test('toggle groups all five types and preserves canonical text and input', () => {
    const { elements } = page({ value: 'original', result: true, masked: maskedExample });
    const toggle = elements['result-view-toggle'];
    toggle.handlers.click();
    const groups = elements['result-categories'].children;
    assert.deepEqual(groups.map(g => g.children[0].textContent),
        ['Credit Card', 'Email', 'Phone Number', 'Date of Birth', 'Address']);
    assert.equal(groups[3].children[1].textContent, 'XX/XX/25XX');
    assert.equal(groups[4].children[1].textContent, 'XXX ซอยลาดกระบัง 19 ถนนลาดกระบัง');
    assert.equal(elements['result-text'].hidden, true);
    assert.equal(toggle.attrs['aria-pressed'], 'true');
    toggle.handlers.click();
    assert.equal(elements['result-text'].hidden, false);
    assert.equal(elements['result-categories'].hidden, true);
    assert.equal(elements.mask_text.value, maskedExample);
    assert.equal(elements.data.value, 'original');
});

test('grouping keeps repeated values and mixed or HTML lines as safe text', () => {
    const mixed = 'Phone: XXX-XXX-7894';
    const html = '<script>alert(1)</script>';
    const { elements } = page({ result: true,
        masked: `XXXX-XXXX-XXXX-3456\nXXXX-XXXX-XXXX-3456\na*b@example.com\nc*d@example.com\n${mixed}\n${html}\n\n` });
    elements['result-view-toggle'].handlers.click();
    const groups = elements['result-categories'].children;
    assert.equal(groups[0].children.length, 3);
    assert.equal(groups[1].children.length, 3);
    assert.equal(groups[2].children[0].textContent, 'ข้อความอื่น');
    assert.equal(groups[2].children[1].textContent, mixed);
    assert.equal(groups[2].children[2].textContent, html);
    assert.equal(groups[2].children[2].children.length, 0);
});

test('copy in categorized mode uses canonical text and failure returns to full text', async () => {
    for (const fail of [false, true, 'missing']) {
        let copied;
        const clipboard = fail === 'missing' ? undefined : {
            async writeText(text) { copied = text; if (fail) throw Error('denied'); },
        };
        const { elements } = page({ result: true, masked: maskedExample, clipboard });
        elements['result-view-toggle'].handlers.click();
        await elements['copy-result-btn'].handlers.click();
        if (fail !== 'missing') assert.equal(copied, maskedExample);
        if (fail) {
            assert.equal(elements['result-text'].hidden, false);
            assert.equal(elements['result-categories'].hidden, true);
            assert.equal(elements['result-view-toggle'].attrs['aria-pressed'], 'false');
            assert.equal(elements['result-view-toggle'].textContent, 'แสดงแบบรายการ');
        }
        assert.equal(elements.mask_text.value, maskedExample);
    }
});

test('loading an example or editing resets and clears both result views', () => {
    for (const action of ['example', 'input']) {
        const { elements } = page({ result: true, masked: maskedExample });
        elements['result-view-toggle'].handlers.click();
        if (action === 'example') elements['load-example-btn'].handlers.click();
        else elements.data.handlers.input();
        assert.equal(elements['result-section'].hidden, true);
        assert.equal(elements['result-text'].textContent, '');
        assert.equal(elements['result-categories'].children.length, 0);
        assert.equal(elements['result-view-toggle'].attrs['aria-pressed'], 'false');
    }
});
