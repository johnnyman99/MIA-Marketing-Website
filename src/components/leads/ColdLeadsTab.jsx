import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.js";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useData } from "../../contexts/DataContext.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";
import { useNotifyRole } from "../../hooks/useNotifyRole.js";
import { currentActorName } from "../../utils.js";
import LeadRow from "./LeadRow.jsx";

export default function ColdLeadsTab() {
  const { t } = useI18n();
  const { myProfile, currentUser } = useAuth();
  const { coldLeads } = useData();
  const notifyRole = useNotifyRole();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [location, setLocation] = useState("");

  async function addLead() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      alert(t("pleaseGiveItAName"));
      return;
    }
    await addDoc(collection(db, "leads"), {
      name: trimmedName,
      contact: contact.trim(),
      location: location.trim(),
      stage: "cold",
      status: "",
      lastSpoken: "",
      createdAt: serverTimestamp()
    });
    setName("");
    setContact("");
    setLocation("");
    notifyRole(
      "user",
      t("newLeadAdded"),
      `${currentActorName(myProfile, currentUser, t)} ${t("notifAddedBy")} ${trimmedName}${
        location.trim() ? " (" + location.trim() + ")" : ""
      }`
    );
  }

  return (
    <section id="tab-cold">
      <div className="card">
        <h2>{t("addColdLeadTitle")}</h2>
        <div className="add-form">
          <input
            placeholder={t("storeNamePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder={t("contactPlaceholder")}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
          <input
            placeholder={t("locationPlaceholder")}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <button onClick={addLead}>{t("addBtn")}</button>
        </div>
      </div>
      <div className="card">
        <h2>{t("coldLeadsTitle")}</h2>
        <div>
          {coldLeads.length === 0 ? (
            <p className="empty">{t("noColdLeads")}</p>
          ) : (
            coldLeads.map((lead) => <LeadRow key={lead.id} lead={lead} stage="cold" />)
          )}
        </div>
      </div>
    </section>
  );
}
