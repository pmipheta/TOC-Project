const input = document.getElementById('data');
const exampleButton = document.getElementById('load-example-btn');
const clearButton = document.getElementById('clear-input-btn');
const status = document.getElementById('action-status');
const result = document.getElementById('mask_text');
const resultSection = document.getElementById('result-section');
const resultText = document.getElementById('result-text');
const categories = document.getElementById('result-categories');
const viewToggle = document.getElementById('result-view-toggle');
const textButton = document.getElementById('result-view-text');
const viewMenu = document.getElementById('result-view-menu');
const languageSelect = document.getElementById('language-select');
const mirror = document.getElementById('input-mirror');
const highlightStatus = document.getElementById('highlight-status');
const metadataNode = document.getElementById('highlight-data');
const metadata = metadataNode
    ? JSON.parse(metadataNode.textContent)
    : {input_spans: [], output_spans: []};

const i18n = window.PdpaMasking.createI18n({input, status, languageSelect, viewMenu});
const highlighter = window.PdpaMasking.createLiveHighlighter({
    input,
    mirror,
    status: highlightStatus,
    errorMessage: () => i18n.message('highlightFailed'),
});
const resultView = window.PdpaMasking.initializeResultView({
    result,
    resultText,
    categories,
    viewToggle,
    textButton,
    viewMenu,
    outputSpans: metadata.output_spans,
});

let examples;
let exampleIndex = 0;
let submitting = false;

function updateClearButton() {
    if (clearButton) clearButton.disabled = submitting || (!input.value && !(result && result.value));
}

function clearResult() {
    if (result) result.value = '';
    if (resultSection) resultSection.hidden = true;
    if (resultText) resultText.textContent = '';
    if (categories) categories.replaceChildren();
    if (resultView) resultView.setView(false);
    status.textContent = '';
    updateClearButton();
}

highlighter.initialize(metadata.input_spans);

input.addEventListener('input', () => {
    clearResult();
    highlighter.refresh();
});

exampleButton.addEventListener('click', () => {
    if (!examples || submitting) return;
    if (input.value !== '' && !window.confirm(i18n.message('confirm'))) return;

    input.value = examples[exampleIndex === 0 ? 'default' : 'long_log'];
    clearResult();
    status.textContent = i18n.message(exampleIndex === 0 ? 'example' : 'longExample');
    exampleIndex = 1 - exampleIndex;
    highlighter.refresh();
    input.focus();
});

fetch(exampleButton.getAttribute('data-examples-url') || '/static/examples.json')
    .then(response => {
        if (!response.ok) throw Error('Example request failed');
        return response.json();
    })
    .then(data => {
        if (typeof data.default !== 'string' || typeof data.long_log !== 'string') {
            throw Error('Invalid examples');
        }
        examples = data;
        exampleButton.hidden = false;
    })
    .catch(() => {
        status.textContent = i18n.message('exampleFailed');
    });

if (clearButton) {
    clearButton.addEventListener('click', () => {
        if (submitting) return;
        input.value = '';
        exampleIndex = 0;
        clearResult();
        highlighter.refresh();
        status.textContent = i18n.message('cleared');
        input.focus();
    });
    clearButton.hidden = false;
    updateClearButton();
}

const copyButton = document.getElementById('copy-result-btn');
if (copyButton) {
    copyButton.addEventListener('click', async () => {
        const text = result.value;
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            if (result.value === text) status.textContent = i18n.message('copied');
        } catch {
            if (result.value === text) {
                if (resultView) resultView.setView(false);
                status.textContent = i18n.message('failed');
            }
        }
    });
    copyButton.hidden = false;
}

if (languageSelect) {
    try {
        languageSelect.value = sessionStorage.getItem('pdpa-language') === 'en' ? 'en' : 'th';
    } catch { /* Use Thai if storage is blocked. */ }
    languageSelect.addEventListener('change', i18n.applyLanguage);
    i18n.applyLanguage();
    document.getElementById('language-control').hidden = false;
}

const maskForm = document.getElementById('mask-form');
const submitButton = document.getElementById('submit-btn');
if (maskForm && submitButton) {
    maskForm.addEventListener('submit', () => {
        submitting = true;
        highlighter.cancel();
        updateClearButton();
        exampleButton.disabled = true;
        maskForm.setAttribute('aria-busy', 'true');
        submitButton.disabled = true;
        status.textContent = i18n.message('processing');
    });
    window.addEventListener('pageshow', () => {
        submitting = false;
        updateClearButton();
        exampleButton.disabled = false;
        maskForm.setAttribute('aria-busy', 'false');
        submitButton.disabled = false;
        if (status.textContent === i18n.message('processing')) status.textContent = '';
    });
}
