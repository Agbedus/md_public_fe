'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Paragraph from '@tiptap/extension-paragraph';
import Heading from '@tiptap/extension-heading';
import Image from 'next/image';
import SlashCommand, { getSuggestionItems, renderItems } from './slash-command';
import { useEffect, useState } from 'react';
import { Portal } from '@/components/ui/portal';
import { toast } from '@/lib/toast';
import { 
  FiBold, FiItalic, FiTrash2, 
  FiAlignLeft, FiAlignCenter, FiAlignRight, 
  FiDroplet, FiRotateCcw, FiRotateCw, FiCode,
  FiList, FiMessageSquare, FiMinus, FiCopy, FiClipboard
} from 'react-icons/fi';

const CustomParagraph = Paragraph.extend({
  addAttributes() {
    return {
      textAlign: {
        default: null,
        parseHTML: element => element.style.textAlign || null,
        renderHTML: attributes => {
          if (!attributes.textAlign) return {};
          return { style: `text-align: ${attributes.textAlign}` };
        },
      },
      color: {
        default: null,
        parseHTML: element => element.style.color || null,
        renderHTML: attributes => {
          if (!attributes.color) return {};
          return { style: `color: ${attributes.color}` };
        },
      },
    };
  },
});

const CustomHeading = Heading.extend({
  addAttributes() {
    return {
      textAlign: {
        default: null,
        parseHTML: element => element.style.textAlign || null,
        renderHTML: attributes => {
          if (!attributes.textAlign) return {};
          return { style: `text-align: ${attributes.textAlign}` };
        },
      },
      color: {
        default: null,
        parseHTML: element => element.style.color || null,
        renderHTML: attributes => {
          if (!attributes.color) return {};
          return { style: `color: ${attributes.color}` };
        },
      },
    };
  },
});

const COLORS = [
  { name: 'Default', value: '' },
  { name: 'Indigo', value: '#818cf8' },
  { name: 'Emerald', value: '#34d399' },
  { name: 'Blue', value: '#60a5fa' },
  { name: 'Purple', value: '#c084fc' },
  { name: 'Rose', value: '#fb7185' },
  { name: 'Amber', value: '#fbbf24' },
];

interface SlashCommandEditorProps {
  initialContent?: string;
  onChange: (content: string) => void;
  user?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function SlashCommandEditor({ initialContent, onChange, user }: SlashCommandEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBottomColorPicker, setShowBottomColorPicker] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        paragraph: false,
      }),
      CustomParagraph,
      CustomHeading.configure({
        levels: [1, 2, 3],
      }),
      Placeholder.configure({
        placeholder: 'Press / for commands, or start typing...',
        emptyEditorClass: 'is-editor-empty',
      }),
      SlashCommand.configure({
        suggestion: {
          items: getSuggestionItems,
          render: renderItems,
        },
      }),
    ],
    content: initialContent || '',
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm sm:prose-base focus:outline-none min-h-[25rem] w-full max-w-none text-foreground transition-colors',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Highlight Selection Listener to Position Custom Bubble Menu
  useEffect(() => {
    if (!editor) return;

    const handleSelection = () => {
      const { selection } = editor.state;
      if (selection.empty || selection.from === selection.to) {
        setMenuCoords(null);
        setShowColorPicker(false);
        return;
      }

      const { view } = editor;
      try {
        const { from, to } = selection;
        const startCoords = view.coordsAtPos(from);
        const endCoords = view.coordsAtPos(to);

        // Calculate center positioning
        const left = (startCoords.left + endCoords.left) / 2;
        const top = startCoords.top - 12; // place just above selection line

        setMenuCoords({ top, left });
      } catch (e) {
        // Fallback for edge cases
      }
    };

    editor.on('selectionUpdate', handleSelection);
    editor.on('focus', handleSelection);
    
    // Delayed blur to allow menu operations before dismissal
    const handleBlur = () => {
      setTimeout(() => {
        if (typeof document !== 'undefined' && !document.activeElement?.closest('.bubble-menu-container')) {
          setMenuCoords(null);
          setShowColorPicker(false);
        }
      }, 250);
    };

    editor.on('blur', handleBlur);

    return () => {
      editor.off('selectionUpdate', handleSelection);
      editor.off('focus', handleSelection);
      editor.off('blur', handleBlur);
    };
  }, [editor]);

  // Re-sync initialContent if it changes externally
  useEffect(() => {
    if (editor && initialContent !== undefined && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent);
    }
  }, [initialContent, editor]);

  const setAlignment = (align: string) => {
    if (!editor) return;
    if (editor.isActive('heading')) {
      editor.commands.updateAttributes('heading', { textAlign: align });
    } else {
      editor.commands.updateAttributes('paragraph', { textAlign: align });
    }
  };

  const setTextColor = (color: string) => {
    if (!editor) return;
    const value = color || null;
    if (editor.isActive('heading')) {
      editor.commands.updateAttributes('heading', { color: value });
    } else {
      editor.commands.updateAttributes('paragraph', { color: value });
    }
  };

  const handleCopy = async () => {
    if (!editor) return;
    const { selection } = editor.state;
    const text = editor.state.doc.textBetween(selection.from, selection.to);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Selection copied to clipboard.");
    } catch (e) {
      toast.error("Failed to copy text.");
    }
  };

  const handlePaste = async () => {
    if (!editor) return;
    try {
      const text = await navigator.clipboard.readText();
      editor.chain().focus().insertContent(text).run();
      toast.success("Text pasted from clipboard.");
    } catch (e) {
      toast.error("Clipboard permission denied or empty.");
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between">
      {editor && menuCoords && (
        <Portal>
          <div
            style={{
              position: 'fixed',
              top: `${menuCoords.top}px`,
              left: `${menuCoords.left}px`,
              transform: 'translate(-50%, -100%)',
            }}
            className="bubble-menu-container flex items-center gap-0.5 p-1 bg-background/95 backdrop-blur-md border border-card-border rounded-xl shadow-xl z-[9999] animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Copy */}
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-text-muted hover:text-foreground hover:bg-foreground/[0.04] transition-all"
              title="Copy"
            >
              <FiCopy size={14} />
            </button>

            {/* Paste */}
            <button
              type="button"
              onClick={handlePaste}
              className="p-1.5 rounded-lg text-text-muted hover:text-foreground hover:bg-foreground/[0.04] transition-all"
              title="Paste"
            >
              <FiClipboard size={14} />
            </button>

            <div className="h-4 w-[1px] bg-card-border mx-1" />

            {/* Bold */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                editor.isActive('bold') 
                  ? 'bg-foreground/[0.08] text-foreground border border-card-border/50' 
                  : 'text-text-muted hover:bg-foreground/[0.04] hover:text-foreground'
              }`}
              title="Bold"
            >
              <FiBold size={14} />
            </button>

            {/* Italic */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                editor.isActive('italic') 
                  ? 'bg-foreground/[0.08] text-foreground border border-card-border/50' 
                  : 'text-text-muted hover:bg-foreground/[0.04] hover:text-foreground'
              }`}
              title="Italic"
            >
              <FiItalic size={14} />
            </button>

            {/* Strike */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                editor.isActive('strike') 
                  ? 'bg-foreground/[0.08] text-foreground border border-card-border/50' 
                  : 'text-text-muted hover:bg-foreground/[0.04] hover:text-foreground'
              }`}
              title="Strike"
            >
              <FiTrash2 size={14} />
            </button>

            <div className="h-4 w-[1px] bg-card-border mx-1" />

            {/* Align Left */}
            <button
              type="button"
              onClick={() => setAlignment('left')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all text-text-muted hover:bg-foreground/[0.04] hover:text-foreground`}
              title="Align Left"
            >
              <FiAlignLeft size={14} />
            </button>

            {/* Align Center */}
            <button
              type="button"
              onClick={() => setAlignment('center')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all text-text-muted hover:bg-foreground/[0.04] hover:text-foreground`}
              title="Align Center"
            >
              <FiAlignCenter size={14} />
            </button>

            {/* Align Right */}
            <button
              type="button"
              onClick={() => setAlignment('right')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all text-text-muted hover:bg-foreground/[0.04] hover:text-foreground`}
              title="Align Right"
            >
              <FiAlignRight size={14} />
            </button>

            <div className="h-4 w-[1px] bg-card-border mx-1" />

            {/* Color Picker Popover Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowColorPicker(!showColorPicker);
                }}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all text-text-muted hover:bg-foreground/[0.04] hover:text-foreground flex items-center gap-1`}
                title="Text Color"
              >
                <FiDroplet size={14} />
              </button>

              {showColorPicker && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 p-2 bg-background border border-card-border rounded-xl shadow-xl z-50 flex items-center gap-1.5">
                  {COLORS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => {
                        setTextColor(c.value);
                        setShowColorPicker(false);
                      }}
                      className="h-5 w-5 rounded-full border border-card-border transition-transform hover:scale-110 flex items-center justify-center"
                      style={{ backgroundColor: c.value || "var(--foreground)" }}
                      title={c.name}
                    >
                      {!c.value && <span className="text-[8px] font-black text-background">D</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}

      <div className="flex-1 w-full">
        <EditorContent editor={editor} className="w-full h-full tiptap-editor" />
      </div>

      {/* Persistent Bottom Toolbar & Author Avatar */}
      {editor && (
        <div className="mt-8 pt-5 border-t border-card-border flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Bottom Left: User Avatar & Identifier */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-foreground/[0.03] flex-shrink-0 relative overflow-hidden ring-2 ring-foreground/[0.03] border border-card-border">
              {user?.image ? (
                <Image src={user.image} alt={user.name || 'Owner'} fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-emerald-500 bg-emerald-500/10">
                  {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-foreground truncate uppercase tracking-tight leading-none">
                {user?.name || user?.email?.split('@')[0] || 'Unknown Author'}
              </p>
              <p className="text-[8px] text-text-muted uppercase tracking-widest font-bold mt-1 leading-none">
                Note Owner
              </p>
            </div>
          </div>

          {/* Bottom Right: Formatting Toolbar Buttons */}
          <div className="flex flex-wrap items-center gap-1 bg-foreground/[0.02] border border-card-border p-1 rounded-xl shadow-sm">
            {/* Undo */}
            <button
              type="button"
              onClick={() => editor.chain().focus().undo().run()}
              className="p-1.5 rounded-lg text-text-muted hover:text-foreground hover:bg-foreground/[0.04] transition-all"
              title="Undo (Ctrl+Z)"
            >
              <FiRotateCcw size={13} />
            </button>
            
            {/* Redo */}
            <button
              type="button"
              onClick={() => editor.chain().focus().redo().run()}
              className="p-1.5 rounded-lg text-text-muted hover:text-foreground hover:bg-foreground/[0.04] transition-all"
              title="Redo (Ctrl+Y)"
            >
              <FiRotateCw size={13} />
            </button>

            <div className="h-4 w-[1px] bg-card-border mx-1" />

            {/* Bold */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                editor.isActive('bold') ? 'bg-foreground/[0.06] text-foreground font-black' : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.04]'
              }`}
              title="Bold"
            >
              <FiBold size={13} />
            </button>
            
            {/* Italic */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                editor.isActive('italic') ? 'bg-foreground/[0.06] text-foreground font-black' : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.04]'
              }`}
              title="Italic"
            >
              <FiItalic size={13} />
            </button>

            {/* Code */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                editor.isActive('code') ? 'bg-foreground/[0.06] text-foreground font-black' : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.04]'
              }`}
              title="Inline Code"
            >
              <FiCode size={13} />
            </button>

            <div className="h-4 w-[1px] bg-card-border mx-1" />

            {/* H1 */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`h-6 px-1.5 rounded-lg text-[10px] font-black transition-all ${
                editor.isActive('heading', { level: 1 }) ? 'bg-foreground/[0.06] text-foreground' : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.04]'
              }`}
              title="Heading 1"
            >
              H1
            </button>

            {/* H2 */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`h-6 px-1.5 rounded-lg text-[10px] font-black transition-all ${
                editor.isActive('heading', { level: 2 }) ? 'bg-foreground/[0.06] text-foreground' : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.04]'
              }`}
              title="Heading 2"
            >
              H2
            </button>

            {/* H3 */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`h-6 px-1.5 rounded-lg text-[10px] font-black transition-all ${
                editor.isActive('heading', { level: 3 }) ? 'bg-foreground/[0.06] text-foreground' : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.04]'
              }`}
              title="Heading 3"
            >
              H3
            </button>

            <div className="h-4 w-[1px] bg-card-border mx-1" />

            {/* Bullet List */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                editor.isActive('bulletList') ? 'bg-foreground/[0.06] text-foreground font-black' : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.04]'
              }`}
              title="Bullet List"
            >
              <FiList size={13} />
            </button>

            {/* Blockquote */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                editor.isActive('blockquote') ? 'bg-foreground/[0.06] text-foreground font-black' : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.04]'
              }`}
              title="Blockquote"
            >
              <FiMessageSquare size={13} />
            </button>

            {/* Divider */}
            <button
              type="button"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              className="p-1.5 rounded-lg text-text-muted hover:text-foreground hover:bg-foreground/[0.04] transition-all"
              title="Horizontal Divider"
            >
              <FiMinus size={13} />
            </button>

            <div className="h-4 w-[1px] bg-card-border mx-1" />

            {/* Bottom Text Color Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowBottomColorPicker(!showBottomColorPicker);
                }}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all text-text-muted hover:bg-foreground/[0.04] hover:text-foreground flex items-center gap-1`}
                title="Text Color"
              >
                <FiDroplet size={13} />
              </button>

              {showBottomColorPicker && (
                <div className="absolute bottom-full mb-2 right-0 p-2 bg-background border border-card-border rounded-xl shadow-xl z-50 flex items-center gap-1.5">
                  {COLORS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => {
                        setTextColor(c.value);
                        setShowBottomColorPicker(false);
                      }}
                      className="h-5 w-5 rounded-full border border-card-border transition-transform hover:scale-110 flex items-center justify-center"
                      style={{ backgroundColor: c.value || "var(--foreground)" }}
                      title={c.name}
                    >
                      {!c.value && <span className="text-[8px] font-black text-background">D</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--text-muted);
          opacity: 0.5;
          pointer-events: none;
          height: 0;
        }
        .tiptap-editor .ProseMirror h1 { font-size: 2.25rem; font-weight: 900; margin-top: 1.5rem; margin-bottom: 1rem; color: var(--foreground); text-transform: uppercase; font-style: italic; }
        .tiptap-editor .ProseMirror h2 { font-size: 1.5rem; font-weight: 800; margin-top: 1.5rem; margin-bottom: 0.75rem; color: var(--foreground); text-transform: uppercase; font-style: italic; }
        .tiptap-editor .ProseMirror h3 { font-size: 1.25rem; font-weight: 800; margin-top: 1rem; margin-bottom: 0.5rem; color: var(--foreground); text-transform: uppercase; font-style: italic; }
        .tiptap-editor .ProseMirror ul { list-style-type: disc; padding-left: 1.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem; }
        .tiptap-editor .ProseMirror ol { list-style-type: decimal; padding-left: 1.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem; }
        .tiptap-editor .ProseMirror pre { background: var(--input-bg); padding: 1rem; border-radius: 0.75rem; border: 1px solid var(--card-border); font-family: monospace; color: var(--foreground); }
        .tiptap-editor .ProseMirror code { background: var(--foreground); color: var(--background); padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: monospace; font-size: 0.875em; font-weight: 700; }
        .tiptap-editor .ProseMirror blockquote { border-left: 4px solid var(--pastel-emerald); padding-left: 1rem; color: var(--text-secondary); font-style: italic; margin-top: 1rem; margin-bottom: 1rem; font-weight: 500; }
      `}</style>
    </div>
  );
}
