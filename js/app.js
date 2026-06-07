import { db } from './firebase-config.js';
import { uploadToCloudinary } from './cloudinary.js';
import {
  collection, getDocs, addDoc, query, where, orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── NAVIGATION ──
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
if (hamburger) hamburger.addEventListener('click', () => mobileMenu.classList.toggle('open'));

function navigate(pageId, pushState = true) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');
  document.querySelectorAll('[data-page]').forEach(a => a.classList.toggle('active', a.dataset.page === pageId));
  if (mobileMenu) mobileMenu.classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (pushState) history.pushState({ page: pageId }, '', '#' + pageId);
  loadPageData(pageId);
}
window.navigate = navigate;
window.addEventListener('popstate', (e) => navigate(e.state?.page || 'home', false));

function loadPageData(pageId) {
  switch(pageId) {
    case 'home': loadHomeEvents(); loadMemberCount(); break;
    case 'founders': loadCommittee('founders', 'foundersGrid'); break;
    case 'managing': loadCommittee('managing', 'managingGrid'); break;
    case 'committee': loadCommittee('committee', 'committeeGrid'); break;
    case 'subcommittee': loadCommittee('subcommittee', 'subcommitteeGrid'); break;
    case 'members': loadMembers(); break;
    case 'events': loadEvents(); break;
    case 'gallery': loadGallery(); break;
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

// ── MEMBER COUNT ──
async function loadMemberCount() {
  try {
    const snap = await getDocs(query(collection(db, 'members'), where('status', '==', 'approved')));
    const el = document.getElementById('heroMemberCount');
    if (el) el.textContent = snap.size || '0';
  } catch(e) {}
}

// ── LOAD COMMITTEE ──
async function loadCommittee(colName, gridId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = '<div class="loading">Loading</div>';
  try {
    const snap = await getDocs(query(collection(db, colName), orderBy('order', 'asc')));
    if (snap.empty) {
      grid.innerHTML = `<p style="text-align:center;color:var(--text-dim);padding:3rem;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Details will be added soon.</p>`;
      return;
    }
    grid.className = 'committee-grid';
    grid.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      return `<div class="person-card">
        <div class="person-avatar">${d.photoURL ? `<img src="${d.photoURL}" alt="${d.name}">` : '👤'}</div>
        <div class="person-name">${d.name || '—'}</div>
        <div class="person-role">${d.role || ''}</div>
        <div class="person-sector">${d.sector || ''}</div>
      </div>`;
    }).join('');
  } catch(e) { grid.innerHTML = '<p style="text-align:center;color:var(--text-dim);padding:2rem;">Unable to load.</p>'; }
}

// ── LOAD MEMBERS ──
let allMembers = [];

async function loadMembers() {
  const grid = document.getElementById('membersGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading">Loading members</div>';
  try {
    const snap = await getDocs(query(collection(db, 'members'), where('status', '==', 'approved')));
    allMembers = snap.docs.map(d => ({id: d.id, ...d.data()}));
    renderMemberGrid();
  } catch(e) { grid.innerHTML = '<div class="no-results">Unable to load members.</div>'; }
}

function renderMemberGrid() {
  const grid = document.getElementById('membersGrid');
  if (!grid) return;
  const search = (document.getElementById('memberSearch')?.value || '').toLowerCase();
  const filter = document.getElementById('sectorFilter')?.value || '';
  const filtered = allMembers.filter(m =>
    (!search || (m.fullname||'').toLowerCase().includes(search) || (m.specialty||'').toLowerCase().includes(search)) &&
    (!filter || m.sector === filter)
  );
  if (!filtered.length) { grid.innerHTML = '<div class="no-results">No members found.</div>'; return; }
  grid.innerHTML = filtered.map(m => {
    const init = (m.fullname||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    return `<div class="member-card">
      <div class="member-avatar">${m.photoURL ? `<img src="${m.photoURL}" alt="${m.fullname}">` : init}</div>
      <div class="member-name">${m.fullname || '—'}</div>
      <div class="member-role">${m.specialty || ''}</div>
      <span class="member-badge ${m.membership==='Lifetime'?'lifetime':''}">${m.sector || ''}</span>
    </div>`;
  }).join('');
}

document.getElementById('memberSearch')?.addEventListener('input', renderMemberGrid);
document.getElementById('sectorFilter')?.addEventListener('change', renderMemberGrid);

// ── LOAD EVENTS ──
async function loadHomeEvents() {
  const container = document.getElementById('homeEvents');
  if (!container) return;
  try {
    const snap = await getDocs(query(collection(db, 'events'), where('upcoming', '==', true), orderBy('date', 'asc'), limit(3)));
    if (snap.empty) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-dim);padding:2rem;font-size:12px;letter-spacing:2px;">No upcoming events at this time.</p>';
      return;
    }
    container.innerHTML = '<div class="events-list" style="background:rgba(255,255,255,0.03);">' + snap.docs.map(doc => eventCard(doc.data(), false)).join('') + '</div>';
  } catch(e) { container.innerHTML = ''; }
}

async function loadEvents() {
  const upcoming = document.getElementById('upcomingEvents');
  const past = document.getElementById('pastEvents');
  if (!upcoming) return;
  try {
    const uSnap = await getDocs(query(collection(db, 'events'), where('upcoming', '==', true), orderBy('date', 'asc')));
    upcoming.innerHTML = uSnap.empty
      ? '<p style="color:var(--text-dim);font-size:12px;letter-spacing:1px;">No upcoming events.</p>'
      : '<div class="events-list">' + uSnap.docs.map(d => eventCard(d.data(), false)).join('') + '</div>';

    const pSnap = await getDocs(query(collection(db, 'events'), where('upcoming', '==', false), orderBy('date', 'desc')));
    past.innerHTML = pSnap.empty
      ? '<p style="color:var(--text-dim);font-size:12px;letter-spacing:1px;">No past events.</p>'
      : '<div class="events-list">' + pSnap.docs.map(d => eventCard(d.data(), true)).join('') + '</div>';
  } catch(e) { upcoming.innerHTML = '<p style="color:var(--text-dim);">Unable to load.</p>'; }
}

function eventCard(d, isPast) {
  const date = d.date ? new Date(d.date) : null;
  const day = date ? date.getDate().toString().padStart(2,'0') : '—';
  const month = date ? date.toLocaleString('en',{month:'short'}).toUpperCase() : '—';
  return `<div class="event-item">
    <div class="event-date-box" ${isPast?'style="background:var(--dark4);"':''}><div class="day">${day}</div><div class="month">${month}</div></div>
    <div class="event-info">
      <div class="event-title">${d.title || '—'}</div>
      <div class="event-location">📍 ${d.location || ''}</div>
      ${d.tag ? `<span class="event-tag">${d.tag}</span>` : ''}
    </div>
    <span class="event-status ${isPast?'past':''}">${isPast ? 'Completed' : 'Upcoming'}</span>
  </div>`;
}

// ── LOAD GALLERY ──
async function loadGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading">Loading gallery</div>';
  try {
    const snap = await getDocs(query(collection(db, 'gallery'), orderBy('createdAt', 'desc')));
    if (snap.empty) {
      grid.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-dim);grid-column:1/-1;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Gallery photos will be added soon.</div>`;
      return;
    }
    grid.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      return `<div class="gallery-item"><img src="${d.url}" alt="${d.caption||'Gallery'}"></div>`;
    }).join('');
  } catch(e) { grid.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-dim);">Unable to load gallery.</div>'; }
}

// ── LOAD TRIBUTE ──
async function loadTribute() {
  const grid = document.getElementById('tributeGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading">Loading</div>';
  try {
    const snap = await getDocs(collection(db, 'tribute'));
    if (snap.empty) {
      grid.innerHTML = `<p style="text-align:center;color:var(--text-dim);padding:2rem;font-size:12px;letter-spacing:1px;">Members will be added to this page by the admin.</p>`;
      return;
    }
    grid.className = 'tribute-grid';
    grid.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      return `<div class="tribute-card">
        <div class="tribute-avatar">${d.photoURL ? `<img src="${d.photoURL}">` : '👤'}</div>
        <div class="tribute-name">${d.name || '—'}</div>
        <div class="tribute-role">${d.role || ''}</div>
        <div class="tribute-dates">${d.born||''} — ${d.passed||''}</div>
        <div class="tribute-msg">${d.message || '"Their memory is our inspiration."'}</div>
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
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.sector = sector; data.membership = membership;
    data.status = 'pending'; data.createdAt = serverTimestamp();

    // Upload photo to Cloudinary
    const photoFile = document.getElementById('regPhoto')?.files[0];
    if (photoFile) {
      btn.textContent = 'Uploading photo...';
      data.photoURL = await uploadToCloudinary(photoFile);
    }
    delete data.photo;

    await addDoc(collection(db, 'members'), data);
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
    await addDoc(collection(db, 'feedback'), {
      type,
      name: document.getElementById('fb_name').value,
      subject: document.getElementById('fb_subject').value,
      message: document.getElementById('fb_message').value,
      createdAt: serverTimestamp()
    });
    document.getElementById('feedbackFormWrap').style.display = 'none';
    document.getElementById('feedbackSuccess').classList.add('show');
  } catch(err) { alert('Failed to send. Please try again.'); }
});
