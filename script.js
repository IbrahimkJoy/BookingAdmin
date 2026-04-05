/* ═══════════════════════════════════════════════════════
   AIPSC Booking System — admin-script.js
   For: admin.html (Admin Panel)
═══════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────
   CONFIG
   ⚠️  Replace with your Google Apps Script
   Web App URL after deployment.
───────────────────────────────────────── */
const APPS_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';

/* ─────────────────────────────────────────
   ADMIN CREDENTIALS
   In production, move auth to the server side.
───────────────────────────────────────── */
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'aipsc2024',
};

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const BASE_SLOTS = ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30'];

const SLOT_LABELS = {
  '13:00': '1:00 PM', '13:30': '1:30 PM',
  '14:00': '2:00 PM', '14:30': '2:30 PM',
  '15:00': '3:00 PM', '15:30': '3:30 PM',
};

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  bookings:  'All Bookings',
  upcoming:  'Upcoming Meetings',
  settings:  'Settings & Block Slots',
};

const PER_PAGE = 8;

/* ─────────────────────────────────────────
   MUTABLE STATE
   (persisted in sessionStorage for demo)
───────────────────────────────────────── */
let ADMIN = {
  loggedIn: false,
  password: 'aipsc2024',
};

// Demo bookings — replace with Google Sheets fetch in production
let BOOKINGS = JSON.parse(sessionStorage.getItem('aipsc_bookings') || 'null') || [
  { id: 'BK001', name: 'Ahmed Al-Hassan',  email: 'ahmed@example.com',    phone: '+880 171 000 0001', date: 'Monday, 7 April 2025',    dateKey: '2025-04-07', slotKey: '13:00', timeGMT6: '1:00 PM GMT+6', timeLocal: '1:00 PM GMT+6',      notes: 'Want to discuss procurement strategy.',            status: 'confirmed', submittedAt: '2025-04-03T08:00:00Z' },
  { id: 'BK002', name: 'Fatima Noor',      email: 'fatima@corp.bd',        phone: '+880 181 000 0002', date: 'Monday, 7 April 2025',    dateKey: '2025-04-07', slotKey: '14:00', timeGMT6: '2:00 PM GMT+6', timeLocal: '2:00 PM GMT+6',      notes: '',                                                 status: 'confirmed', submittedAt: '2025-04-03T09:15:00Z' },
  { id: 'BK003', name: 'James Okafor',     email: 'james@gmail.com',       phone: '+234 803 000 0003', date: 'Tuesday, 8 April 2025',   dateKey: '2025-04-08', slotKey: '13:30', timeGMT6: '1:30 PM GMT+6', timeLocal: '10:30 AM GMT+3',     notes: 'Questions about supply chain certification.',      status: 'confirmed', submittedAt: '2025-04-03T10:00:00Z' },
  { id: 'BK004', name: 'Sara Malik',       email: 'sara.m@outlook.com',    phone: '+92 321 000 0004',  date: 'Wednesday, 9 April 2025', dateKey: '2025-04-09', slotKey: '15:00', timeGMT6: '3:00 PM GMT+6', timeLocal: '12:00 PM GMT+3',     notes: 'Follow-up from previous webinar.',                 status: 'cancelled', submittedAt: '2025-04-02T14:30:00Z' },
  { id: 'BK005', name: 'Mohamed Yusuf',    email: 'myusuf@institute.so',   phone: '+252 618 000 0005', date: 'Thursday, 10 April 2025', dateKey: '2025-04-10', slotKey: '14:30', timeGMT6: '2:30 PM GMT+6', timeLocal: '11:30 AM GMT+3',     notes: '',                                                 status: 'confirmed', submittedAt: '2025-04-03T11:45:00Z' },
  { id: 'BK006', name: 'Priya Sharma',     email: 'priya@company.in',      phone: '+91 98765 00006',   date: 'Sunday, 6 April 2025',   dateKey: '2025-04-06', slotKey: '13:00', timeGMT6: '1:00 PM GMT+6', timeLocal: '12:30 PM GMT+5:30',  notes: 'Interested in bulk training for the team.',        status: 'confirmed', submittedAt: '2025-04-01T07:20:00Z' },
];

let BLOCKED_GLOBAL_SLOTS = JSON.parse(sessionStorage.getItem('aipsc_blocked_slots') || '[]');
let BLOCKED_DATES         = JSON.parse(sessionStorage.getItem('aipsc_blocked_dates')  || '[]');

let currentPage    = 1;
let currentModalId = null;

/* ═══════════════════════════════════════════════════════
   PERSIST TO SESSION STORAGE
═══════════════════════════════════════════════════════ */
function persist() {
  sessionStorage.setItem('aipsc_bookings',       JSON.stringify(BOOKINGS));
  sessionStorage.setItem('aipsc_blocked_slots',  JSON.stringify(BLOCKED_GLOBAL_SLOTS));
  sessionStorage.setItem('aipsc_blocked_dates',  JSON.stringify(BLOCKED_DATES));
}

/* ═══════════════════════════════════════════════════════
   AUTHENTICATION
═══════════════════════════════════════════════════════ */
function doLogin() {
  const u   = document.getElementById('login-user').value.trim();
  const p   = document.getElementById('login-pass').value;
  const err = document.getElementById('login-error');

  if (u === ADMIN_CREDENTIALS.username && p === ADMIN.password) {
    err.style.display = 'none';
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-shell').classList.add('visible');
    ADMIN.loggedIn = true;
    initAdmin();
  } else {
    err.style.display = 'block';
    document.getElementById('login-pass').value = '';
    document.getElementById('login-pass').focus();
  }
}

function doLogout() {
  ADMIN.loggedIn = false;
  document.getElementById('admin-shell').classList.remove('visible');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
}

function togglePw() {
  const inp = document.getElementById('login-pass');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function changePassword() {
  const cur = document.getElementById('pw-current').value;
  const nw  = document.getElementById('pw-new').value;
  const cf  = document.getElementById('pw-confirm').value;

  if (cur !== ADMIN.password)  { adminToast('❌ Current password is incorrect.');    return; }
  if (nw.length < 6)           { adminToast('Password must be at least 6 characters.'); return; }
  if (nw !== cf)               { adminToast('New passwords do not match.');          return; }

  ADMIN.password = nw;
  ADMIN_CREDENTIALS.password = nw;
  ['pw-current', 'pw-new', 'pw-confirm'].forEach(id => {
    document.getElementById(id).value = '';
  });
  adminToast('✅ Password updated successfully.');
}

/* ═══════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════ */
function showPage(name, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${name}`).classList.add('active');
  if (btn) btn.classList.add('active');
  document.getElementById('topbar-title').textContent = PAGE_TITLES[name] || name;
  closeSidebar();

  // Page-specific render
  if (name === 'bookings')  { currentPage = 1; renderBookingsTable(); }
  if (name === 'upcoming')  renderUpcoming();
  if (name === 'settings')  renderSettings();
  if (name === 'dashboard') renderDashboard();
}

function openSidebar()  {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

/* ═══════════════════════════════════════════════════════
   INITIALISE
═══════════════════════════════════════════════════════ */
function initAdmin() {
  document.getElementById('topbar-date').textContent =
    new Date().toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  renderDashboard();
}

/* ═══════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════ */
function renderDashboard() {
  const confirmed = BOOKINGS.filter(b => b.status === 'confirmed');
  const cancelled = BOOKINGS.filter(b => b.status === 'cancelled');

  const now  = new Date(); now.setHours(0, 0, 0, 0);
  const in7  = new Date(now); in7.setDate(in7.getDate() + 7);
  const upcoming = confirmed.filter(b => {
    const d = new Date(b.dateKey);
    return d >= now && d <= in7;
  });

  document.getElementById('stat-total').textContent     = BOOKINGS.length;
  document.getElementById('stat-confirmed').textContent = confirmed.length;
  document.getElementById('stat-upcoming').textContent  = upcoming.length;
  document.getElementById('stat-cancelled').textContent = cancelled.length;

  // ── Weekly bar chart ──
  const chartEl      = document.getElementById('week-chart');
  chartEl.innerHTML  = '';
  const startOfWeek  = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());

  const weekCounts = Array(7).fill(0);
  confirmed.forEach(b => {
    const d    = new Date(b.dateKey);
    const diff = Math.floor((d - startOfWeek) / 86400000);
    if (diff >= 0 && diff < 7) weekCounts[diff]++;
  });

  const maxW = Math.max(...weekCounts, 1);
  weekCounts.forEach((c, i) => {
    const wrap = document.createElement('div'); wrap.className = 'chart-bar-wrap';
    const bar  = document.createElement('div'); bar.className  = 'chart-bar';
    bar.style.height = `${Math.round((c / maxW) * 44) + 4}px`;
    bar.title = `${DOW[i]}: ${c} booking${c !== 1 ? 's' : ''}`;
    const lbl = document.createElement('div'); lbl.className = 'chart-bar-label'; lbl.textContent = DOW[i];
    wrap.appendChild(bar); wrap.appendChild(lbl);
    chartEl.appendChild(wrap);
  });

  // ── Slot popularity ──
  const slotEl    = document.getElementById('slot-popularity');
  const slotCounts = {};
  BASE_SLOTS.forEach(s => slotCounts[s] = 0);
  confirmed.forEach(b => { if (slotCounts[b.slotKey] !== undefined) slotCounts[b.slotKey]++; });

  const maxS = Math.max(...Object.values(slotCounts), 1);
  slotEl.innerHTML = BASE_SLOTS.map(s => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
      <div style="min-width:60px;font-size:12px;color:var(--text-muted);font-weight:600">${SLOT_LABELS[s]}</div>
      <div style="flex:1;height:8px;background:var(--bg);border-radius:99px;overflow:hidden">
        <div style="height:100%;width:${Math.round((slotCounts[s] / maxS) * 100)}%;background:linear-gradient(90deg,var(--blue-light),var(--blue));border-radius:99px;transition:width 0.5s"></div>
      </div>
      <div style="font-size:12px;font-weight:700;color:var(--navy);min-width:16px">${slotCounts[s]}</div>
    </div>
  `).join('');

  // ── Recent 5 bookings ──
  const recent = [...BOOKINGS].reverse().slice(0, 5);
  document.getElementById('recent-tbody').innerHTML = recent.length
    ? recent.map(b => bookingRow(b, true)).join('')
    : `<tr><td colspan="5"><div class="empty-state"><p>No bookings yet.</p></div></td></tr>`;
}

/* ═══════════════════════════════════════════════════════
   ALL BOOKINGS TABLE
═══════════════════════════════════════════════════════ */
function filteredBookings() {
  const q  = (document.getElementById('search-input')  || {}).value?.toLowerCase() || '';
  const st = (document.getElementById('status-filter') || {}).value || '';
  const dt = (document.getElementById('date-filter')   || {}).value || '';

  const now = new Date(); now.setHours(0, 0, 0, 0);

  return BOOKINGS.filter(b => {
    // Text search
    if (q && !`${b.name}${b.email}${b.phone}`.toLowerCase().includes(q)) return false;
    // Status filter
    if (st && b.status !== st) return false;
    // Date range filter
    if (dt) {
      const d = new Date(b.dateKey);
      if (dt === 'today' && d.getTime() !== now.getTime()) return false;
      if (dt === 'week') {
        const w = new Date(now); w.setDate(now.getDate() + 7);
        if (d < now || d > w) return false;
      }
      if (dt === 'month') {
        if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
      }
    }
    return true;
  });
}

function renderBookingsTable() {
  const list  = filteredBookings();
  const start = (currentPage - 1) * PER_PAGE;
  const page  = list.slice(start, start + PER_PAGE);

  document.getElementById('all-tbody').innerHTML = page.length
    ? page.map((b, i) => bookingRow(b, false, start + i + 1)).join('')
    : `<tr><td colspan="7"><div class="empty-state">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
        <p>No bookings match your filters.</p>
       </div></td></tr>`;

  document.getElementById('table-info').textContent =
    `Showing ${Math.min(start + 1, list.length)}–${Math.min(start + PER_PAGE, list.length)} of ${list.length} bookings`;

  renderPagination(list.length);
}

/** Build a <tr> for a booking. compact = dashboard preview, full = all-bookings table. */
function bookingRow(b, compact = false, idx = null) {
  const badge = `<span class="badge badge-${b.status}"><span class="badge-dot"></span>${cap(b.status)}</span>`;

  if (compact) {
    return `<tr>
      <td><div class="td-name">${b.name}</div></td>
      <td>${b.date}</td>
      <td>${b.timeGMT6}</td>
      <td>${badge}</td>
      <td><div class="action-btns">
        <button class="btn-sm btn-view" onclick="openModal('${b.id}')">View</button>
        ${b.status === 'confirmed' ? `<button class="btn-sm btn-cancel" onclick="cancelBooking('${b.id}')">Cancel</button>` : ''}
      </div></td>
    </tr>`;
  }

  return `<tr>
    <td style="color:var(--text-muted);font-size:12px">${idx}</td>
    <td><div class="td-name">${b.name}</div><div class="td-email">${b.email}</div></td>
    <td class="td-phone">${b.phone}</td>
    <td style="font-size:13px">${b.date}</td>
    <td style="font-size:13px">${b.timeGMT6}</td>
    <td>${badge}</td>
    <td><div class="action-btns">
      <button class="btn-sm btn-view"   onclick="openModal('${b.id}')">View</button>
      ${b.status === 'confirmed' ? `<button class="btn-sm btn-cancel" onclick="cancelBooking('${b.id}')">Cancel</button>` : ''}
      <button class="btn-sm btn-delete" onclick="deleteBooking('${b.id}')" title="Delete permanently">✕</button>
    </div></td>
  </tr>`;
}

function renderPagination(total) {
  const pages = Math.ceil(total / PER_PAGE);
  const el    = document.getElementById('pagination');
  el.innerHTML = '';

  for (let i = 1; i <= pages; i++) {
    const btn = document.createElement('button');
    btn.className   = 'pg-btn' + (i === currentPage ? ' active' : '');
    btn.textContent = i;
    btn.onclick     = () => { currentPage = i; renderBookingsTable(); };
    el.appendChild(btn);
  }
}

/* ═══════════════════════════════════════════════════════
   UPCOMING MEETINGS
═══════════════════════════════════════════════════════ */
function renderUpcoming() {
  const now  = new Date(); now.setHours(0, 0, 0, 0);
  const list = BOOKINGS
    .filter(b => b.status === 'confirmed' && new Date(b.dateKey) >= now)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.slotKey.localeCompare(b.slotKey));

  const el = document.getElementById('upcoming-list');

  if (!list.length) {
    el.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
      <p>No upcoming meetings scheduled.</p>
    </div>`;
    return;
  }

  el.innerHTML = list.map(b => `
    <div class="upcoming-item">
      <div class="upcoming-time">
        <div class="time-gmt6">${b.timeGMT6.replace(' GMT+6', '')}</div>
        <div class="time-date">${b.dateKey}</div>
      </div>
      <div class="upcoming-divider"></div>
      <div class="upcoming-info">
        <div class="upcoming-name">${b.name}</div>
        <div class="upcoming-meta">${b.email} · ${b.phone}</div>
        ${b.notes ? `<div class="upcoming-meta" style="margin-top:3px;font-style:italic">"${b.notes.slice(0, 60)}${b.notes.length > 60 ? '…' : ''}"</div>` : ''}
      </div>
      <div class="action-btns">
        <button class="btn-sm btn-view"   onclick="openModal('${b.id}')">Details</button>
        <button class="btn-sm btn-cancel" onclick="cancelBooking('${b.id}')">Cancel</button>
      </div>
    </div>
  `).join('');
}

/* ═══════════════════════════════════════════════════════
   SETTINGS & SLOT MANAGEMENT
═══════════════════════════════════════════════════════ */
function renderSettings() {
  // Global slot toggle cards
  document.getElementById('block-slots-grid').innerHTML = BASE_SLOTS.map(s => {
    const blocked = BLOCKED_GLOBAL_SLOTS.includes(s);
    return `<div class="block-card ${blocked ? 'blocked' : ''}">
      <div>
        <div class="block-card-label">${SLOT_LABELS[s]} GMT+6</div>
        <div class="block-card-sub">${blocked ? 'Blocked – unavailable' : 'Available to book'}</div>
      </div>
      <button class="toggle ${blocked ? 'on' : ''}" onclick="toggleSlotBlock('${s}')"
        title="${blocked ? 'Unblock' : 'Block'} this slot"></button>
    </div>`;
  }).join('');

  renderBlockedDatesList();
}

function toggleSlotBlock(slot) {
  const idx = BLOCKED_GLOBAL_SLOTS.indexOf(slot);
  if (idx > -1) BLOCKED_GLOBAL_SLOTS.splice(idx, 1);
  else          BLOCKED_GLOBAL_SLOTS.push(slot);
  persist();
  renderSettings();
  adminToast(BLOCKED_GLOBAL_SLOTS.includes(slot)
    ? `Slot ${SLOT_LABELS[slot]} blocked.`
    : `Slot ${SLOT_LABELS[slot]} unblocked.`);
}

function addDateBlock() {
  const d = document.getElementById('block-date-input').value;
  const s = document.getElementById('block-slot-select').value;
  if (!d) { adminToast('Please select a date.'); return; }

  const key = s === 'all' ? `${d}:all` : `${d}:${s}`;
  if (BLOCKED_DATES.includes(key)) { adminToast('Already blocked.'); return; }

  BLOCKED_DATES.push(key);
  persist();
  renderBlockedDatesList();
  adminToast(`Blocked: ${d}${s === 'all' ? '' : ', ' + SLOT_LABELS[s]}`);
}

function removeBlock(key) {
  BLOCKED_DATES = BLOCKED_DATES.filter(k => k !== key);
  persist();
  renderBlockedDatesList();
  adminToast('Block removed.');
}

function renderBlockedDatesList() {
  const el = document.getElementById('blocked-dates-list');
  if (!BLOCKED_DATES.length) {
    el.innerHTML = '<span style="font-size:13px;color:var(--text-muted)">No dates blocked yet.</span>';
    return;
  }
  el.innerHTML = BLOCKED_DATES.map(k => {
    const [d, s] = k.split(':');
    const label  = s === 'all' ? `${d} · All day` : `${d} · ${SLOT_LABELS[s] || s}`;
    return `<div class="blocked-date-tag">
      ${label}
      <button onclick="removeBlock('${k}')" title="Remove">×</button>
    </div>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════
   BOOKING DETAIL MODAL
═══════════════════════════════════════════════════════ */
function openModal(id) {
  const b = BOOKINGS.find(x => x.id === id);
  if (!b) return;
  currentModalId = id;

  document.getElementById('modal-body').innerHTML = `
    <div class="detail-row"><div class="detail-label">Booking ID</div>
      <div class="detail-val" style="font-family:monospace;font-size:13px;color:var(--text-muted)">${b.id}</div></div>
    <div class="detail-row"><div class="detail-label">Full Name</div>   <div class="detail-val">${b.name}</div></div>
    <div class="detail-row"><div class="detail-label">Email</div>
      <div class="detail-val"><a href="mailto:${b.email}" style="color:var(--blue)">${b.email}</a></div></div>
    <div class="detail-row"><div class="detail-label">Phone</div>
      <div class="detail-val"><a href="tel:${b.phone}" style="color:var(--blue)">${b.phone}</a></div></div>
    <div class="detail-row"><div class="detail-label">Date</div>        <div class="detail-val">${b.date}</div></div>
    <div class="detail-row"><div class="detail-label">Time (GMT+6)</div><div class="detail-val">${b.timeGMT6}</div></div>
    ${b.timeLocal !== b.timeGMT6
      ? `<div class="detail-row"><div class="detail-label">Local Time</div><div class="detail-val">${b.timeLocal}</div></div>`
      : ''}
    <div class="detail-row"><div class="detail-label">Meeting Type</div><div class="detail-val">Google Meet</div></div>
    <div class="detail-row"><div class="detail-label">Status</div>
      <div class="detail-val"><span class="badge badge-${b.status}"><span class="badge-dot"></span>${cap(b.status)}</span></div></div>
    <div class="detail-row"><div class="detail-label">Notes</div>
      <div class="detail-val" style="font-style:italic;color:var(--text-muted)">${b.notes || '—'}</div></div>
    <div class="detail-row"><div class="detail-label">Submitted</div>
      <div class="detail-val">${new Date(b.submittedAt).toLocaleString()}</div></div>
  `;

  document.getElementById('modal-actions').innerHTML = b.status === 'confirmed'
    ? `<button class="btn-modal btn-modal-cancel" onclick="cancelBooking('${b.id}', true)">Cancel Booking</button>
       <button class="btn-modal btn-modal-close"  onclick="closeModal()">Close</button>`
    : `<button class="btn-modal btn-modal-close" onclick="closeModal()">Close</button>`;

  document.getElementById('detail-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('detail-modal').classList.remove('open');
  currentModalId = null;
}

/* ═══════════════════════════════════════════════════════
   BOOKING ACTIONS
═══════════════════════════════════════════════════════ */
function cancelBooking(id, fromModal = false) {
  const b = BOOKINGS.find(x => x.id === id);
  if (!b || b.status === 'cancelled') return;
  if (!confirm(`Cancel booking for ${b.name} on ${b.date} at ${b.timeGMT6}?`)) return;

  b.status = 'cancelled';
  persist();
  adminToast(`Booking for ${b.name} cancelled.`);

  if (fromModal) closeModal();
  renderDashboard();
  renderBookingsTable();
  renderUpcoming();
}

function deleteBooking(id) {
  const b = BOOKINGS.find(x => x.id === id);
  if (!b) return;
  if (!confirm(`Permanently delete booking for ${b.name}? This cannot be undone.`)) return;

  BOOKINGS = BOOKINGS.filter(x => x.id !== id);
  persist();
  adminToast('Booking deleted.');
  renderDashboard();
  renderBookingsTable();
}

/* ═══════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════ */
function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

let toastTm;
function adminToast(msg) {
  const t = document.getElementById('admin-toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTm);
  toastTm = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ═══════════════════════════════════════════════════════
   EVENT LISTENERS (run on script load)
═══════════════════════════════════════════════════════ */

// Close modal when clicking backdrop
document.getElementById('detail-modal').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});

// Escape key closes modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// Set topbar date
document.getElementById('topbar-date').textContent =
  new Date().toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
