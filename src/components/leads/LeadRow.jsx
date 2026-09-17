import { useState } from "react";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import { useI18n } from "../../i18n/I18nContext.jsx";
import { useSavedFlash } from "../../hooks/useSavedFlash.js";

export default function LeadRow({ lead, stage }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editLocation, setEditLocation] = useState("");

  const [status, setStatus] = useState(lead.status || "");
  const [lastSpoken, setLastSpoken] = useState(lead.lastSpoken || "");
  const [notes, setNotes] = useState(lead.notes || "");
  const [statusFlash, flashStatus] = useSavedFlash();
  const [spokenFlash, flashSpoken] = useSavedFlash();
  const [notesFlash, flashNotes] = useSavedFlash();

  function startEdit() {
    setEditName(lead.name || "");
    setEditContact(lead.contact || "");
    setEditLocation(lead.location || "");
    setEditing(true);
  }

  async function saveEdit() {
    const newName = editName.trim();
    if (!newName) {
      alert(t("nameEmptyError"));
      return;
    }
    await updateDoc(doc(db, "leads", lead.id), {
      name: newName,
      contact: editContact.trim(),
      location: editLocation.trim()
    });
    setEditing(false);
  }

  async function promote() {
    if (stage === "cold") {
      await updateDoc(doc(db, "leads", lead.id), { stage: "progress" });
    } else {
      await updateDoc(doc(db, "leads", lead.id), {
        stage: "store",
        dealType: "buy",
        paymentStatus: "none",
        address: "",
        phone: "",
        details: lead.notes || "",
        certs: { resale: "missing", insurance: "missing", insuranceExpiry: "", agreement: "missing" }
      });
    }
  }

  async function demote() {
    await updateDoc(doc(db, "leads", lead.id), { stage: "cold" });
  }

  async function remove() {
    if (confirm(t("confirmDeleteLead", { name: lead.name }))) await deleteDoc(doc(db, "leads", lead.id));
  }

  return (
    <div className="lead-row">
      {!editing ? (
        <div className="lead-info">
          <b>{lead.name}</b>
          <span>{[lead.contact, lead.location].filter(Boolean).join(" · ")}</span>
        </div>
      ) : (
        <div className="lead-edit">
          <input
            className="e-name"
            placeholder={t("storeNamePlaceholder")}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            autoFocus
          />
          <input
            className="e-contact"
            placeholder={t("contactPlaceholder")}
            value={editContact}
            onChange={(e) => setEditContact(e.target.value)}
          />
          <input
            className="e-location"
            placeholder={t("locationPlaceholder")}
            value={editLocation}
            onChange={(e) => setEditLocation(e.target.value)}
          />
        </div>
      )}

      {stage === "progress" && (
        <div className="progress-fields">
          <input
            className={`f-status${statusFlash ? " saved-flash" : ""}`}
            placeholder={t("statusPlaceholder")}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            onBlur={async () => {
              if (status === (lead.status || "")) return;
              await updateDoc(doc(db, "leads", lead.id), { status });
              flashStatus();
            }}
          />
          <input
            className={`f-spoken${spokenFlash ? " saved-flash" : ""}`}
            placeholder={t("lastSpokenPlaceholder")}
            value={lastSpoken}
            onChange={(e) => setLastSpoken(e.target.value)}
            onBlur={async () => {
              if (lastSpoken === (lead.lastSpoken || "")) return;
              await updateDoc(doc(db, "leads", lead.id), { lastSpoken });
              flashSpoken();
            }}
          />
          <textarea
            className={`f-notes${notesFlash ? " saved-flash" : ""}`}
            rows={2}
            placeholder={t("leadNotesPlaceholder")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={async () => {
              if (notes === (lead.notes || "")) return;
              await updateDoc(doc(db, "leads", lead.id), { notes });
              flashNotes();
            }}
          />
        </div>
      )}

      <div className="lead-actions">
        {!editing ? (
          <button className="btn-edit" onClick={startEdit}>
            {t("editBtn")}
          </button>
        ) : (
          <>
            <button className="btn-save-edit" onClick={saveEdit}>
              {t("saveBtn")}
            </button>
            <button className="btn-cancel-edit" onClick={() => setEditing(false)}>
              {t("cancelBtn")}
            </button>
          </>
        )}
        {!editing && (
          <button className="btn-promote" onClick={promote}>
            {t("promoteBtn")} ↑
          </button>
        )}
        {stage === "progress" && !editing && (
          <button className="btn-demote" onClick={demote}>
            ↓
          </button>
        )}
        <button className="btn-delete" onClick={remove}>
          {t("deleteBtn")}
        </button>
      </div>
    </div>
  );
}
