"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import UserAvatarGroup from "../user-avatar-group";
import type { Note } from "@/types/note";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { useAdaptiveDropdown } from "@/hooks/use-adaptive-dropdown";
import SlashCommand, { getSuggestionItems, renderItems } from "./slash-command";
import { NoteUpdatedTime } from "../notes/note-updated-time";
import {
  NoteParagraph,
  NoteHeading,
  NoteTextColor,
  NoteImage,
  NOTE_COLORS,
} from "./note-extensions";
import {
  FiBold,
  FiItalic,
  FiUnderline,
  FiAlignLeft,
  FiAlignCenter,
  FiAlignRight,
  FiDroplet,
  FiRotateCcw,
  FiRotateCw,
  FiCode,
  FiList,
  FiCheckSquare,
  FiMessageSquare,
  FiMinus,
  FiCopy,
  FiClipboard,
  FiImage,
  FiCheck,
} from "react-icons/fi";

interface SlashCommandEditorProps {
  initialContent?: string;
  onChange: (content: string) => void;
  updatedAt?: string | null;
  sharedWith?: Note["shared_with"];
  user?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}
function Tool({
  label,
  children,
  action,
  active = false,
  disabled = false,
}: {
  label: string;
  children: ReactNode;
  action: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={action}
      className={`inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-sm transition-colors focus-visible:outline-2 focus-visible:outline-emerald-500 disabled:opacity-40 ${active ? "bg-foreground/[0.08] text-foreground" : "text-text-muted hover:bg-foreground/[0.04] hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}
function ColorPalette({
  anchor,
  selectedColor,
  choose,
  close,
}: {
  anchor: HTMLButtonElement;
  selectedColor: string;
  choose: (color: string) => void;
  close: () => void;
}) {
  const anchorRef = useRef(anchor);
  const menuRef = useRef<HTMLDivElement>(null);
  const { style, side } = useAdaptiveDropdown({
    isOpen: true,
    anchorRef,
    dropdownRef: menuRef,
    preferredSide: "top",
    preferredAlign: "end",
  });
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target) &&
        !anchor.contains(event.target)
      )
        close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
        anchor.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape, true);
    };
  }, [anchor, close]);
  // Escape transformed/clipped modal and selection-menu containing blocks.
  return createPortal(
    <div
      ref={menuRef}
      style={style}
      data-side={side}
      data-note-editor-controls
      role="group"
      aria-label="Text colour palette"
      onMouseDown={(event) => event.preventDefault()}
      className="z-[10000] grid grid-cols-4 gap-1 overflow-auto rounded-xl border border-card-border bg-background p-2 shadow-lg"
    >
      {NOTE_COLORS.map((color) => (
        <button
          key={color.name}
          type="button"
          title={color.name}
          aria-label={color.name}
          aria-pressed={selectedColor === color.value}
          onClick={() => choose(color.value)}
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-foreground/[0.05] focus-visible:outline-2 focus-visible:outline-emerald-500"
        >
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full border border-card-border"
            style={{ backgroundColor: color.value || "var(--foreground)" }}
          >
            {selectedColor === color.value && (
              <FiCheck className="text-background" size={14} />
            )}
          </span>
        </button>
      ))}
    </div>,
    document.body,
  );
}

export default function SlashCommandEditor({
  initialContent,
  onChange,
  user,
  updatedAt,
  sharedWith = [],
}: SlashCommandEditorProps) {
  const [paletteAnchor, setPaletteAnchor] = useState<HTMLButtonElement | null>(
    null,
  );
  const [menuCoords, setMenuCoords] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [addingImage, setAddingImage] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<{ from: number; to: number } | null>(null);
  const incomingContent = useRef(initialContent);
  const lastEmitted = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        paragraph: false,
        link: { openOnClick: false },
      }),
      NoteParagraph,
      NoteHeading.configure({ levels: [1, 2, 3] }),
      NoteTextColor,
      NoteImage,
      TaskList,
      TaskItem.configure({ nested: false }),
      Placeholder.configure({
        placeholder: "Write your note, or press / for formatting…",
      }),
      SlashCommand.configure({
        suggestion: { items: getSuggestionItems, render: renderItems },
      }),
    ],
    content: initialContent || "",
    editorProps: {
      attributes: {
        class:
          "prose dark:prose-invert prose-sm sm:prose-base focus:outline-none min-h-[25rem] w-full max-w-none text-foreground",
      },
    },
    onUpdate: ({ editor }) => {
      lastEmitted.current = editor.getHTML();
      onChangeRef.current(lastEmitted.current);
    },
  });
  useEffect(() => {
    if (!editor) return;
    const selection = () => {
      const { from, to, empty } = editor.state.selection;
      selectionRef.current = { from, to };
      if (empty) {
        setMenuCoords(null);
        return;
      }
      try {
        const start = editor.view.coordsAtPos(from),
          end = editor.view.coordsAtPos(to);
        setMenuCoords({
          top: Math.max(8, Math.min(window.innerHeight - 56, start.top - 52)),
          left: Math.max(
            8,
            Math.min(
              window.innerWidth - 264,
              (start.left + end.left) / 2 - 128,
            ),
          ),
        });
      } catch {
        setMenuCoords(null);
      }
    };
    const blur = ({ event }: { event: FocusEvent }) => {
      if (
        event.relatedTarget instanceof Element &&
        event.relatedTarget.closest("[data-note-editor-controls]")
      )
        return;
      setMenuCoords(null);
    };
    editor.on("selectionUpdate", selection);
    editor.on("focus", selection);
    editor.on("blur", blur);
    window.addEventListener("scroll", selection, true);
    window.addEventListener("resize", selection);
    return () => {
      editor.off("selectionUpdate", selection);
      editor.off("focus", selection);
      editor.off("blur", blur);
      window.removeEventListener("scroll", selection, true);
      window.removeEventListener("resize", selection);
    };
  }, [editor]);
  useEffect(() => {
    if (
      !editor ||
      initialContent === undefined ||
      initialContent === incomingContent.current
    )
      return;
    incomingContent.current = initialContent;
    // Parent echoes must not reset selection, undo history or formatting.
    if (
      initialContent === lastEmitted.current ||
      initialContent === editor.getHTML()
    )
      return;
    editor.commands.setContent(initialContent, { emitUpdate: false });
  }, [editor, initialContent]);

  const focusSelection = (instance: Editor) => {
    const range = selectionRef.current,
      chain = instance.chain().focus();
    return range && range.to <= instance.state.doc.content.size
      ? chain.setTextSelection(range)
      : chain;
  };
  const alignment = (value: string) => {
    if (editor)
      focusSelection(editor)
        .updateAttributes("paragraph", { textAlign: value })
        .updateAttributes("heading", { textAlign: value })
        .run();
  };
  const chooseColor = (color: string) => {
    if (!editor) return;
    const chain = focusSelection(editor);
    if (color) chain.setMark("noteTextColor", { color }).run();
    else
      chain
        .unsetMark("noteTextColor")
        .resetAttributes("paragraph", "color")
        .resetAttributes("heading", "color")
        .run();
    setPaletteAnchor(null);
  };
  const addImage = async (file: File | undefined) => {
    if (!file || !editor) return;
    if (
      !["image/jpeg", "image/png"].includes(file.type) ||
      file.size > 10_000_000
    ) {
      toast.error("Choose a JPEG or PNG photo under 10 MB.");
      return;
    }
    setAddingImage(true);
    let bitmap: ImageBitmap | undefined;
    try {
      bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas"),
        ratio = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image processing unavailable");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      let src = "";
      for (const quality of [0.7, 0.5, 0.3, 0.15]) {
        const candidate = canvas.toDataURL("image/jpeg", quality);
        if (candidate.length <= 32_023) {
          src = candidate;
          break;
        }
      }
      if (
        !src ||
        new TextEncoder().encode(editor.getHTML()).length + src.length + 200 >
          60_000
      )
        throw new Error(
          "This note has reached its image limit. Choose a smaller photo or remove an image.",
        );
      focusSelection(editor)
        .insertContent({ type: "noteImage", attrs: { src, alt: "Note image" } })
        .run();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The photo could not be added.",
      );
    } finally {
      bitmap?.close();
      setAddingImage(false);
      if (imageInput.current) imageInput.current.value = "";
    }
  };
  const colourButton = (selection = false) => (
    <button
      type="button"
      title="Text colour"
      aria-label={selection ? "Selection text colour" : "Text colour"}
      aria-expanded={!!paletteAnchor}
      onClick={(event) => {
        const target = event.currentTarget;
        setPaletteAnchor((current) => (current === target ? null : target));
      }}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-foreground/[0.04]"
    >
      <FiDroplet />
    </button>
  );

  return (
    <div className="relative flex h-full w-full flex-col justify-between">
      {editor &&
        menuCoords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            data-note-editor-controls
            onMouseDown={(event) => event.preventDefault()}
            style={{ position: "fixed", ...menuCoords }}
            className="z-[9999] flex max-w-[calc(100vw-16px)] items-center overflow-x-auto rounded-xl border border-card-border bg-background p-1 shadow-lg"
          >
            <Tool
              label="Bold"
              active={editor.isActive("bold")}
              action={() => editor.chain().focus().toggleBold().run()}
            >
              <FiBold />
            </Tool>
            <Tool
              label="Italic"
              active={editor.isActive("italic")}
              action={() => editor.chain().focus().toggleItalic().run()}
            >
              <FiItalic />
            </Tool>
            <Tool
              label="Underline"
              active={editor.isActive("underline")}
              action={() => editor.chain().focus().toggleUnderline().run()}
            >
              <FiUnderline />
            </Tool>
            {colourButton(true)}
            <Tool
              label="Copy"
              action={() => {
                const { from, to } = editor.state.selection;
                void navigator.clipboard
                  .writeText(editor.state.doc.textBetween(from, to))
                  .catch(() => toast.error("Could not copy the selection."));
              }}
            >
              <FiCopy />
            </Tool>
          </div>,
          document.body,
        )}
      <EditorContent editor={editor} className="tiptap-editor flex-1" />
      {editor && (
        <div className="mt-6 min-w-0 border-t border-card-border pt-3">
          {updatedAt && (
            <div className="mb-2 text-xs text-text-muted">
              <NoteUpdatedTime value={updatedAt} />
            </div>
          )}
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex shrink-0 items-center gap-2"
              aria-label="Note collaborators"
            >
              <UserAvatarGroup
                users={[
                  user
                    ? { ...user, id: user.id || undefined }
                    : { name: "Note owner" },
                ]}
                size="sm"
                limit={1}
              />
              {sharedWith.length > 0 && (
                <div className="border-l border-card-border pl-2">
                  <UserAvatarGroup
                    users={sharedWith.map((person) =>
                      typeof person === "string" ? { name: person } : person,
                    )}
                    size="xs"
                    limit={2}
                  />
                </div>
              )}
            </div>
            <div
              data-note-editor-controls
              role="toolbar"
              aria-label="Note formatting"
              onMouseDown={(event) => event.preventDefault()}
              className="flex min-w-0 flex-1 flex-nowrap items-center gap-1 overflow-x-auto overscroll-x-contain rounded-xl border border-card-border bg-foreground/[0.02] p-1"
            >
              <Tool
                label="Undo"
                disabled={!editor.can().undo()}
                action={() => editor.chain().focus().undo().run()}
              >
                <FiRotateCcw />
              </Tool>
              <Tool
                label="Redo"
                disabled={!editor.can().redo()}
                action={() => editor.chain().focus().redo().run()}
              >
                <FiRotateCw />
              </Tool>
              <Tool
                label="Body"
                active={editor.isActive("paragraph")}
                action={() => editor.chain().focus().setParagraph().run()}
              >
                Aa
              </Tool>
              {([1, 2, 3] as const).map((level) => (
                <Tool
                  key={level}
                  label={["Title", "Heading", "Subheading"][level - 1]}
                  active={editor.isActive("heading", { level })}
                  action={() =>
                    editor.chain().focus().toggleHeading({ level }).run()
                  }
                >
                  H{level}
                </Tool>
              ))}
              <Tool
                label="Bold"
                active={editor.isActive("bold")}
                action={() => editor.chain().focus().toggleBold().run()}
              >
                <FiBold />
              </Tool>
              <Tool
                label="Italic"
                active={editor.isActive("italic")}
                action={() => editor.chain().focus().toggleItalic().run()}
              >
                <FiItalic />
              </Tool>
              <Tool
                label="Underline"
                active={editor.isActive("underline")}
                action={() => editor.chain().focus().toggleUnderline().run()}
              >
                <FiUnderline />
              </Tool>
              <Tool
                label="Strikethrough"
                active={editor.isActive("strike")}
                action={() => editor.chain().focus().toggleStrike().run()}
              >
                <span className="line-through">S</span>
              </Tool>
              <Tool
                label="Bulleted list"
                active={editor.isActive("bulletList")}
                action={() => editor.chain().focus().toggleBulletList().run()}
              >
                <FiList />
              </Tool>
              <Tool
                label="Numbered list"
                active={editor.isActive("orderedList")}
                action={() => editor.chain().focus().toggleOrderedList().run()}
              >
                1.
              </Tool>
              <Tool
                label="Checklist"
                active={editor.isActive("taskList")}
                action={() => editor.chain().focus().toggleTaskList().run()}
              >
                <FiCheckSquare />
              </Tool>
              <Tool label="Align left" action={() => alignment("left")}>
                <FiAlignLeft />
              </Tool>
              <Tool label="Align center" action={() => alignment("center")}>
                <FiAlignCenter />
              </Tool>
              <Tool label="Align right" action={() => alignment("right")}>
                <FiAlignRight />
              </Tool>
              <Tool
                label="Inline code"
                active={editor.isActive("code")}
                action={() => editor.chain().focus().toggleCode().run()}
              >
                <FiCode />
              </Tool>
              <Tool
                label="Code block"
                active={editor.isActive("codeBlock")}
                action={() => editor.chain().focus().toggleCodeBlock().run()}
              >
                {"{ }"}
              </Tool>
              <Tool
                label="Quote"
                active={editor.isActive("blockquote")}
                action={() => editor.chain().focus().toggleBlockquote().run()}
              >
                <FiMessageSquare />
              </Tool>
              <Tool
                label="Divider"
                action={() => editor.chain().focus().setHorizontalRule().run()}
              >
                <FiMinus />
              </Tool>
              {colourButton()}
              <Tool
                label={addingImage ? "Adding image" : "Add image"}
                disabled={addingImage}
                action={() => {
                  selectionRef.current = {
                    from: editor.state.selection.from,
                    to: editor.state.selection.to,
                  };
                  imageInput.current?.click();
                }}
              >
                <FiImage />
              </Tool>
              <Tool
                label="Paste"
                action={() => {
                  void navigator.clipboard
                    .readText()
                    .then((text) => {
                      if (text)
                        editor
                          .chain()
                          .focus()
                          .insertContent({ type: "text", text })
                          .run();
                    })
                    .catch(() =>
                      toast.error(
                        "Allow clipboard access, or paste using your keyboard.",
                      ),
                    );
                }}
              >
                <FiClipboard />
              </Tool>
            </div>
          </div>
          <input
            ref={imageInput}
            type="file"
            accept="image/jpeg,image/png"
            aria-label="Note image"
            className="hidden"
            onChange={(event) => {
              void addImage(event.target.files?.[0]);
            }}
          />
        </div>
      )}
      {editor && paletteAnchor && (
        <ColorPalette
          key={paletteAnchor.getAttribute("aria-label")}
          anchor={paletteAnchor}
          selectedColor={editor.getAttributes("noteTextColor").color || ""}
          choose={chooseColor}
          close={() => setPaletteAnchor(null)}
        />
      )}
      <style jsx global>{`
        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--text-muted);
          pointer-events: none;
          height: 0;
        }
        .tiptap-editor .ProseMirror p {
          min-height: 1.5em;
        }
        .tiptap-editor .ProseMirror h1 {
          font-size: 2rem;
          font-weight: 700;
        }
        .tiptap-editor .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
        }
        .tiptap-editor .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
        }
        .tiptap-editor .ProseMirror ul {
          list-style: disc;
          padding-left: 1.5rem;
        }
        .tiptap-editor .ProseMirror ol {
          list-style: decimal;
          padding-left: 1.5rem;
        }
        .tiptap-editor .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }
        .tiptap-editor .ProseMirror li[data-type="taskItem"] {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }
        .tiptap-editor .ProseMirror li[data-type="taskItem"] > label {
          flex-shrink: 0;
          padding-top: 0.25rem;
        }
        .tiptap-editor .ProseMirror li[data-type="taskItem"] > div {
          flex: 1;
          min-width: 0;
        }
        .tiptap-editor .ProseMirror li[data-type="taskItem"] p {
          margin: 0;
        }
        .tiptap-editor .ProseMirror pre {
          background: var(--input-bg);
          padding: 1rem;
          border-radius: 0.75rem;
          font-family: monospace;
        }
        .tiptap-editor .ProseMirror code {
          background: var(--input-bg);
          padding: 0.15rem 0.3rem;
          border-radius: 0.25rem;
          font-family: monospace;
        }
        .tiptap-editor .ProseMirror blockquote {
          border-left: 3px solid var(--card-border);
          padding-left: 1rem;
        }
      `}</style>
    </div>
  );
}
