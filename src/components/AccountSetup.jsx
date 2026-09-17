import { useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import LangSwitch from "./LangSwitch.jsx";

export default function AccountSetup() {
  const { t } = useI18n();
  const { completeSetup, setupError } = useAuth();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    completeSetup(name, password);
  }

  return (
    <div id="setup-screen">
      <LangSwitch corner />
      <div className="login-box">
        <h1>{t("setupWelcome")}</h1>
        <p className="sub">{t("setupSubtitle")}</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder={t("yourNamePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="password"
            placeholder={t("setupPasswordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">{t("createAccountBtn")}</button>
        </form>
        <div id="setup-error">{setupError}</div>
      </div>
    </div>
  );
}
