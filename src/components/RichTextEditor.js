'use client'

import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Node, mergeAttributes } from '@tiptap/core'
import { Bold, Italic, Heading2, List, ListOrdered, Quote, Undo2, Redo2, Image as ImageIcon, Eye, Pencil, X, Upload, Sigma } from 'lucide-react'
import { uploadFile } from '@/lib/uploads'
import { getToken } from '@/lib/auth'
import { FolderBrowseInline, LibraryListInline } from '@/components/AttachPickers'
import { renderMath } from '@/lib/math'
import { templateBgStyle } from '@/lib/note-template'

// Minimal block image node (no extra deps): renders <img>, parses it back,
// inserts via setImage. Stored as plain HTML with everything else.
const CustomImage = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
    }
  },
  parseHTML() {
    return [{ tag: 'img[src]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes, { class: 'note-img' })]
  },
  addCommands() {
    return {
      setImage: (options) => ({ commands }) => {
        if (!options?.src) return false
        return commands.insertContent({ type: this.name, attrs: { src: options.src, alt: options.alt || null } })
      },
    }
  },
})

// Clean, mobile-friendly rich-text editor: formatting rail (top by default,
// Samsung-style bottom rail above the keyboard with toolbar="bottom"),
// live preview, inline images from device / folders / library.
export default function RichTextEditor({ value, onChange, placeholder = 'Write your note…', tall = false, toolbar = 'top', template = 'plain' }) {
  const [preview, setPreview] = useState(false)
  const [imgOpen, setImgOpen] = useState(false)
  const [imgTab, setImgTab] = useState(null) // 'folder' | 'library' | null
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const editorRef = useRef(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] } }), CustomImage],
    content: value || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: tall
          ? 'min-h-[55dvh] overflow-y-auto px-1 py-2 text-[15px] leading-relaxed outline-none prose dark:prose-invert [&_h2]:text-xl [&_h2]:font-extrabold [&_h3]:text-base [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_img]:my-3 [&_img]:rounded-xl [&_img]:max-w-full'
          : 'min-h-48 max-h-[45dvh] overflow-y-auto rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary prose-sm dark:prose-invert [&_h2]:text-base [&_h2]:font-extrabold [&_h3]:text-sm [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_img]:rounded-xl [&_img]:my-2 [&_img]:max-w-full',
        'data-placeholder': placeholder,
      },
      handlePaste: (view, event) => {
        const files = [...(event.clipboardData?.files || [])].filter(f => /^image\//.test(f.type || ''))
        if (!files.length) return false
        event.preventDefault()
        uploadFilesAndInsert(files)
        return true
      },
      handleDrop: (view, event) => {
        const files = [...(event.dataTransfer?.files || [])].filter(f => /^image\//.test(f.type || ''))
        if (!files.length) return false
        event.preventDefault()
        uploadFilesAndInsert(files)
        return true
      },
    },
    onUpdate: ({ editor }) => onChangeRef.current?.(editor.getHTML()),
  })

  useEffect(() => {
    editorRef.current = editor || null
  }, [editor])

  useEffect(() => {
    if (editor && value !== undefined && editor.getHTML() !== value && !editor.isFocused) {
      editor.commands.setContent(value || '', false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function insertImage(url, alt) {
    const ed = editorRef.current || editor
    if (!url || !ed) return
    ed.chain().focus().setImage({ src: url, alt: alt || null }).run()
    onChangeRef.current?.(ed.getHTML())
  }

  async function uploadFilesAndInsert(files) {
    const imgs = (files || []).filter(f => /^image\//.test(f.type || ''))
    const ed = editorRef.current || editor
    if (!imgs.length || !ed) return false
    setUploading(true)
    try {
      for (const file of imgs.slice(0, 5)) {
        const up = await uploadFile(file, { folder: 'gss-quiz/notes', getToken })
        if (up?.url) {
          ed.chain().focus().setImage({ src: up.url, alt: file.name || null }).run()
        }
      }
      onChangeRef.current?.(ed.getHTML())
      return true
    } catch {
      return false
    } finally {
      setUploading(false)
    }
  }

  async function uploadAndInsert(e) {
    const file = e.target.files?.[0]
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    await uploadFilesAndInsert([file])
  }

  if (!editor) {
    return <div className="min-h-48 animate-pulse rounded-xl border bg-muted/40" />
  }

  const btn = (active) =>
    `flex size-9 items-center justify-center rounded-lg ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`

  const rail = (
      <div className={(toolbar === 'bottom'
        ? 'fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-2xl items-center gap-0.5 overflow-x-auto border-x border-t bg-card/95 px-2 pt-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur [padding-bottom:max(0.375rem,env(safe-area-inset-bottom))] [&>*]:shrink-0'
        : 'sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-xl border bg-card p-1 shadow-sm')}>
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Bold"
          className={btn(editor.isActive('bold'))}><Bold className="size-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="Italic"
          className={btn(editor.isActive('italic'))}><Italic className="size-4" /></button>
        <span className="mx-0.5 h-5 w-px bg-border" />
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="Heading"
          className={btn(editor.isActive('heading', { level: 2 }))}><Heading2 className="size-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="Bullets"
          className={btn(editor.isActive('bulletList'))}><List className="size-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Numbered list"
          className={btn(editor.isActive('orderedList'))}><ListOrdered className="size-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} aria-label="Quote"
          className={btn(editor.isActive('quote'))}><Quote className="size-4" /></button>
        <button type="button" onClick={() => { editor.chain().focus().insertContent('\\(x^2\\) ').run() }} aria-label="Insert math" title="Insert math \(...\)"
          className={btn(false)}><Sigma className="size-4" /></button>
        <span className="mx-0.5 h-5 w-px bg-border" />
        <button type="button" onClick={() => setImgOpen(true)} aria-label="Add image" title="Add image"
          className={btn(false)}><ImageIcon className="size-4" /></button>
        <span className="mx-0.5 h-5 w-px bg-border" />
        <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} aria-label="Undo"
          className={btn(false) + ' disabled:opacity-40'}><Undo2 className="size-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} aria-label="Redo"
          className={btn(false) + ' disabled:opacity-40'}><Redo2 className="size-4" /></button>
        <span className="flex-1" />
        <button type="button" onClick={() => setPreview(p => !p)} aria-label={preview ? 'Back to editing' : 'Preview'}
          title={preview ? 'Back to editing' : 'Preview'} className={btn(preview)}>
          {preview ? <Pencil className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
  )

  // Lined pages need text riding the rules. Bottom-rail mode pads for the
  // fixed rail so the last lines never hide under it.
  const templateWrap = (template && template !== 'plain' && tall
    ? '[&_.ProseMirror]:leading-[28px]'
    : '') + (toolbar === 'bottom' ? ' pb-24' : '')

  return (
    <div className="space-y-2">
      {toolbar !== 'bottom' && rail}

      {preview ? (
        <div className={'overflow-y-auto px-1 py-2 prose dark:prose-invert ' + (tall ? 'min-h-[55dvh] text-[15px] leading-relaxed [&_img]:my-3 [&_img]:rounded-xl [&_img]:max-w-full' : 'prose-sm min-h-48 rounded-xl border bg-background px-3 [&_img]:my-2 [&_img]:rounded-xl [&_img]:max-w-full')}
          dangerouslySetInnerHTML={{ __html: renderMath(value || editor.getHTML()) || '<p class="text-muted-foreground">Nothing to preview yet.</p>' }} />
      ) : (
        <div className={templateWrap} style={templateBgStyle(template)}>
          <EditorContent editor={editor} />
        </div>
      )}

      {toolbar === 'bottom' && rail}

      {imgOpen && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm" onClick={() => !uploading && setImgOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[71] mx-auto max-h-[80dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t bg-background p-4 pb-8">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
            <div className="mb-3 flex items-center gap-2">
              <h3 className="flex-1 text-sm font-black">Add image</h3>
              <button onClick={() => !uploading && setImgOpen(false)} aria-label="Close" className="flex size-8 items-center justify-center rounded-lg hover:bg-muted"><X className="size-4" /></button>
            </div>
            <div className="space-y-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadAndInsert} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
                <Upload className="size-4" /> {uploading ? 'Uploading…' : 'Upload from device'}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setImgTab(t => t === 'folder' ? null : 'folder')} className={'rounded-xl border py-2 text-xs font-bold hover:bg-muted/60 ' + (imgTab === 'folder' ? 'border-primary bg-primary/5' : '')}>From folder</button>
                <button onClick={() => setImgTab(t => t === 'library' ? null : 'library')} className={'rounded-xl border py-2 text-xs font-bold hover:bg-muted/60 ' + (imgTab === 'library' ? 'border-primary bg-primary/5' : '')}>From library</button>
              </div>
              {imgTab === 'folder' && <FolderBrowseInline kind="image" onPick={(n) => { if (n.url) { insertImage(n.url, n.name); setImgOpen(false) } }} />}
              {imgTab === 'library' && <LibraryListInline kind="image" onPick={(n) => { if (n.url) { insertImage(n.url, n.name); setImgOpen(false) } }} />}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
