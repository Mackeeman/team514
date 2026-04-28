// ═══════════════════════════════════════════════════
//  PAGE: Home
// ═══════════════════════════════════════════════════

function renderHome() {
  renderLeaders();
  renderUpcomingMatches();
  renderTrainings();
}

function renderLeaders() {
  const history   = DB.getHistory();
  const players   = DB.getPlayers();
  const draftData = DB.getDraftStats();

  const stats = { td: {}, rec: {}, tackle: {}, int: {} };

  history.forEach(match => {
    if (!match.playerStats) return;
    Object.entries(match.playerStats).forEach(([pid, ps]) => {
      pid = Number(pid);
      stats.td[pid]     = (stats.td[pid]     || 0) + (ps.recTd || 0) + (ps.rushTd || 0) + (ps.passTd || 0);
      stats.rec[pid]    = (stats.rec[pid]     || 0) + (ps.receptions || 0);
      stats.tackle[pid] = (stats.tackle[pid]  || 0) + (ps.tackles || 0);
      stats.int[pid]    = (stats.int[pid]     || 0) + (ps.interceptions || 0);
    });
  });

  const getLeader = (stat) => {
    const entries = Object.entries(stats[stat]);
    if (!entries.length) return null;
    const [pid, val] = entries.sort((a, b) => b[1] - a[1])[0];
    const player = players.find(p => p.id === Number(pid));
    return player ? { name: player.name, value: val } : null;
  };

  // Best 5yd sprint from draft data (lower is better)
  const best5yd = draftData
    .filter(d => d.sprint5 !== undefined && d.sprint5 !== '')
    .map(d => ({ player: players.find(p => p.id === d.playerId), val: d.sprint5 }))
    .filter(e => e.player)
    .sort((a, b) => a.val - b.val)[0] || null;

  const leaders = [
    { icon: '🏈', label: 'Touchdowns',   unit: 'TDs this season',  leader: getLeader('td')     },
    { icon: '🙌', label: 'Receptions',   unit: 'REC this season',  leader: getLeader('rec')    },
    { icon: '🛡️', label: 'Tackles',      unit: 'TAC this season',  leader: getLeader('tackle') },
    { icon: '✋', label: 'Interceptions',unit: 'INT this season',  leader: getLeader('int')    },
    { icon: '⚡', label: 'Fastest 5 yds',unit: 's — 5yd sprint',
      leader: best5yd ? { name: best5yd.player.name, value: best5yd.val } : null },
  ];

  const container = document.getElementById('leaders-grid');
  if (!container) return;

  container.innerHTML = leaders.map(l => `
    <div class="stat-highlight">
      <span class="stat-icon">${l.icon}</span>
      <div class="stat-name">${l.label}</div>
      ${l.leader ? `
        <div class="stat-player">${l.leader.name}</div>
        <div class="stat-value">${l.leader.value}</div>
        <div class="stat-label">${l.unit}</div>
      ` : `
        <div style="color:var(--gray-500);font-size:0.85rem;padding:10px 0">No data yet</div>
      `}
    </div>
  `).join('');
}

function renderUpcomingMatches() {
  const today = new Date().toISOString().slice(0, 10);
  const matches = DB.getMatches()
    .filter(m => m.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const container = document.getElementById('upcoming-matches');
  if (!container) return;

  if (!matches.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <p>No upcoming matches.<br>Add them via the admin panel.</p>
      </div>`;
    return;
  }

  container.innerHTML = matches.map(m => {
    const { day, month, weekday } = formatDateShort(m.date);
    const meetup = getMeetupTime(m.time);
    return `
      <div class="match-card fade-in">
        <div class="match-date-block">
          <div class="match-day">${day}</div>
          <div class="match-month">${month}</div>
          <div class="match-month" style="color:var(--gray-500);font-size:0.62rem">${weekday}</div>
        </div>
        <div class="match-divider"></div>
        <div class="match-info">
          <div class="match-teams">
            <span>514</span>
            <span class="match-vs">VS</span>
            <span>${m.opponent || 'TBD'}</span>
          </div>
          <div class="match-meta">
            <span>📍 ${m.location || '—'}</span>
            ${m.field ? `<span>🏟️ ${m.field}</span>` : ''}
            ${m.note  ? `<span>💬 ${m.note}</span>`  : ''}
          </div>
        </div>
        <div class="match-times">
          <div class="match-time-main">⏰ ${m.time}</div>
          <div class="match-time-meetup">Meet-up ${meetup}</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderTrainings() {
  const trainings = DB.getTrainings();
  const container = document.getElementById('trainings-list');
  if (!container) return;

  if (!trainings.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏃</div>
        <p>No training sessions configured.</p>
      </div>`;
    return;
  }

  container.innerHTML = trainings.map(t => {
    const dateDisplay = t.date ? formatDateShort(t.date) : null;
    const dateStr = dateDisplay ? ` ${dateDisplay.day} ${dateDisplay.month}` : '';
    return `
      <div class="training-card fade-in">
        <div class="training-icon">🏃</div>
        <div>
          <div class="training-day">${t.day}${dateStr} — ${t.time}</div>
          <div class="training-detail">📍 ${t.location}${t.note ? ` · ${t.note}` : ''}</div>
        </div>
      </div>
    `;
  }).join('');
}