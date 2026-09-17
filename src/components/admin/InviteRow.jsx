import { useState } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import { sendSignInLinkToEmail } from "firebase/auth";
import { auth, db } from "../../firebase.js";
import { useI18n } from "../../i18n/I18nContext.jsx";
import { roleLabel } from "../../utils.js";

export default function InviteRow({ invite }) {
  const { t } = useI18n();
  const [resendLabel, setResendLabel] = useState(t("resendBtn"));

  async function resend() {
    setResendLabel(t("sending"));
    try {
      await sendSignInLinkToEmail(auth, invite.email, {
        url: window.location.origin + window.location.pathname,
        handleCodeInApp: true
      });
      setResendLabel(t("sentCheck"));
      setTimeout(() => setResendLabel(t("resendBtn")), 2000);
    } catch (err) {
      alert(t("couldntResend") + err.message);
      setResendLabel(t("resendBtn"));
    }
  }

  async function cancelInvite() {
    if (confirm(t("confirmCancelInvite", { email: invite.email }))) await deleteDoc(doc(db, "invites", invite.id));
  }

  return (
    <div className="invite-row">
      <div className="invite-main">
        <b className="i-email">{invite.email}</b>
        <span className="i-meta">
          {roleLabel(invite.role, t)} · {t("invitedByLabel")} {invite.invitedBy || "—"}
        </span>
      </div>
      <button
        className="btn-resend"
        style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: "6px", background: "white", cursor: "pointer", fontSize: "13px" }}
        onClick={resend}
      >
        {resendLabel}
      </button>
      <button
        className="btn-cancel-invite"
        style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: "6px", background: "white", cursor: "pointer", fontSize: "13px" }}
        onClick={cancelInvite}
      >
        {t("cancelBtn")}
      </button>
    </div>
  );
}
