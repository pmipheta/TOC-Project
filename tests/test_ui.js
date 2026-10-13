const { test } = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const example = [
    '1234-5678-9012-3456', 'somchai.d@company.com', '093-245-7894',
    'DOB:25/12/2549', 'Address: 689 ซอยลาดกระบัง 19 ถนนลาดกระบัง',
].join('\n');

async function page({ value = '', result = false, approve = true, clipboard, masked = 'previous result', locale = null, storageBlocked = false, fetchFailure = false, highlightFetch, metadata } = {}) {
    const elements = {};
    for (const id of ['data', 'input-mirror', 'highlight-notice', 'highlight-status', 'clear-input-btn', 'highlight-data', 'load-example-btn', 'action-status', 'mask-form', 'submit-btn',
        ...(locale ? ['language-select', 'language-control'] : []),
        ...(result ? ['mask_text', 'result-section', 'copy-result-btn',
            'result-text', 'result-categories', 'result-view-toggle',
            'result-view-text', 'result-view-menu'] : [])]) {
        elements[id] = {
            value: '', textContent: '', hidden: id === 'load-example-btn',
            handlers: {}, focused: false,
            children: [], attrs: {},
            setAttribute(name, value) { this.attrs[name] = value; },
            getAttribute(name) { return this.attrs[name]; },
            hasAttribute(name) { return name in this.attrs; },
            append(...children) { this.children.push(...children); },
            replaceChildren(...children) { this.children = children; },
            addEventListener(event, handler) { this.handlers[event] = handler; },
            focus() { this.focused = true; },
        };
    }
    elements['highlight-data'].textContent = JSON.stringify(metadata || {input_spans: [], output_spans: []});
    elements.data.value = value;
    elements['load-example-btn'].attrs['data-en'] = 'Load example';
    elements['load-example-btn'].textContent = 'โหลดตัวอย่าง';
    if (result) {
        elements.mask_text.value = masked;
        elements['result-text'].textContent = masked;
        elements['result-categories'].hidden = true;
    }
    const timers = new Map();
    const requests = [];
    let timerId = 0;
    const confirmations = [];
    let approved = approve;
    let hiddenDuringExampleFetch;
    const windowHandlers = {};
    const root = { lang: 'th' };
    let stored = locale;
    const scripts = ['js/i18n.js', 'js/highlights.js', 'js/results.js', 'app.js']
        .map(filename => path.join(__dirname, '../static', filename));
    for (const script of scripts) assert.ok(existsSync(script), `${script} must exist`);
    const context = vm.createContext({
        document: {
            documentElement: root,
            querySelectorAll() {
                const nodes = Object.values(elements);
                if (elements['result-categories']) {
                    for (const group of elements['result-categories'].children) nodes.push(...group.children);
                }
                return nodes.filter(n => n.attrs && 'data-en' in n.attrs);
            },
            getElementById: id => elements[id] ?? null,
            createElement(tag) { return {
                tag, textContent: '', children: [], attrs: {},
                replaceChildren(...children) { this.children = children; },
                setAttribute(name, value) { this.attrs[name] = value; },
                getAttribute(name) { return this.attrs[name]; },
                hasAttribute(name) { return name in this.attrs; },
                append(...children) { this.children.push(...children); },
            }; },
        },
        window: {
            confirm(message) { confirmations.push(message); return approved; },
            addEventListener(event, handler) { windowHandlers[event] = handler; },
        },
        navigator: { clipboard },
        AbortController,
        setTimeout(fn) { timers.set(++timerId, fn); return timerId; },
        clearTimeout(id) { timers.delete(id); },
        fetch: async (url, options) => {
            if (url === '/highlight') {
                requests.push(options);
                return highlightFetch ? highlightFetch(options) : {ok: true, json: async () => ({input_spans: []})};
            }
            if (fetchFailure) throw Error('offline');
            hiddenDuringExampleFetch = elements['load-example-btn'].hidden;
            return {ok: true, json: async () => JSON.parse(readFileSync(path.join(__dirname, '../static/examples.json'), 'utf8'))};
        },
        sessionStorage: {
            getItem() { if (storageBlocked) throw Error('blocked'); return stored; },
            setItem(key, val) { if (storageBlocked) throw Error('blocked'); stored = val; },
        },
    });
    for (const script of scripts) vm.runInContext(readFileSync(script, 'utf8'), context);
    await new Promise(resolve => setImmediate(resolve));
    return { elements, confirmations, root, windowHandlers, requests, hiddenDuringExampleFetch,
        setApprove(value) { approved = value; },
        async flushTimers() { const pending = [...timers.values()]; timers.clear(); await Promise.all(pending.map(fn => fn())); } };
}

test('empty input loads the exact example without confirmation or submit', async () => {
    const { elements, confirmations } = await page();
    assert.equal(elements['load-example-btn'].hidden, false);
    elements['load-example-btn'].handlers.click();
    assert.equal(elements.data.value, example);
    assert.equal(elements.data.focused, true);
    assert.deepEqual(confirmations, []);
    assert.equal(elements['action-status'].textContent,
        'โหลดตัวอย่างแบบสั้นแล้ว กด Mask Data เพื่อประมวลผล');
});

test('cancel preserves input and previous result', async () => {
    const { elements, confirmations } = await page({ value: 'my text', result: true, approve: false });
    elements['load-example-btn'].handlers.click();
    assert.equal(elements.data.value, 'my text');
    assert.equal(elements.mask_text.value, 'previous result');
    assert.equal(elements['result-section'].hidden, false);
    assert.equal(elements.data.focused, false);
    assert.deepEqual(confirmations, ['แทนที่ข้อความปัจจุบันด้วยตัวอย่างหรือไม่?']);
});

test('confirmation replaces input and clears and hides previous result', async () => {
    const { elements, confirmations } = await page({ value: 'my text', result: true });
    elements['load-example-btn'].handlers.click();
    assert.equal(elements.data.value, example);
    assert.equal(elements.mask_text.value, '');
    assert.equal(elements['result-section'].hidden, true);
    assert.equal(elements.data.focused, true);
    assert.equal(confirmations.length, 1);
});

test('typing or pasting clears stale result and feedback without changing new input', async () => {
    const { elements } = await page({ value: 'my text', result: true });
    elements['action-status'].textContent = 'old status';
    elements.data.value = 'new text';
    elements.data.handlers.input();
    assert.equal(elements.data.value, 'new text');
    assert.equal(elements.mask_text.value, '');
    assert.equal(elements['result-section'].hidden, true);
    assert.equal(elements['action-status'].textContent, '');
});

test('editing a page without a result is safe', async () => {
    const { elements } = await page();
    elements.data.value = 'new text';
    elements.data.handlers.input();
    assert.equal(elements.data.value, 'new text');
});

test('copy writes the exact result and reports success only after resolve', async () => {
    let resolve;
    let copied;
    const { elements } = await page({ value: 'raw input', result: true,
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
        const { elements } = await page({ result: true, clipboard });
        await elements['copy-result-btn'].handlers.click();
        assert.equal(elements['action-status'].textContent,
            'คัดลอกอัตโนมัติไม่ได้ โปรดเลือกข้อความผลลัพธ์และคัดลอกเอง');
        assert.equal(elements['result-section'].hidden, false);
    }
});

test('editing while copy is pending prevents stale success or failure feedback', async () => {
    for (const fail of [false, true]) {
        let finish;
        const { elements } = await page({ result: true, clipboard: {
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
    const { elements } = await page({ result: true, clipboard: { writeText: async () => { calls++; } } });
    elements['load-example-btn'].handlers.click();
    await elements['copy-result-btn'].handlers.click();
    assert.equal(calls, 0);
});

const maskedExample = 'XXXX-XXXX-XXXX-3456\ns*******d@company.com\nXXX-XXX-7894\nDOB:XX/XX/25XX\nAddress: XXX ซอยลาดกระบัง 19 ถนนลาดกระบัง';

test('toggle groups all five types and preserves canonical text and input', async () => {
    const { elements } = await page({ value: 'original', result: true, masked: maskedExample });
    const toggle = elements['result-view-toggle'];
    assert.equal(elements['result-view-menu'].hidden, false);
    assert.equal(elements['result-view-text'].attrs['aria-pressed'], 'true');
    toggle.handlers.click();
    const groups = elements['result-categories'].children;
    assert.deepEqual(groups.map(g => g.children[0].textContent),
        ['Credit Card', 'Email', 'Phone Number', 'Date of Birth', 'Address']);
    assert.equal(groups[3].children[1].textContent, 'XX/XX/25XX');
    assert.equal(groups[4].children[1].textContent, 'XXX ซอยลาดกระบัง 19 ถนนลาดกระบัง');
    assert.equal(elements['result-text'].hidden, true);
    assert.equal(toggle.attrs['aria-pressed'], 'true');
    toggle.handlers.click();
    assert.equal(elements['result-text'].hidden, true);
    elements['result-view-text'].handlers.click();
    assert.equal(elements['result-text'].hidden, false);
    assert.equal(elements['result-categories'].hidden, true);
    assert.equal(elements.mask_text.value, maskedExample);
    assert.equal(elements.data.value, 'original');
});

test('grouping keeps repeated values and mixed or HTML lines as safe text', async () => {
    const mixed = 'Phone: XXX-XXX-7894';
    const html = '<script>alert(1)</script>';
    const { elements } = await page({ result: true,
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

test('grouping extracts masked values embedded in long log lines by server category', async () => {
    const masked = [
        '[09:00] Card XXXX-XXXX-XXXX-3456 accepted.',
        '[09:01] Sent to a*c@example.com using XXX-XXX-5678.',
        '[09:02] Profile DOB:XX/XX/25XX updated.',
        '[09:03] Delivery Address: XXX Road.',
    ].join('\n');
    const matches = [
        ['XXXX-XXXX-XXXX-3456', 'card'],
        ['a*c@example.com', 'email'],
        ['XXX-XXX-5678', 'phone'],
        ['DOB:XX/XX/25XX', 'dob'],
        ['Address: XXX', 'address'],
    ];
    const output_spans = matches.map(([value, kind]) => {
        const start = Array.from(masked.slice(0, masked.indexOf(value))).length;
        return {start, end: start + Array.from(value).length, kind};
    });
    const { elements } = await page({result: true, masked,
        metadata: {input_spans: [], output_spans}});
    elements['result-view-toggle'].handlers.click();
    const groups = elements['result-categories'].children;
    assert.deepEqual(groups.map(group => group.children[0].textContent),
        ['Credit Card', 'Email', 'Phone Number', 'Date of Birth', 'Address']);
    const renderedText = node => node.textContent || node.children.map(renderedText).join('');
    assert.deepEqual(groups.map(group => renderedText(group.children[1])),
        ['XXXX-XXXX-XXXX-3456', 'a*c@example.com', 'XXX-XXX-5678', 'XX/XX/25XX', 'XXX']);
});

test('copy in categorized mode uses canonical text and failure returns to full text', async () => {
    for (const fail of [false, true, 'missing']) {
        let copied;
        const clipboard = fail === 'missing' ? undefined : {
            async writeText(text) { copied = text; if (fail) throw Error('denied'); },
        };
        const { elements } = await page({ result: true, masked: maskedExample, clipboard });
        elements['result-view-toggle'].handlers.click();
        await elements['copy-result-btn'].handlers.click();
        if (fail !== 'missing') assert.equal(copied, maskedExample);
        if (fail) {
            assert.equal(elements['result-text'].hidden, false);
            assert.equal(elements['result-categories'].hidden, true);
            assert.equal(elements['result-view-toggle'].attrs['aria-pressed'], 'false');
            assert.equal(elements['result-view-text'].attrs['aria-pressed'], 'true');
        }
        assert.equal(elements.mask_text.value, maskedExample);
    }
});

test('loading an example or editing resets and clears both result views', async () => {
    for (const action of ['example', 'input']) {
        const { elements } = await page({ result: true, masked: maskedExample });
        elements['result-view-toggle'].handlers.click();
        if (action === 'example') elements['load-example-btn'].handlers.click();
        else elements.data.handlers.input();
        assert.equal(elements['result-section'].hidden, true);
        assert.equal(elements['result-text'].textContent, '');
        assert.equal(elements['result-categories'].children.length, 0);
        assert.equal(elements['result-view-toggle'].attrs['aria-pressed'], 'false');
    }
});

test('language switch translates controls, categories and feedback without altering data or view', async () => {
    const { elements, root, confirmations } = await page({ locale: 'en', result: true,
        value: 'original', masked: maskedExample, clipboard: { writeText: async () => {} } });
    const select = elements['language-select'];
    assert.equal(root.lang, 'en');
    assert.equal(elements['load-example-btn'].textContent, 'Load example');
    elements['result-view-toggle'].handlers.click();
    await elements['copy-result-btn'].handlers.click();
    assert.equal(elements['action-status'].textContent, 'Result copied.');
    select.value = 'th';
    select.handlers.change();
    assert.equal(root.lang, 'th');
    assert.equal(elements['load-example-btn'].textContent, 'โหลดตัวอย่าง');
    assert.equal(elements['action-status'].textContent, 'คัดลอกผลลัพธ์แล้ว');
    assert.equal(elements['result-categories'].children[0].children[0].textContent, 'บัตรเครดิต');
    assert.equal(elements['result-text'].hidden, true);
    assert.equal(elements.mask_text.value, maskedExample);
    assert.equal(elements.data.value, 'original');
    select.value = 'en';
    select.handlers.change();
    elements['load-example-btn'].handlers.click();
    assert.equal(confirmations[0], 'Replace your current text with the example?');
    assert.equal(elements['action-status'].textContent, 'Short example loaded. Click Mask Data to process it.');
});

test('blocked language storage falls back safely and switching still works', async () => {
    const { elements, root } = await page({ locale: 'en', storageBlocked: true });
    assert.equal(root.lang, 'th');
    elements['language-select'].value = 'en';
    elements['language-select'].handlers.change();
    assert.equal(root.lang, 'en');
});

test('submission shows processing and browser restoration re-enables the action', async () => {
    const { elements, windowHandlers } = await page({ locale: 'en' });
    elements['mask-form'].handlers.submit();
    assert.equal(elements['submit-btn'].disabled, true);
    assert.equal(elements['mask-form'].attrs['aria-busy'], 'true');
    assert.equal(elements['action-status'].textContent, 'Processing…');
    windowHandlers.pageshow();
    assert.equal(elements['submit-btn'].disabled, false);
    assert.equal(elements['mask-form'].attrs['aria-busy'], 'false');
    assert.equal(elements['action-status'].textContent, '');
});

test('one example button alternates and Clear resets its index and all results', async () => {
    const { elements } = await page({ result: true, locale: 'en' });
    const load = elements['load-example-btn'].handlers.click;
    load();
    assert.equal(elements.data.value, example);
    load();
    const examples = JSON.parse(readFileSync(path.join(__dirname, '../static/examples.json'), 'utf8'));
    assert.equal(elements.data.value, examples.long_log);
    load();
    assert.equal(elements.data.value, example);
    load();
    elements['clear-input-btn'].handlers.click();
    assert.equal(elements.data.value, '');
    assert.equal(elements.mask_text.value, '');
    assert.equal(elements['result-text'].textContent, '');
    assert.equal(elements['result-section'].hidden, true);
    assert.equal(elements['clear-input-btn'].disabled, true);
    assert.equal(elements['action-status'].textContent, 'Input cleared.');
    load();
    assert.equal(elements.data.value, example);
});

test('failed example fetch preserves input and does not enable example button', async () => {
    const { elements } = await page({value: 'keep me', fetchFailure: true, locale: 'en'});
    assert.equal(elements.data.value, 'keep me');
    assert.equal(elements['load-example-btn'].hidden, true);
    assert.match(elements['action-status'].textContent, /load examples/i);
});

test('input requests debounce, ignore stale responses and Clear aborts pending request', async () => {
    const pending = [];
    const {elements, flushTimers, requests} = await page({highlightFetch: options => new Promise(resolve => pending.push({options, resolve}))});
    elements.data.value = 'first';
    elements.data.handlers.input();
    const first = flushTimers();
    elements.data.value = '🙂 0932457894';
    elements.data.handlers.input();
    const second = flushTimers();
    assert.equal(requests[0].signal.aborted, true);
    pending[1].resolve({ok: true, json: async () => ({input_spans: [{start: 2, end: 12, kind: 'phone'}]})});
    await second;
    const marks = elements['input-mirror'].children.filter(node => node.tag === 'mark');
    assert.equal(marks[0].textContent, '0932457894');
    pending[0].resolve({ok: true, json: async () => ({input_spans: []})});
    await first;
    assert.equal(elements['input-mirror'].children.filter(node => node.tag === 'mark').length, 1);
    elements['clear-input-btn'].handlers.click();
    assert.equal(requests[1].signal.aborted, true);
    assert.equal(elements['input-mirror'].children.length, 0);
});

test('output marks use server spans and preserve plain copy and categorized offsets', async () => {
    const text = '🙂 DOB:XX/XX/25XX\nAddress: XXX ถนน';
    const offset = Array.from('🙂 DOB:XX/XX/25XX\n').length;
    const {elements} = await page({result: true, masked: text,
        metadata: {input_spans: [], output_spans: [{start: 2, end: 16, kind: 'dob'}, {start: offset, end: offset + 12, kind: 'address'}]}});
    assert.equal(elements['result-text'].children.filter(n => n.tag === 'mark').length, 2);
    const groups = elements['result-categories'].children;
    assert.equal(groups[1].children[1].children.find(n => n.tag === 'mark').textContent, 'XXX');
    assert.equal(elements.mask_text.value, text);
});

test('cancel does not advance example index, and initial load waits for fetch', async () => {
    const {elements, setApprove, hiddenDuringExampleFetch} = await page();
    assert.equal(hiddenDuringExampleFetch, true);
    const load = elements['load-example-btn'].handlers.click;
    load();
    setApprove(false);
    elements.data.value = 'keep';
    load();
    assert.equal(elements.data.value, 'keep');
    setApprove(true);
    load();
    assert.equal(elements.data.value, JSON.parse(readFileSync(path.join(__dirname, '../static/examples.json'), 'utf8')).long_log);
});

test('Clear during copy preserves clear feedback and disables controls during submission', async () => {
    let finish;
    const {elements} = await page({result: true, locale: 'en', clipboard: {
        writeText: () => new Promise(resolve => {finish = resolve;})
    }});
    const copying = elements['copy-result-btn'].handlers.click();
    elements['clear-input-btn'].handlers.click();
    finish();
    await copying;
    assert.equal(elements['action-status'].textContent, 'Input cleared.');
    elements.data.value = 'new text';
    elements.data.handlers.input();
    assert.equal(elements['clear-input-btn'].disabled, false);
    elements['mask-form'].handlers.submit();
    assert.equal(elements['clear-input-btn'].disabled, true);
    assert.equal(elements['load-example-btn'].disabled, true);
});

test('highlight failure leaves editing and form available and translates feedback', async () => {
    const {elements, flushTimers} = await page({locale: 'en', highlightFetch: async () => ({ok: false})});
    elements.data.value = '<script>🙂 DOB:25/12/2549</script>';
    elements.data.handlers.input();
    await flushTimers();
    assert.equal(elements.data.value, '<script>🙂 DOB:25/12/2549</script>');
    assert.match(elements['highlight-status'].textContent, /unavailable/);
    assert.equal(elements['input-mirror'].hidden, true);
    elements['language-select'].value = 'th';
    elements['language-select'].handlers.change();
    assert.equal(elements['highlight-status'].textContent, 'ตรวจสีเน้นไม่ได้ ยังส่งข้อความเพื่อปิดข้อมูลได้ตามปกติ');
});

test('typing coalesces requests and cancelling prevents pending highlights after Clear', async () => {
    let finish;
    const {elements, requests, flushTimers} = await page({highlightFetch: () => new Promise(resolve => {finish = resolve;})});
    elements.data.value = 'one'; elements.data.handlers.input();
    elements.data.value = 'two'; elements.data.handlers.input();
    const pending = flushTimers();
    assert.equal(requests.length, 1);
    assert.equal(JSON.parse(requests[0].body).text, 'two');
    elements['clear-input-btn'].handlers.click();
    finish({ok: true, json: async () => ({input_spans: [{start: 0, end: 3, kind: 'email'}]})});
    await pending;
    assert.equal(elements['input-mirror'].hidden, true);
    assert.equal(elements['highlight-status'].textContent, '');
});
