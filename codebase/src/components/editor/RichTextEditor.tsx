import { useEffect } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Code, Link2, Undo2, Redo2, Minus, Underline as UnderlineIcon,
} from "lucide-react";
import { cx } from "../../lib/format";
import { isSafeUrl } from "../../lib/sanitize";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  id?: string;
}

export function RichTextEditor({ value, onChange, placeholder = "Write here…", id }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"] } }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editorProps: { attributes: { class: "tiptap prose-lms px-4 py-3", ...(id ? { id } : {}) } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML() && !editor.isFocused) editor.commands.setContent(value || "", { emitUpdate: false });
  }, [value, editor]);

  return (
    <div className="overflow-hidden rounded-md border border-rule-strong bg-paper focus-within:border-ink">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      ul: e.isActive("bulletList"),
      ol: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      code: e.isActive("codeBlock"),
      link: e.isActive("link"),
    }),
  });

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (https://…)", prev || "https://");
    if (url === null) return;
    if (url === "") return editor.chain().focus().unsetLink().run();
    if (!isSafeUrl(url)) return window.alert("Please enter a valid http(s) URL.");
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const c = () => editor.chain().focus();
  const btns: { label: string; icon: typeof Bold; active?: boolean; run: () => void }[] = [
    { label: "Bold", icon: Bold, active: s.bold, run: () => c().toggleBold().run() },
    { label: "Italic", icon: Italic, active: s.italic, run: () => c().toggleItalic().run() },
    { label: "Underline", icon: UnderlineIcon, active: s.underline, run: () => c().toggleUnderline().run() },
    { label: "Heading", icon: Heading2, active: s.h2, run: () => c().toggleHeading({ level: 2 }).run() },
    { label: "Subheading", icon: Heading3, active: s.h3, run: () => c().toggleHeading({ level: 3 }).run() },
    { label: "Bulleted list", icon: List, active: s.ul, run: () => c().toggleBulletList().run() },
    { label: "Numbered list", icon: ListOrdered, active: s.ol, run: () => c().toggleOrderedList().run() },
    { label: "Quote", icon: Quote, active: s.quote, run: () => c().toggleBlockquote().run() },
    { label: "Code block", icon: Code, active: s.code, run: () => c().toggleCodeBlock().run() },
    { label: "Link", icon: Link2, active: s.link, run: setLink },
    { label: "Divider", icon: Minus, run: () => c().setHorizontalRule().run() },
    { label: "Undo", icon: Undo2, run: () => c().undo().run() },
    { label: "Redo", icon: Redo2, run: () => c().redo().run() },
  ];

  return (
    <div className="flex flex-wrap gap-0.5 border-b border-rule bg-paper-2 px-2 py-1.5" role="toolbar" aria-label="Formatting">
      {btns.map((b) => (
        <button
          key={b.label}
          type="button"
          onClick={b.run}
          title={b.label}
          aria-label={b.label}
          aria-pressed={b.active}
          className={cx("rounded p-1.5 transition-colors", b.active ? "bg-marker text-ink" : "text-ink-2 hover:bg-paper-3 hover:text-ink")}
        >
          <b.icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
