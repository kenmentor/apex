// Background upload manager: XHR (fetch has no upload progress) + a tiny
// subscriber store so a persistent progress bar can live above the bottom nav
// while the user keeps doing other things.
const listeners = new Set()
const jobs = new Map() // id -> { id, name, progress, status, xhr }
let seq = 0

function emit() {
  const snap = [...jobs.values()]
  listeners.forEach(fn => { try { fn(snap) } catch {} })
}

export function subscribeUploads(fn) {
  listeners.add(fn)
  fn([...jobs.values()])
  return () => listeners.delete(fn)
}

function update(id, patch) {
  const j = jobs.get(id)
  if (!j) return
  jobs.set(id, { ...j, ...patch })
  emit()
}

function finish(id, ms = 3000) {
  setTimeout(() => {
    jobs.delete(id)
    emit()
  }, ms)
}

export function cancelUpload(id) {
  const j = jobs.get(id)
  if (j?.xhr) try { j.xhr.abort() } catch {}
  jobs.delete(id)
  emit()
}

// Uploads `file` with live progress. Resolves { url, publicId, type } like /api/upload.
// The returned promise has `.uploadId` and `.cancel()` so a single row can be cancelled.
export function uploadFile(file, { folder = 'gss-quiz/library', getToken } = {}) {
  const id = `up-${Date.now()}-${seq++}`
  let xhrRef = null
  const p = new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    jobs.set(id, { id, name: file.name || 'Upload', progress: 0, status: 'uploading', xhr })
    emit()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) update(id, { progress: Math.min(99, Math.round((e.loaded / e.total) * 100)) })
    })
    xhr.addEventListener('load', () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}')
        if (xhr.status >= 200 && xhr.status < 300 && data.url) {
          update(id, { progress: 100, status: 'done' })
          finish(id)
          resolve(data)
        } else {
          throw new Error(data.error || `Upload failed (${xhr.status})`)
        }
      } catch (err) {
        update(id, { status: 'error', error: err.message })
        finish(id, 6000)
        reject(err)
      }
    })
    xhr.addEventListener('error', () => {
      update(id, { status: 'error', error: 'Network error' })
      finish(id, 6000)
      reject(new Error('Network error'))
    })
    xhr.addEventListener('abort', () => {
      jobs.delete(id)
      emit()
      reject(new Error('Cancelled'))
    })

    const form = new FormData()
    form.append('file', file)
    form.append('folder', folder)
    xhr.open('POST', '/api/upload')
    try {
      const t = getToken?.()
      if (t) xhr.setRequestHeader('Authorization', `Bearer ${t}`)
    } catch {}
    xhr.send(form)
  })
  p.uploadId = id
  p.cancel = () => cancelUpload(id)
  return p
}
