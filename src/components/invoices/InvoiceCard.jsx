import { useRef, useState } from "react";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../../firebase.js";
import { useI18n } from "../../i18n/I18nContext.jsx";
import { useSavedFlash } from "../../hooks/useSavedFlash.js";
import ItemLines from "../ItemLines.jsx";

export default function InvoiceCard({ invoice, mode }) {
  const { t } = useI18n();
  const isDone = invoice.invoiceStatus === "done";
  const isHistory = mode === "history";
  const items = invoice.items || [];

  const [invoiceNumber, setInvoiceNumber] = useState(invoice.invoiceNumber || "");
  const [flashNum, triggerNum] = useSavedFlash();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  async function saveNumber() {
    if (invoiceNumber === (invoice.invoiceNumber || "")) return;
    await updateDoc(doc(db, "invoiceRequests", invoice.id), { invoiceNumber });
    triggerNum();
  }

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      alert(t("maxFileSize"));
      return;
    }
    setUploading(true);
    try {
      const fileRef = ref(storage, `invoices/${invoice.id}/${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      await updateDoc(doc(db, "invoiceRequests", invoice.id), {
        invoiceFileUrl: url,
        invoiceFileName: file.name
      });
    } catch (err) {
      alert(t("uploadFailed") + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function toggleDone() {
    await updateDoc(doc(db, "invoiceRequests", invoice.id), { invoiceStatus: isDone ? "pending" : "done" });
  }

  async function archive() {
    if (confirm(t("confirmMoveHistory", { company: invoice.company }))) {
      await updateDoc(doc(db, "invoiceRequests", invoice.id), { archived: true });
    }
  }

  async function unarchive() {
    await updateDoc(doc(db, "invoiceRequests", invoice.id), { archived: false });
  }

  async function remove() {
    if (confirm(t("confirmDeleteInvoice", { company: invoice.company })))
      await deleteDoc(doc(db, "invoiceRequests", invoice.id));
  }

  return (
    <div className="order-card">
      <div className="order-top">
        <div className="order-info">
          <b>{invoice.company}</b>
          <span className="o-contact">{invoice.contact || ""}</span>
          <span className="o-address">{invoice.address || ""}</span>
          <span className="o-phone">{invoice.phone || ""}</span>
          <ItemLines items={items} />
          <div style={{ marginTop: "6px" }}>
            <span className={`pill ${invoice.dealType === "consigned" ? "pill-consigned" : "pill-buy"}`}>
              {invoice.dealType === "consigned" ? t("dealTypeConsigned") : t("buyLabel")}
            </span>
            {isHistory && <span className="pill pill-done">{t("filedLabel")}</span>}
          </div>
        </div>
        <div className="order-actions">
          {isHistory ? (
            <button className="btn-unarchive" onClick={unarchive}>
              ↩︎ {t("backToInvoices")}
            </button>
          ) : (
            <>
              <button className={isDone ? "btn-toggle-done" : "btn-toggle-done btn-done"} onClick={toggleDone}>
                {isDone ? "↩︎ " + t("backToRequests") : t("markDoneBtn")}
              </button>
              {isDone && invoice.invoiceFileUrl && (
                <button className="btn-archive-inv btn-archive" onClick={archive}>
                  {t("moveToHistoryBtn")}
                </button>
              )}
            </>
          )}
          <button className="btn-delete" onClick={remove}>
            {t("deleteBtn")}
          </button>
        </div>
      </div>

      <div className="tracking-row">
        <label>{t("invoiceNumberLabel")}</label>
        <input
          className={flashNum ? "f-invnum saved-flash" : "f-invnum"}
          placeholder={t("invoiceNumberPlaceholder")}
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          onBlur={saveNumber}
        />
      </div>

      {(isDone || isHistory) && (
        <div className="invoice-file-row">
          <label>{t("invoiceFileLabel")}</label>
          <span className="file-slot">
            {invoice.invoiceFileUrl ? (
              <a className="cert-view" href={invoice.invoiceFileUrl} target="_blank" rel="noreferrer">
                {invoice.invoiceFileName || t("viewInvoiceDefault")}
              </a>
            ) : (
              <span className="file-none">{t("noFileAttached")}</span>
            )}
          </span>
          <button
            type="button"
            className="btn-upload btn-inv-upload"
            disabled={uploading}
            onClick={() => fileInputRef.current.click()}
          >
            {uploading ? t("uploading") : invoice.invoiceFileUrl ? t("replaceBtn") : t("attachInvoiceBtn")}
          </button>
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            accept="application/pdf,image/*"
            onChange={handleFile}
          />
        </div>
      )}
    </div>
  );
}
