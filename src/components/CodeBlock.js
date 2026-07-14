'use client';

import { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { java } from '@codemirror/lang-java';
import { oneDark } from '@codemirror/theme-one-dark';
import { Copy, Check, Edit3, Eye } from 'lucide-react';

export default function CodeBlock({ code, editable = false, onChange }) {
  const [copied, setCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-border bg-[#282c34]">
      <div className="flex items-center justify-between px-3 py-1.5 text-xs text-zinc-400">
        <span className="font-mono">Java</span>
        <div className="flex items-center gap-1">
          {editable && (
            <button
              onClick={() => setEditMode(!editMode)}
              className="flex items-center gap-1 rounded px-2 py-1 hover:bg-zinc-700"
            >
              {editMode ? <Eye className="size-3" /> : <Edit3 className="size-3" />}
              {editMode ? 'Read' : 'Edit'}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-2 py-1 hover:bg-zinc-700"
          >
            {copied ? <Check className="size-3 text-green-400" /> : <Copy className="size-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <CodeMirror
        value={code}
        extensions={[java()]}
        theme={oneDark}
        editable={editable && editMode}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: false,
          autocompletion: false,
        }}
        onChange={onChange}
        className="text-sm"
      />
    </div>
  );
}
