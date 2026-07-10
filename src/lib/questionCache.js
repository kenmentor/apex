const DB_NAME = 'gss-quiz-cache'
const STORE = 'questions'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { key: 'courseCode' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getCachedQuestions(courseCode) {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(courseCode.toUpperCase())
      req.onsuccess = () => resolve(req.result?.questions || null)
      req.onerror = () => resolve(null)
    })
  } catch { return null }
}

export async function cacheQuestions(courseCode, questions) {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put({ courseCode: courseCode.toUpperCase(), questions, cachedAt: Date.now() })
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(false)
    })
  } catch { return false }
}
