// ═══════════════════════════════════════════════════
//  PAGE: Stats
// ═══════════════════════════════════════════════════

let currentSeason = 'all';

function renderStats() {
  renderSeasonSelector();
  aggregateStats();
  renderStatsTab('players');
}

function renderSeasonSelector() {
  const history   = DB.getHistory();
  const draftData = DB.getDraftStats();

  const matchSeasons = history.map(m => m.season).filter(Boolean);
  const draftSeasons = draftData.map(d => d.season).filter(Boolean);
  const seasons = [...new Set([...matchSeasons, ...draftSeasons])].sort().reverse();

  const container = document.getElementById('season-selector');
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:20px">
      <span style="font-family:var(--font-display);font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--gray-300)">Season:</span>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="season-btn ${currentSeason === 'all' ? 'active' : ''}"
          onclick="selectSeason('all')">All Time</button>
        ${seasons.map(s => `
          <button class="season-btn ${currentSeason === s ? 'active' : ''}"
            onclick="selectSeason('${s}')">${s}</button>
        `).join('')}
      </div>
    </div>
  `;
}

function selectSeason(season) {
  currentSeason = season;
  renderSeasonSelector();
  aggregateStats();
  const activeTab = document.querySelector('#stats-tabs .tab-btn.active')?.dataset.tab || 'receiving';
  renderStatsTab(activeTab);
}

function aggregateStats() {
  let history = DB.getHistory();
  const players = DB.getPlayers();

  // Filter by season if needed
  if (currentSeason !== 'all') {
    history = history.filter(m => m.season === currentSeason);
  }

  const agg = {};
  players.forEach(p => {
    agg[p.id] = {
      player: p,
      // Receiving
      gamesPlayed: 0, receptions: 0, recYds: 0, recTd: 0, recTd1pt: 0, recTd2pt: 0,
      // Rushing
      rushYds: 0, rushAtt: 0, rushTd: 0, rushTd2pt: 0,
      // Passing
      passComp: 0, passAtt: 0, passYds: 0, passTd: 0, passInt: 0, passSack: 0, muffedSnap: 0,
      // Defense
      tackles: 0, sacks: 0, interceptions: 0, safeties: 0, passDefense: 0, pick6: 0, pick1: 0, pick2: 0,
    };
  });

  history.forEach(match => {
    if (!match.playerStats) return;
    Object.entries(match.playerStats).forEach(([pid, ps]) => {
      pid = Number(pid);
      if (!agg[pid]) return;
      const a = agg[pid];
      a.gamesPlayed++;
      a.receptions    += ps.receptions    || 0;
      a.recYds        += ps.recYds        || 0;
      a.recTd         += ps.recTd         || 0;
      a.recTd1pt      += ps.recTd1pt      || 0;
      a.recTd2pt      += ps.recTd2pt      || 0;
      a.rushYds       += ps.rushYds       || 0;
      a.rushAtt       += ps.rushAtt       || 0;
      a.rushTd        += ps.rushTd        || 0;
      a.rushTd2pt     += ps.rushTd2pt     || 0;
      a.passComp      += ps.passComp      || 0;
      a.passAtt       += ps.passAtt       || 0;
      a.passYds       += ps.passYds       || 0;
      a.passTd        += ps.passTd        || 0;
      a.passInt       += ps.passInt       || 0;
      a.passSack      += ps.passSack      || 0;
      a.muffedSnap    += ps.muffedSnap    || 0;
      a.tackles       += ps.tackles       || 0;
      a.sacks         += ps.sacks         || 0;
      a.interceptions += ps.interceptions || 0;
      a.safeties      += ps.safeties      || 0;
      a.passDefense   += ps.passDefense   || 0;
      a.pick6         += ps.pick6         || 0;
      a.pick1         += ps.pick1         || 0;
      a.pick2         += ps.pick2         || 0;
    });
  });

  window._aggStats = Object.values(agg);
}

function renderStatsTab(tab) {
  aggregateStats();
  const agg = window._aggStats || [];

  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('#stats-tabs .tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });

  const panel = document.getElementById('stats-panel-' + tab);
  if (!panel) return;
  panel.classList.add('active');
  if (tab === 'players') { renderPlayersTab(panel); return; }
  if (tab === 'draft') { renderDraftStats(panel); return; }

  const sorted = (fn) => [...agg].sort((a, b) => fn(b) - fn(a));
  const avg    = (n, d) => d ? (n / d).toFixed(1) : '0.0';
  const pct    = (n, d) => d ? ((n / d) * 100).toFixed(0) + '%' : '0%';

  const tbl = (cols, rows) => `
    <div style="overflow-x:auto">
      <table class="stats-table">
        <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  const playerCell = (a, rank) => `
    <td>
      <div class="player-name-cell">
        <span class="player-rank${rank <= 3 ? ` rank-${rank}` : ''}">${rank}</span>
        <div class="player-avatar">${getInitials(a.player.name)}</div>
        <span class="player-name" style="cursor:pointer;text-decoration:underline dotted"
          onclick="openPlayerProfile(${a.player.id})">${a.player.name}</span>
      </div>
    </td>
  `;

  let html = '';

  if (tab === 'receiving') {
    const rows = sorted(a => a.recYds).map((a, i) => `
      <tr>
        ${playerCell(a, i + 1)}
        <td>${a.gamesPlayed}</td>
        <td class="highlight-val">${a.receptions}</td>
        <td>${a.recYds}</td>
        <td>${avg(a.recYds, a.receptions)}</td>
        <td class="highlight-val">${a.recTd}</td>
        <td>${a.recTd1pt}</td>
        <td>${a.recTd2pt}</td>
      </tr>
    `).join('');
    html = tbl(['Player', 'Games', 'Receptions', 'Total Yards', 'Avg Yards/Rec', 'Touchdowns', '1pt Conv.', '2pt Conv.'], rows);

  } else if (tab === 'rushing') {
    const rows = sorted(a => a.rushYds).map((a, i) => `
      <tr>
        ${playerCell(a, i + 1)}
        <td class="highlight-val">${a.rushYds}</td>
        <td>${a.rushAtt}</td>
        <td>${avg(a.rushYds, a.rushAtt)}</td>
        <td class="highlight-val">${a.rushTd}</td>
        <td>${a.rushTd2pt}</td>
      </tr>
    `).join('');
    html = tbl(['Player', 'Rushing Yards', 'Attempts', 'Avg Yards/Attempt', 'Touchdowns', '2pt Conv.'], rows);

  } else if (tab === 'passing') {
    const rows = sorted(a => a.passYds).map((a, i) => `
      <tr>
        ${playerCell(a, i + 1)}
        <td>${a.passAtt}</td>
        <td class="highlight-val">${a.passComp}</td>
        <td>${pct(a.passComp, a.passAtt)}</td>
        <td class="highlight-val">${a.passYds}</td>
        <td>${avg(a.passYds, a.passAtt)}</td>
        <td>${avg(a.passYds, a.passComp)}</td>
        <td class="highlight-val">${a.passTd}</td>
        <td>${a.passInt}</td>
        <td>${a.passSack}</td>
        <td>${a.muffedSnap}</td>
      </tr>
    `).join('');
    html = tbl([
      'Player', 'Attempts', 'Completions', 'Comp %',
      'Total Yards', 'Avg Yards/Att', 'Avg Yards/Comp',
      'Touchdowns', 'Interceptions Thrown', 'Times Sacked', 'Muffed Snaps'
    ], rows);

  } else if (tab === 'defense') {
    const rows = sorted(a => a.tackles + a.interceptions * 3 + a.sacks * 2).map((a, i) => `
      <tr>
        ${playerCell(a, i + 1)}
        <td>${a.gamesPlayed}</td>
        <td class="highlight-val">${a.tackles}</td>
        <td>${a.sacks}</td>
        <td class="highlight-val">${a.interceptions}</td>
        <td>${a.safeties}</td>
        <td>${a.passDefense}</td>
        <td>${a.pick6}</td>
        <td>${a.pick1}</td>
        <td>${a.pick2}</td>
      </tr>
    `).join('');
    html = tbl([
      'Player', 'Games', 'Tackles', 'Sacks', 'Interceptions',
      'Safeties', 'Pass Defense', 'Pick-6', 'Pick-1pt', 'Pick-2pts'
    ], rows);
  }

  panel.innerHTML = html || `
    <div class="empty-state">
      <div class="empty-icon">📊</div>
      <p>No stats yet for this season.</p>
    </div>`;
}

function renderDraftStats(panel) {
  const draftData = DB.getDraftStats();
  const players   = DB.getPlayers();

  const metrics = [
    { key: 'sprint5',      label: '5-yard sprint',                  unit: 's',   type: 'time'  },
    { key: 'sprint10',     label: '10-yard sprint',                 unit: 's',   type: 'time'  },
    { key: 'sprint20',     label: '20-yard sprint',                 unit: 's',   type: 'time'  },
    { key: 'shuttle',      label: '5-5-5 shuttle',                  unit: 's',   type: 'time'  },
    { key: 'recStatic',    label: 'Stationary catch (avg 3 tries)', unit: '%',   type: 'pct'   },
    { key: 'recMoving',    label: 'Moving catch (avg 3 tries)',     unit: '%',   type: 'pct'   },
    { key: 'deflag',       label: 'Deflag attempt',                 unit: '/ 2', type: 'score' },
    { key: 'deflagNoStop', label: 'Deflag no-stop',                 unit: '/ 2', type: 'score' },
    { key: 'oneOnOne',     label: '1v1 offensive (avg 2 tries)',    unit: '%',   type: 'pct'   },
    { key: 'pass20',       label: '20-yard pass',                   unit: '/ 5', type: 'score' },
    { key: 'pass10',       label: '10-yard pass',                   unit: '/ 5', type: 'score' },
    { key: 'oneOnOneDef',  label: '1v1 defensive (avg 2 tries)',    unit: '%',   type: 'pct'   },
    { key: 'reaction',     label: 'Reaction time',                  unit: '/ 3', type: 'score' },
  ];

  if (!draftData.length) {
    panel.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⏱️</div>
        <p>No draft stats yet. Add them via the admin panel.</p>
      </div>`;
    return;
  }

  // ── Draft leaderboard (best per metric) ──
  const getBest = (key, lowerBetter) => {
    const entries = draftData
      .filter(d => d[key] !== undefined && d[key] !== '')
      .map(d => ({ player: players.find(p => p.id === d.playerId), val: d[key] }))
      .filter(e => e.player)
      .sort((a, b) => lowerBetter ? a.val - b.val : b.val - a.val);
    if (!entries.length) return null;
    const bestVal = entries[0].val;
    const tied = entries.filter(e => e.val === bestVal);
    return { val: bestVal, players: tied.map(e => e.player.name) };
  };

  const lowerBetterKeys = ['sprint5','sprint10','sprint20','shuttle'];

  const leaderCards = metrics.map(m => {
    const best = getBest(m.key, lowerBetterKeys.includes(m.key));
    if (!best) return '';
    const display = m.type === 'pct' ? `${best.val}%` : `${best.val} ${m.unit}`;
    return `
      <div style="background:var(--bg-card2);border:1px solid rgba(12,64,112,0.3);border-radius:var(--radius);padding:14px;text-align:center">
        <div style="font-family:var(--font-display);font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--gray-300);margin-bottom:6px">${m.label}</div>
        <div style="font-family:var(--font-display);font-size:1.5rem;font-weight:900;color:var(--blue-light)">${display}</div>
        <div style="font-size:0.8rem;color:var(--white);margin-top:4px">
          ${best.players.join(' & ')}
          ${best.players.length > 1 ? '<span style="font-size:0.7rem;color:var(--gold);margin-left:4px">Tied</span>' : ''}
        </div>
      </div>
    `;
  }).join('');

  panel.innerHTML = `
    <div style="margin-bottom:24px">
      <div class="section-title" style="font-size:1.1rem">🏆 Draft Leaders</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px">
        ${leaderCards}
      </div>
    </div>
    <div class="section-title" style="font-size:1.1rem">📋 Individual Results</div>
    ${draftData.map(entry => {
      const player = players.find(p => p.id === Number(entry.playerId));
      if (!player) return '';
      return `
        <div style="background:var(--bg-card);border:1px solid rgba(12,64,112,0.3);border-radius:var(--radius);padding:20px;margin-bottom:16px">
          <div style="font-family:var(--font-display);font-size:1.1rem;font-weight:800;margin-bottom:16px">
            ⏱️ ${player.name} — Draft Evaluation ${entry.season ? `<span style="color:var(--blue-light);font-size:0.85rem">(${entry.season})</span>` : ''}
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
            ${metrics.map(m => {
              const val = entry[m.key];
              if (val === undefined || val === '') return '';
              let cls = '';
              if (m.key === 'sprint5')  cls = val <= 1.50 ? 'good' : '';
              if (m.key === 'sprint10') cls = val <= 2.35 ? 'good' : '';
              if (m.key === 'sprint20') cls = val <= 3.60 ? 'good' : '';
              if (m.key === 'shuttle')  cls = val <= 4.00 ? 'good' : '';
              const display = m.type === 'pct' ? `${val}%` : `${val} ${m.unit}`;
              return `
                <div style="display:flex;align-items:center;gap:12px;background:var(--bg-card2);border-radius:8px;padding:10px 14px">
                  <div class="draft-score-circle ${cls}" style="font-size:0.82rem;min-width:56px;text-align:center">${display}</div>
                  <div style="font-size:0.82rem;color:var(--gray-300);line-height:1.3">${m.label}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('')}
  `;
}

// ── Player Profile ──
function openPlayerProfile(playerId) {
  const players = DB.getPlayers();
  const history = DB.getHistory();
  const player  = players.find(p => p.id === playerId);
  if (!player) return;

  // Get all seasons this player has stats in
  const seasons = [...new Set(
    history
      .filter(m => m.playerStats && m.playerStats[playerId])
      .map(m => m.season)
      .filter(Boolean)
  )].sort().reverse();

  // Aggregate stats for this player across all seasons
  const buildStats = (seasonFilter) => {
    const filtered = seasonFilter === 'all'
      ? history
      : history.filter(m => m.season === seasonFilter);

    const s = {
      gamesPlayed: 0, receptions: 0, recYds: 0, recTd: 0, recTd1pt: 0, recTd2pt: 0,
      rushYds: 0, rushAtt: 0, rushTd: 0, rushTd2pt: 0,
      passComp: 0, passAtt: 0, passYds: 0, passTd: 0, passInt: 0, passSack: 0, muffedSnap: 0,
      tackles: 0, sacks: 0, interceptions: 0, safeties: 0, passDefense: 0, pick6: 0, pick1: 0, pick2: 0,
    };

    filtered.forEach(match => {
      const ps = match.playerStats?.[playerId];
      if (!ps) return;
      s.gamesPlayed++;
      Object.keys(s).forEach(k => { if (k !== 'gamesPlayed') s[k] += ps[k] || 0; });
    });
    return s;
  };

  const avg = (n, d) => d ? (n / d).toFixed(1) : '0.0';
  const pct = (n, d) => d ? ((n / d) * 100).toFixed(0) + '%' : '0%';

  const statBlock = (label, value, sub) => `
    <div style="background:var(--bg-card2);border-radius:8px;padding:12px;text-align:center">
      <div style="font-family:var(--font-display);font-size:1.4rem;font-weight:900;color:var(--blue-light)">${value}</div>
      <div style="font-size:0.75rem;color:var(--gray-300);margin-top:2px">${label}</div>
      ${sub ? `<div style="font-size:0.7rem;color:var(--gray-500)">${sub}</div>` : ''}
    </div>
  `;

  const renderProfileStats = (s) => `
    <div style="margin-bottom:20px">
      <div style="font-family:var(--font-display);font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--gray-300);margin-bottom:10px">Receiving</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px">
        ${statBlock('Games', s.gamesPlayed)}
        ${statBlock('Receptions', s.receptions)}
        ${statBlock('Total Yards', s.recYds)}
        ${statBlock('Avg Yds/Rec', avg(s.recYds, s.receptions))}
        ${statBlock('Touchdowns', s.recTd)}
        ${statBlock('1pt Conv.', s.recTd1pt)}
        ${statBlock('2pt Conv.', s.recTd2pt)}
      </div>
    </div>
    <div style="margin-bottom:20px">
      <div style="font-family:var(--font-display);font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--gray-300);margin-bottom:10px">Rushing</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px">
        ${statBlock('Rush Yards', s.rushYds)}
        ${statBlock('Attempts', s.rushAtt)}
        ${statBlock('Avg Yds/Att', avg(s.rushYds, s.rushAtt))}
        ${statBlock('Touchdowns', s.rushTd)}
        ${statBlock('2pt Conv.', s.rushTd2pt)}
      </div>
    </div>
    <div style="margin-bottom:20px">
      <div style="font-family:var(--font-display);font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--gray-300);margin-bottom:10px">Passing</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px">
        ${statBlock('Attempts', s.passAtt)}
        ${statBlock('Completions', s.passComp)}
        ${statBlock('Comp %', pct(s.passComp, s.passAtt))}
        ${statBlock('Pass Yards', s.passYds)}
        ${statBlock('Touchdowns', s.passTd)}
        ${statBlock('INT Thrown', s.passInt)}
        ${statBlock('Times Sacked', s.passSack)}
        ${statBlock('Muffed Snaps', s.muffedSnap)}
      </div>
    </div>
    <div>
      <div style="font-family:var(--font-display);font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--gray-300);margin-bottom:10px">Defense</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px">
        ${statBlock('Tackles', s.tackles)}
        ${statBlock('Sacks', s.sacks)}
        ${statBlock('Interceptions', s.interceptions)}
        ${statBlock('Safeties', s.safeties)}
        ${statBlock('Pass Defense', s.passDefense)}
        ${statBlock('Pick-6', s.pick6)}
        ${statBlock('Pick-1pt', s.pick1)}
        ${statBlock('Pick-2pts', s.pick2)}
      </div>
    </div>
  `;

  const overlay = document.getElementById('adminOverlay');
  const content = document.getElementById('adminContent');
  overlay.classList.add('open');

  let selectedSeason = 'all';

  const render = () => {
    const s = buildStats(selectedSeason);
    content.innerHTML = `
      <div class="admin-modal">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px">
          <div>
            <div style="display:flex;align-items:center;gap:12px">
              <div class="player-avatar" style="width:44px;height:44px;font-size:1.1rem">${getInitials(player.name)}</div>
              <div>
                <div style="font-family:var(--font-display);font-size:1.5rem;font-weight:900">${player.name}</div>
                <div style="font-size:0.82rem;color:var(--gray-300)">#${player.number} · ${player.position}</div>
              </div>
            </div>
          </div>
          <button class="btn btn-ghost" onclick="closeAdmin()">✕ Close</button>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:20px">
          <span style="font-family:var(--font-display);font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--gray-300)">Season:</span>
          <button class="season-btn ${selectedSeason === 'all' ? 'active' : ''}"
            onclick="profileSelectSeason(${playerId}, 'all')">All Time</button>
          ${seasons.map(s => `
            <button class="season-btn ${selectedSeason === s ? 'active' : ''}"
              onclick="profileSelectSeason(${playerId}, '${s}')">${s}</button>
          `).join('')}
        </div>
        ${renderProfileStats(s)}
      </div>
    `;
  };

  window._currentProfileId = playerId;
  window._currentProfileRender = render;
  render();
}

function profileSelectSeason(playerId, season) {
  const history = DB.getHistory();
  const players = DB.getPlayers();
  const player  = players.find(p => p.id === playerId);
  if (!player) return;

  const seasons = [...new Set(
    history
      .filter(m => m.playerStats && m.playerStats[playerId])
      .map(m => m.season)
      .filter(Boolean)
  )].sort().reverse();

  const avg = (n, d) => d ? (n / d).toFixed(1) : '0.0';
  const pct = (n, d) => d ? ((n / d) * 100).toFixed(0) + '%' : '0%';

  const filtered = season === 'all'
    ? history
    : history.filter(m => m.season === season);

  const s = {
    gamesPlayed: 0, receptions: 0, recYds: 0, recTd: 0, recTd1pt: 0, recTd2pt: 0,
    rushYds: 0, rushAtt: 0, rushTd: 0, rushTd2pt: 0,
    passComp: 0, passAtt: 0, passYds: 0, passTd: 0, passInt: 0, passSack: 0, muffedSnap: 0,
    tackles: 0, sacks: 0, interceptions: 0, safeties: 0, passDefense: 0, pick6: 0, pick1: 0, pick2: 0,
  };

  filtered.forEach(match => {
    const ps = match.playerStats?.[playerId];
    if (!ps) return;
    s.gamesPlayed++;
    Object.keys(s).forEach(k => { if (k !== 'gamesPlayed') s[k] += ps[k] || 0; });
  });

  const statBlock = (label, value) => `
    <div style="background:var(--bg-card2);border-radius:8px;padding:12px;text-align:center">
      <div style="font-family:var(--font-display);font-size:1.4rem;font-weight:900;color:var(--blue-light)">${value}</div>
      <div style="font-size:0.75rem;color:var(--gray-300);margin-top:2px">${label}</div>
    </div>
  `;

  const content = document.getElementById('adminContent');
  content.innerHTML = `
    <div class="admin-modal">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="player-avatar" style="width:44px;height:44px;font-size:1.1rem">${getInitials(player.name)}</div>
          <div>
            <div style="font-family:var(--font-display);font-size:1.5rem;font-weight:900">${player.name}</div>
            <div style="font-size:0.82rem;color:var(--gray-300)">#${player.number} · ${player.position}</div>
          </div>
        </div>
        <button class="btn btn-ghost" onclick="closeAdmin()">✕ Close</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:20px">
        <span style="font-family:var(--font-display);font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--gray-300)">Season:</span>
        <button class="season-btn ${season === 'all' ? 'active' : ''}"
          onclick="profileSelectSeason(${playerId}, 'all')">All Time</button>
        ${seasons.map(se => `
          <button class="season-btn ${season === se ? 'active' : ''}"
            onclick="profileSelectSeason(${playerId}, '${se}')">${se}</button>
        `).join('')}
      </div>
      <div style="margin-bottom:20px">
        <div style="font-family:var(--font-display);font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--gray-300);margin-bottom:10px">Receiving</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px">
          ${statBlock('Games', s.gamesPlayed)}
          ${statBlock('Receptions', s.receptions)}
          ${statBlock('Total Yards', s.recYds)}
          ${statBlock('Avg Yds/Rec', avg(s.recYds, s.receptions))}
          ${statBlock('Touchdowns', s.recTd)}
          ${statBlock('1pt Conv.', s.recTd1pt)}
          ${statBlock('2pt Conv.', s.recTd2pt)}
        </div>
      </div>
      <div style="margin-bottom:20px">
        <div style="font-family:var(--font-display);font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--gray-300);margin-bottom:10px">Rushing</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px">
          ${statBlock('Rush Yards', s.rushYds)}
          ${statBlock('Attempts', s.rushAtt)}
          ${statBlock('Avg Yds/Att', avg(s.rushYds, s.rushAtt))}
          ${statBlock('Touchdowns', s.rushTd)}
          ${statBlock('2pt Conv.', s.rushTd2pt)}
        </div>
      </div>
      <div style="margin-bottom:20px">
        <div style="font-family:var(--font-display);font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--gray-300);margin-bottom:10px">Passing</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px">
          ${statBlock('Attempts', s.passAtt)}
          ${statBlock('Completions', s.passComp)}
          ${statBlock('Comp %', pct(s.passComp, s.passAtt))}
          ${statBlock('Pass Yards', s.passYds)}
          ${statBlock('Touchdowns', s.passTd)}
          ${statBlock('INT Thrown', s.passInt)}
          ${statBlock('Times Sacked', s.passSack)}
          ${statBlock('Muffed Snaps', s.muffedSnap)}
        </div>
      </div>
      <div>
        <div style="font-family:var(--font-display);font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--gray-300);margin-bottom:10px">Defense</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px">
          ${statBlock('Tackles', s.tackles)}
          ${statBlock('Sacks', s.sacks)}
          ${statBlock('Interceptions', s.interceptions)}
          ${statBlock('Safeties', s.safeties)}
          ${statBlock('Pass Defense', s.passDefense)}
          ${statBlock('Pick-6', s.pick6)}
          ${statBlock('Pick-1pt', s.pick1)}
          ${statBlock('Pick-2pts', s.pick2)}
        </div>
      </div>
    </div>
  `;
}

function renderPlayersTab(panel) {
  const players   = DB.getPlayers();
  const history   = DB.getHistory();
  const draftData = DB.getDraftStats();

  if (!players.length) {
    panel.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👤</div>
        <p>No players yet. Add them via the admin panel.</p>
      </div>`;
    return;
  }

  // Quick stats per player
  const quickStats = {};
  players.forEach(p => {
    quickStats[p.id] = { games: 0, td: 0, rec: 0, tackles: 0, passYds: 0 };
  });

  history.forEach(match => {
    if (!match.playerStats) return;
    Object.entries(match.playerStats).forEach(([pid, ps]) => {
      pid = Number(pid);
      if (!quickStats[pid]) return;
      quickStats[pid].games++;
      quickStats[pid].td      += (ps.recTd || 0) + (ps.rushTd || 0) + (ps.passTd || 0);
      quickStats[pid].rec     += ps.receptions || 0;
      quickStats[pid].tackles += ps.tackles    || 0;
      quickStats[pid].passYds += ps.passYds    || 0;
    });
  });

  panel.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">
      ${players.map(p => {
        const qs = quickStats[p.id] || {};
        const draft = draftData.find(d => d.playerId === p.id);
        return `
          <div onclick="openPlayerProfile(${p.id})"
            style="background:var(--bg-card);border:1px solid rgba(12,64,112,0.3);border-radius:var(--radius);padding:20px;cursor:pointer;transition:var(--transition);text-align:center"
            onmouseover="this.style.borderColor='var(--blue-mid)';this.style.transform='translateY(-2px)'"
            onmouseout="this.style.borderColor='rgba(12,64,112,0.3)';this.style.transform='translateY(0)'">
            <div class="player-avatar" style="width:52px;height:52px;font-size:1.2rem;margin:0 auto 12px">
              ${getInitials(p.name)}
            </div>
            <div style="font-family:var(--font-display);font-size:1.1rem;font-weight:800;margin-bottom:2px">${p.name}</div>
            <div style="font-size:0.8rem;color:var(--blue-light);margin-bottom:12px">
              #${p.number || '—'} · 
              ${(p.offPos?.length ? p.offPos.join('/') : p.position || '—')} | 
              ${p.defPos?.length ? p.defPos.join('/') : '—'}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px">
              <div style="background:var(--bg-card2);border-radius:6px;padding:6px">
                <div style="font-family:var(--font-display);font-size:1rem;font-weight:800;color:var(--blue-light)">${qs.games || 0}</div>
                <div style="font-size:0.68rem;color:var(--gray-500)">Games</div>
              </div>
              <div style="background:var(--bg-card2);border-radius:6px;padding:6px">
                <div style="font-family:var(--font-display);font-size:1rem;font-weight:800;color:var(--blue-light)">${qs.td || 0}</div>
                <div style="font-size:0.68rem;color:var(--gray-500)">TDs</div>
              </div>
              <div style="background:var(--bg-card2);border-radius:6px;padding:6px">
                <div style="font-family:var(--font-display);font-size:1rem;font-weight:800;color:var(--blue-light)">${qs.rec || 0}</div>
                <div style="font-size:0.68rem;color:var(--gray-500)">Receptions</div>
              </div>
              <div style="background:var(--bg-card2);border-radius:6px;padding:6px">
                <div style="font-family:var(--font-display);font-size:1rem;font-weight:800;color:var(--blue-light)">${qs.tackles || 0}</div>
                <div style="font-size:0.68rem;color:var(--gray-500)">Tackles</div>
              </div>
            </div>
            ${draft ? `<div style="font-size:0.72rem;color:var(--green);background:rgba(76,175,80,0.1);border-radius:20px;padding:3px 10px;display:inline-block">✓ Draft evaluated</div>` : `<div style="font-size:0.72rem;color:var(--gray-500);background:rgba(255,255,255,0.05);border-radius:20px;padding:3px 10px;display:inline-block">No draft data</div>`}
            <div style="font-size:0.72rem;color:var(--blue-light);margin-top:8px">Tap to view full profile →</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}