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

// ── Keys to sync ──
const KEYS = [
  'players', 'matches', 'history', 'trainings',
  'strategies', 'playbookUrl', 'media', 'draftStats'
];

// ── Push all localStorage data to Firebase ──
async function pushToFirebase() {
  for (const key of KEYS) {
    const val = DB.get(key);
    if (val !== null) {
      await set(ref(db, 'team514/' + key), val);
    }
  }
}

// ── Pull all Firebase data to localStorage ──
async function pullFromFirebase() {
  for (const key of KEYS) {
    const snapshot = await get(ref(db, 'team514/' + key));
    if (snapshot.exists()) {
      DB.set(key, snapshot.val());
    }
  }
}

// ── Listen for real-time changes ──
function startSync() {
  KEYS.forEach(key => {
    onValue(ref(db, 'team514/' + key), (snapshot) => {
      if (snapshot.exists()) {
        DB.set(key, snapshot.val());
        // Re-render current page
        const activePage = localStorage.getItem('team514_activePage') || 'home';
        if (window.pageRenderers?.[activePage]) {
          window.pageRenderers[activePage]();
        }
      }
    });
  });
}

// ── Save function — writes to localStorage AND Firebase ──
const originalSet = DB.set.bind(DB);
DB.set = function(key, val) {
  originalSet(key, val);
  if (KEYS.includes(key)) {
    set(ref(db, 'team514/' + key), val).catch(console.error);
  }
};

// ── Init ──
async function initFirebase() {
  await pullFromFirebase();
  startSync();
  console.log('Firebase synced ✅');
}

initFirebase();
