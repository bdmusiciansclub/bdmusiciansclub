// ── DROPDOWN CLICK SUPPORT (mobile + touch) ──
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.dropdown > a').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const dropdown = toggle.parentElement;
      const isOpen = dropdown.classList.contains('open');
      // Close all dropdowns
      document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
      // Toggle current
      if (!isOpen) dropdown.classList.add('open');
    });
  });
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
    }
  });
});

import { db } from './firebase-config.js';
import { uploadToCloudinary } from './cloudinary.js';
import {
  collection, getDocs, addDoc, query, where, orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── NAVIGATION ──
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
if (hamburger) hamburger.addEventListener('click', () => mobileMenu.classList.toggle('open'));

window.navigate = function(pageId, pushState = true) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');
  document.querySelectorAll('[data-page]').forEach(a => a.classList.toggle('active', a.dataset.page === pageId));
  if (mobileMenu) mobileMenu.classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (pushState) history.pushState({ page: pageId }, '', '#' + pageId);
  loadPageData(pageId);
}

window.addEventListener('popstate', (e) => navigate(e.state?.page || 'home', false));

function loadPageData(id) {
  switch(id) {
    case 'home': loadHome(); break;
    case 'founders': loadCommittee('founders', 'foundersGrid'); break;
    case 'managing': loadCommittee('managing', 'managingGrid'); break;
    case 'committee': loadCommittee('committee', 'committeeGrid'); break;
    case 'subcommittee': loadCommittee('subcommittee', 'subcommitteeGrid'); break;
    case 'members': loadMembers(); break;
    case 'news': loadNews('newsGrid', 20); break;
    case 'events': loadEvents(); break;
    case 'jobs': loadJobs('jobsGrid', 50); break;
    case 'gallery': loadGallery(); break;
    case 'videos': loadVideos('videosGrid', 20); break;
    case 'achievements': loadAchievements('achievementsGrid', 20); break;
    case 'sponsors': loadSponsors('sponsorsGrid', 50); break;
    case 'tribute': loadTribute(); break;
  }
}

navigate(location.hash.replace('#', '') || 'home', false);

// ── GEO DROPDOWNS ──
document.addEventListener('DOMContentLoaded', () => {
  if (typeof initGeo === 'function') {
    initGeo('div_c', 'dist_c', 'thana_c');
    initGeo('div_p', 'dist_p', 'thana_p');
  }
  document.getElementById('sameAddress')?.addEventListener('change', (e) => {
    document.getElementById('permanentAddress').style.display = e.target.checked ? 'none' : 'block';
  });
  document.querySelectorAll('.sector-option').forEach(opt => {
    opt.addEventListener('click', () => {
      opt.closest('.sector-options').querySelectorAll('.sector-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected'); opt.querySelector('input').checked = true;
    });
  });
  document.querySelectorAll('.membership-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.membership-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected'); opt.querySelector('input').checked = true;
    });
  });
  document.querySelectorAll('.feedback-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.feedback-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });
});

// ── HOME ──
async function loadHome() {
  try {
    const [members, events, musicians, soundEng, logistic] = await Promise.all([
      getDocs(query(collection(db, 'members'), where('status','==','approved'))),
      getDocs(collection(db, 'events')),
      getDocs(query(collection(db, 'members'), where('status','==','approved'), where('sector','==','Musicians'))),
      getDocs(query(collection(db, 'members'), where('status','==','approved'), where('sector','==','Sound Engineers'))),
      getDocs(query(collection(db, 'members'), where('status','==','approved'), where('sector','==','Logistic Supporters'))),
    ]);
    setText('heroMemberCount', members.size || '0');
    setText('heroEventCount', events.size || '0');
    setText('statMusicians', musicians.size || '0');
    setText('statSoundEng', soundEng.size || '0');
    setText('statLogistic', logistic.size || '0');
  } catch(e) {}

  loadNews('homeNews', 3);
  loadHomeEvents();
  loadJobs('homeJobs', 3);
  loadSponsors('homeSponsors', 8);
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

// ── NEWS ──
async function loadNews(containerId, lim) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<div class="loading">Loading</div>';
  try {
    const snap = await getDocs(query(collection(db, 'news'), orderBy('createdAt','desc'), limit(lim)));
    if (snap.empty) { container.innerHTML = emptyState('📰','No announcements yet.'); return; }
    container.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      const date = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('en-GB') : '';
      return `<div class="news-card">
        <div class="news-card-img">${d.imageURL ? `<img src="${d.imageURL}" alt="${d.title}">` : '📰'}</div>
        <div class="news-card-body">
          <span class="news-tag">${d.tag || 'Announcement'}</span>
          <div class="news-title">${d.title || '—'}</div>
          <div class="news-date">${date}</div>
          <div class="news-excerpt">${d.excerpt || ''}</div>
        </div>
      </div>`;
    }).join('');
  } catch(e) { container.innerHTML = emptyState('📰','Unable to load.'); }
}

// ── COMMITTEE ──
async function loadCommittee(colName, gridId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = '<div class="loading">Loading</div>';
  try {
    const snap = await getDocs(query(collection(db, colName), orderBy('order','asc')));
    if (snap.empty) { grid.innerHTML = emptyState('👤','Details will be added soon by the admin.'); return; }
    grid.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      return `<div class="person-card">
        <div class="person-avatar">${d.photoURL ? `<img src="${d.photoURL}" alt="${d.name}">` : '👤'}</div>
        <div class="person-name">${d.name||'—'}</div>
        <div class="person-role">${d.role||''}</div>
        <div class="person-sector">${d.sector||''}</div>
      </div>`;
    }).join('');
  } catch(e) { grid.innerHTML = emptyState('👤','Unable to load.'); }
}

// ── MEMBERS ──
let allMembers = [];
async function loadMembers() {
  const grid = document.getElementById('membersGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading">Loading members</div>';
  try {
    const snap = await getDocs(query(collection(db, 'members'), where('status','==','approved')));
    allMembers = snap.docs.map(d => ({id:d.id,...d.data()}));
    renderMembers();
  } catch(e) { grid.innerHTML = '<div class="no-results">Unable to load members.</div>'; }
}
function renderMembers() {
  const grid = document.getElementById('membersGrid');
  if (!grid) return;
  const search = (document.getElementById('memberSearch')?.value||'').toLowerCase();
  const filter = document.getElementById('sectorFilter')?.value||'';
  const filtered = allMembers.filter(m =>
    (!search||(m.fullname||'').toLowerCase().includes(search)||(m.specialty||'').toLowerCase().includes(search)) &&
    (!filter||m.sector===filter)
  );
  if (!filtered.length) { grid.innerHTML = '<div class="no-results">No members found.</div>'; return; }
  grid.innerHTML = filtered.map(m => {
    const init = (m.fullname||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    return `<div class="member-card">
      <div class="member-avatar">${m.photoURL?`<img src="${m.photoURL}" alt="${m.fullname}">`:init}</div>
      <div class="member-name">${m.fullname||'—'}</div>
      <div class="member-role">${m.specialty||''}</div>
      <span class="member-badge ${m.membership==='Lifetime'?'lifetime':''}">${m.sector||''}</span>
    </div>`;
  }).join('');
}
document.getElementById('memberSearch')?.addEventListener('input', renderMembers);
document.getElementById('sectorFilter')?.addEventListener('change', renderMembers);

// ── HOME EVENTS ──
async function loadHomeEvents() {
  const container = document.getElementById('homeEvents');
  if (!container) return;
  try {
    const snap = await getDocs(query(collection(db,'events'),where('upcoming','==',true),orderBy('date','asc'),limit(3)));
    if (snap.empty) { container.innerHTML = emptyState('📅','No upcoming events at this time.'); return; }
    container.innerHTML = '<div class="events-list">' + snap.docs.map(d => eventCard(d.data(),false)).join('') + '</div>';
  } catch(e) { container.innerHTML = ''; }
}

// ── EVENTS ──
async function loadEvents() {
  const upcoming = document.getElementById('upcomingEvents');
  const past = document.getElementById('pastEvents');
  if (!upcoming) return;
  try {
    const uSnap = await getDocs(query(collection(db,'events'),where('upcoming','==',true),orderBy('date','asc')));
    upcoming.innerHTML = uSnap.empty ? emptyState('📅','No upcoming events.') : '<div class="events-list">'+uSnap.docs.map(d=>eventCard(d.data(),false)).join('')+'</div>';
    const pSnap = await getDocs(query(collection(db,'events'),where('upcoming','==',false),orderBy('date','desc')));
    past.innerHTML = pSnap.empty ? emptyState('📅','No past events recorded.') : '<div class="events-list">'+pSnap.docs.map(d=>eventCard(d.data(),true)).join('')+'</div>';
  } catch(e) { upcoming.innerHTML = emptyState('📅','Unable to load.'); }
}

function eventCard(d, isPast) {
  const date = d.date ? new Date(d.date) : null;
  const day = date ? date.getDate().toString().padStart(2,'0') : '—';
  const month = date ? date.toLocaleString('en',{month:'short'}).toUpperCase() : '—';
  return `<div class="event-item">
    <div class="event-date-box ${isPast?'past':''}"><div class="day">${day}</div><div class="month">${month}</div></div>
    <div class="event-info">
      <div class="event-title">${d.title||'—'}</div>
      <div class="event-location">📍 ${d.location||''}</div>
      ${d.tag?`<span class="event-tag">${d.tag}</span>`:''}
    </div>
    <span class="event-status ${isPast?'past':''}">${isPast?'Completed':'Upcoming'}</span>
  </div>`;
}

// ── JOBS ──
async function loadJobs(containerId, lim) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<div class="loading">Loading</div>';
  try {
    const snap = await getDocs(query(collection(db,'jobs'),orderBy('createdAt','desc'),limit(lim)));
    if (snap.empty) { container.innerHTML = emptyState('💼','No opportunities posted yet.'); return; }
    container.innerHTML = '<div class="job-grid">'+snap.docs.map(doc => {
      const d = doc.data();
      const typeClass = d.type==='Full-time'?'full':d.type==='Part-time'?'part':'gig';
      return `<div class="job-card">
        <span class="job-badge ${typeClass}">${d.type||'Gig'}</span>
        <div class="job-info">
          <div class="job-title">${d.title||'—'}</div>
          <div class="job-org">${d.organization||''}</div>
          <div class="job-detail">📍 ${d.location||''} ${d.pay?'· 💰 '+d.pay:''}</div>
        </div>
        <span class="job-sector">${d.sector||''}</span>
      </div>`;
    }).join('')+'</div>';
  } catch(e) { container.innerHTML = emptyState('💼','Unable to load.'); }
}

// ── GALLERY ──
async function loadGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading">Loading gallery</div>';
  try {
    const snap = await getDocs(query(collection(db,'gallery'),orderBy('createdAt','desc')));
    if (snap.empty) { grid.innerHTML = emptyState('🖼️','Gallery photos will be added soon.'); return; }
    grid.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      return `<div class="gallery-item"><img src="${d.url}" alt="${d.caption||'Gallery'}"></div>`;
    }).join('');
  } catch(e) { grid.innerHTML = emptyState('🖼️','Unable to load.'); }
}

// ── VIDEOS ──
async function loadVideos(containerId, lim) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<div class="loading">Loading</div>';
  try {
    const snap = await getDocs(query(collection(db,'videos'),orderBy('createdAt','desc'),limit(lim)));
    if (snap.empty) { container.innerHTML = emptyState('🎬','Videos will be added soon.'); return; }
    container.innerHTML = '<div class="video-grid">'+snap.docs.map(doc => {
      const d = doc.data();
      const embedId = d.youtubeId || '';
      return `<div class="video-card">
        <div class="video-embed"><iframe src="https://www.youtube.com/embed/${embedId}" allowfullscreen loading="lazy"></iframe></div>
        <div class="video-info"><div class="video-title">${d.title||'—'}</div><div class="video-date">${d.date||''}</div></div>
      </div>`;
    }).join('')+'</div>';
  } catch(e) { container.innerHTML = emptyState('🎬','Unable to load.'); }
}

// ── ACHIEVEMENTS ──
async function loadAchievements(containerId, lim) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<div class="loading">Loading</div>';
  try {
    const snap = await getDocs(query(collection(db,'achievements'),orderBy('order','asc'),limit(lim)));
    if (snap.empty) { container.innerHTML = emptyState('🏆','Achievements will be added soon.'); return; }
    container.innerHTML = '<div class="achievements-grid">'+snap.docs.map(doc => {
      const d = doc.data();
      return `<div class="achievement-card">
        <span class="achievement-icon">${d.icon||'🏆'}</span>
        <div class="achievement-title">${d.title||'—'}</div>
        <div class="achievement-desc">${d.description||''}</div>
        ${d.year?`<span class="achievement-year">${d.year}</span>`:''}
      </div>`;
    }).join('')+'</div>';
  } catch(e) { container.innerHTML = emptyState('🏆','Unable to load.'); }
}

// ── SPONSORS ──
async function loadSponsors(containerId, lim) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const snap = await getDocs(query(collection(db,'sponsors'),orderBy('order','asc'),limit(lim)));
    if (snap.empty) { container.innerHTML = emptyState('🤝','Sponsors will be listed here soon.'); return; }
    container.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      return `<div class="sponsor-card">
        ${d.logoURL?`<img src="${d.logoURL}" class="sponsor-logo" alt="${d.name}">`:`<div style="height:80px;display:flex;align-items:center;justify-content:center;font-size:2rem;">🤝</div>`}
        <div class="sponsor-name">${d.name||'—'}</div>
        <div class="sponsor-type">${d.type||''}</div>
      </div>`;
    }).join('');
  } catch(e) { container.innerHTML = ''; }
}

// ── TRIBUTE ──
async function loadTribute() {
  const grid = document.getElementById('tributeGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading">Loading</div>';
  try {
    const snap = await getDocs(collection(db,'tribute'));
    if (snap.empty) { grid.innerHTML = emptyState('🕯️','Members will be added to this page by the admin.'); return; }
    grid.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      return `<div class="tribute-card">
        <div class="tribute-avatar">${d.photoURL?`<img src="${d.photoURL}">`:' 👤'}</div>
        <div class="tribute-name">${d.name||'—'}</div>
        <div class="tribute-role">${d.role||''}</div>
        <div class="tribute-dates">${d.born||''} — ${d.passed||''}</div>
        <div class="tribute-msg">${d.message||'"Their memory is our inspiration."'}</div>
      </div>`;
    }).join('');
  } catch(e) {}
}

// ── REGISTRATION ──
document.getElementById('regForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const sector = document.querySelector('.sector-option.selected')?.dataset.value;
  const membership = document.querySelector('.membership-option.selected')?.dataset.value;
  if (!sector) { alert('Please select a sector.'); return; }
  if (!membership) { alert('Please select membership type.'); return; }
  const btn = document.getElementById('regSubmitBtn');
  btn.textContent = 'Submitting...'; btn.disabled = true;
  try {
    const data = Object.fromEntries(new FormData(e.target).entries());
    data.sector = sector; data.membership = membership;
    data.status = 'pending'; data.createdAt = serverTimestamp();
    const photoFile = document.getElementById('regPhoto')?.files[0];
    if (photoFile) { btn.textContent = 'Uploading photo...'; data.photoURL = await uploadToCloudinary(photoFile); }
    delete data.photo;
    await addDoc(collection(db,'members'), data);
    e.target.style.display = 'none';
    document.getElementById('regSuccess').classList.add('show');
  } catch(err) {
    alert('Submission failed. Please try again.');
    btn.textContent = 'Submit Application'; btn.disabled = false;
  }
});

// ── FEEDBACK ──
document.getElementById('feedbackForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const type = document.querySelector('.feedback-option.selected')?.dataset.type || 'Suggestion';
  try {
    await addDoc(collection(db,'feedback'), {
      type, name: document.getElementById('fb_name').value,
      subject: document.getElementById('fb_subject').value,
      message: document.getElementById('fb_message').value,
      createdAt: serverTimestamp()
    });
    document.getElementById('feedbackFormWrap').style.display = 'none';
    document.getElementById('feedbackSuccess').classList.add('show');
  } catch(err) { alert('Failed to send. Please try again.'); }
});

// ── HELPERS ──
function emptyState(icon, msg) {
  return `<div class="empty-state"><span class="empty-icon">${icon}</span><p>${msg}</p></div>`;
}
