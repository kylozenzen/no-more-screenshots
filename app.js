'use strict';

/*
  No More Screenshots — Calendar Standalone
  Goal: PostIQ's Plan calendar + Share Snapshot as its own thing.
  No composer. No approvals. No strategy tools.
*/

const STORE_KEY = 'nms_calendar_buffer_token';
const STATE_KEY = 'nms_calendar_state_v1';

const qs = id => document.getElementById(id);
const app = qs('app');
const toastWrap = qs('toastWrap');

const state = loadState() || {
  scheduled: [],
  notes: {},
  month: new Date().toISOString(),
  calendarFilter: 'all',
  title: '',
  message: '',
  includeNotes: true,
  shareLink: '',
  token: ''
};

function samplePosts() {
  return [
    {
      id: 'sample-1',
      dueAt: '2026-06-03T09:00:00',
      text: 'A behind-the-scenes look at the summer campaign setup. Clean enough for the client. Human enough for the internet.',
      platform: 'Instagram',
      channelName: 'Client Instagram',
      status: 'scheduled'
    },
    {
      id: 'sample-2',
      dueAt: '2026-06-04T13:30:00',
      text: 'Most content calendars fail because they organize posts, not decisions. Here is the cleaner way we are sharing what is planned this month.',
      platform: 'LinkedIn',
      channelName: 'Company Page',
      status: 'scheduled'
    },
    {
      id: 'sample-3',
      dueAt: '2026-06-06T11:15:00',
      text: 'POV: the content calendar is finally shareable without screenshots, a PDF, and one emotionally damaged spreadsheet.',
      platform: 'TikTok',
      channelName: 'Client TikTok',
      status: 'scheduled'
    }
  ];
}

function uid() {
  return 'nms_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function safeText(v) {
  return String(v || '').replace(/[&<>"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]));
}
function compact(v, max = 70) {
  const t = String(v || '').trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}
function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}
function monthDate() {
  return new Date(state.month || new Date().toISOString());
}
function monthLabel(d) {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
function formatDateTime(value) {
  if (!value) return 'Unscheduled';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
}
function formatDateOnly(key) {
  const d = new Date(key + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}
function monthRangeLabel(d) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}
function saveState() {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch {}
}
function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function showToast(msg) {
  if (!toastWrap) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  toastWrap.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
async function copyTextSafe(text) {
  try {
    await navigator.clipboard.writeText(String(text || ''));
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = String(text || '');
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}
const SNAP_ADJECTIVES = ['clean','tidy','sunny','brisk','golden','clever','quiet','vivid'];
const SNAP_NOUNS = ['calendar','signal','plan','window','brief','map','view','link'];
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function generateSnapshotId() { return `${pick(SNAP_ADJECTIVES)}-${pick(SNAP_NOUNS)}-${Math.random().toString(36).slice(2, 6)}`; }
function toBase64Url(str) {
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromBase64Url(str) {
  const normalized = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return decodeURIComponent(escape(atob(padded)));
}

function currentPosts() {
  const m = monthDate();
  return state.scheduled.filter(p => {
    const d = new Date(p.dueAt);
    if (Number.isNaN(d.getTime())) return false;
    if (state.calendarFilter !== 'all') {
      const value = `${p.platform || ''} ${p.channelName || ''}`.toLowerCase();
      if (!value.includes(state.calendarFilter.toLowerCase())) return false;
    }
    return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
  });
}

function postsByDate(posts = currentPosts()) {
  return posts.reduce((map, p) => {
    const d = new Date(p.dueAt);
    if (Number.isNaN(d.getTime())) return map;
    const key = fmtDate(d);
    (map[key] ||= []).push(p);
    return map;
  }, {});
}

function notesForDate(key) {
  return Array.isArray(state.notes?.[key]) ? state.notes[key] : [];
}

function buildSnapshotPayload() {
  const m = monthDate();
  const posts = currentPosts();
  const includeNotes = !!state.includeNotes;
  const rangeNotes = includeNotes
    ? Object.entries(state.notes || {})
      .filter(([key]) => {
        const d = new Date(key + 'T12:00:00');
        return !Number.isNaN(d.getTime()) && d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
      })
      .flatMap(([date, list]) => (Array.isArray(list) ? list : []).map(n => ({ ...n, date })))
    : [];
  const label = monthLabel(m);
  const title = (state.title || '').trim() || `${label} content plan`;
  return {
    snapshotId: generateSnapshotId(),
    createdAt: Date.now(),
    period: 'month',
    month: label,
    monthRange: monthRangeLabel(m),
    title,
    message: (state.message || '').trim(),
    includeNotes,
    posts: posts.map(p => ({
      id: p.id,
      dueAt: p.dueAt,
      text: p.text,
      platform: p.platform,
      channelName: p.channelName,
      status: p.status || 'scheduled'
    })),
    notes: rangeNotes
  };
}

function shareSnapshot() {
  const payload = buildSnapshotPayload();
  const encoded = toBase64Url(JSON.stringify(payload));
  state.shareLink = location.origin + location.pathname + '#share=' + payload.snapshotId + '.' + encoded;
  saveState();
  renderApp();
  showToast('Snapshot link ready');
  return state.shareLink;
}

async function copyShareLink() {
  const link = state.shareLink || shareSnapshot();
  const ok = await copyTextSafe(link);
  showToast(ok ? 'Copied link' : 'Could not copy link');
}

function openShareLink() {
  const link = state.shareLink || shareSnapshot();
  window.open(link, '_blank', 'noopener,noreferrer');
}

function parseSharedSnapshotFromHash() {
  if (!location.hash.startsWith('#share=')) return null;
  const raw = location.hash.slice(7);
  const dot = raw.indexOf('.');
  const encoded = dot >= 0 ? raw.slice(dot + 1) : raw;
  return JSON.parse(fromBase64Url(encoded));
}

function renderApp() {
  const shared = parseSharedSnapshotFromHash();
  if (shared) return renderSharedView(shared);

  app.className = 'app';
  const token = state.token || localStorage.getItem(STORE_KEY) || '';
  app.innerHTML = `
    <aside class="side">
      <div class="side-logo">
        <div class="logo-mark">No More Screenshots <span class="logo-beta">Calendar</span></div>
      </div>

      <div class="connection-card">
        <div class="conn-row">
          <div class="conn-dot ${token ? 'on' : ''}"></div>
          <span class="conn-label">${token ? 'Buffer token saved' : 'Not connected'}</span>
        </div>
        <h2 class="conn-heading">${token ? 'Calendar ready' : 'Calendar standalone'}</h2>
        <p class="conn-helper">This is the PostIQ Plan/calendar feature as its own shareable snapshot tool.</p>
        <details class="advanced-panel">
          <summary>Advanced Buffer import</summary>
          <p class="advanced-helper">Optional: import scheduled posts from Buffer using your token.</p>
          <div class="field">
            <label class="label" for="tokenInput">Buffer token</label>
            <input id="tokenInput" class="input" type="password" value="${safeText(token)}" placeholder="Paste Buffer token" />
          </div>
          <button class="btn primary full" id="syncBtn">Import scheduled posts</button>
        </details>
      </div>

      <div class="side-actions">
        <button class="btn full" id="sampleBtn">Load sample calendar</button>
        <label class="btn full" for="csvFile">Upload CSV</label>
        <input id="csvFile" type="file" accept=".csv" class="hidden" />
        <a class="btn ghost full csv-helper-link" href="./sample-calendar.csv" download>Download sample CSV</a>
        <button class="btn full" id="addPostBtn">Add post</button>
        <button class="btn full" id="addNoteBtn">Add note</button>
      </div>
      <div class="csv-help">
        <div class="csv-help-title">Accepted columns</div>
        <div class="csv-help-cols">date, time, platform, channel name, caption, status</div>
      </div>

      <div class="side-note">
        No composer, approvals, comments, or deal tracking. Just the calendar and clean Snapshot link.
      </div>
    </aside>

    <main class="main">
      <section class="view">
        <div class="page-hdr">
          <div>
            <h1 class="page-title">Plan</h1>
            <p class="page-desc">Your content calendar in a monthly view. Click a day to view the posts and notes. Generate a clean read-only snapshot when ready.</p>
          </div>
          <div class="page-actions">
            <button class="btn" id="shareBtn">Share snapshot</button>
            <button class="btn ghost" id="resetBtn">Reset</button>
          </div>
        </div>

        <div class="calendar-shell">
          <div class="cal-header">
            <button class="btn sm ghost" id="prevMonth">‹</button>
            <div class="cal-month-label" id="monthLabel">${safeText(monthLabel(monthDate()))}</div>
            <button class="btn sm ghost" id="nextMonth">›</button>
            <button class="btn sm ghost" id="todayMonth">Today</button>
          </div>

          <div class="cal-filter-row">
            <label class="label" for="calendarFilter" style="margin:0;">Show</label>
            <select id="calendarFilter" class="input" style="max-width:220px;">${filterOptionsHtml()}</select>
          </div>

          <div class="cal-dow">
            <div class="dow-cell">Sun</div><div class="dow-cell">Mon</div><div class="dow-cell">Tue</div><div class="dow-cell">Wed</div><div class="dow-cell">Thu</div><div class="dow-cell">Fri</div><div class="dow-cell">Sat</div>
          </div>
          <div class="cal-grid" id="calGrid">${calendarGridHtml()}</div>
          <div class="cal-agenda" id="calAgenda">${agendaHtml()}</div>

          ${currentPosts().length ? '' : `<div class="empty-state" style="margin-top:16px;">
            <div class="empty-title">Create your first calendar Snapshot</div>
            <div class="empty-desc">Load sample posts, upload a CSV, add a post manually, or import scheduled posts from Buffer.</div>
            <div class="empty-cta-row">
              <button class="btn" id="emptySampleBtn">Load sample calendar</button>
              <label class="btn" for="csvFile">Upload CSV</label>
              <button class="btn" id="emptyAddPostBtn">Add post</button>
              <button class="btn ghost" id="emptyBufferBtn">Advanced Buffer import</button>
            </div>
          </div>`}
        </div>
      </section>
    </main>

    ${modalHtml()}
  `;

  bindEvents();
}

function filterOptionsHtml() {
  const labels = Array.from(new Set(state.scheduled.flatMap(p => [p.platform, p.channelName]).filter(Boolean)));
  return `<option value="all">All platforms/channels</option>` + labels.map(label => `<option value="${safeText(label)}" ${state.calendarFilter === label ? 'selected' : ''}>${safeText(label)}</option>`).join('');
}

function calendarGridHtml() {
  const m = monthDate();
  const first = new Date(m.getFullYear(), m.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const todayKey = fmtDate(new Date());
  const map = postsByDate();
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = fmtDate(d);
    const posts = map[key] || [];
    const notes = notesForDate(key);
    const has = posts.length || notes.length;
    const cls = ['cal-day'];
    if (d.getMonth() !== m.getMonth()) cls.push('other-month');
    if (key === todayKey) cls.push('today');
    if (posts.length) cls.push('has-posts');
    cells.push(`<div class="${cls.join(' ')}" data-day="${key}">
      <div class="day-header"><span class="day-num">${d.getDate()}</span></div>
      ${posts.length ? `<div class="day-count">${posts.length}</div>` : ''}
      ${posts.slice(0,2).map(p => `<div class="day-post-pill">${safeText(compact(p.text, 64))}</div>`).join('')}
      ${notes.slice(0,1).map(n => `<div class="day-note-pill">${safeText(compact(n.text, 54))}</div>`).join('')}
      ${posts.length > 2 ? `<div class="more-indicator">+${posts.length - 2} more</div>` : ''}
    </div>`);
  }
  return cells.join('');
}

function agendaHtml() {
  const map = postsByDate();
  const noteEntries = Object.entries(state.notes || {}).filter(([key]) => notesForDate(key).length);
  const keys = Array.from(new Set([...Object.keys(map), ...noteEntries.map(([k]) => k)])).sort();
  if (!keys.length) return `<div class="empty-state"><div class="empty-title">No posts to show</div></div>`;
  return keys.map(key => {
    const posts = map[key] || [];
    const notes = notesForDate(key);
    return `<div class="agenda-day" data-day="${key}">
      <div class="agenda-date">${safeText(formatDateOnly(key))}</div>
      ${posts.map(p => `<div class="agenda-post">${safeText(p.platform || 'Post')} · ${safeText(compact(p.text, 100))}</div>`).join('')}
      ${notes.map(n => `<div class="agenda-post" style="background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.2);color:#92600a;">Note · ${safeText(compact(n.text, 100))}</div>`).join('')}
    </div>`;
  }).join('');
}

function modalHtml() {
  return `
    <div class="modal" id="dayModal">
      <div class="modal-card lg">
        <div class="modal-hdr">
          <div class="modal-title" id="dayModalTitle">Day details</div>
          <button class="btn sm ghost" id="closeDayModal">Close</button>
        </div>
        <div id="dayModalBody"></div>
      </div>
    </div>

    <div class="modal" id="shareModal">
      <div class="modal-card">
        <div class="modal-hdr">
          <div class="modal-title">Share snapshot</div>
          <button class="btn sm ghost" id="closeShareModal">Close</button>
        </div>
        <div class="field">
          <label class="label" for="shareTitle">Snapshot title</label>
          <input id="shareTitle" class="input" value="${safeText(state.title || `${monthLabel(monthDate())} content plan`)}" />
        </div>
        <div class="field">
          <label class="label" for="shareMessage">Optional message</label>
          <textarea id="shareMessage" placeholder="Add a quick note for the person viewing this calendar.">${safeText(state.message || '')}</textarea>
        </div>
        <div class="share-meta-line">Month range: <strong>${safeText(monthRangeLabel(monthDate()))}</strong></div>
        <label class="row" style="margin-bottom:12px;color:var(--muted);font-weight:600;">
          <input type="checkbox" id="includeNotes" ${state.includeNotes ? 'checked' : ''} />
          Include planning notes
        </label>
        <p class="share-explainer">This creates a read-only calendar link. No login required.</p>
        <div class="row">
          <button class="btn primary" id="generateShare">Generate Link</button>
          <button class="btn" id="copyShare">Copy Link</button>
          <button class="btn ghost" id="openShare">Open Preview</button>
        </div>
        <div id="shareSuccess" class="share-success ${state.shareLink ? 'show' : ''}">Snapshot ready. Send this link instead of screenshots.</div>
        <div class="share-link-box" id="shareLinkBox">${safeText(state.shareLink || 'Generate a link first.')}</div>
      </div>
    </div>

    <div class="modal" id="editModal">
      <div class="modal-card">
        <div class="modal-hdr">
          <div class="modal-title" id="editModalTitle">Add post</div>
          <button class="btn sm ghost" id="closeEditModal">Close</button>
        </div>
        <div class="cols2">
          <div class="field"><label class="label" for="postDate">Date</label><input class="input" id="postDate" type="date" /></div>
          <div class="field"><label class="label" for="postTime">Time</label><input class="input" id="postTime" type="time" value="09:00" /></div>
        </div>
        <div class="cols2">
          <div class="field"><label class="label" for="postPlatform">Platform</label><input class="input" id="postPlatform" value="Instagram" /></div>
          <div class="field"><label class="label" for="postChannel">Channel</label><input class="input" id="postChannel" placeholder="Client Instagram" /></div>
        </div>
        <div class="field"><label class="label" for="postText">Post copy</label><textarea id="postText"></textarea></div>
        <button class="btn primary" id="savePost">Save post</button>
      </div>
    </div>

    <div class="modal" id="noteModal">
      <div class="modal-card">
        <div class="modal-hdr">
          <div class="modal-title">Add planning note</div>
          <button class="btn sm ghost" id="closeNoteModal">Close</button>
        </div>
        <div class="field"><label class="label" for="noteDate">Date</label><input class="input" id="noteDate" type="date" /></div>
        <div class="field"><label class="label" for="noteText">Note</label><textarea id="noteText"></textarea></div>
        <button class="btn primary" id="saveNote">Save note</button>
      </div>
    </div>
  `;
}

function bindEvents() {
  qs('tokenInput')?.addEventListener('input', e => {
    state.token = e.target.value.trim();
    localStorage.setItem(STORE_KEY, state.token);
    saveState();
  });
  qs('syncBtn')?.addEventListener('click', syncFromBuffer);
  qs('sampleBtn')?.addEventListener('click', () => {
    loadSampleCalendar();
  });
  qs('csvFile')?.addEventListener('change', handleCsvUpload);
  qs('addPostBtn')?.addEventListener('click', () => openEditPost());
  qs('emptySampleBtn')?.addEventListener('click', () => loadSampleCalendar());
  qs('emptyAddPostBtn')?.addEventListener('click', () => openEditPost());
  qs('emptyBufferBtn')?.addEventListener('click', () => {
    document.querySelector('.advanced-panel')?.setAttribute('open', '');
    qs('tokenInput')?.focus();
  });
  qs('addNoteBtn')?.addEventListener('click', () => openNoteModal());
  qs('shareBtn')?.addEventListener('click', () => openModal('shareModal'));
  qs('resetBtn')?.addEventListener('click', () => {
    localStorage.removeItem(STATE_KEY);
    location.hash = '';
    location.reload();
  });
  qs('prevMonth')?.addEventListener('click', () => changeMonth(-1));
  qs('nextMonth')?.addEventListener('click', () => changeMonth(1));
  qs('todayMonth')?.addEventListener('click', () => {
    state.month = new Date().toISOString();
    saveState();
    renderApp();
  });
  qs('calendarFilter')?.addEventListener('change', e => {
    state.calendarFilter = e.target.value;
    saveState();
    renderApp();
  });
  document.querySelectorAll('[data-day]').forEach(el => {
    el.addEventListener('click', () => openDayDetails(el.dataset.day));
  });
  qs('closeDayModal')?.addEventListener('click', () => closeModal('dayModal'));
  qs('closeShareModal')?.addEventListener('click', () => closeModal('shareModal'));
  qs('closeEditModal')?.addEventListener('click', () => closeModal('editModal'));
  qs('closeNoteModal')?.addEventListener('click', () => closeModal('noteModal'));
  qs('generateShare')?.addEventListener('click', () => {
    state.title = qs('shareTitle').value.trim();
    state.message = qs('shareMessage').value.trim();
    state.includeNotes = qs('includeNotes').checked;
    const link = shareSnapshot();
    qs('shareLinkBox').textContent = link;
    qs('shareSuccess')?.classList.add('show');
  });
  qs('copyShare')?.addEventListener('click', copyShareLink);
  qs('openShare')?.addEventListener('click', openShareLink);
  qs('savePost')?.addEventListener('click', savePostFromModal);
  qs('saveNote')?.addEventListener('click', saveNoteFromModal);
}
function loadSampleCalendar() {
  state.scheduled = samplePosts();
  state.month = new Date('2026-06-01T12:00:00').toISOString();
  state.shareLink = '';
  saveState();
  renderApp();
  showToast('Sample calendar loaded');
}

function openModal(id) { qs(id)?.classList.add('open'); }
function closeModal(id) { qs(id)?.classList.remove('open'); }
function changeMonth(delta) {
  const m = monthDate();
  m.setMonth(m.getMonth() + delta);
  state.month = m.toISOString();
  saveState();
  renderApp();
}

function openDayDetails(key) {
  const map = postsByDate();
  const posts = map[key] || [];
  const notes = notesForDate(key);
  qs('dayModalTitle').textContent = formatDateOnly(key);
  const sections = [];
  if (posts.length) {
    sections.push(`<div class="post-detail-label">${posts.length} scheduled post${posts.length === 1 ? '' : 's'}</div>`);
    posts.forEach(p => {
      sections.push(`<div class="detail-post">
        <div class="detail-post-hdr"><span>${safeText(p.platform || 'Post')} ${p.channelName ? '· ' + safeText(p.channelName) : ''}</span><span>${safeText(formatDateTime(p.dueAt))}</span></div>
        <div class="detail-post-copy">${safeText(p.text || '(no copy)')}</div>
      </div>`);
    });
  }
  if (notes.length) {
    sections.push(`<div class="post-detail-label">Planning notes</div>`);
    notes.forEach(n => sections.push(`<div class="detail-note">${safeText(n.text)}</div>`));
  }
  if (!posts.length && !notes.length) {
    sections.push(`<div class="empty-state"><div class="empty-title">No plans yet</div><div class="empty-desc">Add a post or planning note for this date.</div></div>`);
  }
  sections.push(`<div class="row" style="margin-top:14px;"><button class="btn" id="dayAddPost">Add post</button><button class="btn ghost" id="dayAddNote">Add note</button></div>`);
  qs('dayModalBody').innerHTML = sections.join('');
  openModal('dayModal');
  qs('dayAddPost')?.addEventListener('click', () => { closeModal('dayModal'); openEditPost(key); });
  qs('dayAddNote')?.addEventListener('click', () => { closeModal('dayModal'); openNoteModal(key); });
}

function openEditPost(dateKey = '') {
  qs('editModalTitle').textContent = 'Add post';
  qs('postDate').value = dateKey || fmtDate(monthDate());
  qs('postTime').value = '09:00';
  qs('postPlatform').value = 'Instagram';
  qs('postChannel').value = '';
  qs('postText').value = '';
  openModal('editModal');
}
function savePostFromModal() {
  const date = qs('postDate').value;
  const time = qs('postTime').value || '09:00';
  const text = qs('postText').value.trim();
  if (!date || !text) { showToast('Date and post copy are required'); return; }
  state.scheduled.push({
    id: uid(),
    dueAt: `${date}T${time}:00`,
    platform: qs('postPlatform').value.trim() || 'Post',
    channelName: qs('postChannel').value.trim(),
    text,
    status: 'scheduled'
  });
  state.shareLink = '';
  saveState();
  closeModal('editModal');
  renderApp();
  showToast('Post added');
}

function openNoteModal(dateKey = '') {
  qs('noteDate').value = dateKey || fmtDate(monthDate());
  qs('noteText').value = '';
  openModal('noteModal');
}
function saveNoteFromModal() {
  const date = qs('noteDate').value;
  const text = qs('noteText').value.trim();
  if (!date || !text) { showToast('Date and note are required'); return; }
  state.notes[date] ||= [];
  state.notes[date].push({ id: uid(), text });
  state.shareLink = '';
  saveState();
  closeModal('noteModal');
  renderApp();
  showToast('Note added');
}

function csvRows(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '"' && quoted && n === '"') { cell += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && n === '\n') i++;
      row.push(cell.trim()); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows;
}
function handleCsvUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const posts = parseCsv(String(reader.result || ''));
    if (!posts.length) { showToast('No posts found in CSV'); return; }
    state.scheduled = posts;
    const first = posts.find(p => p.dueAt)?.dueAt;
    if (first) state.month = new Date(first).toISOString();
    state.shareLink = '';
    saveState();
    renderApp();
    showToast(`${posts.length} posts imported`);
  };
  reader.readAsText(file);
}
function parseCsv(text) {
  const rows = csvRows(text).filter(r => r.some(Boolean));
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim().toLowerCase());
  return rows.slice(1).map(row => {
    const data = {};
    headers.forEach((h, i) => data[h] = row[i] || '');
    const date = data.date || data['publish date'] || data['scheduled date'] || '';
    const time = data.time || data['publish time'] || '09:00';
    return {
      id: uid(),
      dueAt: date ? `${date}T${time}:00` : '',
      platform: data.platform || data.channel || 'Post',
      channelName: data['channel name'] || data.account || '',
      text: data.caption || data.copy || data.text || data.post || '',
      status: data.status || 'scheduled'
    };
  }).filter(p => p.text || p.dueAt);
}

async function callBuffer(query, variables = {}) {
  const token = (qs('tokenInput')?.value || state.token || localStorage.getItem(STORE_KEY) || '').trim();
  if (!token) throw new Error('Paste a Buffer token first');
  state.token = token;
  localStorage.setItem(STORE_KEY, token);
  saveState();
  const response = await fetch('/.netlify/functions/buffer-proxy', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ token, query, variables })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.errors?.length) {
    throw new Error(data.errors?.[0]?.message || `Buffer request failed (${response.status})`);
  }
  return data;
}
async function syncFromBuffer() {
  try {
    showToast('Loading Buffer posts…');
    const orgData = await callBuffer('query { account { organizations { id name } } }');
    const organizationId = orgData?.data?.account?.organizations?.[0]?.id;
    if (!organizationId) throw new Error('No Buffer organization found');

    const channelsData = await callBuffer(
      'query C($organizationId: OrganizationId!) { channels(input:{organizationId:$organizationId}){ id displayName name service } }',
      { organizationId }
    );
    const channels = channelsData?.data?.channels || [];

    const postsData = await callBuffer(
      'query P($organizationId: OrganizationId!, $first: Int!) { posts(first:$first,input:{organizationId:$organizationId,filter:{status:[scheduled]}}){ edges { node { id text dueAt channelId } } pageInfo { hasNextPage endCursor } } }',
      { organizationId, first: 100 }
    );

    const edges = postsData?.data?.posts?.edges || [];
    const posts = edges.map(edge => {
      const node = edge.node || {};
      const channel = channels.find(c => c.id === node.channelId) || {};
      return {
        id: node.id || uid(),
        dueAt: node.dueAt || '',
        text: node.text || '',
        platform: channel.service || 'Buffer',
        channelName: channel.displayName || channel.name || '',
        status: 'scheduled'
      };
    }).filter(p => p.text || p.dueAt);

    if (!posts.length) throw new Error('No scheduled Buffer posts found');
    state.scheduled = posts;
    const first = posts.find(p => p.dueAt)?.dueAt;
    if (first) state.month = new Date(first).toISOString();
    state.shareLink = '';
    saveState();
    renderApp();
    showToast(`${posts.length} Buffer posts loaded`);
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Buffer sync failed');
  }
}

function renderSharedView(snap) {
  app.className = '';
  const posts = Array.isArray(snap.posts) ? snap.posts : [];
  const notes = snap.includeNotes !== false && Array.isArray(snap.notes) ? snap.notes : [];
  const base = getSharedBaseDate(snap);
  const map = {};
  posts.forEach(p => {
    const d = new Date(p.dueAt);
    if (Number.isNaN(d.getTime())) return;
    const key = fmtDate(d);
    map[key] ||= { posts: [], notes: [] };
    map[key].posts.push(p);
  });
  notes.forEach(n => {
    if (!n.date) return;
    map[n.date] ||= { posts: [], notes: [] };
    map[n.date].notes.push(n);
  });

  app.innerHTML = `
    <div class="public-shell">
      <section class="card public-hero">
        <div class="public-title">${safeText(snap.title || 'Content Plan')}</div>
        ${snap.message ? `<p class="public-message">${safeText(snap.message)}</p>` : ''}
        <div class="public-meta">${safeText(snap.month || monthLabel(base))} · ${safeText(snap.monthRange || monthRangeLabel(base))}</div>
        <div class="public-readonly">Read-only calendar</div>
      </section>
      <section class="calendar-shell">
        <div class="cal-header"><div class="cal-month-label">${safeText(snap.month || monthLabel(base))}</div></div>
        <div class="cal-dow"><div class="dow-cell">Sun</div><div class="dow-cell">Mon</div><div class="dow-cell">Tue</div><div class="dow-cell">Wed</div><div class="dow-cell">Thu</div><div class="dow-cell">Fri</div><div class="dow-cell">Sat</div></div>
        <div class="cal-grid">${sharedCalendarGridHtml(base, map)}</div>
        <div class="public-list-title">Posts by date</div>
        <div class="cal-agenda" style="display:grid;">${sharedAgendaHtml(map)}</div>
      </section>
      <p class="public-footer">Shared with No More Screenshots — the PostIQ-style calendar without the rest of the cockpit.</p>
    </div>
    ${modalHtml()}
  `;
  document.querySelectorAll('[data-day]').forEach(el => {
    el.addEventListener('click', () => openSharedDayDetails(el.dataset.day, map[el.dataset.day] || { posts: [], notes: [] }));
  });
  qs('closeDayModal')?.addEventListener('click', () => closeModal('dayModal'));
}
function getSharedBaseDate(snap) {
  if (snap.posts?.[0]?.dueAt) {
    const d = new Date(snap.posts[0].dueAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (snap.notes?.[0]?.date) {
    const d = new Date(snap.notes[0].date + 'T12:00:00');
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}
function sharedCalendarGridHtml(base, map) {
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = fmtDate(d);
    const data = map[key] || { posts: [], notes: [] };
    const cls = ['cal-day'];
    if (d.getMonth() !== base.getMonth()) cls.push('other-month');
    if (data.posts.length) cls.push('has-posts');
    cells.push(`<div class="${cls.join(' ')}" data-day="${key}">
      <div class="day-header"><span class="day-num">${d.getDate()}</span></div>
      ${data.posts.length ? `<div class="day-count">${data.posts.length}</div>` : ''}
      ${data.posts.slice(0,2).map(p => `<div class="day-post-pill">${safeText(compact(p.text, 64))}</div>`).join('')}
      ${data.notes.slice(0,1).map(n => `<div class="day-note-pill">${safeText(compact(n.text, 54))}</div>`).join('')}
    </div>`);
  }
  return cells.join('');
}
function sharedAgendaHtml(map) {
  const keys = Object.keys(map).sort();
  if (!keys.length) return `<div class="empty-state"><div class="empty-title">No posts in this snapshot</div></div>`;
  return keys.map(key => `<div class="agenda-day" data-day="${key}">
    <div class="agenda-date">${safeText(formatDateOnly(key))}</div>
    ${(map[key].posts || []).map(p => `<div class="agenda-post">
      <div><strong>${safeText(p.platform || 'Post')}</strong>${p.channelName ? ` · ${safeText(p.channelName)}` : ''}</div>
      <div>${safeText(formatDateTime(p.dueAt))}</div>
      <div>${safeText(p.text || '')}</div>
    </div>`).join('')}
    ${(map[key].notes || []).map(n => `<div class="agenda-post" style="background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.2);color:#92600a;">Note · ${safeText(compact(n.text, 100))}</div>`).join('')}
  </div>`).join('');
}
function openSharedDayDetails(key, data) {
  qs('dayModalTitle').textContent = formatDateOnly(key);
  const sections = [];
  if (data.posts?.length) {
    sections.push(`<div class="post-detail-label">${data.posts.length} scheduled post${data.posts.length === 1 ? '' : 's'}</div>`);
    data.posts.forEach(p => sections.push(`<div class="detail-post"><div class="detail-post-hdr"><span>${safeText(p.platform || 'Post')} ${p.channelName ? '· ' + safeText(p.channelName) : ''}</span><span>${safeText(formatDateTime(p.dueAt))}</span></div><div class="detail-post-copy">${safeText(p.text || '(no copy)')}</div></div>`));
  }
  if (data.notes?.length) {
    sections.push(`<div class="post-detail-label">Planning notes</div>`);
    data.notes.forEach(n => sections.push(`<div class="detail-note">${safeText(n.text)}</div>`));
  }
  if (!sections.length) sections.push(`<div class="empty-state"><div class="empty-title">No plans on this date</div></div>`);
  qs('dayModalBody').innerHTML = sections.join('');
  openModal('dayModal');
}

window.addEventListener('hashchange', renderApp);
renderApp();
