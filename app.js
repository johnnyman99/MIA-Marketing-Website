// ---- 1. Connect to Firebase ----
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut,
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, updatePassword
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, deleteDoc, updateDoc, doc, getDoc, setDoc, getDocs,
  query, where, orderBy, limit, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
import { PRODUCTS } from "./products.js";

const firebaseConfig = {
  apiKey: "AIzaSyDZn3WBh7l78bxnXMhuUsSuC5CtmA3b3yQ",
  authDomain: "mia-sales-c9623.firebaseapp.com",
  projectId: "mia-sales-c9623",
  storageBucket: "mia-sales-c9623.firebasestorage.app",
  messagingSenderId: "254926909292",
  appId: "1:254926909292:web:ce6be2ff6607979b7d0d49"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let currentUser = null;
let myProfile = null;

const loginScreen = document.getElementById("login-screen");
const setupScreen = document.getElementById("setup-screen");
const appScreen = document.getElementById("app-screen");
const loginError = document.getElementById("login-error");
const setupError = document.getElementById("setup-error");

// ---- 2. Navigation (top tabs + hover menus) ----
function showTab(tabName) {
  document.querySelectorAll("main > section").forEach(s => s.classList.add("hidden"));
  const section = document.getElementById("tab-" + tabName);
  if (section) section.classList.remove("hidden");

  // highlight the matching top-level button
  document.querySelectorAll("nav .tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".dropdown button").forEach(b => b.classList.remove("active"));

  const dropItem = document.querySelector(`.dropdown button[data-tab="${tabName}"]`);
  if (dropItem) {
    dropItem.classList.add("active");
    const groupBtn = dropItem.closest(".nav-group").querySelector(".tab-btn");
    groupBtn.classList.add("active");
    groupBtn.dataset.tab = tabName;   // clicking the group again reopens what you last used
  } else {
    const topBtn = document.querySelector(`nav > .tab-btn[data-tab="${tabName}"]`);
    if (topBtn) topBtn.classList.add("active");
  }
}

document.querySelectorAll("nav .tab-btn, .dropdown button").forEach((btn) => {
  btn.addEventListener("click", () => showTab(btn.dataset.tab));
});

// ---- 3. Sign in ----
document.getElementById("login-btn").addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(
      auth,
      document.getElementById("email").value,
      document.getElementById("password").value
    );
  } catch (err) {
    loginError.textContent = "Wrong email or password.";
  }
});

document.getElementById("signout-btn").addEventListener("click", () => signOut(auth));

// ---- 4. Invite links ----
let pendingInviteRole = null;

async function handleInviteLink() {
  if (!isSignInWithEmailLink(auth, window.location.href)) return false;
  let email = window.localStorage.getItem("inviteEmail");
  if (!email) email = window.prompt("Please confirm the email this invite was sent to:");
  if (!email) return false;
  try {
    await signInWithEmailLink(auth, email, window.location.href);
    window.localStorage.removeItem("inviteEmail");
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
  } catch (err) {
    alert("That invite link didn't work: " + err.message);
    return false;
  }
}

document.getElementById("setup-btn").addEventListener("click", async () => {
  const name = document.getElementById("setup-name").value.trim();
  const password = document.getElementById("setup-password").value;
  if (!name) { setupError.textContent = "Please enter your name."; return; }
  if (password.length < 6) { setupError.textContent = "Password needs at least 6 characters."; return; }

  try {
    await updatePassword(auth.currentUser, password);
    await setDoc(doc(db, "users", auth.currentUser.uid), {
      name: name,
      email: auth.currentUser.email,
      role: pendingInviteRole || "user",
      createdAt: serverTimestamp()
    });
    const invSnap = await getDocs(query(
      collection(db, "invites"),
      where("email", "==", auth.currentUser.email.toLowerCase())
    ));
    invSnap.forEach((i) => deleteDoc(doc(db, "invites", i.id)).catch(() => {}));
    setupScreen.classList.add("hidden");
    startApp();
  } catch (err) {
    setupError.textContent = "Couldn't finish setup: " + err.message;
  }
});

// ---- 5. Auth state ----
let stopCold = null, stopProgress = null, stopStores = null, stopOrders = null,
    stopInvoices = null, stopTeam = null, stopNotifs = null, stopMyProfile = null, stopInvites = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const profileSnap = await getDoc(doc(db, "users", user.uid));

    if (!profileSnap.exists()) {
      const invSnap = await getDocs(query(
        collection(db, "invites"),
        where("email", "==", user.email.toLowerCase())
      ));
      pendingInviteRole = invSnap.empty ? null : invSnap.docs[0].data().role;

      if (pendingInviteRole) {
        loginScreen.classList.add("hidden");
        appScreen.classList.add("hidden");
        setupScreen.classList.remove("hidden");
        return;
      }
      const role = (await noAdminsYet()) ? "admin" : "user";
      await setDoc(doc(db, "users", user.uid), {
        name: user.email.split("@")[0],
        email: user.email,
        role: role,
        createdAt: serverTimestamp()
      });
    } else if (await noAdminsYet()) {
      await updateDoc(doc(db, "users", user.uid), { role: "admin" });
    }

    startApp();
  } else {
    currentUser = null;
    myProfile = null;
    const cameFromLink = await handleInviteLink();
    if (cameFromLink) return;
    loginScreen.classList.remove("hidden");
    setupScreen.classList.add("hidden");
    appScreen.classList.add("hidden");
    [stopCold, stopProgress, stopStores, stopOrders, stopInvoices, stopTeam, stopNotifs, stopMyProfile, stopInvites]
      .forEach(fn => { if (fn) fn(); });
  }
});

async function noAdminsYet() {
  try {
    const admins = await getDocs(query(collection(db, "users"), where("role", "==", "admin")));
    return admins.empty;
  } catch {
    return false;
  }
}

function startApp() {
  loginScreen.classList.add("hidden");
  setupScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
  watchMyProfile();
  listenCold();
  listenProgress();
  listenStores();
  listenOrders();
  listenInvoices();
  listenNotifications();
}

// ---- 6. Profile & roles ----
const ROLE_LABELS = { user: "Normal user", warehouse: "Warehouse manager", accountant: "Accountant", admin: "Admin" };

function watchMyProfile() {
  stopMyProfile = onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
    myProfile = snap.data() || null;
    document.getElementById("welcome-text").textContent = `Welcome ${myProfile?.name || "there"}!`;

    const isAdmin = myProfile?.role === "admin";
    document.getElementById("admin-tab-btn").classList.toggle("hidden", !isAdmin);
    if (isAdmin) {
      if (!stopTeam) listenTeam();
      if (!stopInvites) listenInvites();
    } else {
      if (!document.getElementById("tab-admin").classList.contains("hidden")) showTab("cold");
      if (stopTeam) { stopTeam(); stopTeam = null; }
      if (stopInvites) { stopInvites(); stopInvites = null; }
    }
  });
}

async function notifyRole(role, title, body) {
  try {
    const snap = await getDocs(query(collection(db, "users"), where("role", "==", role)));
    const jobs = [];
    snap.forEach((u) => {
      if (u.id === currentUser.uid) return;
      jobs.push(addDoc(collection(db, "notifications"), {
        userId: u.id, title, body, read: false, createdAt: serverTimestamp()
      }));
    });
    await Promise.all(jobs);
  } catch (err) {
    console.error("Notification failed:", err);
  }
}

// ---- 7. Invites ----
document.getElementById("invite-btn").addEventListener("click", async () => {
  const emailInput = document.getElementById("invite-email");
  const roleSel = document.getElementById("invite-role");
  const statusEl = document.getElementById("invite-status");
  const email = emailInput.value.trim().toLowerCase();
  if (!email) { alert("Enter an email 🙂"); return; }

  statusEl.textContent = "Sending…";
  try {
    await setDoc(doc(db, "invites", email), {
      email: email,
      role: roleSel.value,
      invitedBy: myProfile?.name || currentUser.email,
      createdAt: serverTimestamp()
    });
    await sendSignInLinkToEmail(auth, email, {
      url: window.location.origin + window.location.pathname,
      handleCodeInApp: true
    });
    statusEl.textContent = `✓ Invite sent to ${email}. Ask them to check their inbox (and spam).`;
    emailInput.value = "";
  } catch (err) {
    statusEl.textContent = "Couldn't send: " + err.message;
  }
});

function listenInvites() {
  const listDiv = document.getElementById("invites-list");
  stopInvites = onSnapshot(collection(db, "invites"), (snapshot) => {
    listDiv.innerHTML = "";
    if (snapshot.empty) { listDiv.innerHTML = '<p class="empty">No pending invites.</p>'; return; }
    snapshot.forEach((iDoc) => {
      const inv = iDoc.data();
      const row = document.createElement("div");
      row.className = "invite-row";
      row.innerHTML = `
        <div class="invite-main"><b class="i-email"></b><span class="i-meta"></span></div>
        <button class="btn-resend" style="padding:6px 10px;border:1px solid #ddd;border-radius:6px;background:white;cursor:pointer;font-size:13px;">Resend</button>
        <button class="btn-cancel-invite" style="padding:6px 10px;border:1px solid #ddd;border-radius:6px;background:white;cursor:pointer;font-size:13px;">Cancel</button>
      `;
      row.querySelector(".i-email").textContent = inv.email;
      row.querySelector(".i-meta").textContent = `${ROLE_LABELS[inv.role] || inv.role} · invited by ${inv.invitedBy || "—"}`;

      row.querySelector(".btn-resend").addEventListener("click", async (e) => {
        e.target.textContent = "Sending…";
        try {
          await sendSignInLinkToEmail(auth, inv.email, {
            url: window.location.origin + window.location.pathname,
            handleCodeInApp: true
          });
          e.target.textContent = "✓ Sent";
          setTimeout(() => { e.target.textContent = "Resend"; }, 2000);
        } catch (err) {
          alert("Couldn't resend: " + err.message);
          e.target.textContent = "Resend";
        }
      });
      row.querySelector(".btn-cancel-invite").addEventListener("click", async () => {
        if (confirm(`Cancel the invite for ${inv.email}?`)) await deleteDoc(doc(db, "invites", iDoc.id));
      });
      listDiv.appendChild(row);
    });
  });
}

// ---- 8. Team ----
function listenTeam() {
  const listDiv = document.getElementById("team-list");
  stopTeam = onSnapshot(collection(db, "users"), (snapshot) => {
    document.getElementById("count-team").textContent = snapshot.size;
    listDiv.innerHTML = "";
    snapshot.forEach((uDoc) => {
      const u = uDoc.data();
      const isMe = uDoc.id === currentUser.uid;
      const row = document.createElement("div");
      row.className = "user-row";
      row.innerHTML = `
        <div class="user-main">
          <input class="u-name" placeholder="Display name">
          <span class="u-email"></span>
        </div>
        ${isMe ? '<span class="you-tag">you</span>' : ''}
        <select class="u-role">
          <option value="user">Normal user</option>
          <option value="warehouse">Warehouse manager</option>
          <option value="accountant">Accountant</option>
          <option value="admin">Admin</option>
        </select>
      `;
      const nameInput = row.querySelector(".u-name");
      nameInput.value = u.name || "";
      row.querySelector(".u-email").textContent = u.email || "";
      const roleSel = row.querySelector(".u-role");
      roleSel.value = u.role || "user";

      nameInput.addEventListener("change", async () => {
        await updateDoc(doc(db, "users", uDoc.id), { name: nameInput.value.trim() });
        nameInput.classList.add("saved-flash");
        setTimeout(() => nameInput.classList.remove("saved-flash"), 600);
      });
      roleSel.addEventListener("change", async () => {
        if (isMe && roleSel.value !== "admin") {
          if (!confirm("Remove your own admin access? You'll lose that tab immediately.")) {
            roleSel.value = "admin"; return;
          }
        }
        await updateDoc(doc(db, "users", uDoc.id), { role: roleSel.value });
        roleSel.classList.add("saved-flash");
        setTimeout(() => roleSel.classList.remove("saved-flash"), 600);
      });
      listDiv.appendChild(row);
    });
  });
}

// ---- 9. Inbox ----
const inboxPanel = document.getElementById("inbox-panel");
document.getElementById("inbox-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  inboxPanel.classList.toggle("hidden");
});
document.addEventListener("click", (e) => {
  if (!inboxPanel.contains(e.target) && e.target.id !== "inbox-btn") inboxPanel.classList.add("hidden");
});

function timeAgo(ts) {
  if (!ts || !ts.toDate) return "";
  const diff = (Date.now() - ts.toDate().getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return ts.toDate().toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function listenNotifications() {
  const listDiv = document.getElementById("notif-list");
  const badge = document.getElementById("unread-badge");
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", currentUser.uid),
    orderBy("createdAt", "desc"),
    limit(40)
  );

  stopNotifs = onSnapshot(q, (snapshot) => {
    let unread = 0;
    listDiv.innerHTML = "";
    if (snapshot.empty) listDiv.innerHTML = '<p class="empty" style="padding:16px;">Nothing here yet.</p>';
    snapshot.forEach((nDoc) => {
      const n = nDoc.data();
      if (!n.read) unread++;
      const item = document.createElement("div");
      item.className = "notif" + (n.read ? "" : " unread");
      item.innerHTML = `<div class="notif-title"></div><div class="notif-body"></div><div class="notif-time"></div>`;
      item.querySelector(".notif-title").textContent = n.title;
      item.querySelector(".notif-body").textContent = n.body;
      item.querySelector(".notif-time").textContent = timeAgo(n.createdAt);
      item.addEventListener("click", async () => {
        if (!n.read) await updateDoc(doc(db, "notifications", nDoc.id), { read: true });
      });
      listDiv.appendChild(item);
    });
    badge.textContent = unread;
    badge.classList.toggle("hidden", unread === 0);
  }, (err) => {
    console.error(err);
    listDiv.innerHTML = '<p class="empty" style="padding:16px;">Inbox needs a database index — check the console for the link.</p>';
  });
}

document.getElementById("mark-all-read").addEventListener("click", async () => {
  const snap = await getDocs(query(
    collection(db, "notifications"),
    where("userId", "==", currentUser.uid),
    where("read", "==", false)
  ));
  const jobs = [];
  snap.forEach((n) => jobs.push(updateDoc(doc(db, "notifications", n.id), { read: true })));
  await Promise.all(jobs);
});

// ---- 10. Helpers ----
function wireItemPicker(formEl) {
  const searchInput = formEl.querySelector(".of-search");
  const resultsDiv = formEl.querySelector(".prod-results");
  const qtyInput = formEl.querySelector(".of-qty");
  const priceInput = formEl.querySelector(".of-price");
  const itemsDiv = formEl.querySelector(".of-items");
  let selectedProduct = null;
  let draftItems = [];

  const renderItems = () => {
    itemsDiv.innerHTML = "";
    draftItems.forEach((item, i) => {
      const chip = document.createElement("span");
      chip.className = "item-chip";
      chip.innerHTML = `<span></span><button title="Remove">✕</button>`;
      const priceText = item.price != null ? ` @ $${item.price}` : "";
      chip.querySelector("span").textContent = `${item.name} ×${item.qty}${priceText}`;
      chip.querySelector("button").addEventListener("click", () => {
        draftItems.splice(i, 1);
        renderItems();
      });
      itemsDiv.appendChild(chip);
    });
  };

  searchInput.addEventListener("input", () => {
    const term = searchInput.value.trim().toLowerCase();
    selectedProduct = null;
    if (term.length < 2) { resultsDiv.classList.add("hidden"); return; }
    const matches = PRODUCTS.filter(p =>
      p.name.toLowerCase().includes(term) || (p.sku && p.sku.toLowerCase().includes(term))
    ).slice(0, 8);
    if (matches.length === 0) {
      resultsDiv.innerHTML = '<div class="prod-item"><span>No matches</span></div>';
      resultsDiv.classList.remove("hidden");
      return;
    }
    resultsDiv.innerHTML = "";
    matches.forEach((p) => {
      const item = document.createElement("div");
      item.className = "prod-item";
      item.innerHTML = `<span></span><span class="sku"></span>`;
      item.querySelector("span").textContent = p.name;
      item.querySelector(".sku").textContent = p.sku || "";
      item.addEventListener("click", () => {
        selectedProduct = p;
        searchInput.value = p.name;
        resultsDiv.classList.add("hidden");
      });
      resultsDiv.appendChild(item);
    });
    resultsDiv.classList.remove("hidden");
  });

  formEl.querySelector(".btn-add-item").addEventListener("click", () => {
    if (!selectedProduct) { alert("Pick a product from the search list first 🙂"); return; }
    const qty = Math.max(1, Number(qtyInput.value) || 1);
    const price = priceInput.value === "" ? null : Number(priceInput.value);
    draftItems.push({ name: selectedProduct.name, sku: selectedProduct.sku || "", price: price, qty: qty });
    renderItems();
    selectedProduct = null;
    searchInput.value = "";
    qtyInput.value = 1;
    priceInput.value = "";
    searchInput.focus();
  });

  return {
    getItems: () => draftItems,
    reset: () => {
      draftItems = []; renderItems(); selectedProduct = null;
      searchInput.value = ""; qtyInput.value = 1; priceInput.value = "";
    }
  };
}

const PICKER_HTML = `
  <div class="prod-search">
    <input class="of-search" placeholder="Search product or SKU… (e.g. battery, SP0071)">
    <div class="prod-results hidden"></div>
  </div>
  <div class="row">
    <input class="of-qty" type="number" min="1" value="1" style="max-width: 90px;" title="Quantity">
    <input class="of-price" type="number" min="0" step="0.01" placeholder="$ / unit" style="max-width: 110px;" title="Your price per unit">
    <button class="btn-add-item">+ Add</button>
  </div>
  <div class="of-items"></div>
`;

function renderItemLines(itemsEl, totalEl, items) {
  items.forEach((item) => {
    const line = document.createElement("div");
    line.innerHTML = `<span class="i-name"></span> ×<span class="i-qty"></span> <span class="i-price"></span> <span class="sku"></span>`;
    line.querySelector(".i-name").textContent = item.name;
    line.querySelector(".i-qty").textContent = item.qty;
    line.querySelector(".i-price").textContent = item.price != null ? `@ $${item.price}` : "";
    line.querySelector(".sku").textContent = item.sku ? `(${item.sku})` : "";
    itemsEl.appendChild(line);
  });
  if (items.length > 0 && items.every(i => i.price != null)) {
    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    totalEl.textContent = `Total: $${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    totalEl.classList.remove("hidden");
  }
}

function itemsSummary(items) {
  return items.map(i => `${i.name} ×${i.qty}`).join(", ");
}

function dateLabel(ts) {
  if (!ts || !ts.toDate) return "No date";
  return ts.toDate().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

// ---- 11. Customer order form ----
const customerForm = document.getElementById("customer-order-form");
const customerPicker = wireItemPicker(customerForm);

customerForm.querySelector(".btn-save-customer-order").addEventListener("click", async () => {
  const name = customerForm.querySelector(".co-name").value.trim();
  const phone = customerForm.querySelector(".co-phone").value.trim();
  const email = customerForm.querySelector(".co-email").value.trim();
  const address = customerForm.querySelector(".co-address").value.trim();
  const items = customerPicker.getItems();

  if (!name) { alert("Customer name, please 🙂"); return; }
  if (items.length === 0) { alert("Add at least one product 🙂"); return; }

  await addDoc(collection(db, "orders"), {
    orderSource: "customer",
    company: name,
    contact: email,
    phone: phone,
    address: address,
    items: items,
    dealType: "buy",
    orderStatus: "requested",
    tracking: "",
    archived: false,
    createdAt: serverTimestamp()
  });

  customerForm.querySelector(".co-name").value = "";
  customerForm.querySelector(".co-phone").value = "";
  customerForm.querySelector(".co-email").value = "";
  customerForm.querySelector(".co-address").value = "";
  customerPicker.reset();

  notifyRole("warehouse", "New customer order",
    `${name}: ${itemsSummary(items)} — entered by ${myProfile?.name || "a teammate"}`);

  alert("Customer order saved!");
});

// ---- 12. Leads ----
document.getElementById("add-lead-btn").addEventListener("click", async () => {
  const name = document.getElementById("lead-name").value.trim();
  const contact = document.getElementById("lead-contact").value.trim();
  const location = document.getElementById("lead-location").value.trim();
  if (!name) { alert("At least give it a name 🙂"); return; }

  await addDoc(collection(db, "leads"), {
    name, contact, location, stage: "cold", status: "", lastSpoken: "",
    createdAt: serverTimestamp()
  });

  document.getElementById("lead-name").value = "";
  document.getElementById("lead-contact").value = "";
  document.getElementById("lead-location").value = "";

  notifyRole("user", "New lead added",
    `${myProfile?.name || "Someone"} added ${name}${location ? " (" + location + ")" : ""}`);
});

function buildLeadRow(leadDoc, stage) {
  const lead = leadDoc.data();
  const row = document.createElement("div");
  row.className = "lead-row";

  const progressFields = stage === "progress" ? `
    <div class="progress-fields">
      <input class="f-status" placeholder="Status (e.g. sent pricing)">
      <input class="f-spoken" placeholder="Last spoken (e.g. 14 Sep, Rose)">
    </div>` : "";

  row.innerHTML = `
    <div class="lead-info"><b></b><span></span></div>
    <div class="lead-edit hidden">
      <input class="e-name" placeholder="Store / company name">
      <input class="e-contact" placeholder="Contact">
      <input class="e-location" placeholder="Location">
    </div>
    ${progressFields}
    <div class="lead-actions">
      <button class="btn-edit">✏️ Edit</button>
      <button class="btn-save-edit hidden">Save</button>
      <button class="btn-cancel-edit hidden">Cancel</button>
      <button class="btn-promote">Promote ↑</button>
      ${stage === "progress" ? '<button class="btn-demote">↓</button>' : ''}
      <button class="btn-delete">Delete</button>
    </div>
  `;

  const infoDiv = row.querySelector(".lead-info");
  const editDiv = row.querySelector(".lead-edit");
  row.querySelector("b").textContent = lead.name;
  row.querySelector("span").textContent = [lead.contact, lead.location].filter(Boolean).join(" · ");

  if (stage === "progress") {
    const statusInput = row.querySelector(".f-status");
    const spokenInput = row.querySelector(".f-spoken");
    statusInput.value = lead.status || "";
    spokenInput.value = lead.lastSpoken || "";
    statusInput.addEventListener("change", async () => {
      await updateDoc(doc(db, "leads", leadDoc.id), { status: statusInput.value });
      statusInput.classList.add("saved-flash");
      setTimeout(() => statusInput.classList.remove("saved-flash"), 600);
    });
    spokenInput.addEventListener("change", async () => {
      await updateDoc(doc(db, "leads", leadDoc.id), { lastSpoken: spokenInput.value });
      spokenInput.classList.add("saved-flash");
      setTimeout(() => spokenInput.classList.remove("saved-flash"), 600);
    });
  }

  const editBtn = row.querySelector(".btn-edit");
  const saveBtn = row.querySelector(".btn-save-edit");
  const cancelBtn = row.querySelector(".btn-cancel-edit");
  const promoteBtn = row.querySelector(".btn-promote");
  const demoteBtn = row.querySelector(".btn-demote");

  const setEditing = (on) => {
    infoDiv.classList.toggle("hidden", on);
    editDiv.classList.toggle("hidden", !on);
    editBtn.classList.toggle("hidden", on);
    saveBtn.classList.toggle("hidden", !on);
    cancelBtn.classList.toggle("hidden", !on);
    promoteBtn.classList.toggle("hidden", on);
    if (demoteBtn) demoteBtn.classList.toggle("hidden", on);
  };

  editBtn.addEventListener("click", () => {
    row.querySelector(".e-name").value = lead.name || "";
    row.querySelector(".e-contact").value = lead.contact || "";
    row.querySelector(".e-location").value = lead.location || "";
    setEditing(true);
    row.querySelector(".e-name").focus();
  });
  cancelBtn.addEventListener("click", () => setEditing(false));
  saveBtn.addEventListener("click", async () => {
    const newName = row.querySelector(".e-name").value.trim();
    if (!newName) { alert("Name can't be empty 🙂"); return; }
    await updateDoc(doc(db, "leads", leadDoc.id), {
      name: newName,
      contact: row.querySelector(".e-contact").value.trim(),
      location: row.querySelector(".e-location").value.trim()
    });
  });

  promoteBtn.addEventListener("click", async () => {
    if (stage === "cold") {
      await updateDoc(doc(db, "leads", leadDoc.id), { stage: "progress" });
    } else {
      await updateDoc(doc(db, "leads", leadDoc.id), {
        stage: "store", dealType: "buy", paymentStatus: "none",
        address: "", phone: "", details: "",
        certs: { resale: "missing", insurance: "missing", insuranceExpiry: "", agreement: "missing" }
      });
    }
  });
  if (demoteBtn) {
    demoteBtn.addEventListener("click", async () => {
      await updateDoc(doc(db, "leads", leadDoc.id), { stage: "cold" });
    });
  }
  row.querySelector(".btn-delete").addEventListener("click", async () => {
    if (confirm(`Delete ${lead.name}?`)) await deleteDoc(doc(db, "leads", leadDoc.id));
  });

  return row;
}

function listenCold() {
  const listDiv = document.getElementById("cold-list");
  const q = query(collection(db, "leads"), where("stage", "==", "cold"), orderBy("createdAt", "desc"));
  stopCold = onSnapshot(q, (snapshot) => {
    document.getElementById("count-cold").textContent = snapshot.size;
    if (snapshot.empty) { listDiv.innerHTML = '<p class="empty">No cold leads. Add one above.</p>'; return; }
    listDiv.innerHTML = "";
    snapshot.forEach((leadDoc) => listDiv.appendChild(buildLeadRow(leadDoc, "cold")));
  });
}

function listenProgress() {
  const listDiv = document.getElementById("progress-list");
  const q = query(collection(db, "leads"), where("stage", "==", "progress"), orderBy("createdAt", "desc"));
  stopProgress = onSnapshot(q, (snapshot) => {
    document.getElementById("count-progress").textContent = snapshot.size;
    if (snapshot.empty) { listDiv.innerHTML = '<p class="empty">Nothing here yet. Promote a cold lead when you make contact.</p>'; return; }
    listDiv.innerHTML = "";
    snapshot.forEach((leadDoc) => listDiv.appendChild(buildLeadRow(leadDoc, "progress")));
  });
}

// ---- 13. Stores ----
function listenStores() {
  const listDiv = document.getElementById("stores-list");
  const q = query(collection(db, "leads"), where("stage", "==", "store"), orderBy("createdAt", "desc"));

  stopStores = onSnapshot(q, (snapshot) => {
    document.getElementById("count-stores").textContent = snapshot.size;
    if (snapshot.empty) { listDiv.innerHTML = '<p class="empty">No stores yet. Promote a progress lead when the deal is real.</p>'; return; }
    listDiv.innerHTML = "";
    snapshot.forEach((storeDoc) => {
      const s = storeDoc.data();
      const certs = s.certs || {};
      const needsAgreement = s.dealType === "consigned" && certs.agreement !== "onfile";

      const card = document.createElement("div");
      card.className = "store-card";
      card.innerHTML = `
        <div class="store-head">
          <b></b>
          ${needsAgreement ? '<span class="badge-warn">⚠️ Consigned — agreement not on file</span>' : ''}
          <div class="lead-actions">
            <button class="btn-edit-store btn-edit">✏️ Edit</button>
            <button class="btn-order">📦 Create order</button>
            <button class="btn-invoice">🧾 Request invoice</button>
            <button class="btn-demote">↓ Back to progress</button>
            <button class="btn-delete">Delete</button>
          </div>
        </div>
        <div class="store-sub"></div>

        <div class="store-identity-edit hidden">
          <input class="e-name" placeholder="Store / company name">
          <input class="e-contact" placeholder="Contact (name, email)">
          <input class="e-location" placeholder="Location">
          <button class="btn-save-identity">Save</button>
          <button class="btn-cancel-identity">Cancel</button>
        </div>

        <div class="store-grid">
          <div>
            <label>Deal type</label>
            <select class="f-dealType">
              <option value="buy">Buy (wholesale)</option>
              <option value="consigned">Consigned</option>
            </select>
          </div>
          <div>
            <label>Payment status</label>
            <select class="f-paymentStatus">
              <option value="none">Nothing due</option>
              <option value="invoiced">Invoice sent</option>
              <option value="partial">Partially paid</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <label>Address</label>
            <input class="f-address" placeholder="Street, city, state, zip">
          </div>
          <div>
            <label>Phone</label>
            <input class="f-phone" placeholder="Phone number">
          </div>
          <div style="grid-column: 1 / -1;">
            <label>Details / notes</label>
            <textarea class="f-details" rows="2" placeholder="Terms, margins, who said what…"></textarea>
          </div>
        </div>

        <div class="certs">
          <h3>📋 Documents</h3>
          <div class="cert-row" data-cert="resale">
            <span class="cert-name">Resale certificate</span>
            <select class="f-cert"><option value="missing">Missing</option><option value="requested">Requested</option><option value="onfile">On file ✓</option></select>
            <button class="btn-upload">Upload</button>
            <input type="file" class="f-file hidden" accept="application/pdf,image/*">
          </div>
          <div class="cert-row" data-cert="insurance">
            <span class="cert-name">Insurance certificate</span>
            <select class="f-cert"><option value="missing">Missing</option><option value="requested">Requested</option><option value="onfile">On file ✓</option></select>
            <input type="date" class="f-insExpiry" title="Insurance expiry date">
            <button class="btn-upload">Upload</button>
            <input type="file" class="f-file hidden" accept="application/pdf,image/*">
          </div>
          <div class="cert-row" data-cert="agreement">
            <span class="cert-name">Consignment agreement</span>
            <select class="f-cert"><option value="missing">Missing</option><option value="requested">Requested</option><option value="onfile">On file ✓</option></select>
            <button class="btn-upload">Upload</button>
            <input type="file" class="f-file hidden" accept="application/pdf,image/*">
          </div>
        </div>

        <div class="order-form item-form hidden">
          ${PICKER_HTML}
          <div class="row">
            <button class="btn-save-order">Save order</button>
            <button class="btn-cancel">Cancel</button>
          </div>
        </div>

        <div class="invoice-form item-form hidden">
          <div class="row">
            <input class="if-contact" placeholder="Contact name" style="flex:1; min-width:140px;">
            <input class="if-company" placeholder="Company (legal) name" style="flex:1; min-width:160px;">
          </div>
          <div class="row">
            <input class="if-address" placeholder="Billing address" style="flex:2; min-width:200px;">
            <input class="if-phone" placeholder="Phone" style="flex:1; min-width:120px;">
          </div>
          ${PICKER_HTML}
          <div class="row">
            <button class="btn-save-invoice">Request invoice</button>
            <button class="btn-cancel">Cancel</button>
          </div>
        </div>
      `;

      card.querySelector("b").textContent = s.name;
      card.querySelector(".store-sub").textContent = [s.contact, s.location].filter(Boolean).join(" · ");
      card.querySelector(".f-dealType").value = s.dealType || "buy";
      card.querySelector(".f-paymentStatus").value = s.paymentStatus || "none";
      card.querySelector(".f-address").value = s.address || "";
      card.querySelector(".f-phone").value = s.phone || "";
      card.querySelector(".f-details").value = s.details || "";
      card.querySelector(".f-insExpiry").value = certs.insuranceExpiry || "";

      const identityBox = card.querySelector(".store-identity-edit");
      card.querySelector(".btn-edit-store").addEventListener("click", () => {
        identityBox.querySelector(".e-name").value = s.name || "";
        identityBox.querySelector(".e-contact").value = s.contact || "";
        identityBox.querySelector(".e-location").value = s.location || "";
        identityBox.classList.toggle("hidden");
        if (!identityBox.classList.contains("hidden")) identityBox.querySelector(".e-name").focus();
      });
      identityBox.querySelector(".btn-cancel-identity").addEventListener("click", () => identityBox.classList.add("hidden"));
      identityBox.querySelector(".btn-save-identity").addEventListener("click", async () => {
        const newName = identityBox.querySelector(".e-name").value.trim();
        if (!newName) { alert("Name can't be empty 🙂"); return; }
        await updateDoc(doc(db, "leads", storeDoc.id), {
          name: newName,
          contact: identityBox.querySelector(".e-contact").value.trim(),
          location: identityBox.querySelector(".e-location").value.trim()
        });
      });

      const bindField = (selector, fieldName) => {
        const el = card.querySelector(selector);
        el.addEventListener("change", async () => {
          await updateDoc(doc(db, "leads", storeDoc.id), { [fieldName]: el.value });
          el.classList.add("saved-flash");
          setTimeout(() => el.classList.remove("saved-flash"), 600);
        });
      };
      bindField(".f-dealType", "dealType");
      bindField(".f-paymentStatus", "paymentStatus");
      bindField(".f-address", "address");
      bindField(".f-phone", "phone");
      bindField(".f-details", "details");
      bindField(".f-insExpiry", "certs.insuranceExpiry");

      card.querySelectorAll(".cert-row").forEach((rowEl) => {
        const certKey = rowEl.dataset.cert;
        const sel = rowEl.querySelector(".f-cert");
        sel.value = certs[certKey] || "missing";
        if (sel.value === "onfile") sel.classList.add("cert-onfile");
        sel.addEventListener("change", async () => {
          await updateDoc(doc(db, "leads", storeDoc.id), { ["certs." + certKey]: sel.value });
        });

        const existingUrl = certs[certKey + "Url"];
        if (existingUrl) {
          const link = document.createElement("a");
          link.className = "cert-view";
          link.textContent = "View 📄";
          link.href = existingUrl;
          link.target = "_blank";
          rowEl.appendChild(link);
        }

        const uploadBtn = rowEl.querySelector(".btn-upload");
        const fileInput = rowEl.querySelector(".f-file");
        uploadBtn.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", async () => {
          const file = fileInput.files[0];
          if (!file) return;
          if (file.size > 20 * 1024 * 1024) { alert("Max 20MB per file."); return; }
          uploadBtn.disabled = true;
          uploadBtn.textContent = "Uploading…";
          try {
            const fileRef = ref(storage, `stores/${storeDoc.id}/${certKey}-${file.name}`);
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);
            await updateDoc(doc(db, "leads", storeDoc.id), {
              ["certs." + certKey]: "onfile",
              ["certs." + certKey + "Url"]: url
            });
          } catch (err) {
            alert("Upload failed: " + err.message);
            uploadBtn.disabled = false;
            uploadBtn.textContent = "Upload";
          }
        });
      });

      const orderForm = card.querySelector(".order-form");
      const orderPicker = wireItemPicker(orderForm);
      card.querySelector(".btn-order").addEventListener("click", () => {
        card.querySelector(".invoice-form").classList.add("hidden");
        orderForm.classList.toggle("hidden");
        if (!orderForm.classList.contains("hidden")) orderForm.querySelector(".of-search").focus();
      });
      orderForm.querySelector(".btn-cancel").addEventListener("click", () => {
        orderForm.classList.add("hidden");
        orderPicker.reset();
      });
      orderForm.querySelector(".btn-save-order").addEventListener("click", async () => {
        const items = orderPicker.getItems();
        if (items.length === 0) { alert("Add at least one product 🙂"); return; }
        await addDoc(collection(db, "orders"), {
          orderSource: "store",
          storeId: storeDoc.id, company: s.name, contact: s.contact || "",
          address: s.address || "", phone: s.phone || "",
          items: items, dealType: s.dealType || "buy",
          orderStatus: "requested", tracking: "", archived: false,
          createdAt: serverTimestamp()
        });
        orderForm.classList.add("hidden");
        orderPicker.reset();
        notifyRole("warehouse", "New store order",
          `${s.name}: ${itemsSummary(items)} — requested by ${myProfile?.name || "a teammate"}`);
        alert(`Order saved! Check 📦 Orders → Store orders.`);
      });

      const invoiceForm = card.querySelector(".invoice-form");
      const invoicePicker = wireItemPicker(invoiceForm);
      invoiceForm.querySelector(".if-contact").value = s.contact || "";
      invoiceForm.querySelector(".if-company").value = s.name || "";
      invoiceForm.querySelector(".if-address").value = s.address || "";
      invoiceForm.querySelector(".if-phone").value = s.phone || "";

      card.querySelector(".btn-invoice").addEventListener("click", () => {
        orderForm.classList.add("hidden");
        invoiceForm.classList.toggle("hidden");
        if (!invoiceForm.classList.contains("hidden")) invoiceForm.querySelector(".of-search").focus();
      });
      invoiceForm.querySelector(".btn-cancel").addEventListener("click", () => {
        invoiceForm.classList.add("hidden");
        invoicePicker.reset();
      });
      invoiceForm.querySelector(".btn-save-invoice").addEventListener("click", async () => {
        const items = invoicePicker.getItems();
        if (items.length === 0) { alert("Add at least one product 🙂"); return; }
        const contactName = invoiceForm.querySelector(".if-contact").value.trim();
        const companyName = invoiceForm.querySelector(".if-company").value.trim();
        const billingAddress = invoiceForm.querySelector(".if-address").value.trim();
        const phone = invoiceForm.querySelector(".if-phone").value.trim();
        if (!companyName) { alert("Company name is required for an invoice 🙂"); return; }

        await addDoc(collection(db, "invoiceRequests"), {
          storeId: storeDoc.id, company: companyName, contact: contactName,
          address: billingAddress, phone: phone, items: items,
          dealType: s.dealType || "buy", invoiceStatus: "pending",
          invoiceNumber: "", invoiceFileUrl: "", invoiceFileName: "",
          archived: false, createdAt: serverTimestamp()
        });
        invoiceForm.classList.add("hidden");
        invoicePicker.reset();
        notifyRole("accountant", "Invoice requested",
          `${companyName}: ${itemsSummary(items)} — requested by ${myProfile?.name || "a teammate"}`);
        alert(`Invoice requested! Check 🧾 Invoices → Requests.`);
      });

      card.querySelector(".btn-demote").addEventListener("click", async () => {
        await updateDoc(doc(db, "leads", storeDoc.id), { stage: "progress" });
      });
      card.querySelector(".btn-delete").addEventListener("click", async () => {
        if (confirm(`Delete ${s.name}? This removes everything about them.`)) {
          await deleteDoc(doc(db, "leads", storeDoc.id));
        }
      });

      listDiv.appendChild(card);
    });
  });
}

// ---- 14. Orders ----
const ORDER_STEPS = ["requested", "processing", "shipped", "delivered"];
const STEP_LABELS = { requested: "Requested", processing: "Processing", shipped: "Shipped", delivered: "Delivered" };

function buildOrderCard(orderDoc, isHistory) {
  const o = orderDoc.data();
  const source = o.orderSource === "customer" ? "customer" : "store";
  let currentStep = o.orderStatus;
  if (currentStep === "new") currentStep = "requested";
  if (currentStep === "sent") currentStep = "processing";
  if (currentStep === "done") currentStep = "delivered";
  const currentIndex = Math.max(0, ORDER_STEPS.indexOf(currentStep));
  const items = o.items || (o.product ? [{ name: o.product, sku: "", qty: o.amount || 1, price: null }] : []);

  const card = document.createElement("div");
  card.className = "order-card";

  let progressHtml = "";
  ORDER_STEPS.forEach((step, i) => {
    const done = i <= currentIndex;
    progressHtml += `
      <div class="step ${done ? "done" : ""}" data-step="${step}" title="Mark as ${STEP_LABELS[step]}">
        <div class="dot">${done ? "✓" : ""}</div>
        <div class="step-label">${STEP_LABELS[step]}</div>
      </div>`;
    if (i < ORDER_STEPS.length - 1) {
      progressHtml += `<div class="bar ${i < currentIndex ? "filled" : ""}"></div>`;
    }
  });

  card.innerHTML = `
    <div class="order-top">
      <div class="order-info">
        <b></b>
        <span class="o-contact"></span>
        <span class="o-address"></span>
        <span class="o-phone"></span>
        <div class="order-items"></div>
        <div class="order-total hidden"></div>
        <div style="margin-top:6px;">
          <span class="pill ${source === "customer" ? "pill-customer" : "pill-store"}">${source === "customer" ? "🙋 Customer" : "🏪 Store"}</span>
          &nbsp; <span class="pill ${o.dealType === "consigned" ? "pill-consigned" : "pill-buy"}">${o.dealType === "consigned" ? "Consigned" : "Buy"}</span>
          &nbsp; <span class="tracking-badge hidden">🚚 <span class="o-trackshow"></span></span>
        </div>
      </div>
      <div class="order-actions">
        ${isHistory ? '<button class="btn-unarchive">↩︎ Back to orders</button>' : ''}
        <button class="btn-delete">Delete</button>
      </div>
    </div>
    <div class="order-progress">${progressHtml}</div>
    <div class="tracking-row">
      <label>Tracking:</label>
      <input class="f-tracking" placeholder="Carrier + tracking number (e.g. UPS 1Z999AA10123456784)">
    </div>
  `;

  card.querySelector("b").textContent = o.company;
  card.querySelector(".o-contact").textContent = o.contact || "";
  card.querySelector(".o-address").textContent = o.address || "(no address on file)";
  card.querySelector(".o-phone").textContent = o.phone ? "📞 " + o.phone : "";
  renderItemLines(card.querySelector(".order-items"), card.querySelector(".order-total"), items);

  const trackInput = card.querySelector(".f-tracking");
  trackInput.value = o.tracking || "";
  if (o.tracking && currentIndex >= 2) {
    card.querySelector(".tracking-badge").classList.remove("hidden");
    card.querySelector(".o-trackshow").textContent = o.tracking;
  }
  trackInput.addEventListener("change", async () => {
    await updateDoc(doc(db, "orders", orderDoc.id), { tracking: trackInput.value });
    trackInput.classList.add("saved-flash");
    setTimeout(() => trackInput.classList.remove("saved-flash"), 600);
  });

  card.querySelectorAll(".step").forEach((stepEl) => {
    stepEl.addEventListener("click", async () => {
      const step = stepEl.dataset.step;
      await updateDoc(doc(db, "orders", orderDoc.id), { orderStatus: step });
      if (step === "shipped" && !isHistory) {
        if (confirm(`Mark ${o.company}'s order as shipped and move it to History?\n\nYou can still update it there.`)) {
          await updateDoc(doc(db, "orders", orderDoc.id), { archived: true });
        }
      }
    });
  });

  if (isHistory) {
    card.querySelector(".btn-unarchive").addEventListener("click", async () => {
      await updateDoc(doc(db, "orders", orderDoc.id), { archived: false });
    });
  }
  card.querySelector(".btn-delete").addEventListener("click", async () => {
    if (confirm(`Delete this order for ${o.company}?`)) await deleteDoc(doc(db, "orders", orderDoc.id));
  });

  return card;
}

function listenOrders() {
  const storeDiv = document.getElementById("orders-store-list");
  const custDiv = document.getElementById("orders-customer-list");
  const histDiv = document.getElementById("history-orders-list");
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));

  stopOrders = onSnapshot(q, (snapshot) => {
    storeDiv.innerHTML = ""; custDiv.innerHTML = ""; histDiv.innerHTML = "";
    let storeCount = 0, custCount = 0, histCount = 0, lastDate = null;

    snapshot.forEach((orderDoc) => {
      const o = orderDoc.data();
      const isCustomer = o.orderSource === "customer";

      if (o.archived === true) {
        histCount++;
        const label = dateLabel(o.createdAt);
        if (label !== lastDate) {
          const h = document.createElement("div");
          h.className = "date-heading";
          h.textContent = label;
          histDiv.appendChild(h);
          lastDate = label;
        }
        histDiv.appendChild(buildOrderCard(orderDoc, true));
      } else if (isCustomer) {
        custCount++;
        custDiv.appendChild(buildOrderCard(orderDoc, false));
      } else {
        storeCount++;
        storeDiv.appendChild(buildOrderCard(orderDoc, false));
      }
    });

    document.getElementById("count-orders-store").textContent = storeCount;
    document.getElementById("count-orders-customer").textContent = custCount;
    document.getElementById("count-orders").textContent = storeCount + custCount;
    document.getElementById("count-hist-orders").textContent = histCount;
    updateHistoryCount();

    if (storeCount === 0) storeDiv.innerHTML = '<p class="empty">No store orders. Create one from a store card.</p>';
    if (custCount === 0) custDiv.innerHTML = '<p class="empty">No customer orders yet. Add one above.</p>';
    if (histCount === 0) histDiv.innerHTML = '<p class="empty">No archived orders yet.</p>';
  });
}

// ---- 15. Invoices ----
function buildInvoiceCard(invDoc, mode) {
  const inv = invDoc.data();
  const isDone = inv.invoiceStatus === "done";
  const items = inv.items || [];
  const isHistory = mode === "history";

  const card = document.createElement("div");
  card.className = "order-card";
  card.innerHTML = `
    <div class="order-top">
      <div class="order-info">
        <b></b>
        <span class="o-contact"></span>
        <span class="o-address"></span>
        <span class="o-phone"></span>
        <div class="order-items"></div>
        <div class="order-total hidden"></div>
        <div style="margin-top:6px;">
          <span class="pill ${inv.dealType === "consigned" ? "pill-consigned" : "pill-buy"}">${inv.dealType === "consigned" ? "Consigned" : "Buy"}</span>
          ${isHistory ? '<span class="pill pill-done">✓ Filed</span>' : ''}
        </div>
      </div>
      <div class="order-actions">
        ${isHistory
          ? '<button class="btn-unarchive">↩︎ Back to invoices</button>'
          : `<button class="btn-toggle-done ${isDone ? "" : "btn-done"}">${isDone ? "↩︎ Back to requests" : "Mark done ✓"}</button>
             ${isDone && inv.invoiceFileUrl ? '<button class="btn-archive-inv btn-archive">🗂 Move to history</button>' : ''}`}
        <button class="btn-delete">Delete</button>
      </div>
    </div>
    <div class="tracking-row">
      <label>Invoice #:</label>
      <input class="f-invnum" placeholder="Invoice number (e.g. INV-2026-041)">
    </div>
    <div class="invoice-file-row ${isDone || isHistory ? "" : "hidden"}">
      <label>Invoice file:</label>
      <span class="file-slot"></span>
      <button class="btn-upload btn-inv-upload">Attach invoice</button>
      <input type="file" class="f-invfile hidden" accept="application/pdf,image/*">
    </div>
  `;

  card.querySelector("b").textContent = inv.company;
  card.querySelector(".o-contact").textContent = inv.contact || "";
  card.querySelector(".o-address").textContent = inv.address || "";
  card.querySelector(".o-phone").textContent = inv.phone ? "📞 " + inv.phone : "";
  renderItemLines(card.querySelector(".order-items"), card.querySelector(".order-total"), items);

  const invnumInput = card.querySelector(".f-invnum");
  invnumInput.value = inv.invoiceNumber || "";
  invnumInput.addEventListener("change", async () => {
    await updateDoc(doc(db, "invoiceRequests", invDoc.id), { invoiceNumber: invnumInput.value });
    invnumInput.classList.add("saved-flash");
    setTimeout(() => invnumInput.classList.remove("saved-flash"), 600);
  });

  const fileSlot = card.querySelector(".file-slot");
  if (inv.invoiceFileUrl) {
    const link = document.createElement("a");
    link.className = "cert-view";
    link.href = inv.invoiceFileUrl;
    link.target = "_blank";
    link.textContent = "📄 " + (inv.invoiceFileName || "View invoice");
    fileSlot.appendChild(link);
  } else {
    const none = document.createElement("span");
    none.className = "file-none";
    none.textContent = "No file attached yet";
    fileSlot.appendChild(none);
  }

  const invUploadBtn = card.querySelector(".btn-inv-upload");
  const invFileInput = card.querySelector(".f-invfile");
  invUploadBtn.textContent = inv.invoiceFileUrl ? "Replace" : "Attach invoice";
  invUploadBtn.addEventListener("click", () => invFileInput.click());
  invFileInput.addEventListener("change", async () => {
    const file = invFileInput.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { alert("Max 20MB per file."); return; }
    invUploadBtn.disabled = true;
    invUploadBtn.textContent = "Uploading…";
    try {
      const fileRef = ref(storage, `invoices/${invDoc.id}/${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      await updateDoc(doc(db, "invoiceRequests", invDoc.id), {
        invoiceFileUrl: url, invoiceFileName: file.name
      });
    } catch (err) {
      alert("Upload failed: " + err.message);
      invUploadBtn.disabled = false;
      invUploadBtn.textContent = "Attach invoice";
    }
  });

  const toggleBtn = card.querySelector(".btn-toggle-done");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", async () => {
      await updateDoc(doc(db, "invoiceRequests", invDoc.id), { invoiceStatus: isDone ? "pending" : "done" });
    });
  }
  const archiveBtn = card.querySelector(".btn-archive-inv");
  if (archiveBtn) {
    archiveBtn.addEventListener("click", async () => {
      if (confirm(`Move ${inv.company}'s invoice to History?\n\nThe attached file stays with it.`)) {
        await updateDoc(doc(db, "invoiceRequests", invDoc.id), { archived: true });
      }
    });
  }
  const unarchiveBtn = card.querySelector(".btn-unarchive");
  if (unarchiveBtn) {
    unarchiveBtn.addEventListener("click", async () => {
      await updateDoc(doc(db, "invoiceRequests", invDoc.id), { archived: false });
    });
  }
  card.querySelector(".btn-delete").addEventListener("click", async () => {
    if (confirm(`Delete this invoice for ${inv.company}?`)) await deleteDoc(doc(db, "invoiceRequests", invDoc.id));
  });

  return card;
}

function listenInvoices() {
  const pendingDiv = document.getElementById("invoices-pending-list");
  const doneDiv = document.getElementById("invoices-done-list");
  const histDiv = document.getElementById("history-invoices-list");
  const q = query(collection(db, "invoiceRequests"), orderBy("createdAt", "desc"));

  stopInvoices = onSnapshot(q, (snapshot) => {
    pendingDiv.innerHTML = ""; doneDiv.innerHTML = ""; histDiv.innerHTML = "";
    let pendingCount = 0, doneCount = 0, histCount = 0, lastDate = null;

    snapshot.forEach((invDoc) => {
      const inv = invDoc.data();
      if (inv.archived === true) {
        histCount++;
        const label = dateLabel(inv.createdAt);
        if (label !== lastDate) {
          const h = document.createElement("div");
          h.className = "date-heading";
          h.textContent = label;
          histDiv.appendChild(h);
          lastDate = label;
        }
        histDiv.appendChild(buildInvoiceCard(invDoc, "history"));
      } else if (inv.invoiceStatus === "done") {
        doneCount++;
        doneDiv.appendChild(buildInvoiceCard(invDoc, "done"));
      } else {
        pendingCount++;
        pendingDiv.appendChild(buildInvoiceCard(invDoc, "pending"));
      }
    });

    document.getElementById("count-invoices").textContent = pendingCount + doneCount;
    document.getElementById("count-inv-pending").textContent = pendingCount;
    document.getElementById("count-inv-done").textContent = doneCount;
    document.getElementById("count-hist-invoices").textContent = histCount;
    updateHistoryCount();

    if (pendingCount === 0) pendingDiv.innerHTML = '<p class="empty">No pending requests. Create one from a store card.</p>';
    if (doneCount === 0) doneDiv.innerHTML = '<p class="empty">No completed invoices waiting. Mark a request done to see it here.</p>';
    if (histCount === 0) histDiv.innerHTML = '<p class="empty">No filed invoices yet.</p>';
  });
}

function updateHistoryCount() {
  const o = Number(document.getElementById("count-hist-orders").textContent) || 0;
  const i = Number(document.getElementById("count-hist-invoices").textContent) || 0;
  document.getElementById("count-history").textContent = o + i;
}