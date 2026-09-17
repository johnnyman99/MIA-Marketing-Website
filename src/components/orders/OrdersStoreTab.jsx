import { useData } from "../../contexts/DataContext.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";
import NewStoreOrderForm from "./NewStoreOrderForm.jsx";
import OrderCard from "./OrderCard.jsx";

export default function OrdersStoreTab() {
  const { t } = useI18n();
  const { orders } = useData();
  const storeOrders = orders.filter((o) => o.orderSource !== "customer" && !o.archived);

  return (
    <section id="tab-orders-store">
      <NewStoreOrderForm />
      <div className="card">
        <h2>{t("storeOrdersTitle")}</h2>
        <p className="empty" style={{ marginBottom: "12px" }}>
          {t("storeOrdersHelp")}
        </p>
        <div>
          {storeOrders.length === 0 ? (
            <p className="empty">{t("noStoreOrders")}</p>
          ) : (
            storeOrders.map((order) => <OrderCard key={order.id} order={order} isHistory={false} />)
          )}
        </div>
      </div>
    </section>
  );
}
