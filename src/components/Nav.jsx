import { useAuth } from "../contexts/AuthContext.jsx";
import { useData } from "../contexts/DataContext.jsx";
import { useNav } from "../contexts/NavContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";

const ORDERS_TABS = ["orders-store", "orders-customer"];
const INVOICE_TABS = ["inv-pending", "inv-done"];
const HISTORY_TABS = ["hist-orders", "hist-invoices"];

export default function Nav() {
  const { t } = useI18n();
  const { isAdmin } = useAuth();
  const { activeTab, setActiveTab } = useNav();
  const { coldLeads, progressLeads, stores, orders, invoices, team } = useData();

  const storeOrders = orders.filter((o) => o.orderSource !== "customer" && !o.archived).length;
  const customerOrders = orders.filter((o) => o.orderSource === "customer" && !o.archived).length;
  const histOrders = orders.filter((o) => o.archived).length;

  const pendingInvoices = invoices.filter((i) => !i.archived && i.invoiceStatus !== "done").length;
  const doneInvoices = invoices.filter((i) => !i.archived && i.invoiceStatus === "done").length;
  const histInvoices = invoices.filter((i) => i.archived).length;

  const TabButton = ({ tab, children }) => (
    <button className={`tab-btn${activeTab === tab ? " active" : ""}`} onClick={() => setActiveTab(tab)}>
      {children}
    </button>
  );

  const GroupButton = ({ groupTabs, defaultTab, children }) => (
    <button
      className={`tab-btn${groupTabs.includes(activeTab) ? " active" : ""}`}
      onClick={() => setActiveTab(groupTabs.includes(activeTab) ? activeTab : defaultTab)}
    >
      {children}
      <span className="caret">▾</span>
    </button>
  );

  const DropdownItem = ({ tab, children }) => (
    <button className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>
      {children}
    </button>
  );

  return (
    <nav>
      <TabButton tab="home">{t("navHome")}</TabButton>
      <TabButton tab="cold">
        <span>{t("navCold")}</span> <span className="count">{coldLeads.length}</span>
      </TabButton>
      <TabButton tab="progress">
        <span>{t("navProgress")}</span> <span className="count">{progressLeads.length}</span>
      </TabButton>
      <TabButton tab="stores">
        <span>{t("navStores")}</span> <span className="count">{stores.length}</span>
      </TabButton>

      <div className="nav-group">
        <GroupButton groupTabs={ORDERS_TABS} defaultTab="orders-store">
          <span>{t("navOrders")}</span> <span className="count">{storeOrders + customerOrders}</span>
        </GroupButton>
        <div className="dropdown">
          <DropdownItem tab="orders-store">
            <span>{t("navOrdersStore")}</span> <span className="count">{storeOrders}</span>
          </DropdownItem>
          <DropdownItem tab="orders-customer">
            <span>{t("navOrdersCustomer")}</span> <span className="count">{customerOrders}</span>
          </DropdownItem>
        </div>
      </div>

      <div className="nav-group">
        <GroupButton groupTabs={INVOICE_TABS} defaultTab="inv-pending">
          <span>{t("navInvoices")}</span> <span className="count">{pendingInvoices + doneInvoices}</span>
        </GroupButton>
        <div className="dropdown">
          <DropdownItem tab="inv-pending">
            <span>{t("navInvPending")}</span> <span className="count">{pendingInvoices}</span>
          </DropdownItem>
          <DropdownItem tab="inv-done">
            <span>{t("navInvDone")}</span> <span className="count">{doneInvoices}</span>
          </DropdownItem>
        </div>
      </div>

      <div className="nav-group">
        <GroupButton groupTabs={HISTORY_TABS} defaultTab="hist-orders">
          <span>{t("navHistory")}</span> <span className="count">{histOrders + histInvoices}</span>
        </GroupButton>
        <div className="dropdown">
          <DropdownItem tab="hist-orders">
            <span>{t("navHistOrders")}</span> <span className="count">{histOrders}</span>
          </DropdownItem>
          <DropdownItem tab="hist-invoices">
            <span>{t("navHistInvoices")}</span> <span className="count">{histInvoices}</span>
          </DropdownItem>
        </div>
      </div>

      {isAdmin && (
        <TabButton tab="admin">
          <span>{t("navAdmin")}</span> <span className="count">{team.length}</span>
        </TabButton>
      )}
    </nav>
  );
}
