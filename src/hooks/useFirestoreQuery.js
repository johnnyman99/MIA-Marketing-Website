import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";

// Subscribes to a Firestore query (or a doc/collection ref) and keeps a
// React-friendly array of { id, ...data() } in sync with it. Pass `null` for
// `queryRef` to skip subscribing (e.g. admin-only data before we know the
// user is an admin) — this hook then just returns an empty, non-loading
// result and unsubscribes any previous listener.
//
// `deps` should list anything the query itself was built from (a uid, a
// role check, etc.) so the effect re-subscribes when the query changes.
export function useFirestoreQuery(queryRef, deps = []) {
  const [state, setState] = useState({ docs: [], loading: !!queryRef, error: null });

  useEffect(() => {
    if (!queryRef) {
      setState({ docs: [], loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const unsub = onSnapshot(
      queryRef,
      (snapshot) => {
        setState({
          docs: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })),
          loading: false,
          error: null
        });
      },
      (error) => {
        console.error(error);
        setState({ docs: [], loading: false, error });
      }
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
