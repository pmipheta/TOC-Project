(function initializeResultsModule(namespace) {
    const labels = {
        card: 'Credit Card',
        email: 'Email',
        phone: 'Phone Number',
        dob: 'Date of Birth',
        address: 'Address',
    };
    const thaiLabels = {
        'Credit Card': 'บัตรเครดิต',
        'Phone Number': 'โทรศัพท์',
        Email: 'อีเมล',
        'Date of Birth': 'วันเกิด',
        Address: 'ที่อยู่',
        'ข้อความอื่น': 'ข้อความอื่น',
    };

    function addToGroup(groups, label, value, spans) {
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label).push({value, spans});
    }

    function groupsFromSpans(text, outputSpans) {
        const groups = new Map();
        const points = Array.from(text);
        for (const span of outputSpans) {
            const label = labels[span.kind];
            if (!label || span.start < 0 || span.end > points.length || span.end <= span.start) continue;
            let value = points.slice(span.start, span.end).join('');
            if (span.kind === 'dob') value = value.replace(/^DOB:[ \t]*/, '');
            else if (span.kind === 'address') value = value.replace(/^Address:[ \t]*/, '');
            addToGroup(groups, label, value, [
                {start: 0, end: Array.from(value).length, kind: span.kind},
            ]);
        }
        return groups;
    }

    function groupsFromLines(text) {
        const groups = new Map();
        for (const line of text.split(/\n/)) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            let label = 'ข้อความอื่น';
            let value = line;
            if (/^XXXX-XXXX-XXXX-\d{4}$/.test(trimmed)) label = 'Credit Card';
            else if (/^XXX-XXX-\d{4}$/.test(trimmed)) label = 'Phone Number';
            else if (/^[^\s@]+@[^\s@]+$/.test(trimmed)) label = 'Email';
            else if (/^DOB:[ \t]*XX\/XX\/\d{2}XX$/.test(trimmed)) {
                label = 'Date of Birth';
                value = trimmed.replace(/^DOB:[ \t]*/, '');
            } else if (/^Address:[ \t]*XXX(?:\s|$)/.test(trimmed)) {
                label = 'Address';
                value = trimmed.replace(/^Address:[ \t]*/, '');
            }
            addToGroup(groups, label, value, []);
        }
        return groups;
    }

    /** Group masked values by server-provided kind, with a line fallback. */
    function buildResultGroups(text, outputSpans) {
        return outputSpans.length ? groupsFromSpans(text, outputSpans) : groupsFromLines(text);
    }

    /** Render categorized values using text nodes and safe highlight marks. */
    function renderResultGroups(container, groups) {
        for (const [label, values] of groups) {
            const section = document.createElement('section');
            const heading = document.createElement('h3');
            heading.textContent = label;
            heading.setAttribute('data-en', label === 'ข้อความอื่น' ? 'Other text' : label);
            heading.setAttribute('data-th', thaiLabels[label]);
            section.append(heading);

            for (const {value, spans} of values) {
                const item = document.createElement('p');
                namespace.renderHighlights(item, value, spans);
                section.append(item);
            }
            container.append(section);
        }
    }

    /** Initialize full-text and categorized result views. */
    function initializeResultView({result, resultText, categories, viewToggle, textButton, viewMenu, outputSpans}) {
        if (!result || !resultText) return null;
        namespace.renderHighlights(resultText, result.value, outputSpans);
        if (!viewToggle) return null;

        function setView(showCategories) {
            resultText.hidden = showCategories;
            categories.hidden = !showCategories;
            viewToggle.setAttribute('aria-pressed', String(showCategories));
            textButton.setAttribute('aria-pressed', String(!showCategories));
        }

        renderResultGroups(categories, buildResultGroups(result.value, outputSpans));
        viewToggle.addEventListener('click', () => {
            if (result.value) setView(true);
        });
        textButton.addEventListener('click', () => {
            if (result.value) setView(false);
        });
        setView(false);
        viewMenu.hidden = false;
        return {setView};
    }

    namespace.buildResultGroups = buildResultGroups;
    namespace.initializeResultView = initializeResultView;
    namespace.renderResultGroups = renderResultGroups;
}(window.PdpaMasking = window.PdpaMasking || {}));
