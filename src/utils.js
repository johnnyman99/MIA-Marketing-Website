// Small pure helpers shared across components — ported as-is from the
// original app.js so behavior stays identical.

export function roleLabel(role, t) {
  const labels = {
    user: t("roleUser"),
    warehouse: t("roleWarehouse"),
    accountant: t("roleAccountant"),
    admin: t("roleAdmin")
  };
  return labels[role] || role;
}

export function currentActorName(myProfile, currentUser, t) {
  return myProfile?.name || currentUser?.email?.split("@")[0] || t("aTeammate");
}

export function itemsSummary(items) {
  return (items || []).map((i) => `${i.name} ×${i.qty}`).join(", ");
}

export function dateLabel(ts, lang, t) {
  if (!ts || !ts.toDate) return "";
  return ts.toDate().toLocaleDateString(lang === "he" ? "he" : "en", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

export function activityMillis(item) {
  if (!item.createdAt) return 0;
  if (typeof item.createdAt.toMillis === "function") return item.createdAt.toMillis();
  if (typeof item.createdAt.toDate === "function") return item.createdAt.toDate().getTime();
  return 0;
}

export function timeAgo(ts, lang, t) {
  if (!ts || !ts.toDate) return "";
  const diff = (Date.now() - ts.toDate().getTime()) / 1000;
  if (diff < 60) return t("justNow");
  if (diff < 3600) return t("minutesAgo", { n: Math.floor(diff / 60) });
  if (diff < 86400) return t("hoursAgo", { n: Math.floor(diff / 3600) });
  return ts.toDate().toLocaleDateString(lang === "he" ? "he" : "en", { day: "numeric", month: "short" });
}

export function formatTotal(items, lang, t) {
  if (items.length > 0 && items.every((i) => i.price != null)) {
    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    return `${t("totalPrefix")} $${total.toLocaleString(lang === "he" ? "he" : "en", {
      maximumFractionDigits: 2
    })}`;
  }
  return null;
}

export const WAREHOUSES = ["California", "Bulgaria"];
