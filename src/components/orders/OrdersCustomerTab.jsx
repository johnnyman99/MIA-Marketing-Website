import { useData } from "../../contexts/DataContext.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";
import CustomerOrderForm from "./CustomerOrderForm.jsx";
import OrderCard from "./OrderCard.jsx";

export default function OrdersCustomerTab() {
  const { t } = useI18n();
  const { orders } = useData();
  const customerOrders = orders.filter((o) => o.orderSource === "customer" && !o.archived);

  return (
    <section id="tab-orders-customer">
      <CustomerOrderForm />
      <div className="card">
        <h2>{t("customerOrdersTitle")}</h2>
        <div>
          {customerOrders.length === 0 ? (
            <p className="empty">{t("noCustomerOrders")}</p>
          ) : (
            customerOrders.map((order) => <OrderCard key={order.id} order={order} isHistory={false} />)
          )}
        </div>
      </div>
    </section>
  );
}
