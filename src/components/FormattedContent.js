'use client'

import { useMemo } from 'react'
import Markdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import CodeMirrorBlock from './CodeBlock'

function CodeBlock({ node, className, children, ...props }) {
  const match = /language-(\w+)/.exec(className || '')
  const lang = match ? match[1] : ''
  const code = String(children).replace(/\n$/, '')

  if (!lang && !code.includes('\n')) {
    return (
      <code className="fc-inline-code" {...props}>
        {children}
      </code>
    )
  }

  return <CodeMirrorBlock code={code} />
}

export default function FormattedContent({ content, className = '' }) {
  const processed = useMemo(() => {
    if (!content) return ''
    return content
      .replace(/^(#{1,6})\s+(.+)/gm, '$1 $2')
      .trim()
  }, [content])

  if (!processed) return null

  return (
    <div className={`fc-root ${className}`}>
      <Markdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code: CodeBlock,
          h1: ({ children }) => <h1 className="fc-h1">{children}</h1>,
          h2: ({ children }) => <h2 className="fc-h2">{children}</h2>,
          h3: ({ children }) => <h3 className="fc-h3">{children}</h3>,
          h4: ({ children }) => <h4 className="fc-h4">{children}</h4>,
          p: ({ children }) => <p className="fc-p">{children}</p>,
          ul: ({ children }) => <ul className="fc-ul">{children}</ul>,
          ol: ({ children }) => <ol className="fc-ol">{children}</ol>,
          li: ({ children }) => <li className="fc-li">{children}</li>,
          strong: ({ children }) => <strong className="fc-strong">{children}</strong>,
          em: ({ children }) => <em className="fc-em">{children}</em>,
          blockquote: ({ children }) => <blockquote className="fc-bq">{children}</blockquote>,
          hr: () => <hr className="fc-hr" />,
          table: ({ children }) => <div className="fc-table-wrap"><table>{children}</table></div>,
          thead: ({ children }) => <thead>{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => <th className="fc-th">{children}</th>,
          td: ({ children }) => <td className="fc-td">{children}</td>,
        }}
      >
        {processed}
      </Markdown>
    </div>
  )
}
