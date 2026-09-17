import { useRef, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.js";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useData } from "../../contexts/DataContext.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";
import { useNotifyRole } from "../../hooks/useNotifyRole.js";
import { currentActorName, itemsSummary } from "../../utils.js";
import ProductPicker from "../ProductPicker.jsx";
import WarehouseFields from "../WarehouseFields.jsx";

export default function NewStoreOrderForm() {
  const { t } = useI18n();
  const { currentUser, myProfile } = useAuth();
  const { stores } = useData();
  const notifyRole = useNotifyRole();
  const [storeId, setStoreId] = useState("");
  const pickerRef = useRef(null);
  const shipRef = useRef(null);

  const sortedStores = [...stores].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  function handleStoreChange(e) {
    const id = e.target.value;
    setStoreId(id);
    const store = stores.find((s) => s.id === id);
    shipRef.current?.setDefaultWarehouse(store?.supplier || "");
  }

  async function save() {
    if (!storeId) {
      alert(t("pickStoreFirst"));
      return;
    }
    const store = stores.find((s) => s.id === storeId);
    if (!store) {
      alert(t("storeNotFound"));
      return;
    }
    const items = pickerRef.current.getItems();
    if (items.length === 0) {
      alert(t("addAtLeastOneProduct"));
      return;
    }
    if (!shipRef.current.validate()) return;
    const { warehouse, country } = shipRef.current.getValue();

    await addDoc(collection(db, "orders"), {
      orderSource: "store",
      storeId: store.id,
      company: store.name,
      contact: store.contact || "",
      address: store.address || "",
      phone: store.phone || "",
      warehouse,
      country,
      items,
      dealType: store.dealType || "buy",
      orderStatus: "requested",
      tracking: "",
      archived: false,
      createdBy: currentUser.uid,
      createdByName: currentActorName(myProfile, currentUser, t),
      createdAt: serverTimestamp()
    });

    setStoreId("");
    pickerRef.current.reset();
    shipRef.current.reset();

    notifyRole(
      "warehouse",
      t("notifNewStoreOrder"),
      `${store.name}: ${itemsSummary(items)} — ${t("notifEnteredBy")} ${myProfile?.name || t("aTeammate")}`
    );
    alert(t("storeOrderSaved"));
  }

  return (
    <div className="card">
      <h2>{t("newStoreOrderTitle")}</h2>
      <div className="customer-form">
        <div className="row">
          <select style={{ flex: 1, minWidth: "220px" }} value={storeId} onChange={handleStoreChange}>
            <option value="">{t("selectStoreRequired")}</option>
            {sortedStores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <ProductPicker ref={pickerRef} />
        <WarehouseFields ref={shipRef} />
        <div className="row">
          <button className="btn-save-store-order" onClick={save}>
            {t("saveStoreOrderBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}
