import { useState } from "react";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import { useI18n } from "../../i18n/I18nContext.jsx";
import { useSavedFlash } from "../../hooks/useSavedFlash.js";
import ItemLines from "../ItemLines.jsx";

const ORDER_STEPS = ["requested", "processing", "shipped", "delivered"];

function normalizeStep(status) {
  if (status === "new") return "requested";
  if (status === "sent") return "processing";
  if (status === "done") return "delivered";
  return status;
}

export default function OrderCard({ order, isHistory }) {
  const { t } = useI18n();
  const source = order.orderSource === "customer" ? "customer" : "store";
  const currentStep = normalizeStep(order.orderStatus);
  const currentIndex = Math.max(0, ORDER_STEPS.indexOf(currentStep));
  const items = order.items || (order.product ? [{ name: order.product, sku: "", qty: order.amount || 1, price: null }] : []);

  const STEP_LABELS = {
    requested: t("stepRequested"),
    processing: t("stepProcessing"),
    shipped: t("stepShipped"),
    delivered: t("stepDelivered")
  };

  const [tracking, setTracking] = useState(order.tracking || "");
  const [flashTracking, triggerTracking] = useSavedFlash();

  async function setStep(step) {
    await updateDoc(doc(db, "orders", order.id), { orderStatus: step });
    if (step === "shipped" && !isHistory) {
      if (confirm(t("confirmMarkShipped", { company: order.company }))) {
        await updateDoc(doc(db, "orders", order.id), { archived: true });
      }
    }
  }

  async function unarchive() {
    await updateDoc(doc(db, "orders", order.id), { archived: false });
  }

  async function remove() {
    if (confirm(t("confirmDeleteOrder", { company: order.company }))) await deleteDoc(doc(db, "orders", order.id));
  }

  return (
    <div className="order-card">
      <div className="order-top">
        <div className="order-info">
          <b>{order.company}</b>
          <span className="o-contact">{order.contact || ""}</span>
          <span className="o-address">
            {[order.address, order.country].filter(Boolean).join(" · ") || t("noAddressOnFile")}
          </span>
          <span className="o-phone">{order.phone || ""}</span>
          <ItemLines items={items} />
          <div style={{ marginTop: "6px" }}>
            <span className={`pill ${source === "customer" ? "pill-customer" : "pill-store"}`}>
              {source === "customer" ? t("customerLabel") : t("storeLabel")}
            </span>
            &nbsp;
            <span className={`pill ${order.dealType === "consigned" ? "pill-consigned" : "pill-buy"}`}>
              {order.dealType === "consigned" ? t("dealTypeConsigned") : t("buyLabel")}
            </span>
            {order.warehouse && (
              <>
                &nbsp;<span className="pill pill-warehouse">{order.warehouse}</span>
              </>
            )}
            {order.tracking && currentIndex >= 2 && (
              <>
                &nbsp;
                <span className="tracking-badge">
                  <span className="o-trackshow">{order.tracking}</span>
                </span>
              </>
            )}
          </div>
        </div>
        <div className="order-actions">
          {isHistory && (
            <button className="btn-unarchive" onClick={unarchive}>
              ↩︎ {t("backToOrders")}
            </button>
          )}
          <button className="btn-delete" onClick={remove}>
            {t("deleteBtn")}
          </button>
        </div>
      </div>

      <div className="order-progress">
        {ORDER_STEPS.map((step, i) => {
          const done = i <= currentIndex;
          return (
            <span key={step} style={{ display: "contents" }}>
              <div
                className={`step${done ? " done" : ""}`}
                title={t("markAsStep", { step: STEP_LABELS[step] })}
                onClick={() => setStep(step)}
              >
                <div className="dot">{done ? "✓" : ""}</div>
                <div className="step-label">{STEP_LABELS[step]}</div>
              </div>
              {i < ORDER_STEPS.length - 1 && <div className={`bar${i < currentIndex ? " filled" : ""}`}></div>}
            </span>
          );
        })}
      </div>

      <div className="tracking-row">
        <label>{t("trackingLabel")}</label>
        <input
          className={flashTracking ? "f-tracking saved-flash" : "f-tracking"}
          placeholder={t("trackingPlaceholder")}
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          onBlur={async () => {
            if (tracking === (order.tracking || "")) return;
            await updateDoc(doc(db, "orders", order.id), { tracking });
            triggerTracking();
          }}
        />
      </div>
    </div>
  );
}
