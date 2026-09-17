import { useCallback, useRef, useState } from "react";

// Little green "saved" outline flash shown briefly after an autosave,
// matching the old .saved-flash CSS class behavior.
export function useSavedFlash() {
  const [flashing, setFlashing] = useState(false);
  const timerRef = useRef(null);

  const trigger = useCallback(() => {
    setFlashing(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setFlashing(false), 600);
  }, []);

  return [flashing, trigger];
}
