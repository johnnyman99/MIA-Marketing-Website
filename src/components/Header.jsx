import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useData } from "../contexts/DataContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import LangSwitch from "./LangSwitch.jsx";
import NotificationsPanel from "./NotificationsPanel.jsx";

export default function Header() {
  const { t } = useI18n();
  const { myProfile, logout } = useAuth();
  const { notifications, notificationsError } = useData();
  const [inboxOpen, setInboxOpen] = useState(false);
  const panelRef = useRef(null);
  const btnRef = useRef(null);

  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleDocClick(e) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setInboxOpen(false);
      }
    }
    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, []);

  return (
    <header>
      <div className="brand">
        <img
          className="brand-logo"
          src="/logo.png"
          alt="MIA Dynamics"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.nextElementSibling.style.display = "inline-block";
          }}
        />
        <span className="brand-wordmark">MIA DYNAMICS</span>
      </div>
      <div className="header-right">
        <LangSwitch />
        <span id="welcome-text">{t("welcomeText", { name: myProfile?.name || t("homeThere") })}</span>
        <button
          type="button"
          id="inbox-btn"
          ref={btnRef}
          onClick={(e) => {
            e.stopPropagation();
            setInboxOpen((v) => !v);
          }}
        >
          <span>{t("inboxBtn")}</span>
          {unread > 0 && <span id="unread-badge">{unread}</span>}
        </button>
        <button type="button" id="signout-btn" onClick={logout}>
          {t("signOutBtn")}
        </button>
      </div>

      {inboxOpen && (
        <div ref={panelRef}>
          <NotificationsPanel notifications={notifications} error={notificationsError} />
        </div>
      )}
    </header>
  );
}
