import { useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bold, Code2, Eye, Heading1, Heading2, Italic, Link2, List, ListOrdered, Pencil, Quote } from 'lucide-react';

const TOOL_BUTTON =
  'inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300';

export default function MarkdownEditor({ value = '', onChange, placeholder = 'Tell your story…', minHeight = 'min-h-[26rem]' }) {
  const textareaRef = useRef(null);

  const updateValue = (next, selectionStart, selectionEnd) => {
    onChange(next);
    window.requestAnimationFrame(() => {
      const element = textareaRef.current;
      if (!element) return;
      element.focus();
      element.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const selection = () => {
    const element = textareaRef.current;
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? value.length;
    return { start, end };
  };

  const wrap = (before, after, placeholderText) => {
    const { start, end } = selection();
    const selected = value.slice(start, end) || placeholderText;
    updateValue(
      `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`,
      start + before.length,
      start + before.length + selected.length,
    );
  };

  const prefixLines = (prefix, ordered = false) => {
    const { start, end } = selection();
    const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    let lineEnd = value.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = value.length;
    const lines = value.slice(lineStart, lineEnd).split('\n');
    const updated = lines
      .map((line, index) => `${ordered ? `${index + 1}. ` : prefix}${line}`)
      .join('\n');
    updateValue(
      `${value.slice(0, lineStart)}${updated}${value.slice(lineEnd)}`,
      lineStart,
      lineStart + updated.length,
    );
  };

  const tools = [
    { label: 'Bold', icon: Bold, action: () => wrap('**', '**', 'bold text') },
    { label: 'Italic', icon: Italic, action: () => wrap('_', '_', 'italic text') },
    { label: 'Heading 1', icon: Heading1, action: () => prefixLines('# ') },
    { label: 'Heading 2', icon: Heading2, action: () => prefixLines('## ') },
    { label: 'Link', icon: Link2, action: () => wrap('[', '](https://example.com)', 'link text') },
    { label: 'Bullet list', icon: List, action: () => prefixLines('- ') },
    { label: 'Numbered list', icon: ListOrdered, action: () => prefixLines('', true) },
    { label: 'Quote', icon: Quote, action: () => prefixLines('> ') },
    { label: 'Code block', icon: Code2, action: () => wrap('```\n', '\n```', 'code') },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-indigo-600 dark:focus-within:ring-indigo-950/60">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800/60" role="toolbar" aria-label="Markdown formatting">
        {tools.map(({ label, icon: Icon, action }) => (
          <button
            key={label}
            type="button"
            onClick={action}
            title={label}
            aria-label={label}
            className={TOOL_BUTTON}
          >
            <Icon size={16} aria-hidden="true" />
          </button>
        ))}
        <span className="ml-auto hidden pr-1 text-xs text-slate-400 sm:block">Markdown supported</span>
      </div>

      <div className="grid lg:grid-cols-2">
        <div className="border-b border-slate-200 lg:border-b-0 lg:border-r dark:border-slate-700">
          <label htmlFor="markdown-content" className="sr-only">
            Article content in Markdown
          </label>
          <textarea
            id="markdown-content"
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            spellCheck="true"
            className={`w-full resize-y bg-transparent p-4 font-mono text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 ${minHeight}`}
          />
        </div>
        <div className="bg-slate-50/60 dark:bg-slate-950/30">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <Eye size={14} aria-hidden="true" /> Live preview
          </div>
          <div className={`prose-blogsphere break-words p-4 text-sm ${minHeight}`}>
            {value.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            ) : (
              <p className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                <Pencil size={14} aria-hidden="true" /> Your formatted story will appear here.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
