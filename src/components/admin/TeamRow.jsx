import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";
import { useSavedFlash } from "../../hooks/useSavedFlash.js";

export default function TeamRow({ member }) {
  const { t } = useI18n();
  const { currentUser } = useAuth();
  const isMe = member.id === currentUser?.uid;
  const [name, setName] = useState(member.name || "");
  const [role, setRole] = useState(member.role || "user");
  const [flashName, triggerName] = useSavedFlash();
  const [flashRole, triggerRole] = useSavedFlash();

  async function saveName() {
    if (name === (member.name || "")) return;
    await updateDoc(doc(db, "users", member.id), { name: name.trim() });
    triggerName();
  }

  async function changeRole(e) {
    const newRole = e.target.value;
    if (isMe && newRole !== "admin") {
      if (!confirm(t("confirmRemoveOwnAdmin"))) {
        setRole("admin");
        return;
      }
    }
    setRole(newRole);
    await updateDoc(doc(db, "users", member.id), { role: newRole });
    triggerRole();
  }

  return (
    <div className="user-row">
      <div className="user-main">
        <input
          className={flashName ? "u-name saved-flash" : "u-name"}
          placeholder={t("displayNamePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
        />
        <span className="u-email">{member.email || ""}</span>
      </div>
      {isMe && <span className="you-tag">{t("youTag")}</span>}
      <select className={flashRole ? "u-role saved-flash" : "u-role"} value={role} onChange={changeRole}>
        <option value="user">{t("roleUser")}</option>
        <option value="warehouse">{t("roleWarehouse")}</option>
        <option value="accountant">{t("roleAccountant")}</option>
        <option value="admin">{t("roleAdmin")}</option>
      </select>
    </div>
  );
}
