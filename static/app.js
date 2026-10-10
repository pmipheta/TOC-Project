const input = document.getElementById('data');
const exampleButton = document.getElementById('load-example-btn');
const status = document.getElementById('action-status');
const result = document.getElementById('mask_text');
const resultSection = document.getElementById('result-section');
const resultText = document.getElementById('result-text');
const categories = document.getElementById('result-categories');
const viewToggle = document.getElementById('result-view-toggle');
const textButton = document.getElementById('result-view-text');
const viewMenu = document.getElementById('result-view-menu');
const languageSelect = document.getElementById('language-select');
let language = 'th';
const messages = {
    confirm: ['แทนที่ข้อความปัจจุบันด้วยตัวอย่างหรือไม่?', 'Replace your current text with the example?'],
    example: ['โหลดตัวอย่างแบบสั้นแล้ว กด Mask Data เพื่อประมวลผล', 'Short example loaded. Click Mask Data to process it.'],
    longExample: ['โหลดตัวอย่าง log ยาวแล้ว กด Mask Data เพื่อประมวลผล', 'Long log loaded. Click Mask Data to process it.'],
    exampleFailed: ['โหลดตัวอย่างไม่ได้ โปรดลองโหลดหน้าใหม่', 'Could not load examples. Reload the page to retry.'],
    cleared: ['ล้างข้อความแล้ว', 'Input cleared.'],
    highlightFailed: ['ตรวจสีเน้นไม่ได้ ยังส่งข้อความเพื่อปิดข้อมูลได้ตามปกติ', 'Highlights unavailable. You can still submit text for masking.'],
    copied: ['คัดลอกผลลัพธ์แล้ว', 'Result copied.'],
    failed: ['คัดลอกอัตโนมัติไม่ได้ โปรดเลือกข้อความผลลัพธ์และคัดลอกเอง', 'Automatic copy failed. Select the full result and copy it manually.'],
    processing: ['กำลังประมวลผล…', 'Processing…'],
};
function message(key) {
    return messages[key][language === 'en' ? 1 : 0];
}

function applyLanguage() {
    const previous = language;
    language = languageSelect.value === 'en' ? 'en' : 'th';
    document.documentElement.lang = language;
    input.setAttribute('placeholder', language === 'en'
        ? 'Paste your text here, or load an example.'
        : 'วางข้อความที่นี่ หรือกดโหลดตัวอย่าง');
    for (const element of document.querySelectorAll('[data-en]')) {
        if (!element.hasAttribute('data-th')) element.setAttribute('data-th', element.textContent);
        element.textContent = element.getAttribute(language === 'en' ? 'data-en' : 'data-th');
    }
    for (const values of Object.values(messages)) {
        if (status.textContent === values[previous === 'en' ? 1 : 0]) {
            status.textContent = values[language === 'en' ? 1 : 0];
            break;
        }
    }
    const liveStatus = document.getElementById('highlight-status');
    if (liveStatus && liveStatus.textContent === messages.highlightFailed[previous === 'en' ? 1 : 0]) {
        liveStatus.textContent = message('highlightFailed');
    }
    if (viewMenu) viewMenu.setAttribute('aria-label', language === 'en' ? 'Result format' : 'รูปแบบผลลัพธ์');
    try { sessionStorage.setItem('pdpa-language', language); } catch { /* Storage may be blocked. */ }
}
const clearButton = document.getElementById('clear-input-btn');
const mirror = document.getElementById('input-mirror');
const highlightStatus = document.getElementById('highlight-status');
const metadataNode = document.getElementById('highlight-data');
const metadata = metadataNode ? JSON.parse(metadataNode.textContent) : {input_spans: [], output_spans: []};
let examples;
let exampleIndex = 0;
let submitting = false;
let highlightTimer;
let highlightController;
let highlightSequence = 0;

function renderHighlights(element, text, spans) {
    element.replaceChildren();
    if (!spans.length) { element.textContent = text; return; }
    element.textContent = '';
    const points = Array.from(text);
    let cursor = 0;
    for (const span of spans) {
        if (span.start < cursor || span.end > points.length || span.end <= span.start) continue;
        if (span.start > cursor) {
            const plain = document.createElement('span');
            plain.textContent = points.slice(cursor, span.start).join('');
            element.append(plain);
        }
        const mark = document.createElement('mark');
        mark.setAttribute('data-kind', span.kind);
        mark.textContent = points.slice(span.start, span.end).join('');
        element.append(mark);
        cursor = span.end;
    }
    if (cursor < points.length) {
        const plain = document.createElement('span');
        plain.textContent = points.slice(cursor).join('');
        element.append(plain);
    }
}

function updateClear() {
    if (clearButton) clearButton.disabled = submitting || (!input.value && !(result && result.value));
}

function cancelHighlights() {
    clearTimeout(highlightTimer);
    if (highlightController) highlightController.abort();
    highlightSequence++;
}

function syncMirror() {
    if (!mirror) return;
    if (mirror.style && input.clientWidth) {
        mirror.style.width = `${input.clientWidth + 2}px`;
        mirror.style.height = `${input.clientHeight + 2}px`;
    }
    mirror.scrollTop = input.scrollTop;
    mirror.scrollLeft = input.scrollLeft;
}

function showInputHighlights(text, spans) {
    if (!mirror) return;
    renderHighlights(mirror, text + (text.endsWith('\n') ? ' ' : ''), spans);
    mirror.hidden = false;
    syncMirror();
}

function refreshHighlights() {
    cancelHighlights();
    if (mirror) { mirror.replaceChildren(); mirror.textContent = ''; mirror.hidden = true; }
    if (highlightStatus) highlightStatus.textContent = '';
    if (!input.value) return;
    const sequence = highlightSequence;
    const text = input.value;
    highlightTimer = setTimeout(async () => {
        highlightController = new AbortController();
        try {
            const response = await fetch('/highlight', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({text}), signal: highlightController.signal,
            });
            if (!response.ok) throw Error('Highlight request failed');
            const data = await response.json();
            if (sequence === highlightSequence && input.value === text) showInputHighlights(text, data.input_spans);
        } catch (error) {
            if (sequence === highlightSequence && error.name !== 'AbortError' && highlightStatus) {
                highlightStatus.textContent = message('highlightFailed');
            }
        }
    }, 250);
}

if (mirror) {
    input.addEventListener('scroll', syncMirror);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(syncMirror).observe(input);
    window.addEventListener('resize', syncMirror);
    document.getElementById('highlight-notice').hidden = false;
    showInputHighlights(input.value, metadata.input_spans);
}
if (resultText && result) renderHighlights(resultText, result.value, metadata.output_spans);

function clearResult() {
    if (result) result.value = '';
    if (resultSection) resultSection.hidden = true;
    if (resultText) resultText.textContent = '';
    if (categories) categories.replaceChildren();
    if (viewToggle) setResultView(false);
    status.textContent = '';
    updateClear();
}

function setResultView(list) {
    resultText.hidden = list;
    categories.hidden = !list;
    viewToggle.setAttribute('aria-pressed', String(list));
    textButton.setAttribute('aria-pressed', String(!list));
}

if (viewToggle) {
    const groups = new Map();
    let lineOffset = 0;
    for (const line of result.value.split(/\n/)) {
        const offset = lineOffset;
        lineOffset += Array.from(line).length + 1;
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
        const removed = value === line ? 0 : Array.from(line).length - Array.from(line.trimStart()).length
            + Array.from(text).length - Array.from(value).length;
        const start = offset + removed;
        const end = start + Array.from(value).length;
        const spans = metadata.output_spans.filter(span => span.start < end && span.end > start)
            .map(span => ({...span, start: Math.max(span.start, start) - start, end: Math.min(span.end, end) - start}));
        groups.get(label).push({value, spans});
    }
    for (const [label, values] of groups) {
        const section = document.createElement('section');
        const heading = document.createElement('h3');
        heading.textContent = label;
        heading.setAttribute('data-en', label === 'ข้อความอื่น' ? 'Other text' : label);
        heading.setAttribute('data-th', {
            'Credit Card': 'บัตรเครดิต', 'Phone Number': 'โทรศัพท์', 'Email': 'อีเมล',
            'Date of Birth': 'วันเกิด', 'Address': 'ที่อยู่', 'ข้อความอื่น': 'ข้อความอื่น',
        }[label]);
        section.append(heading);
        for (const {value, spans} of values) {
            const item = document.createElement('p');
            renderHighlights(item, value, spans);
            section.append(item);
        }
        categories.append(section);
    }
    viewToggle.addEventListener('click', () => {
        if (result.value) setResultView(true);
    });
    textButton.addEventListener('click', () => {
        if (result.value) setResultView(false);
    });
    setResultView(false);
    viewMenu.hidden = false;
}

input.addEventListener('input', () => {
    clearResult();
    refreshHighlights();
});
exampleButton.addEventListener('click', () => {
    if (!examples || submitting) return;
    if (input.value !== '' && !window.confirm(message('confirm'))) return;
    input.value = examples[exampleIndex === 0 ? 'default' : 'long_log'];
    clearResult();
    status.textContent = message(exampleIndex === 0 ? 'example' : 'longExample');
    exampleIndex = 1 - exampleIndex;
    refreshHighlights();
    input.focus();
});
fetch(exampleButton.getAttribute('data-examples-url') || '/static/examples.json')
    .then(response => { if (!response.ok) throw Error('Example request failed'); return response.json(); })
    .then(data => {
        if (typeof data.default !== 'string' || typeof data.long_log !== 'string') throw Error('Invalid examples');
        examples = data;
        exampleButton.hidden = false;
    })
    .catch(() => { status.textContent = message('exampleFailed'); });
if (clearButton) {
    clearButton.addEventListener('click', () => {
        if (submitting) return;
        input.value = '';
        exampleIndex = 0;
        clearResult();
        refreshHighlights();
        status.textContent = message('cleared');
        input.focus();
    });
    clearButton.hidden = false;
    updateClear();
}

const copyButton = document.getElementById('copy-result-btn');
if (copyButton) {
    copyButton.addEventListener('click', async () => {
        const text = result.value;
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            if (result.value === text) status.textContent = message('copied');
        } catch {
            if (result.value === text) {
                if (viewToggle) setResultView(false);
                status.textContent = message('failed');
            }
        }
    });
    copyButton.hidden = false;
}

if (languageSelect) {
    try { languageSelect.value = sessionStorage.getItem('pdpa-language') === 'en' ? 'en' : 'th'; } catch { /* Use Thai if storage is blocked. */ }
    languageSelect.addEventListener('change', applyLanguage);
    applyLanguage();
    document.getElementById('language-control').hidden = false;
}

const maskForm = document.getElementById('mask-form');
const submitButton = document.getElementById('submit-btn');
if (maskForm && submitButton) {
    maskForm.addEventListener('submit', () => {
        submitting = true;
        cancelHighlights();
        updateClear();
        exampleButton.disabled = true;
        maskForm.setAttribute('aria-busy', 'true');
        submitButton.disabled = true;
        status.textContent = message('processing');
    });
    window.addEventListener('pageshow', () => {
        submitting = false;
        updateClear();
        exampleButton.disabled = false;
        maskForm.setAttribute('aria-busy', 'false');
        submitButton.disabled = false;
        if (status.textContent === message('processing')) status.textContent = '';
    });
}
