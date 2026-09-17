import { useRef, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../../firebase.js";
import { useI18n } from "../../i18n/I18nContext.jsx";

export default function CertRow({ storeId, certKey, label, value, url, insuranceExpiry }) {
  const { t } = useI18n();
  const fileInputRef = useRef(null);
  const [expiry, setExpiry] = useState(insuranceExpiry || "");
  const [uploading, setUploading] = useState(false);

  async function handleStatusChange(e) {
    await updateDoc(doc(db, "leads", storeId), { ["certs." + certKey]: e.target.value });
  }

  async function handleExpiryBlur() {
    if (expiry === (insuranceExpiry || "")) return;
    await updateDoc(doc(db, "leads", storeId), { ["certs.insuranceExpiry"]: expiry });
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
      const fileRef = ref(storage, `stores/${storeId}/${certKey}-${file.name}`);
      await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(fileRef);
      await updateDoc(doc(db, "leads", storeId), {
        ["certs." + certKey]: "onfile",
        ["certs." + certKey + "Url"]: downloadUrl
      });
    } catch (err) {
      alert(t("uploadFailed") + err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="cert-row">
      <span className="cert-name">{label}</span>
      <select className={value === "onfile" ? "f-cert cert-onfile" : "f-cert"} value={value} onChange={handleStatusChange}>
        <option value="missing">{t("certMissing")}</option>
        <option value="requested">{t("certRequested")}</option>
        <option value="onfile">{t("certOnFile")}</option>
      </select>
      {certKey === "insurance" && (
        <input
          type="date"
          title={t("insuranceExpiryTitle")}
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          onBlur={handleExpiryBlur}
        />
      )}
      <button type="button" className="btn-upload" disabled={uploading} onClick={() => fileInputRef.current.click()}>
        {uploading ? t("uploading") : t("uploadBtn")}
      </button>
      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        accept="application/pdf,image/*"
        onChange={handleFile}
      />
      {url && (
        <a className="cert-view" href={url} target="_blank" rel="noreferrer">
          {t("viewLink")}
        </a>
      )}
    </div>
  );
}
