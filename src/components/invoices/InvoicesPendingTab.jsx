import { useData } from "../../contexts/DataContext.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";
import InvoiceCard from "./InvoiceCard.jsx";

export default function InvoicesPendingTab() {
  const { t } = useI18n();
  const { invoices } = useData();
  const pending = invoices.filter((i) => !i.archived && i.invoiceStatus !== "done");

  return (
    <section id="tab-inv-pending">
      <div className="card">
        <h2>{t("invoiceRequestsTitle")}</h2>
        <div>
          {pending.length === 0 ? (
            <p className="empty">{t("noPendingRequests")}</p>
          ) : (
            pending.map((inv) => <InvoiceCard key={inv.id} invoice={inv} mode="pending" />)
          )}
        </div>
      </div>
    </section>
  );
}
