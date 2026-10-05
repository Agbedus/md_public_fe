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
} from "react-icons/fi";

export interface CommandItemProps {
  title: string;
  description: string;
  icon: React.ReactNode;
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
      icon: <FiList size={18} className="text-[var(--pastel-emerald)]" />,
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
  ];

  return items
    .filter((item) =>
      item.title.toLowerCase().includes(query.trim().toLowerCase()),
    )
    .slice(0, 10);
};

interface CommandListHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const CommandList = forwardRef<
  CommandListHandle,
  SuggestionProps<CommandItemProps>
>((props, ref) => {
  const [selection, setSelection] = useState({ query: props.query, index: 0 });
  const selectedIndex =
    selection.query === props.query
      ? Math.min(selection.index, props.items.length - 1)
      : 0;
  const listRef = useRef<HTMLDivElement>(null);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelection({
      query: props.query,
      index: (selectedIndex + props.items.length - 1) % props.items.length,
    });
  };

  const downHandler = () => {
    setSelection({
      query: props.query,
      index: (selectedIndex + 1) % props.items.length,
    });
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, props.query]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (props.items.length === 0) return false;
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
      return false;
    },
  }));

  if (props.items.length === 0) {
    return (
      <div className="rounded-xl border border-card-border bg-card p-3 text-xs text-text-muted">
        No matching command. Press Escape to keep typing.
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label="Note slash commands"
      className="w-72 max-w-[calc(100vw-24px)] max-h-[min(320px,50dvh)] overflow-y-auto overscroll-contain bg-card border border-card-border rounded-xl shadow-lg p-1"
    >
      {props.items.map((item: CommandItemProps, index: number) => (
        <button
          type="button"
          role="option"
          aria-selected={index === selectedIndex}
          onMouseDown={(event) => event.preventDefault()}
          className={`flex items-center gap-3 w-full px-3 py-2 text-left rounded-xl transition-all ${
            index === selectedIndex
              ? "bg-foreground/[0.07] text-foreground border border-card-border"
              : "text-text-secondary hover:bg-foreground/[0.04] hover:text-foreground border border-transparent"
          }`}
          key={item.title}
          onClick={() => selectItem(index)}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-foreground/[0.03] border border-card-border flex-shrink-0">
            {item.icon}
          </div>
          <div>
            <p className="text-xs font-medium">{item.title}</p>
            <p className="text-[11px] text-text-muted">{item.description}</p>
          </div>
        </button>
      ))}
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
