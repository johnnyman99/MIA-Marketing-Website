import { useData } from "../../contexts/DataContext.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";
import LeadRow from "./LeadRow.jsx";

export default function ProgressLeadsTab() {
  const { t } = useI18n();
  const { progressLeads } = useData();

  return (
    <section id="tab-progress">
      <div className="card">
        <h2>{t("progressLeadsTitle")}</h2>
        <div>
          {progressLeads.length === 0 ? (
            <p className="empty">{t("noProgressLeads")}</p>
          ) : (
            progressLeads.map((lead) => <LeadRow key={lead.id} lead={lead} stage="progress" />)
          )}
        </div>
      </div>
    </section>
  );
}
