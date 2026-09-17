import { useAuth } from "../contexts/AuthContext.jsx";
import { useData } from "../contexts/DataContext.jsx";
import { useNav } from "../contexts/NavContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import { activityMillis, itemsSummary, timeAgo } from "../utils.js";

export default function Home() {
  const { t, lang } = useI18n();
  const { myProfile } = useAuth();
  const { orders, invoices } = useData();
  const { setActiveTab } = useNav();

  const activity = [
    ...orders.map((o) => ({ ...o, activityType: "order" })),
    ...invoices.map((i) => ({ ...i, activityType: "invoice" }))
  ]
    .sort((a, b) => activityMillis(b) - activityMillis(a))
    .slice(0, 12);

  return (
    <section id="tab-home">
      <div className="home-hero">
        <p className="home-eyebrow">MIA Sales</p>
        <h2>
          <span>{t("homeWelcome")}</span> <span id="home-user-name">{myProfile?.name || t("homeThere")}</span>
        </h2>
        <p className="home-subtitle">{t("homeSubtitle")}</p>
      </div>

      <div className="card activity-card">
        <div className="activity-head">
          <h3>{t("recentActivity")}</h3>
          <span className="live-label">
            <span className="live-dot"></span>
            <span>{t("live")}</span>
          </span>
        </div>
        <div id="activity-list">
          {activity.length === 0 ? (
            <p className="activity-empty">{t("activityEmpty")}</p>
          ) : (
            activity.map((item) => {
              const isOrder = item.activityType === "order";
              const actor = item.createdByName || t("aTeammate");
              const company = item.company || (isOrder ? t("aCustomer") : t("aCompany"));
              return (
                <button
                  type="button"
                  key={`${item.activityType}-${item.id}`}
                  className="activity-item"
                  onClick={() =>
                    setActiveTab(
                      isOrder
                        ? item.orderSource === "customer"
                          ? "orders-customer"
                          : "orders-store"
                        : item.invoiceStatus === "done"
                        ? "inv-done"
                        : "inv-pending"
                    )
                  }
                >
                  <span className={`activity-icon ${isOrder ? "order" : "invoice"}`}></span>
                  <span className="activity-copy">
                    <p>
                      <strong className="activity-actor">{actor}</strong>{" "}
                      <span className="activity-action">
                        {isOrder ? t("activityAddedOrderFor") : t("activityRequestedInvoiceFor")}
                      </span>{" "}
                      <strong className="activity-company">{company}</strong>
                    </p>
                    <span className="activity-detail">{itemsSummary(item.items || [])}</span>
                  </span>
                  <span className="activity-time">{timeAgo(item.createdAt, lang, t)}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
