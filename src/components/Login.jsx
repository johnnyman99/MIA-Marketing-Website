import { useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import LangSwitch from "./LangSwitch.jsx";

export default function Login() {
  const { t } = useI18n();
  const { login, loginError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    login(email, password);
  }

  return (
    <div id="login-screen">
      <LangSwitch corner />
      <div className="login-box">
        <h1>MIA Sales</h1>
        <p className="sub">{t("signInSubtitle")}</p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder={t("passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">{t("signInBtn")}</button>
        </form>
        <div id="login-error">{loginError}</div>
      </div>
    </div>
  );
}
