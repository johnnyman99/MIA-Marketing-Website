import { useRef, useState } from "react";
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";
import { useNotifyRole } from "../../hooks/useNotifyRole.js";
import { currentActorName, itemsSummary, WAREHOUSES } from "../../utils.js";
import { useSavedFlash } from "../../hooks/useSavedFlash.js";
import ProductPicker from "../ProductPicker.jsx";
import WarehouseFields from "../WarehouseFields.jsx";
import CertRow from "./CertRow.jsx";

export default function StoreCard({ store }) {
  const { t } = useI18n();
  const { currentUser, myProfile } = useAuth();
  const notifyRole = useNotifyRole();
  const certs = store.certs || {};
  const needsAgreement = store.dealType === "consigned" && certs.agreement !== "onfile";

  const [editingIdentity, setEditingIdentity] = useState(false);
  const [eName, setEName] = useState("");
  const [eContact, setEContact] = useState("");
  const [eLocation, setELocation] = useState("");

  const [supplier, setSupplier] = useState(store.supplier || "");
  const [dealType, setDealType] = useState(store.dealType || "buy");
  const [paymentStatus, setPaymentStatus] = useState(store.paymentStatus || "none");
  const [address, setAddress] = useState(store.address || "");
  const [phone, setPhone] = useState(store.phone || "");
  const [details, setDetails] = useState(store.details || "");
  const [flashSupplier, triggerSupplier] = useSavedFlash();
  const [flashAddress, triggerAddress] = useSavedFlash();
  const [flashPhone, triggerPhone] = useSavedFlash();
  const [flashDetails, triggerDetails] = useSavedFlash();

  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [invoiceFormOpen, setInvoiceFormOpen] = useState(false);
  const orderPickerRef = useRef(null);
  const orderShipRef = useRef(null);
  const invoicePickerRef = useRef(null);
  const [ifContact, setIfContact] = useState(store.contact || "");
  const [ifCompany, setIfCompany] = useState(store.name || "");
  const [ifAddress, setIfAddress] = useState(store.address || "");
  const [ifPhone, setIfPhone] = useState(store.phone || "");

  function startEditIdentity() {
    setEName(store.name || "");
    setEContact(store.contact || "");
    setELocation(store.location || "");
    setEditingIdentity(true);
  }

  async function saveIdentity() {
    const newName = eName.trim();
    if (!newName) {
      alert(t("nameEmptyError"));
      return;
    }
    await updateDoc(doc(db, "leads", store.id), {
      name: newName,
      contact: eContact.trim(),
      location: eLocation.trim()
    });
    setEditingIdentity(false);
  }

  async function field(name, value) {
    await updateDoc(doc(db, "leads", store.id), { [name]: value });
  }

  async function demote() {
    await updateDoc(doc(db, "leads", store.id), { stage: "progress" });
  }

  async function remove() {
    if (confirm(t("confirmDeleteStore", { name: store.name }))) await deleteDoc(doc(db, "leads", store.id));
  }

  function toggleOrderForm() {
    setInvoiceFormOpen(false);
    setOrderFormOpen((v) => !v);
  }
  function cancelOrderForm() {
    setOrderFormOpen(false);
    orderPickerRef.current?.reset();
    orderShipRef.current?.reset(store.supplier || "");
  }
  async function saveOrder() {
    const items = orderPickerRef.current.getItems();
    if (items.length === 0) {
      alert(t("addAtLeastOneProduct"));
      return;
    }
    if (!orderShipRef.current.validate()) return;
    const { warehouse, country } = orderShipRef.current.getValue();
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
    setOrderFormOpen(false);
    orderPickerRef.current.reset();
    orderShipRef.current.reset(store.supplier || "");
    notifyRole(
      "warehouse",
      t("notifNewStoreOrder"),
      `${store.name}: ${itemsSummary(items)} — ${t("notifRequestedBy")} ${myProfile?.name || t("aTeammate")}`
    );
    alert(t("orderSavedCheck"));
  }

  function toggleInvoiceForm() {
    setOrderFormOpen(false);
    setInvoiceFormOpen((v) => !v);
  }
  function cancelInvoiceForm() {
    setInvoiceFormOpen(false);
    invoicePickerRef.current?.reset();
  }
  async function saveInvoice() {
    const items = invoicePickerRef.current.getItems();
    if (items.length === 0) {
      alert(t("addAtLeastOneProduct"));
      return;
    }
    const companyName = ifCompany.trim();
    if (!companyName) {
      alert(t("companyNameRequired"));
      return;
    }
    await addDoc(collection(db, "invoiceRequests"), {
      storeId: store.id,
      company: companyName,
      contact: ifContact.trim(),
      address: ifAddress.trim(),
      phone: ifPhone.trim(),
      items,
      dealType: store.dealType || "buy",
      invoiceStatus: "pending",
      invoiceNumber: "",
      invoiceFileUrl: "",
      invoiceFileName: "",
      archived: false,
      createdBy: currentUser.uid,
      createdByName: currentActorName(myProfile, currentUser, t),
      createdAt: serverTimestamp()
    });
    setInvoiceFormOpen(false);
    invoicePickerRef.current.reset();
    notifyRole(
      "accountant",
      t("invoiceRequestedNotifTitle"),
      `${companyName}: ${itemsSummary(items)} — ${t("notifRequestedBy")} ${myProfile?.name || t("aTeammate")}`
    );
    alert(t("invoiceRequestedCheck"));
  }

  return (
    <div className="store-card">
      <div className="store-head">
        <b>{store.name}</b>
        {needsAgreement && <span className="badge-warn">{t("consignedNoAgreement")}</span>}
        <div className="lead-actions">
          <button className="btn-edit-store btn-edit" onClick={startEditIdentity}>
            {t("editBtn")}
          </button>
          <button className="btn-order" onClick={toggleOrderForm}>
            {t("createOrderBtn")}
          </button>
          <button className="btn-invoice" onClick={toggleInvoiceForm}>
            {t("requestInvoiceBtn")}
          </button>
          <button className="btn-demote" onClick={demote}>
            ↓ {t("backToProgressBtn")}
          </button>
          <button className="btn-delete" onClick={remove}>
            {t("deleteBtn")}
          </button>
        </div>
      </div>
      <div className="store-sub">{[store.contact, store.location].filter(Boolean).join(" · ")}</div>

      {editingIdentity && (
        <div className="store-identity-edit">
          <input placeholder={t("storeNamePlaceholder")} value={eName} onChange={(e) => setEName(e.target.value)} />
          <input
            placeholder={t("storeContactPlaceholder")}
            value={eContact}
            onChange={(e) => setEContact(e.target.value)}
          />
          <input
            placeholder={t("locationPlaceholder")}
            value={eLocation}
            onChange={(e) => setELocation(e.target.value)}
          />
          <button className="btn-save-identity" onClick={saveIdentity}>
            {t("saveBtn")}
          </button>
          <button className="btn-cancel-identity" onClick={() => setEditingIdentity(false)}>
            {t("cancelBtn")}
          </button>
        </div>
      )}

      <div className="store-grid">
        <div>
          <label>{t("supplierLabel")}</label>
          <select
            className={flashSupplier ? "saved-flash" : ""}
            value={supplier}
            onChange={async (e) => {
              setSupplier(e.target.value);
              await field("supplier", e.target.value);
              triggerSupplier();
            }}
          >
            <option value="">{t("chooseSupplier")}</option>
            {WAREHOUSES.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>{t("dealTypeLabel")}</label>
          <select
            value={dealType}
            onChange={async (e) => {
              setDealType(e.target.value);
              await field("dealType", e.target.value);
            }}
          >
            <option value="buy">{t("dealTypeBuy")}</option>
            <option value="consigned">{t("dealTypeConsigned")}</option>
          </select>
        </div>
        <div>
          <label>{t("paymentStatusLabel")}</label>
          <select
            value={paymentStatus}
            onChange={async (e) => {
              setPaymentStatus(e.target.value);
              await field("paymentStatus", e.target.value);
            }}
          >
            <option value="none">{t("paymentNone")}</option>
            <option value="invoiced">{t("paymentInvoiced")}</option>
            <option value="partial">{t("paymentPartial")}</option>
            <option value="paid">{t("paymentPaid")}</option>
          </select>
        </div>
        <div>
          <label>{t("addressLabel")}</label>
          <input
            className={flashAddress ? "saved-flash" : ""}
            placeholder={t("streetCityStateZip")}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onBlur={async () => {
              if (address === (store.address || "")) return;
              await field("address", address);
              triggerAddress();
            }}
          />
        </div>
        <div>
          <label>{t("phoneLabel")}</label>
          <input
            className={flashPhone ? "saved-flash" : ""}
            placeholder={t("phoneNumberPlaceholder")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={async () => {
              if (phone === (store.phone || "")) return;
              await field("phone", phone);
              triggerPhone();
            }}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label>{t("detailsNotesLabel")}</label>
          <textarea
            className={flashDetails ? "saved-flash" : ""}
            rows={2}
            placeholder={t("termsPlaceholder")}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            onBlur={async () => {
              if (details === (store.details || "")) return;
              await field("details", details);
              triggerDetails();
            }}
          />
        </div>
      </div>

      <div className="certs">
        <h3>{t("documentsTitle")}</h3>
        <CertRow
          storeId={store.id}
          certKey="resale"
          label={t("resaleCert")}
          value={certs.resale || "missing"}
          url={certs.resaleUrl}
        />
        <CertRow
          storeId={store.id}
          certKey="insurance"
          label={t("insuranceCert")}
          value={certs.insurance || "missing"}
          url={certs.insuranceUrl}
          insuranceExpiry={certs.insuranceExpiry}
        />
        <CertRow
          storeId={store.id}
          certKey="agreement"
          label={t("consignmentAgreement")}
          value={certs.agreement || "missing"}
          url={certs.agreementUrl}
        />
      </div>

      {orderFormOpen && (
        <div className="order-form item-form">
          <ProductPicker ref={orderPickerRef} />
          <WarehouseFields ref={orderShipRef} initialWarehouse={store.supplier || ""} />
          <div className="row">
            <button className="btn-save-order" onClick={saveOrder}>
              {t("saveOrderBtn")}
            </button>
            <button className="btn-cancel" onClick={cancelOrderForm}>
              {t("cancelBtn")}
            </button>
          </div>
        </div>
      )}

      {invoiceFormOpen && (
        <div className="invoice-form item-form">
          <div className="row">
            <input
              placeholder={t("contactNamePlaceholder")}
              style={{ flex: 1, minWidth: "140px" }}
              value={ifContact}
              onChange={(e) => setIfContact(e.target.value)}
            />
            <input
              placeholder={t("companyLegalNamePlaceholder")}
              style={{ flex: 1, minWidth: "160px" }}
              value={ifCompany}
              onChange={(e) => setIfCompany(e.target.value)}
            />
          </div>
          <div className="row">
            <input
              placeholder={t("billingAddressPlaceholder")}
              style={{ flex: 2, minWidth: "200px" }}
              value={ifAddress}
              onChange={(e) => setIfAddress(e.target.value)}
            />
            <input
              placeholder={t("phoneNumberPlaceholder")}
              style={{ flex: 1, minWidth: "120px" }}
              value={ifPhone}
              onChange={(e) => setIfPhone(e.target.value)}
            />
          </div>
          <ProductPicker ref={invoicePickerRef} />
          <div className="row">
            <button className="btn-save-invoice" onClick={saveInvoice}>
              {t("requestInvoiceBtn")}
            </button>
            <button className="btn-cancel" onClick={cancelInvoiceForm}>
              {t("cancelBtn")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
