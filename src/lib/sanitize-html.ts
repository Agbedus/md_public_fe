/**
 * Sanitize rich-text content before rendering it with `dangerouslySetInnerHTML`.
 *
 * Two jobs:
 *
 * 1. **Safety** — drop scripts, inline event handlers and `javascript:` URLs.
 *
 * 2. **Reading surfaces** — strip saved background declarations, while keeping
 *    intentional text colours and formatting. Uncoloured text inherits the
 *    reader's theme; explicitly coloured text must match the saved note.
 */

/** Style properties that hardcode a theme and must not survive into the DOM. */
const THEME_HOSTILE_STYLE_PROPS = [
    'background',
    'background-color',
];

function stripSavedBackgrounds(el: Element): void {
    const style = el.getAttribute('style');
    if (!style) return;

    const kept = style
        .split(';')
        .map((decl) => decl.trim())
        .filter(Boolean)
        .filter((decl) => {
            const prop = decl.split(':')[0]?.trim().toLowerCase();
            return prop ? !THEME_HOSTILE_STYLE_PROPS.includes(prop) : false;
        });

    if (kept.length > 0) {
        el.setAttribute('style', kept.join('; '));
    } else {
        el.removeAttribute('style');
    }
}

/**
 * Returns sanitized HTML with authored text formatting intact.
 *
 * Returns an empty string on the server: it relies on `DOMParser`, so callers
 * should render it only after mount to avoid a hydration mismatch.
 */
export function sanitizeHtml(html: string): string {
    if (!html) return '';
    if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    doc.querySelectorAll('script, style').forEach((node) => node.remove());

    const elements = doc.getElementsByTagName('*');
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        for (const attr of Array.from(el.attributes)) {
            const name = attr.name.toLowerCase();
            const value = attr.value;

            if (name.startsWith('on')) {
                el.removeAttribute(attr.name);
                continue;
            }
            if (
                (name === 'href' || name === 'src') &&
                value.trim().toLowerCase().startsWith('javascript:')
            ) {
                el.removeAttribute(attr.name);
                continue;
            }
        }

        // Checklists in read-only cards must not appear to save local toggles.
        if (el.tagName === 'INPUT' && el.getAttribute('type') === 'checkbox') {
            el.setAttribute('disabled', '');
        }
        stripSavedBackgrounds(el);
    }

    return doc.body.innerHTML;
}
