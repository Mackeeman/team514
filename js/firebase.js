// ═══════════════════════════════════════════════════
//  TEAM 514 — Firebase Config & Sync
// ═══════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDpQm02A7dEkqlg66CZucwoB5c6R01j5IM",
  authDomain: "team514.firebaseapp.com",
  databaseURL: "https://team514-default-rtdb.firebaseio.com",
  projectId: "team514",
  storageBucket: "team514.firebasestorage.app",
  messagingSenderId: "527846628671",
  appId: "1:527846628671:web:8377505c7396315919478a"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

const KEYS = [
  'players', 'matches', 'history', 'trainings',
  'strategies', 'playbookUrl', 'media', 'draftStats'
];

// Flag to prevent write loops
let isSyncingFromFirebase = false;

// ── Pull all Firebase data to localStorage ──
async function pullFromFirebase() {
  isSyncingFromFirebase = true;
  for (const key of KEYS) {
    const snapshot = await get(ref(db, 'team514/' + key));
    if (snapshot.exists()) {
      // Use original set to avoid triggering Firebase write
      localStorage.setItem('team514_' + key, JSON.stringify(snapshot.val()));
    }
  }
  isSyncingFromFirebase = false;
}

// ── Listen for real-time changes from OTHER devices ──
function startSync() {
  let initialized = false;
  let pendingRender = false;

  KEYS.forEach(key => {
    onValue(ref(db, 'team514/' + key), (snapshot) => {
      if (!initialized) return; // skip initial load (already pulled)
      if (snapshot.exists()) {
        isSyncingFromFirebase = true;
        localStorage.setItem('team514_' + key, JSON.stringify(snapshot.val()));
        isSyncingFromFirebase = false;

        // Debounce re-render — wait for all keys to settle
        if (!pendingRender) {
          pendingRender = true;
          setTimeout(() => {
            pendingRender = false;
            const activePage = localStorage.getItem('team514_activePage') || 'home';
            if (window.pageRenderers?.[activePage]) {
              window.pageRenderers[activePage]();
            }
          }, 300);
        }
      }
    });
  });

  // Mark as initialized after first load
  setTimeout(() => { initialized = true; }, 1000);
}

// ── Override DB.set to also write to Firebase ──
const originalSet = DB.set.bind(DB);
DB.set = function(key, val) {
  originalSet(key, val);
  // Only push to Firebase if WE made the change (not incoming sync)
  if (!isSyncingFromFirebase && KEYS.includes(key)) {
    set(ref(db, 'team514/' + key), val).catch(console.error);
  }
};

// ── Init ──
async function initFirebase() {
  await pullFromFirebase();
  startSync();
  // Re-render after pull
  const activePage = localStorage.getItem('team514_activePage') || 'home';
  if (window.pageRenderers?.[activePage]) {
    window.pageRenderers[activePage]();
  }
  console.log('Firebase synced ✅');
}

initFirebase();