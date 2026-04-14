// ============================================================
// ashrain.out — Wrong Note IndexedDB Wrapper
// ============================================================
// 사진은 base64로 IndexedDB에 저장. localStorage 5MB 한도 회피.
// 메타데이터(분류, 카운트, 어노테이션)도 함께 같은 레코드에 저장.

const DB_NAME = "ashrain_wrongnotes";
const STORE = "notes";
const VERSION = 1;

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("userId", "userId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      console.error("[wrongNoteDB] open failed:", req.error);
      reject(req.error);
    };
  });
  return _dbPromise;
}

async function txStore(mode) {
  const db = await openDB();
  return db.transaction(STORE, mode).objectStore(STORE);
}

export async function dbPutNote(note) {
  const store = await txStore("readwrite");
  return new Promise((resolve, reject) => {
    const r = store.put(note);
    r.onsuccess = () => resolve(note);
    r.onerror = () => reject(r.error);
  });
}

export async function dbGetNote(id) {
  const store = await txStore("readonly");
  return new Promise((resolve, reject) => {
    const r = store.get(id);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => reject(r.error);
  });
}

export async function dbGetAllNotes(userId) {
  const store = await txStore("readonly");
  return new Promise((resolve, reject) => {
    const results = [];
    const idx = store.index("userId");
    const req = idx.openCursor(IDBKeyRange.only(userId));
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        // 최신순 정렬
        results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        resolve(results);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function dbDeleteNote(id) {
  const store = await txStore("readwrite");
  return new Promise((resolve, reject) => {
    const r = store.delete(id);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

// 다중 ID 일괄 patch (분류 동기화용)
export async function dbBulkUpdate(ids, patch) {
  if (!ids || ids.length === 0) return;
  const store = await txStore("readwrite");
  return new Promise((resolve, reject) => {
    let remaining = ids.length;
    let errored = false;
    ids.forEach((id) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        if (errored) return;
        const cur = getReq.result;
        if (!cur) {
          if (--remaining === 0) resolve();
          return;
        }
        const next = { ...cur, ...patch, updatedAt: Date.now() };
        const putReq = store.put(next);
        putReq.onsuccess = () => {
          if (--remaining === 0) resolve();
        };
        putReq.onerror = () => {
          errored = true;
          reject(putReq.error);
        };
      };
      getReq.onerror = () => {
        errored = true;
        reject(getReq.error);
      };
    });
  });
}

// 디버그용: 전체 노트 개수
export async function dbCountNotes(userId) {
  const store = await txStore("readonly");
  return new Promise((resolve, reject) => {
    const idx = store.index("userId");
    const req = idx.count(IDBKeyRange.only(userId));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
