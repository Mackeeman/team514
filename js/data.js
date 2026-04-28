// ═══════════════════════════════════════════════════
//  TEAM 514 — Data Store
// ═══════════════════════════════════════════════════

const DB = {
  get(key) {
    try { return JSON.parse(localStorage.getItem('team514_' + key)) || null; }
    catch { return null; }
  },
  set(key, val) {
    localStorage.setItem('team514_' + key, JSON.stringify(val));
  },
  getOrDefault(key, def) {
    const val = this.get(key);
    return val !== null ? val : def;
  },

  // Players
  getPlayers() { return this.getOrDefault('players', []); },
  savePlayers(p) { this.set('players', p); },

  // Upcoming matches
  getMatches() { return this.getOrDefault('matches', []); },
  saveMatches(m) { this.set('matches', m); },

  // Past results
  getHistory() { return this.getOrDefault('history', []); },
  saveHistory(h) { this.set('history', h); },

  // Training schedule
  getTrainings() { return this.getOrDefault('trainings', []); },
  saveTrainings(t) { this.set('trainings', t); },

  // Strategies
  getStrategies() { return this.getOrDefault('strategies', []); },
  saveStrategies(s) { this.set('strategies', s); },

  // Playbook URL
  getPlaybookUrl() { return this.getOrDefault('playbookUrl', ''); },
  savePlaybookUrl(u) { this.set('playbookUrl', u); },

  // Media
  getMedia() { return this.getOrDefault('media', []); },
  saveMedia(m) { this.set('media', m); },

  // Draft stats
  getDraftStats() { return this.getOrDefault('draftStats', []); },
  saveDraftStats(d) { this.set('draftStats', d); },

  // Admin password
  getPassword() { return this.getOrDefault('adminPass', '514team'); },
  setPassword(p) { this.set('adminPass', p); },
  checkPassword(p) { return p === this.getPassword(); },
  isAdminSession() { return sessionStorage.getItem('team514_admin') === 'true'; },
  setAdminSession() { sessionStorage.setItem('team514_admin', 'true'); },
  clearAdminSession() { sessionStorage.removeItem('team514_admin'); }
};

// ── Utility functions ──

function formatDateShort(dateStr) {
  if (!dateStr) return {};
  const d = new Date(dateStr + 'T12:00:00');
  return {
    day: d.getDate(),
    month: d.toLocaleDateString('en-CA', { month: 'short' }).toUpperCase(),
    weekday: d.toLocaleDateString('en-CA', { weekday: 'short' }).toUpperCase()
  };
}

function getMeetupTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m - 30;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2,'0')}:${String(nm).padStart(2,'0')}`;
}

function showToast(msg, type = 'success') {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.background = type === 'error' ? 'var(--red)' : 'var(--green)';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  const page = document.getElementById('page-' + pageId);
  if (page) {
    page.style.display = 'block';
    localStorage.setItem('team514_activePage', pageId);
    document.querySelectorAll('.nav-link').forEach(el => {
      el.classList.toggle('active', el.dataset.page === pageId);
    });
    if (window.pageRenderers && window.pageRenderers[pageId]) {
      window.pageRenderers[pageId]();
    }
  }
}

function requireAdmin(callback) {
  if (DB.isAdminSession()) { callback(); return; }
  openPasswordScreen(callback);
}

function openPasswordScreen(callback) {
  const screen = document.getElementById('passwordScreen');
  const input = document.getElementById('passwordInput');
  const err = document.getElementById('passwordError');
  if (!screen) return;

  screen.classList.add('open');
  input.value = '';
  err.style.display = 'none';
  input.focus();

  document.getElementById('passwordSubmit').onclick = () => {
    if (DB.checkPassword(input.value.trim())) {
      DB.setAdminSession();
      screen.classList.remove('open');
      callback();
    } else {
      err.style.display = 'block';
      input.value = '';
      input.focus();
    }
  };

  input.onkeydown = (e) => {
    if (e.key === 'Enter') document.getElementById('passwordSubmit').click();
  };

  document.getElementById('passwordCancel').onclick = () => {
    screen.classList.remove('open');
  };
}

function closeAdmin() {
  document.getElementById('adminOverlay')?.classList.remove('open');
  // Re-render the current active page
  const activePage = document.querySelector('.page[style="display: block;"]')?.id?.replace('page-', '');
  if (activePage && window.pageRenderers?.[activePage]) {
    window.pageRenderers[activePage]();
  }
}