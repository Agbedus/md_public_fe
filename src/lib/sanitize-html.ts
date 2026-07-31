/**
 * Sanitize rich-text content before rendering it with `dangerouslySetInnerHTML`.
 *
 * Two jobs:
 *
 * 1. **Safety** — drop scripts, inline event handlers and `javascript:` URLs.
 *
 * 2. **Theme neutrality** — strip colour declarations from inline styles. The
 *    editor writes the colour the author saw at the time, so a note written in
 *    dark mode carries `color: #fff` on its paragraphs and stays white-on-white
 *    when the reader is in light mode (and vice versa). Removing the colour lets
 *    the text inherit the theme token from its container, so the same note is
 *    legible in both themes. Everything else the author chose — bold, italic,
 *    alignment, size — is preserved.
 */

/** Style properties that hardcode a theme and must not survive into the DOM. */
const THEME_HOSTILE_STYLE_PROPS = [
    'color',
    'background',
    'background-color',
];

function stripThemeColours(el: Element): void {
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
 * Returns sanitized, theme-neutral HTML.
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

        // Quill/TipTap also emit `class="ql-color-white"`-style helpers; those
        // resolve through the editor stylesheet, which is not loaded here, so
        // only the inline case needs handling.
        stripThemeColours(el);
    }

    return doc.body.innerHTML;
}
