export const EMPTY_NOTE_CHECKLIST = '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li></ul>';

/** Bring older Quill checklists into the same structure the note editor saves. */
export function normalizeNoteContent(html: string): string {
  if (!html || typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');

  doc.querySelectorAll('ol, ul').forEach((list) => {
    if (!Array.from(list.children).some((item) => ['checked', 'unchecked'].includes(item.getAttribute('data-list') || ''))) return;
    const fragment = doc.createDocumentFragment();
    let group: Element | null = null;
    let previousWasTask: boolean | null = null;
    Array.from(list.children).forEach((item) => {
      const task = ['checked', 'unchecked'].includes(item.getAttribute('data-list') || '');
      if (!group || task !== previousWasTask) {
        group = task ? doc.createElement('ul') : list.cloneNode(false) as Element;
        if (task) group.setAttribute('data-type', 'taskList');
        fragment.appendChild(group);
      }
      previousWasTask = task;
      if (task) {
        const checked = item.getAttribute('data-list') === 'checked';
        item.removeAttribute('data-list');
        item.setAttribute('data-type', 'taskItem');
        item.setAttribute('data-checked', String(checked));
        item.querySelectorAll('.ql-ui').forEach((ui) => ui.remove());
        const content = doc.createElement('div');
        const paragraph = doc.createElement('p');
        while (item.firstChild) paragraph.appendChild(item.firstChild);
        content.appendChild(paragraph);
        const label = doc.createElement('label');
        const checkbox = doc.createElement('input');
        checkbox.type = 'checkbox';
        if (checked) checkbox.setAttribute('checked', 'checked');
        label.append(checkbox, doc.createElement('span'));
        item.append(label, content);
      }
      group.appendChild(item);
    });
    list.replaceWith(fragment);
  });

  doc.querySelectorAll('li[data-type="taskItem"]').forEach((item) => {
    const checkbox = item.querySelector<HTMLInputElement>(':scope > label > input[type="checkbox"]');
    if (!checkbox) return;
    const checked = item.getAttribute('data-checked') === 'true';
    checkbox.toggleAttribute('checked', checked);
    checkbox.setAttribute('aria-label', item.querySelector(':scope > div')?.textContent?.trim() || 'Checklist item');
  });
  return doc.body.innerHTML;
}
