import { useI18n } from "../i18n/I18nContext.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";

// Reusable EN / HE toggle. Used on the login screen, the setup screen, and
// in the app header — same component every time.
export default function LangSwitch({ corner = false }) {
  const { lang, changeLanguage } = useI18n();
  const { currentUser } = useAuth();

  return (
    <div className={`lang-switch${corner ? " lang-switch-corner" : ""}`}>
      <button
        type="button"
        className={`lang-btn${lang === "en" ? " active" : ""}`}
        onClick={() => changeLanguage("en", currentUser?.uid)}
      >
        EN
      </button>
      <button
        type="button"
        className={`lang-btn${lang === "he" ? " active" : ""}`}
        onClick={() => changeLanguage("he", currentUser?.uid)}
      >
        עב
      </button>
    </div>
  );
}
