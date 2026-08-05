const DB_NAME = 'lumiere-studio'
const DB_VERSION = 1
const STORE = 'pending'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function run(mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const req = fn(tx.objectStore(STORE))
        tx.oncomplete = () => resolve(req && req.result !== undefined ? req.result : undefined)
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
  )
}

export function savePending(items) {
  return run('readwrite', (store) => store.put(items, 'items')).catch(() => {})
}

export function loadPending() {
  return run('readonly', (store) => store.get('items')).then((items) => (Array.isArray(items) ? items : []))
}

export function clearPending() {
  return run('readwrite', (store) => store.delete('items')).catch(() => {})
}
