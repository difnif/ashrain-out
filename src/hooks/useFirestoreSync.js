import { useEffect, useRef } from "react";
import { fbGet, fbSet, fbListen } from "../firebase";

/**
 * Syncs a React state with Firestore.
 * - On mount: loads from Firestore (or initializes with current state)
 * - On state change: writes to Firestore
 * - Listens for remote changes: updates state
 * 
 * Usage: useFirestoreSync("members", members, setMembers, defaultValue)
 */
export function useFirestoreSync(docId, fieldName, value, setValue, defaultValue) {
  const isRemoteUpdate = useRef(false);
  const initialized = useRef(false);

  // Listen to Firestore changes (real-time sync)
  useEffect(() => {
    const unsub = fbListen(docId, (data) => {
      if (data && data[fieldName] !== undefined) {
        const remote = data[fieldName];
        // Only update if different from current value
        const remoteStr = JSON.stringify(remote);
        const localStr = JSON.stringify(value);
        if (remoteStr !== localStr) {
          isRemoteUpdate.current = true;
          setValue(typeof remote === "string" ? remote : 
                  typeof defaultValue === "boolean" ? remote === true || remote === "true" :
                  remote);
        }
      } else if (!initialized.current) {
        // First load, no data in Firestore yet → write current value
        fbSet(docId, { [fieldName]: value });
      }
      initialized.current = true;
    });
    return () => unsub();
  }, [docId, fieldName]); // intentionally not including value/setValue to avoid loops

  // Write to Firestore when state changes locally
  useEffect(() => {
    if (!initialized.current) return; // don't write during init
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return; // skip writing back remote updates
    }
    fbSet(docId, { [fieldName]: value });
  }, [value, docId, fieldName]);
}

/**
 * Simple one-way Firestore write (no listening)
 * For data that only needs to be saved, not synced
 */
export function useFirestoreWrite(docId, fieldName, value) {
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) { initialized.current = true; return; }
    fbSet(docId, { [fieldName]: value });
  }, [value, docId, fieldName]);
}
