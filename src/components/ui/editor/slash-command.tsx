import { Extension, type Editor, type Range } from "@tiptap/core";
import Suggestion, {
  exitSuggestion,
  type SuggestionProps,
  type SuggestionKeyDownProps,
} from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useId,
  useRef,
  useState,
} from "react";
import {
  FiType,
  FiList,
  FiCheckSquare,
  FiCode,
  FiMinus,
  FiMessageSquare,
  FiBold, FiItalic, FiUnderline, FiAlignLeft, FiAlignCenter, FiAlignRight,
  FiSearch, FiX, FiCalendar,
} from "react-icons/fi";

export interface CommandItemProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  keywords?: string;
  command: (props: { editor: Editor; range: Range }) => void;
}

export const getSuggestionItems = ({
  query,
}: {
  query: string;
}): CommandItemProps[] => {
  const items: CommandItemProps[] = [
    {
      title: "Body",
      description: "Return to ordinary body text.",
      icon: <FiType size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setParagraph().run();
      },
    },
    {
      title: "Checklist",
      keywords: "todo task checkbox check box",
      description: "Create a list with checkboxes.",
      icon: <FiCheckSquare size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run();
      },
    },
    {
      title: "Heading 1",
      description: "Big section heading.",
      icon: <FiType size={18} className="text-[var(--pastel-indigo)]" />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode("heading", { level: 1 })
          .run();
      },
    },
    {
      title: "Heading 2",
      description: "Medium section heading.",
      icon: <FiType size={18} className="text-[var(--pastel-blue)]" />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode("heading", { level: 2 })
          .run();
      },
    },
    {
      title: "Heading 3",
      description: "Small section heading.",
      icon: <FiType size={18} className="text-[var(--pastel-purple)]" />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode("heading", { level: 3 })
          .run();
      },
    },
    {
      title: "Bullet List",
      description: "Create a simple bulleted list.",
      icon: <FiList size={18} className="text-accent-text" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: "Numbered List",
      description: "Create an ordered sequence.",
      icon: <FiList size={18} className="text-[var(--pastel-amber)]" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: "Blockquote",
      description: "Set a quote apart from the text.",
      icon: <FiMessageSquare size={18} className="text-[var(--pastel-rose)]" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      },
    },
    {
      title: "Code Block",
      description: "Capture code or commands.",
      icon: <FiCode size={18} className="text-text-muted" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
      },
    },
    {
      title: "Divider",
      description: "Insert a horizontal line.",
      icon: <FiMinus size={18} className="text-text-muted" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
    ...([
      { title: "Bold", description: "Emphasize text with bold weight.", icon: <FiBold size={18} />, mark: "bold" },
      { title: "Italic", description: "Add emphasis with italic text.", icon: <FiItalic size={18} />, mark: "italic" },
      { title: "Underline", description: "Underline your text.", icon: <FiUnderline size={18} />, mark: "underline" },
      { title: "Strikethrough", description: "Strike through text.", icon: <span className="line-through">S</span>, mark: "strike" },
      { title: "Inline Code", description: "Format a short piece of code.", icon: <FiCode size={18} />, mark: "code" },
    ]).map(({ mark, ...item }) => ({
      ...item,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleMark(mark).run();
      },
    })),
    ...([
      { title: "Align Left", value: "left", icon: <FiAlignLeft size={18} /> },
      { title: "Align Center", value: "center", icon: <FiAlignCenter size={18} /> },
      { title: "Align Right", value: "right", icon: <FiAlignRight size={18} /> },
    ]).map(({ value, ...item }) => ({
      ...item,
      description: `Align this block to the ${value}.`,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range)
          .updateAttributes("paragraph", { textAlign: value })
          .updateAttributes("heading", { textAlign: value }).run();
      },
    })),
    {
      title: "Clear Formatting",
      description: "Return this block to plain text.",
      keywords: "reset plain remove format",
      icon: <FiX size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).clearNodes().unsetAllMarks().run();
      },
    },
    {
      title: "Today’s Date",
      description: "Insert today’s date.",
      keywords: "date today timestamp",
      icon: <FiCalendar size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertContent(new Date().toLocaleDateString(undefined, { dateStyle: "long" })).run();
      },
    },
  ];

  return items
    .filter((item) =>
      `${item.title} ${item.description} ${item.keywords || ""}`.toLowerCase().includes(query.trim().toLowerCase()),
    );
};

interface CommandListHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const CommandList = forwardRef<
  CommandListHandle,
  SuggestionProps<CommandItemProps>
>((props, ref) => {
  const [search, setSearch] = useState({ source: props.query, value: props.query });
  const query = search.source === props.query ? search.value : props.query;
  const items = getSuggestionItems({ query });
  const [selection, setSelection] = useState({ query, index: 0 });
  const selectedIndex =
    selection.query === query
      ? Math.max(0, Math.min(selection.index, items.length - 1))
      : 0;
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selectItem = (index: number) => {
    const item = items[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelection({
      query,
      index: (selectedIndex + items.length - 1) % items.length,
    });
  };

  const downHandler = () => {
    setSelection({
      query,
      index: (selectedIndex + 1) % items.length,
    });
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, query]);

  const onKeyDown = ({ event }: { event: KeyboardEvent | React.KeyboardEvent }) => {
      if (items.length === 0) return false;
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }
      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }
      if (event.key === "Enter") {
        enterHandler();
        return true;
      }
      if (event.key === "Home" || event.key === "End") {
        setSelection({ query, index: event.key === "Home" ? 0 : items.length - 1 });
        return true;
      }
      return false;
  };
  useImperativeHandle(ref, () => ({ onKeyDown }));

  return (
    <div
      data-note-editor-controls
      className="md-menu w-80 max-w-[calc(100vw-24px)] shadow-md"
    >
      <div className="p-1 pb-1.5">
        <div className="relative">
          <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input
            role="combobox"
            aria-label="Search note commands"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={items.length ? `${listId}-${selectedIndex}` : undefined}
            value={query}
            onChange={(event) => setSearch({ source: props.query, value: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Escape" || event.key === "Tab") {
                if (event.key === "Escape") event.preventDefault();
                event.stopPropagation();
                exitSuggestion(props.editor.view);
                if (event.key === "Escape") props.editor.commands.focus();
              } else if (onKeyDown({ event })) event.preventDefault();
            }}
            placeholder="Search commands…"
            className="h-10 w-full border border-card-border bg-input-bg pl-9 pr-3 text-sm text-foreground placeholder:text-text-muted"
          />
        </div>
      </div>
      <div ref={listRef} id={listId} role="listbox" aria-label="Note slash commands" className="max-h-[min(360px,45dvh)] overflow-y-auto overscroll-contain">
      {items.map((item: CommandItemProps, index: number) => (
        <button
          id={`${listId}-${index}`}
          type="button"
          role="option"
          tabIndex={-1}
          aria-selected={index === selectedIndex}
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => setSelection({ query, index })}
          className={`md-menu-item gap-3 ${index === selectedIndex ? "bg-foreground/[0.06]" : "text-text-secondary"}`}
          key={item.title}
          onClick={() => selectItem(index)}
        >
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-foreground/[0.05]">
            {item.icon}
          </div>
          <div className="min-w-0 py-1">
            <p className="text-sm font-medium">{item.title}</p>
            <p className="text-xs leading-snug text-text-muted">{item.description}</p>
          </div>
        </button>
      ))}
      {items.length === 0 && <p role="status" className="px-3.5 py-4 text-sm text-text-muted">No matching commands.</p>}
      </div>
    </div>
  );
});

CommandList.displayName = "CommandList";

export default Extension.create({
  name: "slashCommand",
  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: true,
        allowSpaces: true,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: Range;
          props: CommandItemProps;
        }) => {
          props.command({ editor, range });
        },
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export const renderItems = () => {
  let component: ReactRenderer<CommandListHandle> | undefined;
  let popup: TippyInstance[] = [];

  return {
    onStart: (props: SuggestionProps<CommandItemProps>) => {
      component = new ReactRenderer(CommandList, {
        props,
        editor: props.editor,
      });

      const rect = props.clientRect?.();
      if (!rect) {
        return;
      }

      popup = tippy("body", {
        getReferenceClientRect: () => props.clientRect?.() || rect,
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: "manual",
        placement: "bottom-start",
        zIndex: 10000,
        maxWidth: "calc(100vw - 24px)",
        duration: 0,
        onClickOutside: () => exitSuggestion(props.editor.view),
        arrow: false,
        popperOptions: {
          modifiers: [
            {
              name: "flip",
              options: {
                fallbackPlacements: ["top-start", "bottom-end", "top-end"],
              },
            },
            { name: "preventOverflow", options: { padding: 12 } },
          ],
        },
      });
    },
    onUpdate(props: SuggestionProps<CommandItemProps>) {
      component?.updateProps(props);

      const rect = props.clientRect?.();
      if (!rect) {
        return;
      }

      popup[0]?.setProps({
        getReferenceClientRect: () => props.clientRect?.() || rect,
      });
    },
    onKeyDown(props: SuggestionKeyDownProps) {
      if (props.event.key === "Escape" || props.event.key === "Tab") {
        exitSuggestion(props.view);
        if (props.event.key === "Tab") return false;
        return true;
      }
      return component?.ref?.onKeyDown(props) || false;
    },
    onExit() {
      popup[0]?.destroy();
      component?.destroy();
    },
  };
};
