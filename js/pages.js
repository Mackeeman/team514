// ═══════════════════════════════════════════════════
//  PAGE: History
// ═══════════════════════════════════════════════════

function renderHistory() {
  const history = DB.getHistory().sort((a, b) => b.date.localeCompare(a.date));
  const players = DB.getPlayers();
  const container = document.getElementById('history-list');
  if (!container) return;

  if (!history.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏆</div>
        <p>No game history yet. Add results via the admin panel.</p>
      </div>`;
    return;
  }

  container.innerHTML = history.map(match => {
    const us    = match.scoreUs   ?? '—';
    const them  = match.scoreThem ?? '—';
    const won   = (match.scoreUs !== undefined && match.scoreThem !== undefined)
      ? match.scoreUs > match.scoreThem ? 'win'
      : match.scoreUs < match.scoreThem ? 'loss' : 'tie'
      : null;

    const badge = won === 'win'  ? '<span class="badge badge-win">Win</span>'
      : won === 'loss' ? '<span class="badge badge-loss">Loss</span>'
      : won === 'tie'  ? '<span class="badge" style="background:rgba(255,193,7,.1);color:var(--gold);border:1px solid rgba(255,193,7,.3)">Tie</span>'
      : '';

    const { day, month } = formatDateShort(match.date);

    let statsHtml = '';
    if (match.playerStats && Object.keys(match.playerStats).length) {
      const entries = Object.entries(match.playerStats)
        .filter(([, ps]) => Object.values(ps).some(v => v > 0));
      statsHtml = `
        <div style="margin-top:12px;border-top:1px solid rgba(12,64,112,0.2);padding-top:12px">
          <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--gray-500);margin-bottom:8px">
            Player Performances
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${entries.map(([pid, ps]) => {
              const player = players.find(p => p.id === Number(pid));
              if (!player) return '';
              const highlights = [];
              if (ps.receptions)    highlights.push(`${ps.receptions} rec`);
              if (ps.recYds)        highlights.push(`${ps.recYds} yds`);
              if (ps.recTd)         highlights.push(`${ps.recTd} TD`);
              if (ps.rushYds)       highlights.push(`${ps.rushYds} rush yds`);
              if (ps.passYds)       highlights.push(`${ps.passYds} pass yds`);
              if (ps.passTd)        highlights.push(`${ps.passTd} pass TD`);
              if (ps.tackles)       highlights.push(`${ps.tackles} tackles`);
              if (ps.interceptions) highlights.push(`${ps.interceptions} INT`);
              if (!highlights.length) return '';
              return `<div class="mini-stat"><strong>${player.name}</strong> — ${highlights.join(', ')}</div>`;
            }).join('')}
          </div>
        </div>
      `;
    }

    return `
      <div class="history-match fade-in">
        <div class="history-match-header">
          <div>
            <div class="history-match-title">
              514 <span style="color:var(--blue-light)">VS</span> ${match.opponent || 'Opponent'}
            </div>
            <div class="history-match-detail">
              ${day} ${month} · ${match.location || ''}
              ${match.season ? ` · ${match.season}` : ''}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            ${badge}
            <div class="result-score">
              <span>${us}</span>
              <span class="score-separator">—</span>
              <span class="score-them">${them}</span>
            </div>
            ${DB.isAdminSession() ? `
              <button class="btn btn-ghost" style="font-size:0.72rem;padding:4px 10px"
                onclick="editResult(${match.id})">✏️</button>
            ` : ''}
          </div>
        </div>
        ${match.note ? `<div style="font-size:0.82rem;color:var(--gray-300);font-style:italic">"${match.note}"</div>` : ''}
        ${statsHtml}
      </div>
    `;
  }).join('');
}

// ═══════════════════════════════════════════════════
//  PAGE: Strategy
// ═══════════════════════════════════════════════════

function renderStrategy() {
  const activeTab = document.querySelector('#strategy-tabs .tab-btn.active')?.dataset.tab || 'defense';
  renderStrategyTab(activeTab);
}

function renderStrategyTab(tab) {
  document.querySelectorAll('#strategy-tabs .tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  document.querySelectorAll('#strategy-panels .tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === 'strategy-panel-' + tab);
  });

  if (tab === 'playbook') { renderPlaybook(); return; }
  if (tab === 'gameplan') { renderGamePlan(); return; }

  const strategies = DB.getStrategies().filter(s => s.type === tab);
  const container  = document.getElementById('strategy-panel-' + tab);
  if (!container) return;

  if (!strategies.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${tab === 'defense' ? '🛡️' : '⚡'}</div>
        <p>No ${tab} strategies yet. Add them via the admin panel.</p>
      </div>`;
    return;
  }

  container.innerHTML = strategies.map(s => `
    <div class="strategy-card fade-in">
      <div class="strategy-name">
        ${s.name}
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost" style="font-size:0.75rem;padding:4px 10px"
            onclick="requireAdmin(() => editStrategy(${s.id}))">✏️</button>
          <button class="btn btn-danger" style="font-size:0.75rem;padding:4px 10px"
            onclick="requireAdmin(() => deleteStrategy(${s.id}))">Delete</button>
        </div>
      </div>
      <div class="strategy-desc">${s.description ? s.description.replace(/\n/g, '<br>') : '<em>No description</em>'}</div>
      ${s.imageUrl ? `<img src="${s.imageUrl}" style="max-width:100%;border-radius:8px;margin-top:12px" />` : ''}
    </div>
  `).join('');
}

function renderPlaybook() {
  const playbook  = DB.getPlaybook();
  const savedSections = DB.getPlaybookSections();
  const container = document.getElementById('strategy-panel-playbook');
  if (!container) return;

  // Merge saved sections with sections from plays
  const playSections = [...new Set(playbook.map(p => p.section).filter(Boolean))];
  const allSections  = [...new Set([...savedSections, ...playSections])];

  const addBtns = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px">
      <button class="btn btn-primary" style="font-size:0.78rem;padding:7px 14px"
        onclick="requireAdmin(() => openPlayForm())">+ Add Play</button>
      <button class="btn btn-ghost" style="font-size:0.78rem;padding:7px 14px"
        onclick="requireAdmin(() => openSectionForm())">+ Add Section</button>
    </div>
  `;

  if (!allSections.length) {
    container.innerHTML = `
      ${addBtns}
      <div class="empty-state">
        <div class="empty-icon">📖</div>
        <p>No plays yet. Start by adding a section!</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    ${addBtns}
    ${allSections.map(sectionName => {
      const plays = playbook.filter(p => p.section === sectionName);
      return `
        <div style="margin-bottom:28px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <div class="section-title" style="font-size:1.1rem;margin-bottom:0;flex:1">📋 ${sectionName}</div>
            <button class="btn btn-ghost" style="font-size:0.72rem;padding:4px 10px"
              onclick="requireAdmin(() => openSectionForm('${sectionName}'))">✏️</button>
          </div>
          ${plays.length ? `
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
              ${plays.map(play => `
                <div style="background:var(--bg-card);border:1px solid rgba(12,64,112,0.3);border-radius:var(--radius);padding:16px;transition:var(--transition)"
                  onmouseover="this.style.borderColor='var(--blue-mid)'"
                  onmouseout="this.style.borderColor='rgba(12,64,112,0.3)'">
                  <div style="display:flex;align-items:start;justify-content:space-between;margin-bottom:8px">
                    <div style="font-family:var(--font-display);font-size:1rem;font-weight:800">${play.name}</div>
                    <button class="btn btn-ghost" style="font-size:0.68rem;padding:3px 8px;flex-shrink:0"
                      onclick="requireAdmin(() => openPlayForm(${play.id}))">✏️</button>
                  </div>
                  ${play.objective ? `
                    <div style="font-size:0.75rem;color:var(--blue-light);font-family:var(--font-display);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">🎯 Objective</div>
                    <div style="font-size:0.82rem;color:var(--white);margin-bottom:8px">${play.objective}</div>
                  ` : ''}
                  ${play.description ? `
                    <div style="font-size:0.75rem;color:var(--blue-light);font-family:var(--font-display);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">📝 Description</div>
                    <div style="font-size:0.82rem;color:var(--gray-300);line-height:1.5;white-space:pre-line;margin-bottom:8px">${play.description}</div>
                  ` : ''}
                  ${play.imageUrl ? `
                    <img src="${play.imageUrl}" style="width:100%;border-radius:8px;margin-top:8px" />
                  ` : ''}
                </div>
              `).join('')}
            </div>
          ` : `
            <div style="color:var(--gray-500);font-size:0.85rem;padding:16px;background:var(--bg-card);border-radius:var(--radius);border:1px dashed rgba(12,64,112,0.3)">
              No plays in this section yet. Click "+ Add Play" and select this section.
            </div>
          `}
        </div>
      `;
    }).join('')}
  `;
}

function deleteStrategy(id) {
  DB.saveStrategies(DB.getStrategies().filter(s => s.id !== id));
  showToast('Strategy deleted');
  renderStrategy();
}

// ═══════════════════════════════════════════════════
//  PAGE: Media
// ═══════════════════════════════════════════════════

function renderMedia() {
  const media     = DB.getMedia();
  const container = document.getElementById('media-grid');
  if (!container) return;

  if (!media.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📸</div>
        <p>No photos yet.</p>
      </div>`;
    return;
  }

  container.innerHTML = media.map((m, i) => `
    <div class="media-item" onclick="openPhoto(${i})">
      <img src="${m.url}" alt="${m.caption || 'Photo'}" loading="lazy" />
    </div>
  `).join('');
}

function openPhoto(index) {
  const m = DB.getMedia()[index];
  if (!m) return;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:500;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:20px;flex-direction:column;gap:12px';
  overlay.innerHTML = `
    <img src="${m.url}" style="max-width:100%;max-height:80vh;object-fit:contain;border-radius:8px" />
    ${m.caption ? `<p style="color:var(--gray-300);font-size:0.9rem">${m.caption}</p>` : ''}
    <button style="color:var(--white);background:rgba(255,255,255,0.1);border:none;padding:8px 20px;border-radius:20px;cursor:pointer;font-family:var(--font-display);font-weight:700">Close</button>
  `;
  overlay.onclick = () => document.body.removeChild(overlay);
  document.body.appendChild(overlay);
}

// ═══════════════════════════════════════════════════
//  ADMIN PANEL
// ═══════════════════════════════════════════════════

function openAdminModal(section) {
  requireAdmin(() => {
    const overlay = document.getElementById('adminOverlay');
    const content = document.getElementById('adminContent');
    if (!overlay || !content) return;
    overlay.classList.add('open');
    content.innerHTML = section ? getAdminSection(section) : getAdminMenu();
  });
}

function getAdminMenu() {
  return `
    <div class="admin-modal">
      <h2>⚙️ Admin Panel</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
        ${[
          ['match',    '📅', 'Add Match'],
          ['result',   '🏆', 'Enter Result'],
          ['player',   '👤', 'Manage Players'],
          ['training', '🏃', 'Trainings'],
          ['strategy', '🛡️', 'Add Strategy'],
          ['playbook', '📖', 'Playbook URL'],
          ['media',    '📸', 'Add Photo'],
          ['draft',    '⏱️', 'Draft Stats'],
          ['password', '🔑', 'Change Password'],
        ].map(([s, icon, label]) => `
          <button class="btn btn-ghost" style="padding:14px;text-align:left"
            onclick="document.getElementById('adminContent').innerHTML=getAdminSection('${s}')">
            ${icon} ${label}
          </button>
        `).join('')}
      </div>
      <button class="btn btn-ghost" onclick="closeAdmin()">Close</button>
    </div>
  `;
}

function getAdminSection(section) {
  const back = `
    <button class="btn btn-ghost" style="margin-bottom:16px;font-size:0.8rem"
      onclick="document.getElementById('adminContent').innerHTML=getAdminMenu()">
      ← Back
    </button>`;

  const sections = {

    match: () => {
      const matches = DB.getMatches().sort((a,b) => a.date.localeCompare(b.date));
      return `
        <div class="admin-modal">
          ${back}<h2>📅 Add Match</h2>
          <div class="form-group"><label class="form-label">Opponent</label>
            <input class="form-input" id="am-opp" placeholder="Team name" /></div>
          <div class="grid-2">
            <div class="form-group"><label class="form-label">Date</label>
              <input class="form-input" type="date" id="am-date" /></div>
            <div class="form-group"><label class="form-label">Game Time</label>
              <input class="form-input" type="time" id="am-time" /></div>
          </div>
          <div class="form-group"><label class="form-label">Location</label>
            <input class="form-input" id="am-loc" placeholder="e.g. Parc Kent, Field 2" /></div>
          <div class="form-group"><label class="form-label">Field detail</label>
            <input class="form-input" id="am-field" placeholder="e.g. Synthetic turf" /></div>
          <div class="form-group"><label class="form-label">Note (optional)</label>
            <input class="form-input" id="am-note" placeholder="e.g. Bring white jerseys" /></div>
          <div class="btn-row">
            <button class="btn btn-primary" onclick="saveMatch()">Add Match</button>
            <button class="btn btn-ghost" onclick="closeAdmin()">Cancel</button>
          </div>
          <div style="margin-top:24px">
            <div class="section-title" style="font-size:1rem">Scheduled Matches</div>
            ${matches.map(m => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(12,64,112,0.2)">
                <span style="font-size:0.88rem">${m.date} — <strong>${m.opponent}</strong> · ${m.location}</span>
                <button class="btn btn-danger" style="font-size:0.72rem;padding:4px 10px"
                  onclick="deleteMatch(${m.id})">✕</button>
              </div>
            `).join('')}
          </div>
        </div>`;
    },

    result: () => {
      const players = DB.getPlayers();
      return `
        <div class="admin-modal">
          ${back}<h2>🏆 Enter Result</h2>
          <div class="form-group"><label class="form-label">Opponent</label>
            <input class="form-input" id="ar-opp" placeholder="Team name" /></div>
          <div class="form-group"><label class="form-label">Date</label>
            <input class="form-input" type="date" id="ar-date" /></div>
          <div class="form-group"><label class="form-label">Location</label>
            <input class="form-input" id="ar-loc" placeholder="Game location" /></div>
          <div class="form-group"><label class="form-label">Season</label>
            <input class="form-input" id="ar-season" placeholder="e.g. Spring 2025" /></div>
          <div class="grid-2">
            <div class="form-group"><label class="form-label">Score — 514</label>
              <input class="form-input" type="number" id="ar-us" min="0" placeholder="0" /></div>
            <div class="form-group"><label class="form-label">Score — Opponent</label>
              <input class="form-input" type="number" id="ar-them" min="0" placeholder="0" /></div>
          </div>
          <div class="form-group"><label class="form-label">Notes</label>
            <textarea class="form-textarea" id="ar-note" placeholder="Game summary..."></textarea></div>
          <div style="margin:16px 0">
            <div class="section-title" style="font-size:1rem;margin-bottom:12px">Player Stats</div>
            ${players.map(p => `
              <details style="margin-bottom:10px;background:var(--bg-card2);border-radius:8px;border:1px solid rgba(12,64,112,0.3)">
                <summary style="padding:12px 16px;cursor:pointer;font-family:var(--font-display);font-weight:700">${p.name}</summary>
                <div style="padding:12px 16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">
                  ${[
                    ['receptions',  'Receptions'],
                    ['recYds',      'Receiving Yards'],
                    ['recTd',       'Receiving TDs'],
                    ['recTd1pt',    '1pt Conv (rec)'],
                    ['recTd2pt',    '2pt Conv (rec)'],
                    ['rushYds',     'Rushing Yards'],
                    ['rushAtt',     'Rush Attempts'],
                    ['rushTd',      'Rushing TDs'],
                    ['rushTd2pt',   '2pt Conv (rush)'],
                    ['passComp',    'Completions'],
                    ['passAtt',     'Pass Attempts'],
                    ['passYds',     'Passing Yards'],
                    ['passTd',      'Passing TDs'],
                    ['passInt',     'Interceptions Thrown'],
                    ['passSack',    'Times Sacked'],
                    ['muffedSnap',  'Muffed Snaps'],
                    ['tackles',     'Tackles'],
                    ['sacks',       'Sacks'],
                    ['interceptions','Interceptions'],
                    ['safeties',    'Safeties'],
                    ['passDefense', 'Pass Defense'],
                    ['pick6',       'Pick-6'],
                    ['pick1',       'Pick-1pt'],
                    ['pick2',       'Pick-2pts'],
                  ].map(([k, label]) => `
                    <div>
                      <label style="font-size:0.7rem;color:var(--gray-300);display:block;margin-bottom:3px">${label}</label>
                      <input type="number" min="0" class="form-input" style="padding:6px 10px"
                        data-player="${p.id}" data-stat="${k}" placeholder="0" />
                    </div>
                  `).join('')}
                </div>
              </details>
            `).join('')}
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" onclick="saveResult()">Save Result</button>
            <button class="btn btn-ghost" onclick="closeAdmin()">Cancel</button>
          </div>
        </div>`;
    },

    player: () => {
      const players = DB.getPlayers();
      return `
        <div class="admin-modal">
          ${back}<h2>👤 Players</h2>
          <div class="grid-2">
            <div class="form-group"><label class="form-label">Name</label>
              <input class="form-input" id="ap-name" placeholder="First Last" /></div>
            <div class="form-group"><label class="form-label">Number</label>
              <input class="form-input" id="ap-num" placeholder="7" /></div>
          </div>
          <div class="form-group"><label class="form-label">Position</label>
            <select class="form-select" id="ap-pos">
              <option value="QB">Quarterback (QB)</option>
              <option value="WR">Wide Receiver (WR)</option>
              <option value="RB">Running Back (RB)</option>
              <option value="DB">Defensive Back (DB)</option>
              <option value="ATH">Athlete</option>
            </select>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" onclick="savePlayer()">Add Player</button>
          </div>
          <div style="margin-top:20px">
            <div class="section-title" style="font-size:1rem">Roster (${players.length} players)</div>
            ${players.map(p => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(12,64,112,0.2)">
                <div class="player-avatar">${getInitials(p.name)}</div>
                <span style="flex:1;font-size:0.9rem"><strong>#${p.number}</strong> ${p.name}
                  <span style="color:var(--gray-500)">(${p.position})</span></span>
                <button class="btn btn-ghost" style="font-size:0.72rem;padding:4px 10px"
                  onclick="editPlayer(${p.id})">✏️</button>
                <button class="btn btn-danger" style="font-size:0.72rem;padding:4px 10px"
                  onclick="deletePlayer(${p.id})">✕</button>
              </div>
            `).join('')}
          </div>
        </div>`;
    },

    training: () => {
      const trainings = DB.getTrainings();
      return `
        <div class="admin-modal">
          ${back}<h2>🏃 Trainings</h2>
          <div class="grid-2">
            <div class="form-group"><label class="form-label">Day</label>
              <input class="form-input" id="at-day" placeholder="e.g. Thursday" /></div>
            <div class="form-group"><label class="form-label">Date</label>
              <input class="form-input" type="date" id="at-date" /></div>
          </div>
          <div class="grid-2">
            <div class="form-group"><label class="form-label">Time</label>
              <input class="form-input" type="time" id="at-time" value="19:00" /></div>
            <div class="form-group"><label class="form-label">Location</label>
              <input class="form-input" id="at-loc" placeholder="e.g. Parc Jarry, east field" /></div>
          </div>
          <div class="form-group"><label class="form-label">Note</label>
            <input class="form-input" id="at-note" placeholder="Optional note" /></div>
          <div class="btn-row">
            <button class="btn btn-primary" onclick="saveTraining()">Add</button>
          </div>
          <div style="margin-top:20px">
            ${trainings.map(t => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(12,64,112,0.2)">
                <span style="font-size:0.88rem"><strong>${t.day} ${t.date || ''}</strong> ${t.time} · ${t.location}</span>
                <button class="btn btn-danger" style="font-size:0.72rem;padding:4px 10px"
                  onclick="deleteTraining(${t.id})">✕</button>
              </div>
            `).join('')}
          </div>
        </div>`;
    },

    strategy: () => `
      <div class="admin-modal">
        ${back}<h2>🛡️ Add Strategy</h2>
        <div class="form-group"><label class="form-label">Name</label>
          <input class="form-input" id="as-name" placeholder="e.g. Zone 2-3" /></div>
        <div class="form-group"><label class="form-label">Type</label>
          <select class="form-select" id="as-type">
            <option value="defense">Defense</option>
            <option value="offense">Offense</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Description</label>
          <textarea class="form-textarea" id="as-desc" placeholder="Explain the strategy..."></textarea></div>
        <div class="form-group"><label class="form-label">Image URL (optional)</label>
          <input class="form-input" id="as-img" placeholder="https://..." /></div>
        <div class="btn-row">
          <button class="btn btn-primary" onclick="saveStrategy()">Add</button>
          <button class="btn btn-ghost" onclick="closeAdmin()">Cancel</button>
        </div>
      </div>`,

    playbook: () => `
      <div class="admin-modal">
        ${back}<h2>📖 Playbook Link</h2>
        <div class="form-group">
          <label class="form-label">Playbook URL</label>
          <input class="form-input" id="apb-url" value="${DB.getPlaybookUrl()}" placeholder="https://drive.google.com/..." />
          <p style="font-size:0.78rem;color:var(--gray-500);margin-top:6px">
            Supports Google Drive, PDF, YouTube. For Google Drive: Share → Get link → change to viewer.
          </p>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" onclick="savePlaybookUrl()">Save</button>
          <button class="btn btn-ghost" onclick="closeAdmin()">Cancel</button>
        </div>
      </div>`,

    media: () => `
      <div class="admin-modal">
        ${back}<h2>📸 Add Photo</h2>
        <div class="form-group"><label class="form-label">Photo URL</label>
          <input class="form-input" id="amedia-url" placeholder="https://..." /></div>
        <div class="form-group"><label class="form-label">Caption (optional)</label>
          <input class="form-input" id="amedia-cap" placeholder="e.g. Game vs Thunder FC, June 5" /></div>
        <p style="font-size:0.78rem;color:var(--gray-500);margin-bottom:16px">
          Tip: Upload your photo to <a href="https://imgur.com" target="_blank"
          style="color:var(--blue-light)">imgur.com</a> and paste the direct link here.
        </p>
        <div class="btn-row">
          <button class="btn btn-primary" onclick="saveMedia()">Add</button>
          <button class="btn btn-ghost" onclick="closeAdmin()">Cancel</button>
        </div>
      </div>`,

    draft: () => {
      const players   = DB.getPlayers();
      const draftData = DB.getDraftStats();
      return `
        <div class="admin-modal">
          ${back}<h2>⏱️ Draft Stats</h2>
          <div class="form-group"><label class="form-label">Player</label>
            <select class="form-select" id="ad-player" onchange="prefillDraftForm()">
              <option value="">— Select a player —</option>
              ${players.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">Season</label>
            <input class="form-input" id="ad-season" placeholder="e.g. Spring 2025" /></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            ${[
              ['sprint5',      '5-yard sprint (s)'],
              ['sprint10',     '10-yard sprint (s)'],
              ['sprint20',     '20-yard sprint (s)'],
              ['shuttle',      '5-5-5 shuttle (s)'],
              ['recStatic',    'Stationary catch avg (%)'],
              ['recMoving',    'Moving catch avg (%)'],
              ['deflag',       'Deflag attempt (/2)'],
              ['deflagNoStop', 'Deflag no-stop (/2)'],
              ['oneOnOne',     '1v1 offensive avg (%)'],
              ['pass20',       '20-yard pass (/5)'],
              ['pass10',       '10-yard pass (/5)'],
              ['oneOnOneDef',  '1v1 defensive avg (%)'],
              ['reaction',     'Reaction time (/3)'],
            ].map(([k, label]) => `
              <div class="form-group">
                <label class="form-label" style="font-size:0.68rem">${label}</label>
                <input type="number" step="0.01" min="0" class="form-input"
                  id="ad-${k}" placeholder="—" />
              </div>
            `).join('')}
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" onclick="saveDraftStats()">Save</button>
            <button class="btn btn-ghost" onclick="closeAdmin()">Cancel</button>
          </div>
        </div>`;
    },

    password: () => `
      <div class="admin-modal">
        ${back}<h2>🔑 Change Password</h2>
        <div class="form-group"><label class="form-label">New Password</label>
          <input type="password" class="form-input" id="np-pass" /></div>
        <div class="form-group"><label class="form-label">Confirm</label>
          <input type="password" class="form-input" id="np-conf" /></div>
        <div class="btn-row">
          <button class="btn btn-primary" onclick="changePassword()">Change</button>
          <button class="btn btn-ghost" onclick="closeAdmin()">Cancel</button>
        </div>
      </div>`,
  };

  return sections[section] ? sections[section]() : getAdminMenu();
}

// ── Save functions ──

function saveMatch() {
  const opp   = document.getElementById('am-opp')?.value.trim();
  const date  = document.getElementById('am-date')?.value;
  const time  = document.getElementById('am-time')?.value;
  const loc   = document.getElementById('am-loc')?.value.trim();
  const field = document.getElementById('am-field')?.value.trim();
  const note  = document.getElementById('am-note')?.value.trim();
  if (!opp || !date || !time) { showToast('Fill in all required fields', 'error'); return; }
  const matches = DB.getMatches();
  matches.push({ id: Date.now(), opponent: opp, date, time, location: loc, field, note });
  DB.saveMatches(matches);
  showToast('Match added!');
  document.getElementById('adminContent').innerHTML = getAdminSection('match');
}

function deleteMatch(id) {
  DB.saveMatches(DB.getMatches().filter(m => m.id !== id));
  showToast('Match deleted');
  document.getElementById('adminContent').innerHTML = getAdminSection('match');
}

function saveResult() {
  const opp    = document.getElementById('ar-opp')?.value.trim();
  const date   = document.getElementById('ar-date')?.value;
  const loc    = document.getElementById('ar-loc')?.value.trim();
  const season = document.getElementById('ar-season')?.value.trim();
  const us     = document.getElementById('ar-us')?.value;
  const them   = document.getElementById('ar-them')?.value;
  const note   = document.getElementById('ar-note')?.value.trim();
  if (!opp || !date) { showToast('Fill in all required fields', 'error'); return; }

  const playerStats = {};
  document.querySelectorAll('[data-player][data-stat]').forEach(input => {
    const pid  = input.dataset.player;
    const stat = input.dataset.stat;
    const val  = Number(input.value) || 0;
    if (val > 0) {
      if (!playerStats[pid]) playerStats[pid] = {};
      playerStats[pid][stat] = val;
    }
  });

  const history = DB.getHistory();
  history.push({
    id: Date.now(), opponent: opp, date, location: loc, season,
    scoreUs:   us   !== '' ? Number(us)   : undefined,
    scoreThem: them !== '' ? Number(them) : undefined,
    note, playerStats
  });
  DB.saveHistory(history);
  showToast('Result saved!');
  closeAdmin();
}

function savePlayer() {
  const name     = document.getElementById('ap-name')?.value.trim();
  const number   = document.getElementById('ap-num')?.value.trim();
  const position = document.getElementById('ap-pos')?.value;
  if (!name) { showToast('Enter a name', 'error'); return; }
  const players = DB.getPlayers();
  players.push({ id: Date.now(), name, number, position });
  DB.savePlayers(players);
  showToast('Player added!');
  document.getElementById('adminContent').innerHTML = getAdminSection('player');
}

function deletePlayer(id) {
  DB.savePlayers(DB.getPlayers().filter(p => p.id !== id));
  showToast('Player deleted');
  document.getElementById('adminContent').innerHTML = getAdminSection('player');
}

function saveTraining() {
  const day  = document.getElementById('at-day')?.value.trim();
  const date = document.getElementById('at-date')?.value;
  const time = document.getElementById('at-time')?.value;
  const loc  = document.getElementById('at-loc')?.value.trim();
  const note = document.getElementById('at-note')?.value.trim();
  if (!day || !time) { showToast('Fill in all required fields', 'error'); return; }
  const trainings = DB.getTrainings();
  trainings.push({ id: Date.now(), day, date, time, location: loc, note });
  DB.saveTrainings(trainings);
  showToast('Training added!');
  document.getElementById('adminContent').innerHTML = getAdminSection('training');
  renderTrainings();
}

function deleteTraining(id) {
  DB.saveTrainings(DB.getTrainings().filter(t => t.id !== id));
  showToast('Training deleted');
  document.getElementById('adminContent').innerHTML = getAdminSection('training');
  renderTrainings();
}

function saveStrategy() {
  const name        = document.getElementById('as-name')?.value.trim();
  const type        = document.getElementById('as-type')?.value;
  const description = document.getElementById('as-desc')?.value.trim();
  const imageUrl    = document.getElementById('as-img')?.value.trim();
  if (!name) { showToast('Enter a name', 'error'); return; }
  const strategies = DB.getStrategies();
  strategies.push({ id: Date.now(), name, type, description, imageUrl });
  DB.saveStrategies(strategies);
  showToast('Strategy added!');
  closeAdmin();
}

function savePlaybookUrl() {
  const url = document.getElementById('apb-url')?.value.trim();
  DB.savePlaybookUrl(url);
  showToast('Playbook saved!');
  closeAdmin();
  renderPlaybook();
}

function saveMedia() {
  const url     = document.getElementById('amedia-url')?.value.trim();
  const caption = document.getElementById('amedia-cap')?.value.trim();
  if (!url) { showToast('Enter a URL', 'error'); return; }
  const media = DB.getMedia();
  media.push({ id: Date.now(), url, caption });
  DB.saveMedia(media);
  showToast('Photo added!');
  closeAdmin();
  renderMedia();
}

function prefillDraftForm() {
  const playerId = Number(document.getElementById('ad-player')?.value);
  if (!playerId) return;
  const existing = DB.getDraftStats().find(d => d.playerId === playerId);
  if (!existing) return;

  const keys = ['sprint5','sprint10','sprint20','shuttle','recStatic','recMoving',
    'deflag','deflagNoStop','oneOnOne','pass20','pass10','oneOnOneDef','reaction'];

  if (existing.season) {
    document.getElementById('ad-season').value = existing.season;
  }
  keys.forEach(k => {
    const input = document.getElementById('ad-' + k);
    if (input && existing[k] !== undefined) input.value = existing[k];
  });
}

function saveDraftStats() {
  const playerId = Number(document.getElementById('ad-player')?.value);
  const season   = document.getElementById('ad-season')?.value.trim();
  if (!playerId) { showToast('Select a player', 'error'); return; }

  const keys = ['sprint5','sprint10','sprint20','shuttle','recStatic','recMoving',
    'deflag','deflagNoStop','oneOnOne','pass20','pass10','oneOnOneDef','reaction'];

  // Start from existing entry so we only overwrite filled fields
  const existing = DB.getDraftStats().find(d => d.playerId === playerId) || {};
  const entry    = { ...existing, playerId };
  if (season) entry.season = season;

  keys.forEach(k => {
    const val = document.getElementById('ad-' + k)?.value;
    if (val !== '' && val !== undefined && val !== null) {
      entry[k] = Number(val);
    }
    // If field is empty, keep existing value — don't overwrite
  });

  const all = DB.getDraftStats().filter(d => d.playerId !== playerId);
  all.push(entry);
  DB.saveDraftStats(all);
  showToast('Draft stats saved!');
  closeAdmin();
}

function changePassword() {
  const p = document.getElementById('np-pass')?.value;
  const c = document.getElementById('np-conf')?.value;
  if (!p) { showToast('Enter a password', 'error'); return; }
  if (p !== c) { showToast('Passwords do not match', 'error'); return; }
  DB.setPassword(p);
  showToast('Password changed!');
  closeAdmin();
}

function editPlayer(id) {
  const players = DB.getPlayers();
  const p = players.find(p => p.id === id);
  if (!p) return;

  const content = document.getElementById('adminContent');
  content.innerHTML = `
    <div class="admin-modal">
      <button class="btn btn-ghost" style="margin-bottom:16px;font-size:0.8rem"
        onclick="document.getElementById('adminContent').innerHTML=getAdminSection('player')">← Back</button>
      <h2>✏️ Edit Player</h2>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">Name</label>
          <input class="form-input" id="ep-name" value="${p.name}" /></div>
        <div class="form-group"><label class="form-label">Number</label>
          <input class="form-input" id="ep-num" value="${p.number || ''}" /></div>
      </div>
      <div class="form-group"><label class="form-label">Position</label>
        <select class="form-select" id="ep-pos">
          <option value="QB" ${p.position === 'QB' ? 'selected' : ''}>Quarterback (QB)</option>
          <option value="WR" ${p.position === 'WR' ? 'selected' : ''}>Wide Receiver (WR)</option>
          <option value="RB" ${p.position === 'RB' ? 'selected' : ''}>Running Back (RB)</option>
          <option value="DB" ${p.position === 'DB' ? 'selected' : ''}>Defensive Back (DB)</option>
          <option value="ATH" ${p.position === 'ATH' ? 'selected' : ''}>Athlete</option>
        </select>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" onclick="saveEditPlayer(${id})">Save Changes</button>
        <button class="btn btn-ghost" onclick="closeAdmin()">Cancel</button>
      </div>
    </div>
  `;
}

function saveEditPlayer(id) {
  const name     = document.getElementById('ep-name')?.value.trim();
  const number   = document.getElementById('ep-num')?.value.trim();
  const position = document.getElementById('ep-pos')?.value;
  if (!name) { showToast('Enter a name', 'error'); return; }

  const players = DB.getPlayers();
  const idx = players.findIndex(p => p.id === id);
  if (idx === -1) return;

  players[idx] = { ...players[idx], name, number, position };
  DB.savePlayers(players);
  showToast('Player updated!');
  document.getElementById('adminContent').innerHTML = getAdminSection('player');
}

function editResult(id) {
  const history = DB.getHistory();
  const match   = history.find(m => m.id === id);
  const players = DB.getPlayers();
  if (!match) return;

  const overlay = document.getElementById('adminOverlay');
  const content = document.getElementById('adminContent');
  overlay.classList.add('open');

  content.innerHTML = `
    <div class="admin-modal">
      <button class="btn btn-ghost" style="margin-bottom:16px;font-size:0.8rem"
        onclick="closeAdmin()">← Back</button>
      <h2>✏️ Edit Result</h2>
      <div class="form-group"><label class="form-label">Opponent</label>
        <input class="form-input" id="er-opp" value="${match.opponent || ''}" /></div>
      <div class="form-group"><label class="form-label">Date</label>
        <input class="form-input" type="date" id="er-date" value="${match.date || ''}" /></div>
      <div class="form-group"><label class="form-label">Location</label>
        <input class="form-input" id="er-loc" value="${match.location || ''}" /></div>
      <div class="form-group"><label class="form-label">Season</label>
        <input class="form-input" id="er-season" value="${match.season || ''}" /></div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">Score — 514</label>
          <input class="form-input" type="number" id="er-us" min="0" value="${match.scoreUs ?? ''}" /></div>
        <div class="form-group"><label class="form-label">Score — Opponent</label>
          <input class="form-input" type="number" id="er-them" min="0" value="${match.scoreThem ?? ''}" /></div>
      </div>
      <div class="form-group"><label class="form-label">Notes</label>
        <textarea class="form-textarea" id="er-note">${match.note || ''}</textarea></div>
      <div style="margin:16px 0">
        <div class="section-title" style="font-size:1rem;margin-bottom:12px">Player Stats</div>
        ${players.map(p => {
          const ps = match.playerStats?.[p.id] || {};
          return `
            <details style="margin-bottom:10px;background:var(--bg-card2);border-radius:8px;border:1px solid rgba(12,64,112,0.3)">
              <summary style="padding:12px 16px;cursor:pointer;font-family:var(--font-display);font-weight:700">${p.name}</summary>
              <div style="padding:12px 16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">
                ${[
                  ['receptions',   'Receptions'],
                  ['recYds',       'Receiving Yards'],
                  ['recTd',        'Receiving TDs'],
                  ['recTd1pt',     '1pt Conv (rec)'],
                  ['recTd2pt',     '2pt Conv (rec)'],
                  ['rushYds',      'Rushing Yards'],
                  ['rushAtt',      'Rush Attempts'],
                  ['rushTd',       'Rushing TDs'],
                  ['rushTd2pt',    '2pt Conv (rush)'],
                  ['passComp',     'Completions'],
                  ['passAtt',      'Pass Attempts'],
                  ['passYds',      'Passing Yards'],
                  ['passTd',       'Passing TDs'],
                  ['passInt',      'Interceptions Thrown'],
                  ['passSack',     'Times Sacked'],
                  ['muffedSnap',   'Muffed Snaps'],
                  ['tackles',      'Tackles'],
                  ['sacks',        'Sacks'],
                  ['interceptions','Interceptions'],
                  ['safeties',     'Safeties'],
                  ['passDefense',  'Pass Defense'],
                  ['pick6',        'Pick-6'],
                  ['pick1',        'Pick-1pt'],
                  ['pick2',        'Pick-2pts'],
                ].map(([k, label]) => `
                  <div>
                    <label style="font-size:0.7rem;color:var(--gray-300);display:block;margin-bottom:3px">${label}</label>
                    <input type="number" min="0" class="form-input" style="padding:6px 10px"
                      data-player="${p.id}" data-stat="${k}" value="${ps[k] || 0}" />
                  </div>
                `).join('')}
              </div>
            </details>
          `;
        }).join('')}
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" onclick="saveEditResult(${id})">Save Changes</button>
        <button class="btn btn-danger" onclick="deleteResult(${id})">Delete Match</button>
        <button class="btn btn-ghost" onclick="closeAdmin()">Cancel</button>
      </div>
    </div>
  `;
}

function saveEditResult(id) {
  const opp    = document.getElementById('er-opp')?.value.trim();
  const date   = document.getElementById('er-date')?.value;
  const loc    = document.getElementById('er-loc')?.value.trim();
  const season = document.getElementById('er-season')?.value.trim();
  const us     = document.getElementById('er-us')?.value;
  const them   = document.getElementById('er-them')?.value;
  const note   = document.getElementById('er-note')?.value.trim();
  if (!opp || !date) { showToast('Fill in all required fields', 'error'); return; }

  const playerStats = {};
  document.querySelectorAll('[data-player][data-stat]').forEach(input => {
    const pid  = input.dataset.player;
    const stat = input.dataset.stat;
    const val  = Number(input.value) || 0;
    if (val > 0) {
      if (!playerStats[pid]) playerStats[pid] = {};
      playerStats[pid][stat] = val;
    }
  });

  const history = DB.getHistory();
  const idx = history.findIndex(m => m.id === id);
  if (idx === -1) return;

  history[idx] = {
    ...history[idx],
    opponent: opp, date, location: loc, season,
    scoreUs:   us   !== '' ? Number(us)   : undefined,
    scoreThem: them !== '' ? Number(them) : undefined,
    note, playerStats
  };

  DB.saveHistory(history);
  showToast('Result updated!');
  closeAdmin();
}

function deleteResult(id) {
  if (!confirm('Delete this match permanently?')) return;
  DB.saveHistory(DB.getHistory().filter(m => m.id !== id));
  showToast('Match deleted');
  closeAdmin();
}

function editStrategy(id) {
  const strategy = DB.getStrategies().find(s => s.id === id);
  if (!strategy) return;

  const overlay = document.getElementById('adminOverlay');
  const content = document.getElementById('adminContent');
  overlay.classList.add('open');

  content.innerHTML = `
    <div class="admin-modal">
      <button class="btn btn-ghost" style="margin-bottom:16px;font-size:0.8rem"
        onclick="closeAdmin()">← Back</button>
      <h2>✏️ Edit Strategy</h2>
      <div class="form-group"><label class="form-label">Name</label>
        <input class="form-input" id="es-name" value="${strategy.name}" /></div>
      <div class="form-group"><label class="form-label">Type</label>
        <select class="form-select" id="es-type">
          <option value="defense" ${strategy.type === 'defense' ? 'selected' : ''}>Defense</option>
          <option value="offense" ${strategy.type === 'offense' ? 'selected' : ''}>Offense</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Description</label>
        <textarea class="form-textarea" id="es-desc">${strategy.description || ''}</textarea></div>
      <div class="form-group"><label class="form-label">Image URL (optional)</label>
        <input class="form-input" id="es-img" value="${strategy.imageUrl || ''}" /></div>
      <div class="btn-row">
        <button class="btn btn-primary" onclick="saveEditStrategy(${id})">Save Changes</button>
        <button class="btn btn-ghost" onclick="closeAdmin()">Cancel</button>
      </div>
    </div>
  `;
}

function saveEditStrategy(id) {
  const name        = document.getElementById('es-name')?.value.trim();
  const type        = document.getElementById('es-type')?.value;
  const description = document.getElementById('es-desc')?.value.trim();
  const imageUrl    = document.getElementById('es-img')?.value.trim();
  if (!name) { showToast('Enter a name', 'error'); return; }

  const strategies = DB.getStrategies();
  const idx = strategies.findIndex(s => s.id === id);
  if (idx === -1) return;

  strategies[idx] = { ...strategies[idx], name, type, description, imageUrl };
  DB.saveStrategies(strategies);
  showToast('Strategy updated!');
  closeAdmin();
}

// ═══════════════════════════════════════════════════
//  GAME PLAN
// ═══════════════════════════════════════════════════

function renderGamePlan() {
  const gamePlans = DB.getGamePlans().sort((a, b) => b.id - a.id);
  const container = document.getElementById('strategy-panel-gameplan');
  if (!container) return;

  const addBtn = DB.isAdminSession() ? `
    <button class="btn btn-primary" style="font-size:0.78rem;padding:7px 14px;margin-bottom:20px"
      onclick="openGamePlanForm()">+ New Game Plan</button>
  ` : `
    <button class="btn btn-primary" style="font-size:0.78rem;padding:7px 14px;margin-bottom:20px"
      onclick="requireAdmin(openGamePlanForm)">+ New Game Plan</button>
  `;

  if (!gamePlans.length) {
    container.innerHTML = `
      ${addBtn}
      <div class="empty-state">
        <div class="empty-icon">🎯</div>
        <p>No game plans yet. Create one before your next match!</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    ${addBtn}
    ${gamePlans.map(gp => `
      <div style="background:var(--bg-card);border:1px solid rgba(12,64,112,0.3);border-radius:var(--radius);padding:20px;margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:16px">
          <div>
            <div style="font-family:var(--font-display);font-size:1.2rem;font-weight:800">
              🎯 vs ${gp.opponent || 'TBD'}
            </div>
            <div style="font-size:0.8rem;color:var(--gray-300)">
              ${gp.date || ''} ${gp.season ? `· ${gp.season}` : ''}
            </div>
          </div>
          <button class="btn btn-ghost" style="font-size:0.75rem;padding:4px 10px"
            onclick="requireAdmin(() => openGamePlanForm(${gp.id}))">✏️ Edit</button>
        </div>
        ${gp.offense ? `
          <div style="margin-bottom:14px">
            <div style="font-family:var(--font-display);font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--blue-light);margin-bottom:6px">⚡ Offense</div>
            <div style="font-size:0.88rem;color:var(--gray-300);line-height:1.6;white-space:pre-line">${gp.offense}</div>
          </div>
        ` : ''}
        ${gp.defense ? `
          <div style="margin-bottom:14px">
            <div style="font-family:var(--font-display);font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--blue-light);margin-bottom:6px">🛡️ Defense</div>
            <div style="font-size:0.88rem;color:var(--gray-300);line-height:1.6;white-space:pre-line">${gp.defense}</div>
          </div>
        ` : ''}
        ${gp.mindset ? `
          <div style="margin-bottom:14px">
            <div style="font-family:var(--font-display);font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--blue-light);margin-bottom:6px">🧠 Mindset</div>
            <div style="font-size:0.88rem;color:var(--gray-300);line-height:1.6;white-space:pre-line">${gp.mindset}</div>
          </div>
        ` : ''}
        ${gp.review ? `
          <div style="border-top:1px solid rgba(12,64,112,0.3);padding-top:14px;margin-top:4px">
            <div style="font-family:var(--font-display);font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--gold);margin-bottom:6px">📋 Post-Game Review</div>
            <div style="font-size:0.88rem;color:var(--gray-300);line-height:1.6;white-space:pre-line">${gp.review}</div>
          </div>
        ` : ''}
      </div>
    `).join('')}
  `;
}

function openGamePlanForm(id) {
  const existing = id ? DB.getGamePlans().find(g => g.id === id) : null;
  const overlay  = document.getElementById('adminOverlay');
  const content  = document.getElementById('adminContent');
  overlay.classList.add('open');

  content.innerHTML = `
    <div class="admin-modal">
      <button class="btn btn-ghost" style="margin-bottom:16px;font-size:0.8rem"
        onclick="closeAdmin()">← Back</button>
      <h2>${existing ? '✏️ Edit Game Plan' : '🎯 New Game Plan'}</h2>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">Opponent</label>
          <input class="form-input" id="gp-opp" value="${existing?.opponent || ''}" placeholder="Team name" /></div>
        <div class="form-group"><label class="form-label">Date</label>
          <input class="form-input" type="date" id="gp-date" value="${existing?.date || ''}" /></div>
      </div>
      <div class="form-group"><label class="form-label">Season</label>
        <input class="form-input" id="gp-season" value="${existing?.season || ''}" placeholder="e.g. Spring 2025" /></div>
      <div class="form-group"><label class="form-label">⚡ Offense</label>
        <textarea class="form-textarea" id="gp-offense" style="min-height:100px" placeholder="Offensive strategy and plays to use...">${existing?.offense || ''}</textarea></div>
      <div class="form-group"><label class="form-label">🛡️ Defense</label>
        <textarea class="form-textarea" id="gp-defense" style="min-height:100px" placeholder="Defensive strategy and coverages...">${existing?.defense || ''}</textarea></div>
      <div class="form-group"><label class="form-label">🧠 Mindset</label>
        <textarea class="form-textarea" id="gp-mindset" style="min-height:80px" placeholder="Team focus, key points, motivation...">${existing?.mindset || ''}</textarea></div>
      <div class="form-group"><label class="form-label">📋 Post-Game Review <span style="color:var(--gray-500);font-weight:400">(fill after the match)</span></label>
        <textarea class="form-textarea" id="gp-review" style="min-height:100px" placeholder="What worked, what didn't, key takeaways...">${existing?.review || ''}</textarea></div>
      <div class="btn-row">
        <button class="btn btn-primary" onclick="saveGamePlan(${id || 'null'})">
          ${existing ? 'Save Changes' : 'Publish Game Plan'}
        </button>
        ${existing ? `<button class="btn btn-danger" onclick="deleteGamePlan(${id})">Delete</button>` : ''}
        <button class="btn btn-ghost" onclick="closeAdmin()">Cancel</button>
      </div>
    </div>
  `;
}

function saveGamePlan(id) {
  const opp     = document.getElementById('gp-opp')?.value.trim();
  const date    = document.getElementById('gp-date')?.value;
  const season  = document.getElementById('gp-season')?.value.trim();
  const offense = document.getElementById('gp-offense')?.value.trim();
  const defense = document.getElementById('gp-defense')?.value.trim();
  const mindset = document.getElementById('gp-mindset')?.value.trim();
  const review  = document.getElementById('gp-review')?.value.trim();

  if (!opp) { showToast('Enter an opponent', 'error'); return; }

  const gamePlans = DB.getGamePlans();

  if (id) {
    const idx = gamePlans.findIndex(g => g.id === id);
    if (idx !== -1) {
      gamePlans[idx] = { ...gamePlans[idx], opponent: opp, date, season, offense, defense, mindset, review };
    }
  } else {
    gamePlans.push({ id: Date.now(), opponent: opp, date, season, offense, defense, mindset, review });
  }

  DB.saveGamePlans(gamePlans);
  showToast(id ? 'Game Plan updated!' : 'Game Plan published!');
  closeAdmin();
  renderGamePlan();
}

function deleteGamePlan(id) {
  if (!confirm('Delete this game plan permanently?')) return;
  DB.saveGamePlans(DB.getGamePlans().filter(g => g.id !== id));
  showToast('Game Plan deleted');
  closeAdmin();
  renderGamePlan();
}

// ═══════════════════════════════════════════════════
//  PLAYBOOK
// ═══════════════════════════════════════════════════

function openSectionForm(existingName) {
  const overlay = document.getElementById('adminOverlay');
  const content = document.getElementById('adminContent');
  overlay.classList.add('open');

  // Get existing sections
  const playbook  = DB.getPlaybook();
  const sections  = [...new Set(playbook.map(p => p.section || 'General'))];

  content.innerHTML = `
    <div class="admin-modal">
      <button class="btn btn-ghost" style="margin-bottom:16px;font-size:0.8rem"
        onclick="closeAdmin()">← Back</button>
      <h2>📋 ${existingName ? 'Rename Section' : 'Add Section'}</h2>
      ${existingName ? `
        <div class="form-group">
          <label class="form-label">Current Name</label>
          <div style="font-family:var(--font-display);font-size:1rem;font-weight:700;color:var(--blue-light)">${existingName}</div>
        </div>
      ` : ''}
      <div class="form-group">
        <label class="form-label">${existingName ? 'New Name' : 'Section Name'}</label>
        <input class="form-input" id="sec-name" value="${existingName || ''}" placeholder="e.g. Short Routes, Red Zone..." />
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" onclick="saveSection('${existingName || ''}')">
          ${existingName ? 'Rename' : 'Add Section'}
        </button>
        ${existingName ? `
          <button class="btn btn-danger" onclick="deleteSection('${existingName}')">Delete Section</button>
        ` : ''}
        <button class="btn btn-ghost" onclick="closeAdmin()">Cancel</button>
      </div>
      <div style="margin-top:20px">
        <div class="section-title" style="font-size:1rem">Existing Sections</div>
        ${sections.map(s => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(12,64,112,0.2)">
            <span style="font-size:0.9rem">📋 ${s}</span>
            <button class="btn btn-ghost" style="font-size:0.72rem;padding:4px 10px"
              onclick="openSectionForm('${s}')">✏️</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function saveSection(oldName) {
  const newName = document.getElementById('sec-name')?.value.trim();
  if (!newName) { showToast('Enter a section name', 'error'); return; }

  const playbook = DB.getPlaybook();
  const sections = DB.getPlaybookSections();

  if (oldName) {
    // Rename in plays
    playbook.forEach(play => {
      if (play.section === oldName) play.section = newName;
    });
    DB.savePlaybook(playbook);
    // Rename in sections list
    const idx = sections.indexOf(oldName);
    if (idx !== -1) sections[idx] = newName;
  } else {
    // Add new section
    if (!sections.includes(newName)) sections.push(newName);
  }

  DB.savePlaybookSections(sections);
  showToast(oldName ? 'Section renamed!' : 'Section added!');
  closeAdmin();
  renderPlaybook();
}

function deleteSection(sectionName) {
  if (!confirm(`Delete section "${sectionName}" and all its plays?`)) return;
  const playbook = DB.getPlaybook().filter(p => p.section !== sectionName);
  const sections = DB.getPlaybookSections().filter(s => s !== sectionName);
  DB.savePlaybook(playbook);
  DB.savePlaybookSections(sections);
  showToast('Section deleted');
  closeAdmin();
  renderPlaybook();
}

function openPlayForm(id) {
  const existing = id ? DB.getPlaybook().find(p => p.id === id) : null;
  const sections = DB.getPlaybookSections();
  const overlay  = document.getElementById('adminOverlay');
  const content  = document.getElementById('adminContent');
  overlay.classList.add('open');

  content.innerHTML = `
    <div class="admin-modal">
      <button class="btn btn-ghost" style="margin-bottom:16px;font-size:0.8rem"
        onclick="closeAdmin()">← Back</button>
      <h2>${existing ? '✏️ Edit Play' : '🏈 Add Play'}</h2>
      <div class="form-group"><label class="form-label">Play Name</label>
        <input class="form-input" id="pl-name" value="${existing?.name || ''}" placeholder="e.g. Slant & Go" /></div>
      <div class="form-group"><label class="form-label">Section</label>
        <select class="form-select" id="pl-section">
          ${sections.map(s => `
            <option value="${s}" ${existing?.section === s ? 'selected' : ''}>${s}</option>
          `).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">🎯 Objective</label>
        <input class="form-input" id="pl-objective" value="${existing?.objective || ''}" placeholder="e.g. Beat man coverage deep" /></div>
      <div class="form-group"><label class="form-label">📝 Description</label>
        <textarea class="form-textarea" id="pl-desc" style="min-height:100px" placeholder="Explain the play, routes, timing...">${existing?.description || ''}</textarea></div>
      <div class="form-group"><label class="form-label">🖼️ Image URL (optional)</label>
        <input class="form-input" id="pl-img" value="${existing?.imageUrl || ''}" placeholder="https://i.imgur.com/..." />
        <p style="font-size:0.75rem;color:var(--gray-500);margin-top:4px">Upload to <a href="https://imgur.com" target="_blank" style="color:var(--blue-light)">imgur.com</a> and paste the direct link.</p>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" onclick="savePlay(${id || 'null'})">
          ${existing ? 'Save Changes' : 'Add Play'}
        </button>
        ${existing ? `<button class="btn btn-danger" onclick="deletePlay(${id})">Delete</button>` : ''}
        <button class="btn btn-ghost" onclick="closeAdmin()">Cancel</button>
      </div>
    </div>
  `;
}

function savePlay(id) {
  const name      = document.getElementById('pl-name')?.value.trim();
  const section   = document.getElementById('pl-section')?.value;
  const objective = document.getElementById('pl-objective')?.value.trim();
  const desc      = document.getElementById('pl-desc')?.value.trim();
  const imageUrl  = document.getElementById('pl-img')?.value.trim();
  if (!name) { showToast('Enter a play name', 'error'); return; }
  if (!section) { showToast('Select a section', 'error'); return; }

  const playbook = DB.getPlaybook();

  if (id) {
    const idx = playbook.findIndex(p => p.id === id);
    if (idx !== -1) {
      playbook[idx] = { ...playbook[idx], name, section, objective, description: desc, imageUrl };
    }
  } else {
    playbook.push({ id: Date.now(), name, section, objective, description: desc, imageUrl });
  }

  DB.savePlaybook(playbook);
  showToast(id ? 'Play updated!' : 'Play added!');
  closeAdmin();
  renderPlaybook();
}

function deletePlay(id) {
  if (!confirm('Delete this play?')) return;
  DB.savePlaybook(DB.getPlaybook().filter(p => p.id !== id));
  showToast('Play deleted');
  closeAdmin();
  renderPlaybook();
}