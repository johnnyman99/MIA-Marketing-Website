import { forwardRef, useImperativeHandle, useState } from "react";
import { PRODUCTS } from "../data/products.js";
import { useI18n } from "../i18n/I18nContext.jsx";

// Product search + qty/price + "add" button used on every order/invoice
// form. Exposes getItems()/reset() via ref, mirroring the old
// wireItemPicker() helper so every form can share one implementation.
const ProductPicker = forwardRef(function ProductPicker(_props, ref) {
  const { t } = useI18n();
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState("");
  const [items, setItems] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const matches =
    term.trim().length >= 2
      ? PRODUCTS.filter(
          (p) =>
            p.name.toLowerCase().includes(term.trim().toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(term.trim().toLowerCase()))
        ).slice(0, 8)
      : [];

  useImperativeHandle(ref, () => ({
    getItems: () => items,
    reset: () => {
      setItems([]);
      setSelected(null);
      setTerm("");
      setQty(1);
      setPrice("");
    }
  }));

  function pick(p) {
    setSelected(p);
    setTerm(p.name);
    setShowResults(false);
  }

  function addItem() {
    if (!selected) {
      alert(t("pickProductFirst"));
      return;
    }
    const q = Math.max(1, Number(qty) || 1);
    const pr = price === "" ? null : Number(price);
    setItems((prev) => [...prev, { name: selected.name, sku: selected.sku || "", price: pr, qty: q }]);
    setSelected(null);
    setTerm("");
    setQty(1);
    setPrice("");
  }

  function removeItem(i) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <>
      <div className="prod-search">
        <input
          className="of-search"
          placeholder={t("searchProductPlaceholder")}
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setSelected(null);
            setShowResults(e.target.value.trim().length >= 2);
          }}
        />
        {showResults && (
          <div className="prod-results">
            {matches.length === 0 ? (
              <div className="prod-item">
                <span>{t("noMatches")}</span>
              </div>
            ) : (
              matches.map((p) => (
                <div key={p.sku || p.name} className="prod-item" onClick={() => pick(p)}>
                  <span>{p.name}</span>
                  <span className="sku">{p.sku || ""}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <div className="row">
        <input
          className="of-qty"
          type="number"
          min="1"
          style={{ maxWidth: "90px" }}
          title={t("qtyTitle")}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <input
          className="of-price"
          type="number"
          min="0"
          step="0.01"
          placeholder={t("pricePerUnitPlaceholder")}
          style={{ maxWidth: "110px" }}
          title={t("pricePerUnitPlaceholder")}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <button type="button" className="btn-add-item" onClick={addItem}>
          {t("addItemBtn")}
        </button>
      </div>
      <div className="of-items">
        {items.map((item, i) => {
          const priceText = item.price != null ? ` @ $${item.price}` : "";
          return (
            <span className="item-chip" key={i}>
              <span>
                {item.name} ×{item.qty}
                {priceText}
              </span>
              <button type="button" title={t("removeTitle")} onClick={() => removeItem(i)}>
                ✕
              </button>
            </span>
          );
        })}
      </div>
    </>
  );
});

export default ProductPicker;
