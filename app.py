from flask import Flask, jsonify, render_template, request
import re
app = Flask(__name__)

def mask_email(match):
    return f'{match.group(1)}{"*" * len(match.group(2))}{match.group(3)}@{match.group(4)}'


# Preserve the assignment's pattern order and replacement semantics.
RULES = [
    ('card', r'\b\d{4}-\d{4}-\d{4}-(\d{4})\b', r'XXXX-XXXX-XXXX-\1'),
    ('card', r'\b\d{4}\d{4}\d{4}(\d{4})\b', r'XXXX-XXXX-XXXX-\1'),
    ('phone', r'\b\d{3}-\d{3}-(\d{4})\b', r'XXX-XXX-\1'),
    ('phone', r'\b\d{3}\d{3}(\d{4})\b', r'XXX-XXX-\1'),
    ('email', r'\b([a-zA-Z0-9._%+-])([a-zA-Z0-9._%+-]+)([a-zA-Z0-9._%+-])@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b', mask_email),
    ('dob', r'(DOB:[ \t]*)\d{2}/\d{2}/(\d{2})\d{2}(?!\d)', r'\g<1>XX/XX/\g<2>XX'),
    ('address', r'(Address:[ \t]*)\d+(?:/\d+)*(?=\s|$)', r'\g<1>XXX'),
]


def mask_with_highlights(t: str) -> dict:
    # Output characters carry original intervals, including length-changing replacements.
    mapping = [(i, i + 1, None) for i in range(len(t))]
    priority = {kind: i for i, (kind, _, _) in enumerate(RULES)}
    for kind, pattern, replacement in RULES:
        next_mapping = []
        cursor = 0

        def replace(match):
            nonlocal cursor
            value = replacement(match) if callable(replacement) else match.expand(replacement)
            next_mapping.extend(mapping[cursor:match.start()])
            old = mapping[match.start():match.end()]
            if value == match.group():
                next_mapping.extend(old)
            else:
                first_kind = min([kind] + [entry[2] for entry in old if entry[2]], key=priority.get)
                interval = (min(entry[0] for entry in old), max(entry[1] for entry in old), first_kind)
                next_mapping.extend([interval] * len(value))
            cursor = match.end()
            return value

        t = re.sub(pattern, replace, t)
        next_mapping.extend(mapping[cursor:])
        mapping = next_mapping

    merged = []
    for start, end, kind in sorted(set(entry for entry in mapping if entry[2])):
        if merged and start < merged[-1]['end']:
            merged[-1]['end'] = max(end, merged[-1]['end'])
            merged[-1]['kind'] = min(kind, merged[-1]['kind'], key=priority.get)
        else:
            merged.append({'start': start, 'end': end, 'kind': kind})
    output = []
    source_index = 0
    for i, (start, end, kind) in enumerate(mapping):
        if not kind:
            continue
        while merged[source_index]['end'] <= start:
            source_index += 1
        source = merged[source_index]
        if output and output[-1]['end'] == i and output[-1]['source'] is source:
            output[-1]['end'] = i + 1
        else:
            output.append({'start': i, 'end': i + 1, 'kind': source['kind'], 'source': source})
    return {'text': t, 'input_spans': merged,
            'output_spans': [{k: v for k, v in span.items() if k != 'source'} for span in output]}


def mask_data(t: str) -> str:
    return mask_with_highlights(t)['text']


@app.route("/")
def index():
    return render_template('index.html')

@app.route('/mask', methods = ['POST'])
def mask():
    # Browsers normalize textarea DOM values to LF; metadata must use those offsets.
    original = request.form.get('data', '').replace('\r\n', '\n').replace('\r', '\n')
    masked = mask_with_highlights(original)
    return render_template('index.html', original=original, mask_text=masked['text'],
                           highlights={'input_spans': masked['input_spans'], 'output_spans': masked['output_spans']})


@app.route('/highlight', methods=['POST'])
def highlight():
    if not request.is_json:
        return jsonify(error='Expected application/json'), 415
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or not isinstance(payload.get('text'), str):
        return jsonify(error='Expected a JSON object with a text string'), 400
    return jsonify(input_spans=mask_with_highlights(payload['text'])['input_spans'])

if __name__ == "__main__":
    app.run(debug=True)
