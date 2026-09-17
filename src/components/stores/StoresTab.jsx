import { useData } from "../../contexts/DataContext.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";
import StoreCard from "./StoreCard.jsx";

export default function StoresTab() {
  const { t } = useI18n();
  const { stores } = useData();

  return (
    <section id="tab-stores">
      <div className="card">
        <h2>{t("storesTitle")}</h2>
        <div>
          {stores.length === 0 ? (
            <p className="empty">{t("noStores")}</p>
          ) : (
            stores.map((store) => <StoreCard key={store.id} store={store} />)
          )}
        </div>
      </div>
    </section>
  );
}
