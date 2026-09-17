import { useEffect } from "react";
import { useAuth } from "./contexts/AuthContext.jsx";
import { useNav } from "./contexts/NavContext.jsx";
import Header from "./components/Header.jsx";
import Nav from "./components/Nav.jsx";
import Home from "./components/Home.jsx";
import ColdLeadsTab from "./components/leads/ColdLeadsTab.jsx";
import ProgressLeadsTab from "./components/leads/ProgressLeadsTab.jsx";
import StoresTab from "./components/stores/StoresTab.jsx";
import OrdersStoreTab from "./components/orders/OrdersStoreTab.jsx";
import OrdersCustomerTab from "./components/orders/OrdersCustomerTab.jsx";
import OrderHistoryTab from "./components/orders/OrderHistoryTab.jsx";
import InvoicesPendingTab from "./components/invoices/InvoicesPendingTab.jsx";
import InvoicesDoneTab from "./components/invoices/InvoicesDoneTab.jsx";
import InvoiceHistoryTab from "./components/invoices/InvoiceHistoryTab.jsx";
import AdminTab from "./components/admin/AdminTab.jsx";

const TAB_COMPONENTS = {
  home: Home,
  cold: ColdLeadsTab,
  progress: ProgressLeadsTab,
  stores: StoresTab,
  "orders-store": OrdersStoreTab,
  "orders-customer": OrdersCustomerTab,
  "hist-orders": OrderHistoryTab,
  "inv-pending": InvoicesPendingTab,
  "inv-done": InvoicesDoneTab,
  "hist-invoices": InvoiceHistoryTab,
  admin: AdminTab
};

export default function AppShell() {
  const { isAdmin } = useAuth();
  const { activeTab, setActiveTab } = useNav();

  // If someone loses admin while looking at the admin tab, bounce them
  // somewhere they can still see.
  useEffect(() => {
    if (activeTab === "admin" && !isAdmin) setActiveTab("cold");
  }, [activeTab, isAdmin, setActiveTab]);

  const ActiveComponent = TAB_COMPONENTS[activeTab] || Home;

  return (
    <div id="app-screen">
      <Header />
      <Nav />
      <main>
        <ActiveComponent />
      </main>
    </div>
  );
}
