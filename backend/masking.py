"""Regex-based masking engine and highlight metadata generation."""

import re
from collections.abc import Callable
from typing import Match

Replacement = str | Callable[[Match[str]], str]
Rule = tuple[str, str, Replacement]


def mask_email(match: Match[str]) -> str:
    """Mask an email username while preserving its domain.

    Args:
        match: Regex match whose groups contain the username and domain.

    Returns:
        The masked email address.
    """
    username = match.group(1)
    if len(username) <= 2:
        masked = "*" * len(username)
    else:
        masked = f'{username[0]}{"*" * (len(username) - 2)}{username[-1]}'
    return f"{masked}@{match.group(2)}"


# Rule order is significant when patterns overlap. Earlier rules win.
RULES: tuple[Rule, ...] = (
    ("card", r"\b\d{4}-\d{4}-\d{4}-(\d{4})\b", r"XXXX-XXXX-XXXX-\1"),
    ("card", r"\b\d{4}\d{4}\d{4}(\d{4})\b", r"XXXX-XXXX-XXXX-\1"),
    ("phone", r"\b\d{3}-\d{3}-(\d{4})\b", r"XXX-XXX-\1"),
    ("phone", r"\b\d{3}\d{3}(\d{4})\b", r"XXX-XXX-\1"),
    ("email", r"\b([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b", mask_email),
    ("dob", r"(DOB:[ \t]*)\d{2}/\d{2}/(\d{2})\d{2}(?!\d)", r"\g<1>XX/XX/\g<2>XX"),
    ("address", r"(Address:[ \t]*)\d+(?:/\d+)*(?=\s|$)", r"\g<1>XXX"),
)


def mask_with_highlights(text: str) -> dict:
    """Mask supported formats and return text plus changed intervals.

    Args:
        text: Original text to inspect and mask.

    Returns:
        A dictionary containing masked text, input spans, and output spans.

    Span offsets are end-exclusive Unicode code-point indexes. Each span kind
    is one of ``card``, ``phone``, ``email``, ``dob``, or ``address``.
    """
    masked_text = text
    mapping = [(index, index + 1, None) for index in range(len(text))]
    priority = {kind: index for index, (kind, _, _) in enumerate(RULES)}

    for kind, pattern, replacement in RULES:
        next_mapping = []
        cursor = 0

        def replace(match: Match[str]) -> str:
            nonlocal cursor
            value = replacement(match) if callable(replacement) else match.expand(replacement)
            next_mapping.extend(mapping[cursor:match.start()])
            previous = mapping[match.start():match.end()]
            if value == match.group():
                next_mapping.extend(previous)
            else:
                first_kind = min(
                    [kind] + [entry[2] for entry in previous if entry[2]],
                    key=priority.get,
                )
                interval = (
                    min(entry[0] for entry in previous),
                    max(entry[1] for entry in previous),
                    first_kind,
                )
                next_mapping.extend([interval] * len(value))
            cursor = match.end()
            return value

        masked_text = re.sub(pattern, replace, masked_text)
        next_mapping.extend(mapping[cursor:])
        mapping = next_mapping

    merged = []
    for start, end, kind in sorted(set(entry for entry in mapping if entry[2])):
        if merged and start < merged[-1]["end"]:
            merged[-1]["end"] = max(end, merged[-1]["end"])
            merged[-1]["kind"] = min(kind, merged[-1]["kind"], key=priority.get)
        else:
            merged.append({"start": start, "end": end, "kind": kind})

    output = []
    source_index = 0
    for index, (start, _, kind) in enumerate(mapping):
        if not kind:
            continue
        while merged[source_index]["end"] <= start:
            source_index += 1
        source = merged[source_index]
        if output and output[-1]["end"] == index and output[-1]["source"] is source:
            output[-1]["end"] = index + 1
        else:
            output.append({"start": index, "end": index + 1, "kind": source["kind"], "source": source})

    return {
        "text": masked_text,
        "input_spans": merged,
        "output_spans": [
            {key: value for key, value in span.items() if key != "source"}
            for span in output
        ],
    }


def mask_data(text: str) -> str:
    """Return text with all supported personal-data formats masked.

    Args:
        text: Original text to inspect and mask.

    Returns:
        Masked text with unsupported formats left unchanged.
    """
    return mask_with_highlights(text)["text"]
