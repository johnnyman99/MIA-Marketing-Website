import { I18nProvider } from "./i18n/I18nContext.jsx";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import { DataProvider } from "./contexts/DataContext.jsx";
import { NavProvider } from "./contexts/NavContext.jsx";
import Login from "./components/Login.jsx";
import AccountSetup from "./components/AccountSetup.jsx";
import AppShell from "./AppShell.jsx";

function Gate() {
  const { currentUser, needsSetup, authLoading } = useAuth();

  if (authLoading) return null;
  if (needsSetup) return <AccountSetup />;
  if (!currentUser) return <Login />;

  return (
    <DataProvider>
      <NavProvider>
        <AppShell />
      </NavProvider>
    </DataProvider>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </I18nProvider>
  );
}
