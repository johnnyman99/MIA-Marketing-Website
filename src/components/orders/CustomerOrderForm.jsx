import { useRef, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.js";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";
import { useNotifyRole } from "../../hooks/useNotifyRole.js";
import { currentActorName, itemsSummary } from "../../utils.js";
import ProductPicker from "../ProductPicker.jsx";
import WarehouseFields from "../WarehouseFields.jsx";

export default function CustomerOrderForm() {
  const { t } = useI18n();
  const { currentUser, myProfile } = useAuth();
  const notifyRole = useNotifyRole();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const pickerRef = useRef(null);
  const shipRef = useRef(null);

  async function save() {
    const trimmedName = name.trim();
    const items = pickerRef.current.getItems();
    if (!trimmedName) {
      alert(t("customerNameRequired"));
      return;
    }
    if (items.length === 0) {
      alert(t("addAtLeastOneProduct"));
      return;
    }
    if (!shipRef.current.validate()) return;
    const { warehouse, country } = shipRef.current.getValue();

    await addDoc(collection(db, "orders"), {
      orderSource: "customer",
      company: trimmedName,
      contact: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      warehouse,
      country,
      items,
      dealType: "buy",
      orderStatus: "requested",
      tracking: "",
      archived: false,
      createdBy: currentUser.uid,
      createdByName: currentActorName(myProfile, currentUser, t),
      createdAt: serverTimestamp()
    });

    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    pickerRef.current.reset();
    shipRef.current.reset();

    notifyRole(
      "warehouse",
      t("notifNewCustomerOrder"),
      `${trimmedName}: ${itemsSummary(items)} — ${t("notifEnteredBy")} ${myProfile?.name || t("aTeammate")}`
    );
    alert(t("customerOrderSaved"));
  }

  return (
    <div className="card">
      <h2>{t("newCustomerOrderTitle")}</h2>
      <div className="customer-form">
        <div className="row">
          <input
            placeholder={t("customerNamePlaceholder")}
            style={{ flex: 1, minWidth: "160px" }}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder={t("phonePlaceholder")}
            style={{ flex: 1, minWidth: "130px" }}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            placeholder={t("emailPlaceholder")}
            style={{ flex: 1, minWidth: "160px" }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="row">
          <input
            placeholder={t("shippingAddressPlaceholder")}
            style={{ flex: 1, minWidth: "260px" }}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <WarehouseFields ref={shipRef} />
        <ProductPicker ref={pickerRef} />
        <div className="row">
          <button className="btn-save-customer-order" onClick={save}>
            {t("saveCustomerOrderBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}
