import { updateDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "../firebase.js";
import { useI18n } from "../i18n/I18nContext.jsx";
import { timeAgo } from "../utils.js";

export default function NotificationsPanel({ notifications, error }) {
  const { t, lang } = useI18n();

  async function markRead(n) {
    if (!n.read) await updateDoc(doc(db, "notifications", n.id), { read: true });
  }

  async function markAllRead() {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach((n) => batch.update(doc(db, "notifications", n.id), { read: true }));
    await batch.commit();
  }

  return (
    <div id="inbox-panel">
      <div className="inbox-head">
        <b>{t("inboxTitle")}</b>
        <button type="button" onClick={markAllRead}>
          {t("markAllRead")}
        </button>
      </div>
      <div id="notif-list">
        {error ? (
          <p className="empty" style={{ padding: "16px" }}>
            {t("inboxIndexError")}
          </p>
        ) : notifications.length === 0 ? (
          <p className="empty" style={{ padding: "16px" }}>
            {t("nothingHereYet")}
          </p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`notif${n.read ? "" : " unread"}`}
              onClick={() => markRead(n)}
            >
              <div className="notif-title">{n.title}</div>
              <div className="notif-body">{n.body}</div>
              <div className="notif-time">{timeAgo(n.createdAt, lang, t)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
