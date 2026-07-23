import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { FiType, FiList, FiCheckSquare, FiCode, FiMinus, FiMessageSquare } from 'react-icons/fi';

export interface CommandItemProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (props: { editor: any; range: any }) => void;
}

export const getSuggestionItems = ({ query }: { query: string }): CommandItemProps[] => {
  const items: CommandItemProps[] = [
    {
      title: 'Heading 1',
      description: 'Big section heading.',
      icon: <FiType size={18} className="text-[var(--pastel-indigo)]" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
      },
    },
    {
      title: 'Heading 2',
      description: 'Medium section heading.',
      icon: <FiType size={18} className="text-[var(--pastel-blue)]" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
      },
    },
    {
      title: 'Heading 3',
      description: 'Small section heading.',
      icon: <FiType size={18} className="text-[var(--pastel-purple)]" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
      },
    },
    {
      title: 'Bullet List',
      description: 'Create a simple bulleted list.',
      icon: <FiList size={18} className="text-[var(--pastel-emerald)]" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: 'Numbered List',
      description: 'Create an ordered sequence.',
      icon: <FiList size={18} className="text-[var(--pastel-amber)]" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: 'Blockquote',
      description: 'Insert an operational quotation.',
      icon: <FiMessageSquare size={18} className="text-[var(--pastel-rose)]" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      },
    },
    {
      title: 'Code Block',
      description: 'Capture code or commands.',
      icon: <FiCode size={18} className="text-[var(--pastel-teal)]" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
      },
    },
    {
      title: 'Divider',
      description: 'Insert a horizontal line.',
      icon: <FiMinus size={18} className="text-text-muted" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
  ];

  return items.filter(item => item.title.toLowerCase().startsWith(query.toLowerCase())).slice(0, 10);
};

export const CommandList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }
      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }
      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }
      return false;
    },
  }));

  if (props.items.length === 0) {
    return null;
  }

  return (
    <div className="z-50 w-72 bg-background/95 backdrop-blur-md border border-card-border rounded-2xl shadow-2xl overflow-hidden p-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
      {props.items.map((item: CommandItemProps, index: number) => (
        <button
          className={`flex items-center gap-3 w-full px-3 py-2 text-left rounded-xl transition-all ${
            index === selectedIndex 
              ? 'bg-foreground/[0.07] text-foreground font-bold border border-card-border' 
              : 'text-text-secondary hover:bg-foreground/[0.04] hover:text-foreground border border-transparent'
          }`}
          key={index}
          onClick={() => selectItem(index)}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-foreground/[0.03] border border-card-border flex-shrink-0">
            {item.icon}
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-tight">{item.title}</p>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">{item.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
});

CommandList.displayName = 'CommandList';

export default Extension.create({
  name: 'slashCommand',
  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: { editor: any; range: any; props: any }) => {
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
  let component: ReactRenderer;
  let popup: TippyInstance[];

  return {
    onStart: (props: any) => {
      component = new ReactRenderer(CommandList, {
        props,
        editor: props.editor,
      });

      if (!props.clientRect) {
        return;
      }

      popup = tippy('body', {
        getReferenceClientRect: props.clientRect,
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom-start',
      });
    },
    onUpdate(props: any) {
      component.updateProps(props);

      if (!props.clientRect) {
        return;
      }

      popup[0].setProps({
        getReferenceClientRect: props.clientRect,
      });
    },
    onKeyDown(props: any) {
      if (props.event.key === 'Escape') {
        popup[0].hide();
        return true;
      }
      return (component.ref as any)?.onKeyDown(props);
    },
    onExit() {
      popup[0].destroy();
      component.destroy();
    },
  };
};
