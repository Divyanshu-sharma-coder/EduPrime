"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Bold, Italic, Link as LinkIcon, List, ListOrdered } from "lucide-react";

export function CourseDescriptionEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, protocols: ["http", "https"] }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
  });

  if (!editor) return <div className="rich-editor-loading">Loading editor...</div>;
  const activeEditor = editor;

  function addLink() {
    const url = window.prompt("Enter a link URL");
    if (url) activeEditor.chain().focus().setLink({ href: url }).run();
  }

  return <div className="rich-editor">
    <div className="rich-editor-toolbar" aria-label="Description formatting">
      <button type="button" className={activeEditor.isActive("heading", { level: 2 }) ? "active" : ""} onClick={() => activeEditor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="Heading 2">H2</button>
      <button type="button" className={activeEditor.isActive("heading", { level: 3 }) ? "active" : ""} onClick={() => activeEditor.chain().focus().toggleHeading({ level: 3 }).run()} aria-label="Heading 3">H3</button>
      <button type="button" className={activeEditor.isActive("bold") ? "active" : ""} onClick={() => activeEditor.chain().focus().toggleBold().run()} aria-label="Bold"><Bold size={16} /></button>
      <button type="button" className={activeEditor.isActive("italic") ? "active" : ""} onClick={() => activeEditor.chain().focus().toggleItalic().run()} aria-label="Italic"><Italic size={16} /></button>
      <button type="button" className={activeEditor.isActive("bulletList") ? "active" : ""} onClick={() => activeEditor.chain().focus().toggleBulletList().run()} aria-label="Bullet list"><List size={16} /></button>
      <button type="button" className={activeEditor.isActive("orderedList") ? "active" : ""} onClick={() => activeEditor.chain().focus().toggleOrderedList().run()} aria-label="Numbered list"><ListOrdered size={16} /></button>
      <button type="button" onClick={addLink} aria-label="Add link"><LinkIcon size={16} /></button>
    </div>
    <EditorContent editor={activeEditor} />
  </div>;
}
