// Proper maths rendering with KaTeX. Write math as \(x^2\) (inline),
// \[...\]/$$...$$ (display) anywhere in note HTML — readers and the
// editor preview turn it into real typeset maths. Plain text without
// delimiters passes through untouched.
import katex from 'katex'

export function hasMath(src) {
  return /\\\(|\\\[|\$\$/.test(String(src || ''))
}

export function renderMath(html) {
  const src = String(html || '')
  if (!hasMath(src)) return src
  try {
    return src
      .replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
        try { return katex.renderToString(tex, { displayMode: true, throwOnError: false }) }
        catch { return _ }
      })
      .replace(/\\\[([\s\S]+?)\\\]/g, (_, tex) => {
        try { return katex.renderToString(tex, { displayMode: true, throwOnError: false }) }
        catch { return _ }
      })
      .replace(/\\\((.+?)\\\)/g, (_, tex) => {
        try { return katex.renderToString(tex, { displayMode: false, throwOnError: false }) }
        catch { return _ }
      })
  } catch {
    return src
  }
}
