import { createContext, useContext, useMemo } from "react";
import { collection, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase.js";
import { useAuth } from "./AuthContext.jsx";
import { useFirestoreQuery } from "../hooks/useFirestoreQuery.js";

// One place that subscribes to every Firestore collection the app reads,
// so every tab shares the same live data instead of each tab running its
// own listener. Leads holds cold/progress/store leads all together — stage
// is just a field — so tabs filter it client-side instead of running a
// separate `where("stage","==",...)` query each (fewer listeners, fewer
// composite indexes to manage).
const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { currentUser, isAdmin } = useAuth();

  const leadsQ = useMemo(
    () => (currentUser ? query(collection(db, "leads"), orderBy("createdAt", "desc")) : null),
    [currentUser]
  );
  const ordersQ = useMemo(
    () => (currentUser ? query(collection(db, "orders"), orderBy("createdAt", "desc")) : null),
    [currentUser]
  );
  const invoicesQ = useMemo(
    () => (currentUser ? query(collection(db, "invoiceRequests"), orderBy("createdAt", "desc")) : null),
    [currentUser]
  );
  const notifsQ = useMemo(
    () =>
      currentUser
        ? query(
            collection(db, "notifications"),
            where("userId", "==", currentUser.uid),
            orderBy("createdAt", "desc"),
            limit(40)
          )
        : null,
    [currentUser]
  );
  const teamQ = useMemo(() => (isAdmin ? collection(db, "users") : null), [isAdmin]);
  const invitesQ = useMemo(() => (isAdmin ? collection(db, "invites") : null), [isAdmin]);

  const leads = useFirestoreQuery(leadsQ, [leadsQ]);
  const orders = useFirestoreQuery(ordersQ, [ordersQ]);
  const invoices = useFirestoreQuery(invoicesQ, [invoicesQ]);
  const notifications = useFirestoreQuery(notifsQ, [notifsQ]);
  const team = useFirestoreQuery(teamQ, [teamQ]);
  const invites = useFirestoreQuery(invitesQ, [invitesQ]);

  const coldLeads = useMemo(() => leads.docs.filter((l) => l.stage === "cold"), [leads.docs]);
  const progressLeads = useMemo(() => leads.docs.filter((l) => l.stage === "progress"), [leads.docs]);
  const stores = useMemo(() => leads.docs.filter((l) => l.stage === "store"), [leads.docs]);

  const value = {
    coldLeads,
    progressLeads,
    stores,
    orders: orders.docs,
    invoices: invoices.docs,
    notifications: notifications.docs,
    notificationsError: notifications.error,
    team: team.docs,
    invites: invites.docs,
    loading: leads.loading || orders.loading || invoices.loading
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
