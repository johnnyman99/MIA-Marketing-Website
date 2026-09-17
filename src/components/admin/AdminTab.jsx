import { useState } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { sendSignInLinkToEmail } from "firebase/auth";
import { auth, db } from "../../firebase.js";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useData } from "../../contexts/DataContext.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";
import InviteRow from "./InviteRow.jsx";
import TeamRow from "./TeamRow.jsx";

export default function AdminTab() {
  const { t } = useI18n();
  const { myProfile, currentUser } = useAuth();
  const { invites, team } = useData();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [status, setStatus] = useState("");

  async function sendInvite() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      alert(t("enterEmail"));
      return;
    }
    setStatus(t("sending"));
    try {
      await setDoc(doc(db, "invites", trimmed), {
        email: trimmed,
        role,
        invitedBy: myProfile?.name || currentUser.email,
        createdAt: serverTimestamp()
      });
      await sendSignInLinkToEmail(auth, trimmed, {
        url: window.location.origin + window.location.pathname,
        handleCodeInApp: true
      });
      setStatus(t("inviteSentCheck", { email: trimmed }));
      setEmail("");
    } catch (err) {
      setStatus(t("couldntSend") + err.message);
    }
  }

  return (
    <section id="tab-admin">
      <div className="card">
        <h2>{t("inviteSomeoneTitle")}</h2>
        <div className="add-form">
          <input type="email" placeholder="their@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="user">{t("roleUser")}</option>
            <option value="warehouse">{t("roleWarehouse")}</option>
            <option value="accountant">{t("roleAccountant")}</option>
            <option value="admin">{t("roleAdmin")}</option>
          </select>
          <button onClick={sendInvite}>{t("sendInviteBtn")}</button>
        </div>
        <p className="empty" style={{ marginTop: "10px" }}>
          {t("inviteHelpText")}
        </p>
        <div style={{ fontSize: "13px", marginTop: "8px" }}>{status}</div>
      </div>

      <div className="card">
        <h2>{t("pendingInvitesTitle")}</h2>
        <div>
          {invites.length === 0 ? (
            <p className="empty">{t("noPendingInvites")}</p>
          ) : (
            invites.map((inv) => <InviteRow key={inv.id} invite={inv} />)
          )}
        </div>
      </div>

      <div className="card">
        <h2>{t("teamRolesTitle")}</h2>
        <div>
          {team.map((member) => (
            <TeamRow key={member.id} member={member} />
          ))}
        </div>
      </div>
    </section>
  );
}
