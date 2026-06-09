import { db, auth } from './firebase-config.js';
import {
  collection, getDocs, query, orderBy, limit, where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* ═══════════════════════════════════════
   STATE
═══════════════════════════════════════ */
let currentUser = null;
let allMembers = [];

/* ═══════════════════════════════════════
   AUTH
═══════════════════════════════════════ */
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  updateAuthUI();
});

function updateAuthUI() {
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const memberPortalLink = document.getElementById('memberPortalLink');
  if (loginBtn) loginBtn.style.display = currentUser ? 'none' : 'block';
  if (logoutBtn) logoutBtn.style.display = currentUser ? 'block' : 'none';
  if (memberPortalLink) memberPortalLink.style.display = currentUser ? 'block' : 'none';
}

window.handleLogin = async function() {
  const email = document.getElementById('loginEmail').value;
  const pass  = document.getElementById('loginPass').value;
  const err   = document.getElementById('loginError');
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    closeModal('loginModal');
    showPage('dashboard');
  } catch (e) {
    if (err) err.textContent = 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।';
  }
};

window.handleLogout = async function() {
  await signOut(auth);
  showPage('home');
};

/* ═══════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════ */
window.showPage = function(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  if (page) {
    page.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeMobileMenu();
    loadPageData(pageId);
  }
};

function loadPageData(pageId) {
  switch(pageId) {
    case 'home':       loadHomeData();       break;
    case 'members':    loadMembers();        break;
    case 'committee':  loadCommittee();      break;
    case 'events':     loadEvents();         break;
    case 'news':       loadNews();           break;
    case 'gallery':    loadGallery();        break;
    case 'videos':     loadVideos();         break;
    case 'dashboard':  loadDashboard();      break;
  }
}

/* ═══════════════════════════════════════
   MOBILE MENU
═══════════════════════════════════════ */
window.toggleMobileMenu = function() {
  document.getElementById('mobileMenu').classList.toggle('open');
};
function closeMobileMenu() {
  document.getElementById('mobileMenu').classList.remove('open');
}

/* ═══════════════════════════════════════
   DROPDOWN
═══════════════════════════════════════ */
document.querySelectorAll('.dropdown').forEach(dd => {
  dd.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.dropdown').forEach(d => {
      if (d !== dd) d.classList.remove('open');
    });
    dd.classList.toggle('open');
  });
});
document.addEventListener('click', () => {
  document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
});

/* ═══════════════════════════════════════
   HOME PAGE DATA
═══════════════════════════════════════ */
async function loadHomeData() {
  await Promise.all([loadHomeStats(), loadHomeNews(), loadHomeEvents()]);
}

async function loadHomeStats() {
  try {
    const snap = await getDocs(collection(db, 'members'));
    document.getElementById('statMembers').textContent = snap.size || '—';
    document.getElementById('heroStatMembers').textContent = snap.size || '—';
  } catch(e) {}
}

async function loadHomeNews() {
  const el = document.getElementById('homeNewsList');
  if (!el) return;
  try {
    const q = query(collection(db, 'news'), orderBy('date', 'desc'), limit(3));
    const snap = await getDocs(q);
    if (snap.empty) { el.innerHTML = emptyState('📰', 'এখনো কোনো নিউজ নেই'); return; }
    el.innerHTML = snap.docs.map(d => newsCardHTML(d.data())).join('');
  } catch(e) { el.innerHTML = emptyState('⚠️', 'লোড হয়নি'); }
}

async function loadHomeEvents() {
  const el = document.getElementById('homeEventsList');
  if (!el) return;
  try {
    const q = query(collection(db, 'events'), orderBy('date', 'desc'), limit(3));
    const snap = await getDocs(q);
    if (snap.empty) { el.innerHTML = emptyState('📅', 'এখনো কোনো ইভেন্ট নেই'); return; }
    el.innerHTML = snap.docs.map(d => eventItemHTML(d.data())).join('');
  } catch(e) { el.innerHTML = emptyState('⚠️', 'লোড হয়নি'); }
}

/* ═══════════════════════════════════════
   MEMBERS
═══════════════════════════════════════ */
async function loadMembers() {
  const grid = document.getElementById('membersGrid');
  if (!grid) return;
  grid.innerHTML = loadingHTML();
  try {
    const snap = await getDocs(collection(db, 'members'));
    allMembers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderMembers(allMembers);
  } catch(e) { grid.innerHTML = emptyState('⚠️', 'লোড হয়নি'); }
}

function renderMembers(list) {
  const grid = document.getElementById('membersGrid');
  if (!grid) return;
  if (!list.length) { grid.innerHTML = emptyState('🎵', 'কোনো সদস্য পাওয়া যায়নি'); return; }
  grid.innerHTML = list.map(m => `
    <div class="member-card" onclick="openMemberModal('${m.id}')">
      <div class="member-avatar">
        ${m.photoURL ? `<img src="${m.photoURL}" alt="${m.name}" loading="lazy">` : initials(m.name)}
      </div>
      <div class="member-name">${m.name || '—'}</div>
      <div class="member-role">${m.specialization || m.sector || '—'}</div>
      <span class="member-badge ${m.membershipType === 'Lifetime' ? 'lifetime' : ''}">
        ${m.membershipType === 'Lifetime' ? 'আজীবন' : 'সাধারণ'}
      </span>
    </div>`).join('');
}

window.filterMembers = function() {
  const search  = document.getElementById('memberSearch').value.toLowerCase();
  const sector  = document.getElementById('sectorFilter').value;
  const filtered = allMembers.filter(m => {
    const matchSearch = !search ||
      (m.name || '').toLowerCase().includes(search) ||
      (m.specialization || '').toLowerCase().includes(search);
    const matchSector = !sector || m.sector === sector;
    return matchSearch && matchSector;
  });
  renderMembers(filtered);
};

window.openMemberModal = function(memberId) {
  const m = allMembers.find(x => x.id === memberId);
  if (!m) return;
  const modal = document.getElementById('memberModal');
  const avatar = m.photoURL
    ? `<img src="${m.photoURL}" alt="${m.name}">`
    : initials(m.name);

  document.getElementById('modalAvatar').innerHTML = avatar;
  document.getElementById('modalName').textContent = m.name || '—';
  document.getElementById('modalRole').textContent = m.specialization || m.sector || '—';

  // Public info always visible
  document.getElementById('modalPublicInfo').innerHTML = `
    <div class="modal-row"><span class="modal-label">সেক্টর</span><span class="modal-value">${sectorLabel(m.sector)}</span></div>
    <div class="modal-row"><span class="modal-label">পেশা</span><span class="modal-value">${m.specialization || '—'}</span></div>
    <div class="modal-row"><span class="modal-label">অভিজ্ঞতা</span><span class="modal-value">${m.experience || '—'}</span></div>
    <div class="modal-row"><span class="modal-label">সদস্যপদ</span><span class="modal-value">${m.membershipType === 'Lifetime' ? 'আজীবন সদস্য' : 'সাধারণ সদস্য'}</span></div>
  `;

  // Private info — only for logged-in members
  const privateEl = document.getElementById('modalPrivateInfo');
  if (currentUser) {
    privateEl.innerHTML = `
      <div class="modal-row"><span class="modal-label">মোবাইল</span><span class="modal-value">${m.mobile || '—'}</span></div>
      <div class="modal-row"><span class="modal-label">ইমেইল</span><span class="modal-value">${m.email || '—'}</span></div>
      <div class="modal-row"><span class="modal-label">জেলা</span><span class="modal-value">${m.district || '—'}</span></div>
      <div class="modal-row"><span class="modal-label">ঠিকানা</span><span class="modal-value">${m.currentAddress || '—'}</span></div>
      ${m.facebook ? `<div class="modal-row"><span class="modal-label">Facebook</span><span class="modal-value"><a href="${m.facebook}" target="_blank">প্রোফাইল দেখুন</a></span></div>` : ''}
    `;
  } else {
    privateEl.innerHTML = `
      <div class="modal-locked">
        <span class="lock-icon">🔒</span>
        যোগাযোগের তথ্য দেখতে <strong>সদস্য হিসেবে লগইন করুন</strong>
      </div>
    `;
  }

  modal.classList.add('open');
};

window.closeMemberModal = function() {
  document.getElementById('memberModal').classList.remove('open');
};

/* ═══════════════════════════════════════
   COMMITTEE (TABS)
═══════════════════════════════════════ */
async function loadCommittee() {
  await Promise.all([
    loadCommitteeSection('founders',   'foundersGrid'),
    loadCommitteeSection('board',      'boardGrid'),
    loadCommitteeSection('executive',  'executiveGrid'),
    loadCommitteeSection('subcommittees', 'subcommitteeGrid'),
  ]);
}

async function loadCommitteeSection(col, elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  try {
    const snap = await getDocs(collection(db, col));
    if (snap.empty) { el.innerHTML = emptyState('👤', 'তথ্য পাওয়া যায়নি'); return; }
    el.innerHTML = `<div class="committee-grid">` +
      snap.docs.map(d => personCardHTML(d.data())).join('') +
      `</div>`;
  } catch(e) { el.innerHTML = emptyState('⚠️', 'লোড হয়নি'); }
}

window.switchTab = function(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
  document.getElementById('tab-' + tabId).classList.add('active');
};

/* ═══════════════════════════════════════
   NEWS
═══════════════════════════════════════ */
async function loadNews() {
  const el = document.getElementById('newsGrid');
  if (!el) return;
  el.innerHTML = loadingHTML();
  try {
    const q = query(collection(db, 'news'), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    if (snap.empty) { el.innerHTML = emptyState('📰', 'এখনো কোনো নিউজ নেই'); return; }
    el.innerHTML = `<div class="news-grid">` +
      snap.docs.map(d => newsCardHTML(d.data())).join('') + `</div>`;
  } catch(e) { el.innerHTML = emptyState('⚠️', 'লোড হয়নি'); }
}

/* ═══════════════════════════════════════
   EVENTS
═══════════════════════════════════════ */
async function loadEvents() {
  const upcomingEl = document.getElementById('upcomingEvents');
  const pastEl     = document.getElementById('pastEvents');
  if (!upcomingEl) return;
  try {
    const q = query(collection(db, 'events'), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    const now = new Date();
    const upcoming = [], past = [];
    snap.docs.forEach(d => {
      const ev = { id: d.id, ...d.data() };
      const evDate = ev.date?.toDate ? ev.date.toDate() : new Date(ev.date);
      if (evDate >= now) upcoming.push(ev); else past.push(ev);
    });
    upcomingEl.innerHTML = upcoming.length
      ? upcoming.map(e => eventItemHTML(e)).join('')
      : emptyState('📅', 'কোনো আসন্ন ইভেন্ট নেই');
    if (pastEl) pastEl.innerHTML = past.length
      ? past.map(e => eventItemHTML(e, true)).join('')
      : emptyState('📅', 'কোনো পুরনো ইভেন্ট নেই');
  } catch(e) {
    upcomingEl.innerHTML = emptyState('⚠️', 'লোড হয়নি');
  }
}

/* ═══════════════════════════════════════
   GALLERY
═══════════════════════════════════════ */
async function loadGallery() {
  const el = document.getElementById('galleryGrid');
  if (!el) return;
  el.innerHTML = loadingHTML();
  try {
    const snap = await getDocs(query(collection(db, 'gallery'), orderBy('createdAt', 'desc')));
    if (snap.empty) { el.innerHTML = emptyState('📷', 'কোনো ছবি নেই'); return; }
    el.innerHTML = snap.docs.map(d => {
      const g = d.data();
      return `<div class="gallery-item"><img src="${g.url}" alt="${g.caption||''}" loading="lazy"></div>`;
    }).join('');
  } catch(e) { el.innerHTML = emptyState('⚠️', 'লোড হয়নি'); }
}

/* ═══════════════════════════════════════
   VIDEOS
═══════════════════════════════════════ */
async function loadVideos() {
  const el = document.getElementById('videoGrid');
  if (!el) return;
  el.innerHTML = loadingHTML();
  try {
    const snap = await getDocs(query(collection(db, 'videos'), orderBy('createdAt', 'desc')));
    if (snap.empty) { el.innerHTML = emptyState('🎬', 'কোনো ভিডিও নেই'); return; }
    el.innerHTML = `<div class="video-grid">` +
      snap.docs.map(d => {
        const v = d.data();
        const embedId = extractYouTubeId(v.url || '');
        return `<div class="video-card">
          <div class="video-embed">
            ${embedId ? `<iframe src="https://www.youtube.com/embed/${embedId}" allowfullscreen loading="lazy"></iframe>` : `<div style="padding:2rem;color:var(--text-muted)">ভিডিও লোড হয়নি</div>`}
          </div>
          <div class="video-info">
            <div class="video-title">${v.title || '—'}</div>
            <div class="video-date">${formatDate(v.createdAt)}</div>
          </div>
        </div>`;
      }).join('') + `</div>`;
  } catch(e) { el.innerHTML = emptyState('⚠️', 'লোড হয়নি'); }
}

/* ═══════════════════════════════════════
   DASHBOARD (Member Portal)
═══════════════════════════════════════ */
async function loadDashboard() {
  if (!currentUser) { showPage('home'); return; }
  // Load current user's member data
  try {
    const q = query(collection(db, 'members'), where('email', '==', currentUser.email), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const m = snap.docs[0].data();
      const el = document.getElementById('dashboardContent');
      if (el) el.innerHTML = `
        <div class="person-card" style="max-width:400px;margin:0 auto 2rem;">
          <div class="person-avatar" style="width:100px;height:100px;font-size:2rem;margin-bottom:1.2rem;">
            ${m.photoURL ? `<img src="${m.photoURL}" alt="${m.name}">` : initials(m.name)}
          </div>
          <div class="person-name" style="font-size:1.3rem;">${m.name || '—'}</div>
          <div class="person-role">${m.specialization || m.sector || '—'}</div>
          <div class="person-sector" style="margin-top:0.5rem;">${sectorLabel(m.sector)}</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem;max-width:800px;margin:0 auto;">
          ${dashRow('মোবাইল', m.mobile)}
          ${dashRow('ইমেইল', m.email)}
          ${dashRow('জেলা', m.district)}
          ${dashRow('সদস্যপদ', m.membershipType === 'Lifetime' ? 'আজীবন সদস্য' : 'সাধারণ সদস্য')}
          ${dashRow('অভিজ্ঞতা', m.experience)}
          ${dashRow('রক্তের গ্রুপ', m.bloodGroup)}
        </div>
      `;
    }
  } catch(e) {}
}

function dashRow(label, value) {
  return `<div class="contact-card" style="padding:1.2rem;">
    <strong style="font-size:10px;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:4px;">${label}</strong>
    <span style="font-size:14px;color:var(--text);">${value || '—'}</span>
  </div>`;
}

/* ═══════════════════════════════════════
   JOIN FORM
═══════════════════════════════════════ */
import {
  addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

window.selectMembership = function(type) {
  document.querySelectorAll('.membership-option').forEach(o => o.classList.remove('selected'));
  document.querySelector(`.membership-option[data-type="${type}"]`)?.classList.add('selected');
};

window.selectSector = function(sector) {
  document.querySelectorAll('.sector-option').forEach(o => o.classList.remove('selected'));
  document.querySelector(`.sector-option[data-sector="${sector}"]`)?.classList.add('selected');
};

window.submitApplication = async function() {
  const get = id => document.getElementById(id)?.value?.trim() || '';
  const membershipEl = document.querySelector('.membership-option.selected');
  const sectorEl     = document.querySelector('.sector-option.selected');

  const data = {
    name:             get('fullName'),
    dob:              get('dob'),
    bloodGroup:       get('bloodGroup'),
    nid:              get('nid'),
    currentDivision:  get('currentDivision'),
    currentDistrict:  get('currentDistrict'),
    currentThana:     get('currentThana'),
    currentAddress:   get('currentAddressFull'),
    mobile:           get('mobile'),
    whatsapp:         get('whatsapp'),
    email:            get('email'),
    facebook:         get('facebook'),
    sector:           sectorEl?.dataset.sector || '',
    specialization:   get('specialization'),
    experience:       get('experience'),
    organization:     get('organization'),
    membershipType:   membershipEl?.dataset.type || 'General',
    status:           'pending',
    createdAt:        serverTimestamp(),
  };

  if (!data.name || !data.mobile || !data.sector) {
    alert('নাম, মোবাইল এবং সেক্টর অবশ্যই দিতে হবে।');
    return;
  }

  try {
    await addDoc(collection(db, 'applications'), data);
    document.getElementById('joinForm').classList.add('hidden');
    document.getElementById('joinSuccess').classList.add('show');
  } catch(e) {
    alert('সমস্যা হয়েছে। আবার চেষ্টা করুন।');
  }
};

window.resetJoinForm = function() {
  document.getElementById('joinForm').classList.remove('hidden');
  document.getElementById('joinSuccess').classList.remove('show');
  document.getElementById('joinForm').reset();
};

/* ═══════════════════════════════════════
   MODALS
═══════════════════════════════════════ */
window.openModal = function(id) {
  document.getElementById(id)?.classList.add('open');
};
window.closeModal = function(id) {
  document.getElementById(id)?.classList.remove('open');
};

/* ═══════════════════════════════════════
   HELPERS
═══════════════════════════════════════ */
function initials(name = '') {
  return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() || '?';
}

function sectorLabel(s) {
  return s === 'Musicians' ? '🎵 মিউজিশিয়ান'
       : s === 'Sound Engineers' ? '🔊 সাউন্ড ইঞ্জিনিয়ার'
       : s === 'Logistic Supporters' ? '🎬 লজিস্টিক সাপোর্টার'
       : s || '—';
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('bn-BD', { year:'numeric', month:'long', day:'numeric' });
}

function extractYouTubeId(url) {
  const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function loadingHTML() {
  return `<div class="loading">লোড হচ্ছে...</div>`;
}

function emptyState(icon, msg) {
  return `<div class="empty-state"><span class="empty-icon">${icon}</span><p>${msg}</p></div>`;
}

function newsCardHTML(n) {
  return `<div class="news-card">
    <div class="news-img">
      ${n.imageURL ? `<img src="${n.imageURL}" alt="${n.title}" loading="lazy">` : '📰'}
    </div>
    <div class="news-body">
      <span class="news-tag">সংবাদ</span>
      <div class="news-title">${n.title || '—'}</div>
      <div class="news-date">${formatDate(n.date)}</div>
      ${n.excerpt ? `<div class="news-excerpt">${n.excerpt}</div>` : ''}
    </div>
  </div>`;
}

function eventItemHTML(e, isPast = false) {
  const d = e.date?.toDate ? e.date.toDate() : new Date(e.date || '');
  const day   = isNaN(d) ? '—' : d.getDate();
  const month = isNaN(d) ? '—' : d.toLocaleString('bn-BD', { month: 'short' });
  return `<div class="event-item">
    <div class="event-date-box ${isPast ? 'past' : ''}">
      <span class="day">${day}</span>
      <span class="month">${month}</span>
    </div>
    <div class="event-info">
      <div class="event-title">${e.title || '—'}</div>
      <div class="event-location">📍 ${e.location || '—'}</div>
      <span class="event-tag">${e.type || 'ইভেন্ট'}</span>
    </div>
    <span class="event-status ${isPast ? 'past' : ''}">${isPast ? 'সম্পন্ন' : 'আসন্ন'}</span>
  </div>`;
}

function personCardHTML(p) {
  return `<div class="person-card">
    <div class="person-avatar">
      ${p.photoURL ? `<img src="${p.photoURL}" alt="${p.name}" loading="lazy">` : initials(p.name)}
    </div>
    <div class="person-name">${p.name || '—'}</div>
    <div class="person-role">${p.role || '—'}</div>
    <div class="person-sector">${sectorLabel(p.sector)}</div>
  </div>`;
}

/* ═══════════════════════════════════════
   INIT
═══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  showPage('home');
  // Membership option default
  document.querySelector('.membership-option')?.classList.add('selected');
  // Sector option default
  document.querySelector('.sector-option')?.classList.add('selected');
  // Committee tab default
  document.querySelector('.tab-btn')?.classList.add('active');
  document.querySelector('.tab-panel')?.classList.add('active');
});
