import { Mark, Node, mergeAttributes } from '@tiptap/core';
import Paragraph from '@tiptap/extension-paragraph';
import Heading from '@tiptap/extension-heading';

export const NOTE_COLORS = [
  { name: 'Default', value: '' },
  { name: 'Indigo', value: '#818cf8' },
  { name: 'Emerald', value: '#34d399' },
  { name: 'Blue', value: '#60a5fa' },
  { name: 'Purple', value: '#c084fc' },
  { name: 'Rose', value: '#fb7185' },
  { name: 'Amber', value: '#fbbf24' },
];
const blockAttributes = {
  textAlign: {
    default: null,
    parseHTML: (element: HTMLElement) => element.style.textAlign || null,
    renderHTML: (attrs: Record<string, unknown>) =>
      attrs.textAlign ? { style: `text-align: ${attrs.textAlign}` } : {},
  },
  color: {
    default: null,
    parseHTML: (element: HTMLElement) => element.style.color || null,
    renderHTML: (attrs: Record<string, unknown>) =>
      attrs.color ? { style: `color: ${attrs.color}` } : {},
  },
};
export const NoteParagraph = Paragraph.extend({
  addAttributes() {
    return { ...this.parent?.(), ...blockAttributes };
  },
});
export const NoteHeading = Heading.extend({
  addAttributes() {
    return { ...this.parent?.(), ...blockAttributes };
  },
});
// Keep colour on selected text; never persist either client's displayed font size.
export const NoteTextColor = Mark.create({
  name: 'noteTextColor',
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => {
          const value = element.style.color;
          const rgb = value.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/);
          return rgb
            ? '#' +
                rgb
                  .slice(1)
                  .map((channel) => Number(channel).toString(16).padStart(2, '0'))
                  .join('')
            : value || null;
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[style]', getAttrs: (element) => (element.style.color ? {} : false) }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', { style: `color: ${HTMLAttributes.color}` }, 0];
  },
});
export const NoteImage = Node.create({
  name: 'noteImage',
  inline: true,
  group: 'inline',
  atom: true,
  draggable: true,
  addAttributes() {
    return { src: { default: null }, alt: { default: 'Note image' }, title: { default: null } };
  },
  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (element) =>
          /^(https:\/\/|data:image\/(jpeg|png);base64,)/i.test(element.getAttribute('src') || '')
            ? {}
            : false,
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    if (!/^(https:\/\/|data:image\/(jpeg|png);base64,)/i.test(String(HTMLAttributes.src || '')))
      return ['span', {}, 'Image unavailable'];
    return [
      'img',
      mergeAttributes(HTMLAttributes, {
        class: 'max-w-full h-auto rounded-lg',
        loading: 'lazy',
        referrerpolicy: 'no-referrer',
      }),
    ];
  },
});
