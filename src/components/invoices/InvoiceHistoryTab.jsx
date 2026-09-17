import { useData } from "../../contexts/DataContext.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";
import { dateLabel } from "../../utils.js";
import InvoiceCard from "./InvoiceCard.jsx";

export default function InvoiceHistoryTab() {
  const { t, lang } = useI18n();
  const { invoices } = useData();
  const archived = invoices.filter((i) => i.archived);

  let lastLabel = null;

  return (
    <section id="tab-hist-invoices">
      <div className="card">
        <h2>{t("invoiceHistoryTitle")}</h2>
        <div>
          {archived.length === 0 ? (
            <p className="empty">{t("noFiledInvoices")}</p>
          ) : (
            archived.map((inv) => {
              const label = dateLabel(inv.createdAt, lang, t);
              const showHeading = label !== lastLabel;
              lastLabel = label;
              return (
                <div key={inv.id}>
                  {showHeading && <div className="date-heading">{label}</div>}
                  <InvoiceCard invoice={inv} mode="history" />
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
