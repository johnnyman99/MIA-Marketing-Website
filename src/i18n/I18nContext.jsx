import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { translations } from "./translations.js";

const STORAGE_KEY = "mia_lang";

function readSavedLang() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "he") return saved;
  } catch {
    // localStorage unavailable — fall back to English
  }
  return "en";
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(readSavedLang);

  // Keep <html lang/dir> in sync so RTL layout (Hebrew) applies correctly.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
  }, [lang]);

  const t = useCallback(
    (key, vars) => {
      const dict = translations[lang] || translations.en;
      let str = dict[key] ?? translations.en[key] ?? key;
      if (vars) {
        Object.keys(vars).forEach((k) => {
          str = str.replace(new RegExp(`\\{${k}\\}`, "g"), vars[k]);
        });
      }
      return str;
    },
    [lang]
  );

  // Called by the language-switch buttons. Persists locally right away (so
  // the UI updates instantly) and, if someone's signed in, saves the choice
  // to their account in Firestore — awaited, so a failed/slow save can never
  // leave the account's stored language out of sync with what's on screen
  // (that mismatch was the old "stuck in Hebrew" bug).
  const changeLanguage = useCallback(
    async (newLang, uid) => {
      if (newLang !== "en" && newLang !== "he") return;
      setLang(newLang);
      try {
        window.localStorage.setItem(STORAGE_KEY, newLang);
      } catch {
        // ignore
      }
      if (uid) {
        try {
          await updateDoc(doc(db, "users", uid), { language: newLang });
        } catch (err) {
          console.error("Failed to save language preference:", err);
        }
      }
    },
    []
  );

  // Called once, when a profile loads, to adopt whatever language is saved
  // on the account — without writing back to Firestore (no loop).
  const adoptLangFromProfile = useCallback((profileLang) => {
    if (profileLang !== "en" && profileLang !== "he") return;
    setLang((current) => {
      if (profileLang === current) return current;
      try {
        window.localStorage.setItem(STORAGE_KEY, profileLang);
      } catch {
        // ignore
      }
      return profileLang;
    });
  }, []);

  const value = useMemo(
    () => ({ lang, t, changeLanguage, adoptLangFromProfile }),
    [lang, t, changeLanguage, adoptLangFromProfile]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
