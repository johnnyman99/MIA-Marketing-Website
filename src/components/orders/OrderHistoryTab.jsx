import { useData } from "../../contexts/DataContext.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";
import { dateLabel } from "../../utils.js";
import OrderCard from "./OrderCard.jsx";

export default function OrderHistoryTab() {
  const { t, lang } = useI18n();
  const { orders } = useData();
  const archived = orders.filter((o) => o.archived);

  let lastLabel = null;

  return (
    <section id="tab-hist-orders">
      <div className="card">
        <h2>{t("orderHistoryTitle")}</h2>
        <div>
          {archived.length === 0 ? (
            <p className="empty">{t("noArchivedOrders")}</p>
          ) : (
            archived.map((order) => {
              const label = dateLabel(order.createdAt, lang, t);
              const showHeading = label !== lastLabel;
              lastLabel = label;
              return (
                <div key={order.id}>
                  {showHeading && <div className="date-heading">{label}</div>}
                  <OrderCard order={order} isHistory />
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
