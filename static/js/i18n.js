(function initializeI18nModule(namespace) {
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

    /**
     * Create the page localization controller.
     * @param {object} elements Required DOM elements for translating the page.
     * @returns {{applyLanguage: Function, message: Function}} Localization helpers.
     */
    function createI18n({input, status, languageSelect, viewMenu}) {
        let language = 'th';

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

            const highlightStatus = document.getElementById('highlight-status');
            if (highlightStatus && highlightStatus.textContent === messages.highlightFailed[previous === 'en' ? 1 : 0]) {
                highlightStatus.textContent = message('highlightFailed');
            }
            if (viewMenu) viewMenu.setAttribute('aria-label', language === 'en' ? 'Result format' : 'รูปแบบผลลัพธ์');
            try { sessionStorage.setItem('pdpa-language', language); } catch { /* Storage may be blocked. */ }
        }

        return {applyLanguage, message};
    }

    namespace.createI18n = createI18n;
}(window.PdpaMasking = window.PdpaMasking || {}));
