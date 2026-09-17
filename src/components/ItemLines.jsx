import { useI18n } from "../i18n/I18nContext.jsx";
import { formatTotal } from "../utils.js";

export default function ItemLines({ items }) {
  const { t, lang } = useI18n();
  const total = formatTotal(items, lang, t);

  return (
    <>
      <div className="order-items">
        {items.map((item, i) => (
          <div key={i}>
            <span className="i-name">{item.name}</span> ×<span className="i-qty">{item.qty}</span>{" "}
            <span className="i-price">{item.price != null ? `@ $${item.price}` : ""}</span>{" "}
            <span className="sku">{item.sku ? `(${item.sku})` : ""}</span>
          </div>
        ))}
      </div>
      {total && <div className="order-total">{total}</div>}
    </>
  );
}
