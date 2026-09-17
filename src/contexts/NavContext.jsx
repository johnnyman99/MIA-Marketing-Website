import { createContext, useContext, useState } from "react";

const NavContext = createContext(null);

export function NavProvider({ children }) {
  const [activeTab, setActiveTab] = useState("home");
  return (
    <NavContext.Provider value={{ activeTab, setActiveTab }}>{children}</NavContext.Provider>
  );
}

export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav must be used inside <NavProvider>");
  return ctx;
}
