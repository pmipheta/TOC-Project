(function initializeHighlightsModule(namespace) {
    /** Render text and safe mark elements from Unicode code-point spans. */
    function renderHighlights(element, text, spans) {
        element.replaceChildren();
        if (!spans.length) {
            element.textContent = text;
            return;
        }

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

    /**
     * Create a debounced live-highlight controller for the input textarea.
     * @returns {{cancel: Function, initialize: Function, refresh: Function}}
     */
    function createLiveHighlighter({input, mirror, status, errorMessage}) {
        let timer;
        let controller;
        let sequence = 0;

        function cancel() {
            clearTimeout(timer);
            if (controller) controller.abort();
            sequence++;
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

        function show(text, spans) {
            if (!mirror) return;
            renderHighlights(mirror, text + (text.endsWith('\n') ? ' ' : ''), spans);
            mirror.hidden = false;
            syncMirror();
        }

        function refresh() {
            cancel();
            if (mirror) {
                mirror.replaceChildren();
                mirror.textContent = '';
                mirror.hidden = true;
            }
            if (status) status.textContent = '';
            if (!input.value) return;

            const requestSequence = sequence;
            const text = input.value;
            timer = setTimeout(async () => {
                controller = new AbortController();
                try {
                    const response = await fetch('/highlight', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({text}),
                        signal: controller.signal,
                    });
                    if (!response.ok) throw Error('Highlight request failed');
                    const data = await response.json();
                    if (requestSequence === sequence && input.value === text) show(text, data.input_spans);
                } catch (error) {
                    if (requestSequence === sequence && error.name !== 'AbortError' && status) {
                        status.textContent = errorMessage();
                    }
                }
            }, 250);
        }

        function initialize(spans) {
            if (!mirror) return;
            input.addEventListener('scroll', syncMirror);
            if (typeof ResizeObserver !== 'undefined') new ResizeObserver(syncMirror).observe(input);
            window.addEventListener('resize', syncMirror);
            document.getElementById('highlight-notice').hidden = false;
            show(input.value, spans);
        }

        return {cancel, initialize, refresh};
    }

    namespace.createLiveHighlighter = createLiveHighlighter;
    namespace.renderHighlights = renderHighlights;
}(window.PdpaMasking = window.PdpaMasking || {}));
