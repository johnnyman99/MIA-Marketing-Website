import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  isSignInWithEmailLink,
  signInWithEmailLink,
  updatePassword
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { auth, db } from "../firebase.js";
import { useI18n } from "../i18n/I18nContext.jsx";

const AuthContext = createContext(null);

async function noAdminsYet() {
  try {
    const admins = await getDocs(query(collection(db, "users"), where("role", "==", "admin")));
    return admins.empty;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  const { lang, t, adoptLangFromProfile } = useI18n();
  const [currentUser, setCurrentUser] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [pendingInviteRole, setPendingInviteRole] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [setupError, setSetupError] = useState("");
  const [inviteLinkChecked, setInviteLinkChecked] = useState(false);
  const langSyncedRef = useRef(false);

  // ---- Handle an incoming "sign in with email link" invite, if this page
  // load's URL is one. ----
  useEffect(() => {
    async function handleInviteLink() {
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        setInviteLinkChecked(true);
        return;
      }
      let email = window.localStorage.getItem("inviteEmail");
      if (!email) email = window.prompt(t("confirmInviteEmailPrompt"));
      if (!email) {
        setInviteLinkChecked(true);
        return;
      }
      try {
        await signInWithEmailLink(auth, email, window.location.href);
        window.localStorage.removeItem("inviteEmail");
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err) {
        alert(t("inviteLinkFailed") + err.message);
      }
      setInviteLinkChecked(true);
    }
    handleInviteLink();
    // Only ever needs to run once, against the URL the page loaded with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const profileSnap = await getDoc(doc(db, "users", user.uid));

        if (!profileSnap.exists()) {
          const invSnap = await getDocs(
            query(collection(db, "invites"), where("email", "==", user.email.toLowerCase()))
          );
          const inviteRole = invSnap.empty ? null : invSnap.docs[0].data().role;

          if (inviteRole) {
            setPendingInviteRole(inviteRole);
            setNeedsSetup(true);
            setAuthLoading(false);
            return;
          }
          const role = (await noAdminsYet()) ? "admin" : "user";
          await setDoc(doc(db, "users", user.uid), {
            name: user.email.split("@")[0],
            email: user.email,
            role,
            language: lang,
            createdAt: serverTimestamp()
          });
        } else if (await noAdminsYet()) {
          await updateDoc(doc(db, "users", user.uid), { role: "admin" });
        }

        setNeedsSetup(false);
        setAuthLoading(false);
      } else {
        setCurrentUser(null);
        setMyProfile(null);
        setNeedsSetup(false);
        setPendingInviteRole(null);
        langSyncedRef.current = false;
        setAuthLoading(false);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live profile subscription (name/role/language), separate from the
  // one-time auth-state resolution above.
  useEffect(() => {
    if (!currentUser) return undefined;
    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
      const data = snap.data() || null;
      setMyProfile(data);
      if (data?.language && !langSyncedRef.current) {
        langSyncedRef.current = true;
        adoptLangFromProfile(data.language);
      }
    });
    return () => unsub();
  }, [currentUser, adoptLangFromProfile]);

  async function login(email, password) {
    setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setLoginError(t("wrongCredentials"));
    }
  }

  function logout() {
    signOut(auth);
  }

  async function completeSetup(name, password) {
    setSetupError("");
    if (!name.trim()) {
      setSetupError(t("nameRequired"));
      return;
    }
    if (password.length < 6) {
      setSetupError(t("passwordTooShort"));
      return;
    }
    try {
      await updatePassword(auth.currentUser, password);
      await setDoc(doc(db, "users", auth.currentUser.uid), {
        name: name.trim(),
        email: auth.currentUser.email,
        role: pendingInviteRole || "user",
        language: lang,
        createdAt: serverTimestamp()
      });
      const invSnap = await getDocs(
        query(collection(db, "invites"), where("email", "==", auth.currentUser.email.toLowerCase()))
      );
      invSnap.forEach((i) => deleteDoc(doc(db, "invites", i.id)).catch(() => {}));
      setNeedsSetup(false);
    } catch (err) {
      setSetupError(t("setupFailed") + err.message);
    }
  }

  const value = {
    currentUser,
    myProfile,
    isAdmin: myProfile?.role === "admin",
    authLoading: authLoading || !inviteLinkChecked,
    needsSetup,
    loginError,
    setupError,
    login,
    logout,
    completeSetup
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
