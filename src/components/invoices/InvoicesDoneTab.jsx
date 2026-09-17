import { useData } from "../../contexts/DataContext.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";
import InvoiceCard from "./InvoiceCard.jsx";

export default function InvoicesDoneTab() {
  const { t } = useI18n();
  const { invoices } = useData();
  const done = invoices.filter((i) => !i.archived && i.invoiceStatus === "done");

  return (
    <section id="tab-inv-done">
      <div className="card">
        <h2>{t("completedInvoicesTitle")}</h2>
        <div>
          {done.length === 0 ? (
            <p className="empty">{t("noCompletedInvoices")}</p>
          ) : (
            done.map((inv) => <InvoiceCard key={inv.id} invoice={inv} mode="done" />)
          )}
        </div>
      </div>
    </section>
  );
}
