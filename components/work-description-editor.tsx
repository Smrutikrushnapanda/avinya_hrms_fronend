"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor, useEditorState, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Slice } from "@tiptap/pm/model";
import { List, ListChecks, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WorkDescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  "aria-describedby"?: string;
}

const listTypes = new Set(["bulletList", "orderedList", "taskList"]);

function inlineText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(inlineText).join("");
}

function descriptionFromDocument(document: JSONContent): string {
  const lines: string[] = [];
  const append = (node: JSONContent, depth = 0) => {
    if (listTypes.has(node.type ?? "")) {
      const start = Number(node.attrs?.start) || 1;
      for (const [index, item] of (node.content ?? []).entries()) {
        const text = (item.content ?? [])
          .filter((child) => !listTypes.has(child.type ?? ""))
          .map(inlineText)
          .join(" ")
          .replace(/\s*\n\s*/g, " ")
          .trim();
        const marker = node.type === "orderedList" ? `${start + index}.` : node.type === "taskList" ? "- [ ]" : "-";
        if (text) lines.push(`${"  ".repeat(depth)}${marker} ${text}`);
        for (const child of item.content ?? []) {
          if (listTypes.has(child.type ?? "")) append(child, depth + 1);
        }
      }
      return;
    }
    if (node.type === "paragraph") lines.push(inlineText(node));
  };
  for (const node of document.content ?? []) append(node);
  return lines.join("\n").trim();
}

function paragraph(text: string): JSONContent {
  return { type: "paragraph", content: text ? [{ type: "text", text }] : [] };
}

function documentFromDescription(value: string): JSONContent {
  const content: JSONContent[] = [];
  for (const line of value.split(/\r?\n/)) {
    const task = /^\s*(?:[-*•]\s*)?\[[ xX]\]\s+(.+)$/.exec(line);
    const ordered = /^\s*(\d+)[.)]\s+(.+)$/.exec(line);
    const bullet = /^\s*[-*•]\s+(.+)$/.exec(line);
    const type = task ? "taskList" : ordered ? "orderedList" : bullet ? "bulletList" : null;
    const text = task?.[1] ?? ordered?.[2] ?? bullet?.[1];
    if (!type || !text) {
      content.push(paragraph(line));
      continue;
    }
    const item: JSONContent = {
      type: type === "taskList" ? "taskItem" : "listItem",
      ...(type === "taskList" ? { attrs: { checked: false } } : {}),
      content: [paragraph(text)],
    };
    const previous = content[content.length - 1];
    if (previous?.type === type) previous.content!.push(item);
    else content.push({ type, ...(ordered ? { attrs: { start: Number(ordered[1]) } } : {}), content: [item] });
  }
  return { type: "doc", content: content.length ? content : [paragraph("")] };
}

export function WorkDescriptionEditor({ value, onChange, disabled = false, id, "aria-describedby": describedBy }: WorkDescriptionEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const lastValue = useRef(value);
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        bold: false,
        italic: false,
        strike: false,
        underline: false,
        code: false,
        link: false,
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: documentFromDescription(value),
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        role: "textbox",
        "aria-label": "Work description",
        "aria-required": "true",
        "aria-multiline": "true",
        "aria-describedby": describedBy ?? "",
        "aria-disabled": String(disabled),
        class: "min-h-28 max-h-64 overflow-y-auto px-3 py-2 text-sm outline-none [&_p]:min-h-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1 [&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0 [&_li[data-type=taskItem]]:flex [&_li[data-type=taskItem]]:items-start [&_li[data-type=taskItem]]:gap-2 [&_li[data-type=taskItem]>label]:mt-0.5 [&_li[data-type=taskItem]>label]:shrink-0 [&_li[data-type=taskItem]>div]:min-w-0 [&_li[data-type=taskItem]>div]:flex-1",
      },
      clipboardTextParser: (text, _context, _plain, view) => Slice.maxOpen(view.state.schema.nodeFromJSON(documentFromDescription(text)).content),
    },
    onUpdate: ({ editor: current }) => {
      // Store only plain text and list markers; completion lives on the assignment.
      const nextValue = descriptionFromDocument(current.getJSON());
      lastValue.current = nextValue;
      onChangeRef.current(nextValue);
    },
  });
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bullet: current?.isActive("bulletList") ?? false,
      ordered: current?.isActive("orderedList") ?? false,
      checklist: current?.isActive("taskList") ?? false,
      empty: !current || !descriptionFromDocument(current.getJSON()),
    }),
  });

  useEffect(() => {
    if (!editor || value === lastValue.current) return;
    lastValue.current = value;
    if (value !== descriptionFromDocument(editor.getJSON())) {
      editor.commands.setContent(documentFromDescription(value), { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled, false);
  }, [editor, disabled]);

  return (
    <div className={cn("rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring/50", disabled && "opacity-50")}>
      <div role="toolbar" aria-label="Description formatting" className="flex gap-1 border-b bg-muted/30 p-1">
        <Button type="button" size="sm" variant="ghost" aria-label="Bullet list" aria-pressed={state?.bullet ?? false} disabled={disabled || !editor} className={cn(state?.bullet && "bg-accent")} onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          <List aria-hidden="true" /> Bullets
        </Button>
        <Button type="button" size="sm" variant="ghost" aria-label="Numbered list" aria-pressed={state?.ordered ?? false} disabled={disabled || !editor} className={cn(state?.ordered && "bg-accent")} onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          <ListOrdered aria-hidden="true" /> Numbers
        </Button>
        <Button type="button" size="sm" variant="ghost" aria-label="Checklist" aria-pressed={state?.checklist ?? false} disabled={disabled || !editor} className={cn(state?.checklist && "bg-accent")} onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().toggleTaskList().run()}>
          <ListChecks aria-hidden="true" /> Checklist
        </Button>
      </div>
      <div className="relative">
        {state?.empty && <p aria-hidden="true" className="pointer-events-none absolute left-3 right-3 top-2 text-sm text-muted-foreground"></p>}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
