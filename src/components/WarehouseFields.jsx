import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { WAREHOUSES } from "../utils.js";
import { useI18n } from "../i18n/I18nContext.jsx";

// Warehouse + destination-country picker used on every order form.
// California defaults the country to "United States"; Bulgaria clears it
// and requires the person to type a country before the order can be saved.
// Exposes validate()/getValue()/reset()/setDefaultWarehouse() via ref,
// mirroring the old wireWarehouseField() helper.
const WarehouseFields = forwardRef(function WarehouseFields({ initialWarehouse }, ref) {
  const { t } = useI18n();
  const [warehouse, setWarehouse] = useState(initialWarehouse || "");
  const [country, setCountry] = useState(initialWarehouse === "California" ? "United States" : "");
  const countryAutoFilled = useRef(initialWarehouse === "California");
  const warehouseTouched = useRef(false);

  function applyDefaults(wh, currentCountry) {
    if (wh === "California") {
      if (!currentCountry.trim() || countryAutoFilled.current) {
        countryAutoFilled.current = true;
        return "United States";
      }
      return currentCountry;
    }
    if (countryAutoFilled.current) {
      countryAutoFilled.current = false;
      return "";
    }
    return currentCountry;
  }

  useImperativeHandle(ref, () => ({
    setDefaultWarehouse(wh) {
      if (warehouseTouched.current) return;
      setWarehouse(wh || "");
      setCountry((c) => applyDefaults(wh || "", c));
    },
    validate() {
      if (!warehouse) {
        alert(t("pickWarehouse"));
        return false;
      }
      if (warehouse === "Bulgaria" && !country.trim()) {
        alert(t("enterCountryBulgaria"));
        return false;
      }
      return true;
    },
    getValue() {
      return { warehouse, country: country.trim() };
    },
    reset(newDefault) {
      countryAutoFilled.current = false;
      warehouseTouched.current = false;
      if (newDefault) {
        setWarehouse(newDefault);
        setCountry(applyDefaults(newDefault, ""));
      } else {
        setWarehouse("");
        setCountry("");
      }
    }
  }));

  return (
    <div className="row">
      <select
        className="of-warehouse"
        value={warehouse}
        onChange={(e) => {
          warehouseTouched.current = true;
          const wh = e.target.value;
          setWarehouse(wh);
          setCountry((c) => applyDefaults(wh, c));
        }}
      >
        <option value="">{t("shipFromWarehouse")}</option>
        {WAREHOUSES.map((w) => (
          <option key={w} value={w}>
            {w}
          </option>
        ))}
      </select>
      <input
        className="of-country"
        placeholder={t("countryPlaceholder")}
        value={country}
        onChange={(e) => {
          countryAutoFilled.current = false;
          setCountry(e.target.value);
        }}
      />
    </div>
  );
});

export default WarehouseFields;
