import { db, auth } from './firebase-config.js';
import {
  collection, getDocs, query, orderBy, limit, where, addDoc, serverTimestamp, setDoc, doc
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
    if (err) err.textContent = 'Invalid email or password.';
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
    case 'home':      loadHomeData();  break;
    case 'about':     loadAbout();     break;
    case 'members':   loadMembers();   break;
    case 'founders':  loadCommitteePage('founders',  'foundersGrid');  break;
    case 'advisers':  loadCommitteePage('advisers',  'advisersGrid');  break;
    case 'executive': loadCommitteePage('executive', 'executiveGrid'); break;
    case 'events':    loadEvents();    break;
    case 'news':      loadNews();      break;
    case 'gallery':   loadGallery();   break;
    case 'videos':    loadVideos();    break;
    case 'notice':    loadNotice();    break;
    case 'dashboard': loadDashboard(); break;
  }
}

window.toggleMobileMenu = function() {
  document.getElementById('mobileMenu').classList.toggle('open');
};
function closeMobileMenu() {
  document.getElementById('mobileMenu').classList.remove('open');
}

document.querySelectorAll('.dropdown').forEach(dd => {
  dd.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.dropdown').forEach(d => { if (d !== dd) d.classList.remove('open'); });
    dd.classList.toggle('open');
  });
});
document.addEventListener('click', () => {
  document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
});

/* ═══════════════════════════════════════
   HOME
═══════════════════════════════════════ */
async function loadHomeData() {
  await Promise.all([loadHomeStats(), loadHomeNews(), loadHomeEvents(), loadSlideshow()]);
}
async function loadHomeStats() {
  try {
    const [mSnap, eSnap] = await Promise.all([
      getDocs(query(collection(db,'members'), where('status','==','approved'))),
      getDocs(collection(db,'events'))
    ]);
    const memberEls = ['statMembers','heroStatMembers'];
    memberEls.forEach(id => { const el=document.getElementById(id); if(el) el.textContent=mSnap.size||'—'; });
    const evEl = document.getElementById('heroStatEvents');
    if (evEl) evEl.textContent = eSnap.size || '—';
  } catch(e) {}
}

// ── SLIDESHOW ──
let slideIndex = 0;
let slideTotal = 0;
let slideTimer = null;

async function loadSlideshow() {
  const track = document.getElementById('slideshowTrack');
  const dots  = document.getElementById('slideDots');
  if (!track) return;
  try {
    const snap = await getDocs(query(collection(db,'gallery'), where('showInSlideshow','==',true)));
    const sortedDocs = snap.docs.sort((a,b) => (b.data().createdAt?.seconds||0) - (a.data().createdAt?.seconds||0));
    if (snap.empty) {
      track.innerHTML = '<div class="slideshow-placeholder"><span>কোনো ছবি নেই</span></div>';
      return;
    }
    const imgs = sortedDocs.map(d => d.data());
    slideTotal = imgs.length;
    track.innerHTML = imgs.map(g =>
      `<img class="slide-item" src="${g.url}" alt="${g.caption||'BMC'}" loading="lazy">`
    ).join('');
    if (dots) {
      dots.innerHTML = imgs.map((_,i) =>
        `<button class="slide-dot ${i===0?'active':''}" onclick="goSlide(${i})"></button>`
      ).join('');
    }
    slideIndex = 0;
    clearInterval(slideTimer);
    slideTimer = setInterval(slideNext, 4000);
  } catch(e) { console.error('Slideshow error:', e); }
}

window.slideNext = function() {
  slideIndex = (slideIndex + 1) % slideTotal;
  updateSlide();
};
window.slidePrev = function() {
  slideIndex = (slideIndex - 1 + slideTotal) % slideTotal;
  updateSlide();
};
window.goSlide = function(i) {
  slideIndex = i;
  updateSlide();
  clearInterval(slideTimer);
  slideTimer = setInterval(slideNext, 4000);
};
function updateSlide() {
  const track = document.getElementById('slideshowTrack');
  if (track) track.style.transform = `translateX(-${slideIndex * 100}%)`;
  document.querySelectorAll('.slide-dot').forEach((d,i) => {
    d.classList.toggle('active', i === slideIndex);
  });
}
async function loadHomeNews() {
  const el = document.getElementById('homeNewsList');
  if (!el) return;
  try {
    const q = query(collection(db, 'news'), orderBy('date', 'desc'), limit(3));
    const snap = await getDocs(q);
    if (snap.empty) { el.innerHTML = emptyState('📰', 'No news yet'); return; }
    el.innerHTML = snap.docs.map(d => newsCardHTML(d.data())).join('');
  } catch(e) { el.innerHTML = emptyState('⚠️', 'Failed to load'); }
}
async function loadHomeEvents() {
  const el = document.getElementById('homeEventsList');
  if (!el) return;
  try {
    const q = query(collection(db, 'events'), orderBy('date', 'desc'), limit(3));
    const snap = await getDocs(q);
    if (snap.empty) { el.innerHTML = emptyState('📅', 'No events yet'); return; }
    el.innerHTML = snap.docs.map(d => eventItemHTML(d.data())).join('');
  } catch(e) { el.innerHTML = emptyState('⚠️', 'Failed to load'); }
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
    allMembers = snap.docs
      .filter(d => d.data().status === 'approved')
      .map(d => ({ id: d.id, ...d.data() }));
    renderMembers(allMembers);
  } catch(e) { grid.innerHTML = emptyState('⚠️', 'Failed to load'); }
}

function renderMembers(list) {
  const grid = document.getElementById('membersGrid');
  if (!grid) return;
  if (!list.length) { grid.innerHTML = emptyState('🎵', 'No members found'); return; }

  // ── Member Cards ──
  grid.innerHTML = list.map(m => {
    const name = m.fullname||m.name||'—';
    const photoHTML = m.photoURL
      ? `<img src="${m.photoURL}" alt="${name}" loading="lazy">`
      : `<span>${initials(name)}</span>`;
    const cat = m.category || 'General Member';
    const catColors = {
      'Founding Member': 'background:#B8111A;color:#fff;',
      'Honorary Member': 'background:#C9A84C;color:#0B3D20;',
      'General Member':  'background:#0B3D20;color:#fff;'
    };
    const badgeStyle = catColors[cat] || catColors['General Member'];
    return `<div class="member-card" onclick="openMemberModal('${m.id}')">
      <div class="member-photo">${photoHTML}</div>
      <div class="member-info">
        <div class="member-name">${name}</div>
        <div class="member-role">${m.sector||'—'}</div>
        ${m.bmcId ? `<div style="font-size:10px;color:#C9A84C;font-family:'Cinzel',serif;font-weight:700;letter-spacing:1px;margin:3px 0;">${m.bmcId}</div>` : ''}
        <span class="member-badge" style="${badgeStyle}border:none;font-size:10px;padding:4px 12px;">${cat}</span>
      </div>
    </div>`;
  }).join('');

  // ── ID Directory — প্রতি line এ ১০টা ──
  const dirEl = document.getElementById('memberIdDirectory');
  if (!dirEl) return;

  const withId = list.filter(m => m.bmcId);
  if (!withId.length) { dirEl.innerHTML = ''; return; }

  // ১০টা করে ভাগ করো
  const rows = [];
  for (let i = 0; i < withId.length; i += 10) {
    rows.push(withId.slice(i, i + 10));
  }

  dirEl.innerHTML = `
    <div style="background:#fff;border-top:3px solid #0B3D20;padding:1.5rem 1.5rem 1rem;box-shadow:0 2px 12px rgba(0,0,0,0.06);margin-top:2rem;">
      <div style="font-family:'Cinzel',serif;font-size:10px;font-weight:700;letter-spacing:3px;color:#0B3D20;text-transform:uppercase;padding-bottom:0.8rem;border-bottom:1px solid #e5e7eb;margin-bottom:1rem;">
        Member ID Directory
        <span style="font-family:'Inter',sans-serif;font-size:11px;letter-spacing:0;font-weight:400;color:#999;margin-left:1rem;text-transform:none;">${withId.length} জন নিবন্ধিত</span>
      </div>
      ${rows.map(row => `
        <div style="display:flex;flex-wrap:wrap;gap:6px 8px;margin-bottom:8px;">
          ${row.map(m => `
            <span
              onclick="openMemberModal('${m.id}')"
              title="${m.fullname||m.name||''}"
              style="font-family:'Cinzel',serif;font-size:11px;font-weight:700;letter-spacing:1px;
                     color:#0B3D20;background:rgba(11,61,32,0.07);
                     border:1px solid rgba(11,61,32,0.2);
                     padding:4px 11px;cursor:pointer;white-space:nowrap;
                     transition:background 0.15s;"
              onmouseover="this.style.background='rgba(11,61,32,0.16)'"
              onmouseout="this.style.background='rgba(11,61,32,0.07)'"
            >${m.bmcId}</span>
          `).join('')}
        </div>
      `).join('')}
    </div>`;
}

window.filterMembers = function() {
  const search = document.getElementById('memberSearch')?.value?.toLowerCase() || '';
  const sector = document.getElementById('sectorFilter')?.value || '';
  const cat    = document.getElementById('categoryFilter')?.value || '';
  const filtered = allMembers.filter(m => {
    const name = (m.fullname||m.name||'').toLowerCase();
    const sec  = (m.sector||'').toLowerCase();
    const matchSearch = !search || name.includes(search) || sec.includes(search);
    const matchSector = !sector || (m.sector||'') === sector;
    const matchCat    = !cat    || (m.category||'General Member') === cat;
    return matchSearch && matchSector && matchCat;
  });
  renderMembers(filtered);
};

window.openMemberModal = function(memberId) {
  const m = allMembers.find(x => x.id === memberId);
  if (!m) return;
  const name = m.fullname||m.name||'—';
  const cat  = m.category || 'General Member';

  document.getElementById('modalAvatar').innerHTML =
    m.photoURL ? `<img src="${m.photoURL}" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : initials(name);
  document.getElementById('modalName').textContent = name;
  document.getElementById('modalRole').textContent = m.sector || '—';

  document.getElementById('modalPublicInfo').innerHTML = `
    ${m.bmcId ? `<div class="modal-row"><span class="modal-label">BMC-ID</span><span class="modal-value" style="font-family:'Cinzel',serif;font-weight:700;color:#C9A84C;letter-spacing:1px;">${m.bmcId}</span></div>` : ''}
    <div class="modal-row"><span class="modal-label">Category</span><span class="modal-value">${cat}</span></div>
    <div class="modal-row"><span class="modal-label">Instrument / Vocal</span><span class="modal-value">${m.sector||'—'}</span></div>
    ${m.specialty ? `<div class="modal-row"><span class="modal-label">Also Plays</span><span class="modal-value">${m.specialty}</span></div>` : ''}
    ${m.experience ? `<div class="modal-row"><span class="modal-label">Experience</span><span class="modal-value">${m.experience}</span></div>` : ''}
    ${m.mobile ? `<div class="modal-row"><span class="modal-label">Mobile</span><span class="modal-value">${m.mobile}</span></div>` : ''}
    ${m.dist_c ? `<div class="modal-row"><span class="modal-label">District</span><span class="modal-value">${m.dist_c}</span></div>` : ''}
    <div class="modal-row" style="margin-top:1rem;padding-top:1rem;border-top:1px solid #f0f0f0;">
      <span style="font-size:12px;color:#888;font-style:italic;">For more details, please contact admin.</span>
    </div>
  `;

  const privateEl = document.getElementById('modalPrivateInfo');
  if (privateEl) privateEl.innerHTML = '';

  document.getElementById('memberModal').classList.add('open');
};
window.closeMemberModal = function() {
  document.getElementById('memberModal').classList.remove('open');
};

/* ═══════════════════════════════════════
   COMMITTEE
═══════════════════════════════════════ */
async function loadCommitteePage(col, gridId) {
  const el = document.getElementById(gridId);
  if (!el) return;
  el.innerHTML = loadingHTML();
  const catMap = {
    founders:  'Founding Member',
    advisers:  'Honorary Member',
    executive: '__executive__'
  };
  try {
    const snap = await getDocs(collection(db, 'members'));
    let docs;
    if (col === 'executive') {
      docs = snap.docs.filter(d => {
        const m = d.data();
        return m.status === 'approved' && m.executiveRole;
      }).sort((a,b) => (a.data().executiveOrder||99) - (b.data().executiveOrder||99));
    } else {
      const cat = catMap[col];
      docs = snap.docs.filter(d => {
        const m = d.data();
        return m.status === 'approved' && m.category === cat;
      });
    }
    if (!docs.length) { el.innerHTML = emptyState('👤', 'No members yet'); return; }
    el.innerHTML = `<div class="committee-grid">` +
      docs.map(d => {
        const m = d.data();
        const role = col === 'executive' ? (m.executiveRole||'Executive') : (m.category||'Member');
        return personCardHTML({ ...m, role }, d.id);
      }).join('') + `</div>`;
  } catch(e) {
    el.innerHTML = emptyState('⚠️', 'Failed to load: ' + e.message);
  }
}

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
    if (snap.empty) { el.innerHTML = emptyState('📰', 'No news yet'); return; }
    el.innerHTML = `<div class="news-grid">` + snap.docs.map(d => newsCardHTML(d.data())).join('') + `</div>`;
  } catch(e) { el.innerHTML = emptyState('⚠️', 'Failed to load'); }
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
    upcomingEl.innerHTML = upcoming.length ? upcoming.map(e => eventItemHTML(e)).join('') : emptyState('📅', 'No upcoming events');
    if (pastEl) pastEl.innerHTML = past.length ? past.map(e => eventItemHTML(e, true)).join('') : emptyState('📅', 'No past events');
  } catch(e) { upcomingEl.innerHTML = emptyState('⚠️', 'Failed to load'); }
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
    if (snap.empty) { el.innerHTML = emptyState('📷', 'No photos yet'); return; }
    el.innerHTML = snap.docs.map(d => {
      const g = d.data();
      return `<div class="gallery-item"><img src="${g.url}" alt="${g.caption||''}" loading="lazy"></div>`;
    }).join('');
  } catch(e) { el.innerHTML = emptyState('⚠️', 'Failed to load'); }
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
    if (snap.empty) { el.innerHTML = emptyState('🎬', 'No videos yet'); return; }
    el.innerHTML = `<div class="video-grid">` + snap.docs.map(d => {
      const v = d.data();
      const embedId = extractYouTubeId(v.url||v.youtubeId||'');
      return `<div class="video-card">
        <div class="video-embed">
          ${embedId ? `<iframe src="https://www.youtube.com/embed/${embedId}" allowfullscreen loading="lazy"></iframe>` : `<div style="padding:2rem;color:var(--text-muted)">Video unavailable</div>`}
        </div>
        <div class="video-info">
          <div class="video-title">${v.title||'—'}</div>
          <div class="video-date">${v.date||formatDate(v.createdAt)}</div>
        </div>
      </div>`;
    }).join('') + `</div>`;
  } catch(e) { el.innerHTML = emptyState('⚠️', 'Failed to load'); }
}

/* ═══════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════ */
async function loadDashboard() {
  if (!currentUser) { showPage('home'); return; }
  try {
    const q = query(collection(db, 'members'), where('email', '==', currentUser.email), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const m = snap.docs[0].data();
      const name = m.fullname||m.name||'—';
      const el = document.getElementById('dashboardContent');
      if (el) el.innerHTML = `
        <div class="person-card" style="max-width:400px;margin:0 auto 2rem;">
          <div class="person-avatar" style="width:100px;height:100px;font-size:2rem;margin-bottom:1.2rem;">
            ${m.photoURL ? `<img src="${m.photoURL}" alt="${name}">` : initials(name)}
          </div>
          <div class="person-name" style="font-size:1.3rem;">${name}</div>
          <div class="person-role">${m.specialty||m.specialization||m.sector||'—'}</div>
          <div class="person-sector" style="margin-top:0.5rem;">${sectorLabel(m.sector)}</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem;max-width:800px;margin:0 auto;">
          ${dashRow('Mobile', m.mobile)}
          ${dashRow('Email', m.email)}
          ${dashRow('District', m.dist_c||m.district)}
          ${dashRow('Membership', m.membership==='Lifetime'||m.membershipType==='Lifetime'?'Lifetime Member':'General Member')}
          ${dashRow('Experience', m.experience)}
          ${dashRow('Blood Group', m.blood||m.bloodGroup)}
        </div>`;
    }
  } catch(e) {}
}
function dashRow(label, value) {
  return `<div class="contact-card" style="padding:1.2rem;">
    <strong style="font-size:10px;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:4px;">${label}</strong>
    <span style="font-size:14px;color:var(--text);">${value||'—'}</span>
  </div>`;
}

/* ═══════════════════════════════════════
   JOIN FORM
═══════════════════════════════════════ */
window.selectMembership = function(type) {
  document.querySelectorAll('.membership-option').forEach(o => o.classList.remove('selected'));
  document.querySelector(`.membership-option[data-type="${type}"]`)?.classList.add('selected');
};
window.selectSector = function(sector) {
  document.querySelectorAll('.sector-option').forEach(o => o.classList.remove('selected'));
  document.querySelector(`.sector-option[data-sector="${sector}"]`)?.classList.add('selected');
};

/* ─── CASCADE DATA (Official: 8 div, 64 dist, 559 thana) ─── */
const BD_DATA = {"Barisal":{"Barguna":["Amtali","Bamna","Barguna Sadar","Betagi","Pathorghata","Taltali"],"Barisal":["Agailjhara","Babuganj","Bakerganj","Banaripara","Barisal Sadar","Gournadi","Hizla","Mehendiganj","Muladi","Wazirpur"],"Bhola":["Bhola Sadar","Borhan Sddin","Charfesson","Doulatkhan","Lalmohan","Monpura","Tazumuddin"],"Jhalakathi":["Jhalakathi Sadar","Kathalia","Nalchity","Rajapur"],"Patuakhali":["Bauphal","Dashmina","Dumki","Galachipa","Kalapara","Mirzaganj","Patuakhali Sadar","Rangabali"],"Pirojpur":["Bhandaria","Kawkhali","Mathbaria","Nazirpur","Nesarabad","Pirojpur Sadar","Zianagar"]},"Chattagram":{"Bandarban":["Alikadam","Bandarban Sadar","Lama","Naikhongchhari","Rowangchhari","Ruma","Thanchi"],"Brahmanbaria":["Akhaura","Ashuganj","Bancharampur","Bijoynagar","Brahmanbaria Sadar","Kasba","Nabinagar","Nasirnagar","Sarail"],"Chandpur":["Chandpur Sadar","Faridgonj","Haimchar","Hajiganj","Kachua","Matlab North","Matlab South","Shahrasti"],"Chattogram":["Akbarshah","Anwara","Bakalia","Bandar","Banshkhali","Bayazid Bostami","Boalkhali","Chandanaish","Chandgaon","Chawkbazar (Ctg)","Double Mooring","EPZ","Fatikchhari","Halishahar","Hathazari","Karnafuli","Khulshi","Kotwali (Ctg)","Lohagara","Mirsharai","Pahartali","Panchlaish","Patenga","Patiya","Rangunia","Raozan","Sadarghat (Ctg)","Sandwip","Satkania","Sitakunda"],"Comilla":["Barura","Brahmanpara","Burichang","Chandina","Chauddagram","Comilla Sadar","Daudkandi","Debidwar","Homna","Laksam","Lalmai","Meghna","Monohargonj","Muradnagar","Nangalkot","Sadarsouth","Titas"],"Coxsbazar":["Chakaria","Coxsbazar Sadar","Eidgaon","Kutubdia","Moheshkhali","Pekua","Ramu","Teknaf","Ukhiya"],"Feni":["Chhagalnaiya","Daganbhuiyan","Feni Sadar","Fulgazi","Parshuram","Sonagazi"],"Khagrachhari":["Dighinala","Guimara","Khagrachhari Sadar","Laxmichhari","Manikchari","Matiranga","Mohalchari","Panchari","Ramgarh"],"Lakshmipur":["Kamalnagar","Lakshmipur Sadar","Raipur","Ramganj","Ramgati"],"Noakhali":["Begumganj","Chatkhil","Companiganj","Hatia","Kabirhat","Noakhali Sadar","Senbug","Sonaimori","Subarnachar"],"Rangamati":["Baghaichari","Barkal","Belaichari","Juraichari","Kaptai","Kawkhali","Langadu","Naniarchar","Rajasthali","Rangamati Sadar"]},"Dhaka":{"Dhaka":["Adabor","Badda","Banani","Bangshal","Bhashantek","Bimanbandar","Cantonment","Chawkbazar","Dakshinkhan","Darus Salam","Demra","Dhamrai","Dhanmondi","Dohar","Gendaria","Gulshan","Hatirjheel","Hazaribagh","Jatrabari","Kadamtali","Kafrul","Kalabagan","Kamrangirchar","Keraniganj","Khilgaon","Khilkhet","Kotwali","Lalbagh","Mirpur","Mohammadpur","Motijheel","Mugda","Nawabganj","New Market","Pallabi","Paltan","Ramna","Rampura","Rupnagar","Sabujbagh","Savar","Shah Ali","Shahbagh","Shahjahanpur","Sher-e-Bangla Nagar","Shyampur","Sutrapur","Tejgaon","Tejgaon Industrial Area","Turag","Uttara East","Uttara West","Uttarkhan","Vatara","Wari"],"Faridpur":["Alfadanga","Bhanga","Boalmari","Charbhadrasan","Faridpur Sadar","Madhukhali","Nagarkanda","Sadarpur","Saltha"],"Gazipur":["Gazipur Sadar","Kaliakair","Kaliganj","Kapasia","Sreepur"],"Gopalganj":["Gopalganj Sadar","Kashiani","Kotalipara","Muksudpur","Tungipara"],"Kishoreganj":["Austagram","Bajitpur","Bhairab","Hossainpur","Itna","Karimgonj","Katiadi","Kishoreganj Sadar","Kuliarchar","Mithamoin","Nikli","Pakundia","Tarail"],"Madaripur":["Dasar","Kalkini","Madaripur Sadar","Rajoir","Shibchar"],"Manikganj":["Doulatpur","Gior","Harirampur","Manikganj Sadar","Saturia","Shibaloy","Singiar"],"Munshiganj":["Gajaria","Louhajanj","Munshiganj Sadar","Sirajdikhan","Sreenagar","Tongibari"],"Narayanganj":["Araihazar","Bandar","Narayanganj Sadar","Rupganj","Sonargaon"],"Narsingdi":["Belabo","Monohardi","Narsingdi Sadar","Palash","Raipura","Shibpur"],"Rajbari":["Baliakandi","Goalanda","Kalukhali","Pangsa","Rajbari Sadar"],"Shariatpur":["Bhedarganj","Damudya","Gosairhat","Naria","Shariatpur Sadar","Zajira"],"Tangail":["Basail","Bhuapur","Delduar","Dhanbari","Ghatail","Gopalpur","Kalihati","Madhupur","Mirzapur","Nagarpur","Sakhipur","Tangail Sadar"]},"Khulna":{"Bagerhat":["Bagerhat Sadar","Chitalmari","Fakirhat","Kachua","Mollahat","Mongla","Morrelganj","Rampal","Sarankhola"],"Chuadanga":["Alamdanga","Chuadanga Sadar","Damurhuda","Jibannagar"],"Jashore":["Abhaynagar","Bagherpara","Chougachha","Jessore Sadar","Jhikargacha","Keshabpur","Manirampur","Sharsha"],"Jhenaidah":["Harinakundu","Jhenaidah Sadar","Kaliganj","Kotchandpur","Moheshpur","Shailkupa"],"Khulna":["Botiaghata","Dakop","Digholia","Dumuria","Fultola","Koyra","Paikgasa","Rupsha","Terokhada"],"Kushtia":["Bheramara","Daulatpur","Khoksa","Kumarkhali","Kushtia Sadar","Mirpur"],"Magura":["Magura Sadar","Mohammadpur","Shalikha","Sreepur"],"Meherpur":["Gangni","Meherpur Sadar","Mujibnagar"],"Narail":["Kalia","Lohagara","Narail Sadar"],"Satkhira":["Assasuni","Debhata","Kalaroa","Kaliganj","Satkhira Sadar","Shyamnagar","Tala"]},"Mymensingh":{"Jamalpur":["Bokshiganj","Dewangonj","Islampur","Jamalpur Sadar","Madarganj","Melandah","Sarishabari"],"Mymensingh":["Bhaluka","Dhobaura","Fulbaria","Gafargaon","Gouripur","Haluaghat","Iswarganj","Muktagacha","Mymensingh Sadar","Nandail","Phulpur","Tarakanda","Trishal"],"Netrokona":["Atpara","Barhatta","Durgapur","Kalmakanda","Kendua","Khaliajuri","Madan","Mohongonj","Netrokona Sadar","Purbadhala"],"Sherpur":["Jhenaigati","Nalitabari","Nokla","Sherpur Sadar","Sreebordi"]},"Rajshahi":{"Bogura":["Adamdighi","Bogra Sadar","Dhunot","Dupchanchia","Gabtali","Kahaloo","Nondigram","Shajahanpur","Shariakandi","Sherpur","Shibganj","Sonatala"],"Chapainawabganj":["Bholahat","Chapainawabganj Sadar","Gomostapur","Nachol","Shibganj"],"Joypurhat":["Akkelpur","Joypurhat Sadar","Kalai","Khetlal","Panchbibi"],"Naogaon":["Atrai","Badalgachi","Dhamoirhat","Manda","Mohadevpur","Naogaon Sadar","Niamatpur","Patnitala","Porsha","Raninagar","Sapahar"],"Natore":["Bagatipara","Baraigram","Gurudaspur","Lalpur","Naldanga","Natore Sadar","Singra"],"Pabna":["Atghoria","Bera","Bhangura","Chatmohar","Faridpur","Ishurdi","Pabna Sadar","Santhia","Sujanagar"],"Rajshahi":["Bagha","Bagmara","Charghat","Durgapur","Godagari","Mohonpur","Paba","Puthia","Tanore"],"Sirajganj":["Belkuchi","Chauhali","Kamarkhand","Kazipur","Raigonj","Shahjadpur","Sirajganj Sadar","Tarash","Ullapara"]},"Rangpur":{"Dinajpur":["Birampur","Birganj","Birol","Bochaganj","Chirirbandar","Dinajpur Sadar","Fulbaria","Ghoraghat","Hakimpur","Kaharol","Khansama","Nawabganj","Parbatipur"],"Gaibandha":["Gaibandha Sadar","Gobindaganj","Palashbari","Phulchari","Sadullapur","Saghata","Sundarganj"],"Kurigram":["Bhurungamari","Charrajibpur","Chilmari","Kurigram Sadar","Nageshwari","Phulbari","Rajarhat","Rowmari","Ulipur"],"Lalmonirhat":["Aditmari","Hatibandha","Kaliganj","Lalmonirhat Sadar","Patgram"],"Nilphamari":["Dimla","Domar","Jaldhaka","Kishorganj","Nilphamari Sadar","Syedpur"],"Panchagarh":["Atwari","Boda","Debiganj","Panchagarh Sadar","Tetulia"],"Rangpur":["Badargonj","Gangachara","Kaunia","Mithapukur","Pirgacha","Pirgonj","Rangpur Sadar","Taragonj"],"Thakurgaon":["Baliadangi","Haripur","Pirganj","Ranisankail","Thakurgaon Sadar"]},"Sylhet":{"Habiganj":["Ajmiriganj","Bahubal","Baniachong","Chunarughat","Habiganj Sadar","Lakhai","Madhabpur","Nabiganj"],"Moulvibazar":["Barlekha","Juri","Kamolganj","Kulaura","Moulvibazar Sadar","Rajnagar","Sreemangal"],"Sunamganj":["Bishwambarpur","Chhatak","Derai","Dharmapasha","Dowarabazar","Jagannathpur","Jamalganj","Madhyanagar","Shalla","South Sunamganj","Sunamganj Sadar","Tahirpur"],"Sylhet":["Balaganj","Beanibazar","Bishwanath","Companiganj","Dakshinsurma","Fenchuganj","Golapganj","Gowainghat","Jaintiapur","Kanaighat","Osmaninagar","Sylhet Sadar","Zakiganj"]}};

window.populateDistricts = function(divId, distId, thanaId) {
  const div      = document.getElementById(divId)?.value;
  const distSel  = document.getElementById(distId);
  const thanaSel = document.getElementById(thanaId);
  if (!distSel || !thanaSel) return;
  distSel.innerHTML  = '<option value="">-- Select District --</option>';
  thanaSel.innerHTML = '<option value="">-- Select Thana --</option>';
  distSel.disabled  = true;
  thanaSel.disabled = true;
  if (!div || !BD_DATA[div]) return;
  Object.keys(BD_DATA[div]).forEach(d => {
    distSel.innerHTML += `<option value="${d}">${d}</option>`;
  });
  distSel.disabled = false;
};

window.populateThanas = function(distId, thanaId) {
  const distSel  = document.getElementById(distId);
  const thanaSel = document.getElementById(thanaId);
  if (!distSel || !thanaSel) return;
  thanaSel.innerHTML = '<option value="">-- Select Thana --</option>';
  thanaSel.disabled  = true;
  const divId = distId.replace('dist_', 'div_');
  const div   = document.getElementById(divId)?.value;
  const dist  = distSel.value;
  const thanas = BD_DATA[div]?.[dist];
  if (!thanas) return;
  thanas.forEach(t => {
    thanaSel.innerHTML += `<option value="${t}">${t}</option>`;
  });
  thanaSel.disabled = false;
};

window.copyCurrAddress = function() {
  const same   = document.getElementById('sameAddress')?.checked;
  const fields = document.getElementById('permAddressFields');
  if (!fields) return;
  if (same) {
    const setVal = (fromId, toId) => {
      const f = document.getElementById(fromId);
      const t = document.getElementById(toId);
      if (f && t) { t.value = f.value; t.dispatchEvent(new Event('change')); }
    };
    setVal('div_c', 'div_p');
    setTimeout(() => {
      setVal('dist_c', 'dist_p');
      setTimeout(() => setVal('thana_c', 'thana_p'), 150);
    }, 150);
    setVal('addr_c', 'addr_p');
    fields.style.opacity = '0.5';
    fields.style.pointerEvents = 'none';
  } else {
    fields.style.opacity = '';
    fields.style.pointerEvents = '';
  }
};

window.submitApplication = async function() {
  const get = id => document.getElementById(id)?.value?.trim() || '';

  const required = [
    { id: 'fullName',  label: 'Full Name' },
    { id: 'dob',       label: 'Date of Birth' },
    { id: 'nid',       label: 'National ID Number' },
    { id: 'div_c',     label: 'Current Division' },
    { id: 'dist_c',    label: 'Current District' },
    { id: 'mobile',    label: 'Mobile Number' },
    { id: 'sector',    label: 'Main Instrument / Vocal Type' },
  ];
  const missing = required.filter(f => !get(f.id));
  if (missing.length) {
    required.forEach(f => {
      const el = document.getElementById(f.id);
      if (el) el.style.borderColor = get(f.id) ? '' : '#B8111A';
    });
    alert('Please fill in the following required fields:\n\n' + missing.map(f => '• ' + f.label).join('\n'));
    return;
  }
  required.forEach(f => { const el = document.getElementById(f.id); if (el) el.style.borderColor = ''; });

  const data = {
    fullname:     get('fullName'),
    dob:          get('dob'),
    blood:        get('bloodGroup'),
    nid:          get('nid'),
    div_c:        get('div_c'),
    dist_c:       get('dist_c'),
    thana_c:      get('thana_c'),
    addr_c:       get('addr_c'),
    div_p:        get('div_p'),
    dist_p:       get('dist_p'),
    thana_p:      get('thana_p'),
    addr_p:       get('addr_p'),
    mobile:       get('mobile'),
    whatsapp:     get('whatsapp'),
    email:        get('email'),
    facebook:     get('facebook'),
    sector:       get('sector'),
    specialty:    get('specialization'),
    experience:   get('experience'),
    organization: get('organization'),
    status:       'pending',
    createdAt:    serverTimestamp(),
  };

  const btn = document.getElementById('joinSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }
  try {
    const photoInput = document.getElementById('profilePhoto');
    if (photoInput?.files[0]) {
      try {
        const { uploadToCloudinary } = await import('./cloudinary.js');
        data.photoURL = await uploadToCloudinary(photoInput.files[0]);
      } catch(uploadErr) {
        console.warn('Photo upload failed, submitting without photo:', uploadErr);
      }
    }
    await addDoc(collection(db, 'members'), data);
    document.getElementById('joinForm').classList.add('hidden');
    document.getElementById('joinSuccess').classList.add('show');
  } catch(e) {
    alert('Something went wrong. Please try again.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Application'; }
  }
};

window.resetJoinForm = function() {
  document.getElementById('joinForm').classList.remove('hidden');
  document.getElementById('joinSuccess').classList.remove('show');
  document.getElementById('joinForm').reset();
  ['dist_c','thana_c','dist_p','thana_p'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = `<option value="">Select ${id.startsWith('dist') ? 'District' : 'Thana'}</option>`;
      el.disabled = true;
    }
  });
  const fields = document.getElementById('permAddressFields');
  if (fields) { fields.style.opacity = ''; fields.style.pointerEvents = ''; }
};

/* ═══════════════════════════════════════
   MODALS
═══════════════════════════════════════ */
window.openModal  = id => document.getElementById(id)?.classList.add('open');
window.closeModal = id => document.getElementById(id)?.classList.remove('open');

/* ═══════════════════════════════════════
   HELPERS
═══════════════════════════════════════ */
function initials(name = '') {
  return name.split(' ').slice(0,2).map(w => w[0]||'').join('').toUpperCase() || '?';
}
function sectorLabel(s) {
  return s === 'Musicians' ? '🎵 Musicians'
       : s === 'Sound Engineers' ? '🔊 Sound Engineers'
       : s === 'Logistic Supporters' ? '🎬 Logistic Supporters'
       : s || '—';
}
function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return isNaN(d) ? '—' : d.toLocaleDateString('en-GB', { year:'numeric', month:'long', day:'numeric' });
}
function extractYouTubeId(url) {
  const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}
function loadingHTML() { return `<div class="loading">Loading...</div>`; }
function emptyState(icon, msg) {
  return `<div class="empty-state"><span class="empty-icon">${icon}</span><p>${msg}</p></div>`;
}
function newsCardHTML(n) {
  return `<div class="news-card">
    <div class="news-img">${n.imageURL ? `<img src="${n.imageURL}" alt="${n.title}" loading="lazy">` : '📰'}</div>
    <div class="news-body">
      <span class="news-tag">News</span>
      <div class="news-title">${n.title||'—'}</div>
      <div class="news-date">${formatDate(n.date)}</div>
      ${n.excerpt ? `<div class="news-excerpt">${n.excerpt}</div>` : ''}
    </div>
  </div>`;
}
function eventItemHTML(e, isPast = false) {
  const d = e.date?.toDate ? e.date.toDate() : new Date(e.date||'');
  const day   = isNaN(d) ? '—' : d.getDate();
  const month = isNaN(d) ? '—' : d.toLocaleString('en-GB', { month: 'short' });
  return `<div class="event-item">
    <div class="event-date-box ${isPast?'past':''}">
      <span class="day">${day}</span><span class="month">${month}</span>
    </div>
    <div class="event-info">
      <div class="event-title">${e.title||'—'}</div>
      <div class="event-location">📍 ${e.location||'—'}</div>
      <span class="event-tag">${e.type||e.tag||'Event'}</span>
    </div>
    <span class="event-status ${isPast?'past':''}">${isPast?'Completed':'Upcoming'}</span>
  </div>`;
}
function personCardHTML(p, memberId) {
  const name = p.fullname || p.name || '—';
  const photoHTML = p.photoURL
    ? `<img src="${p.photoURL}" alt="${name}" loading="lazy">`
    : `<span>${initials(name)}</span>`;
  const idAttr = memberId ? `onclick="openMemberModal('${memberId}')" style="cursor:pointer;"` : '';
  return `<div class="person-card" ${idAttr}>
    <div class="person-photo">${photoHTML}</div>
    <div class="person-info">
      <div class="person-name">${name}</div>
      <div class="person-role">${p.role||p.category||'Member'}</div>
      ${p.bmcId ? `<div style="font-size:10px;color:#C9A84C;font-family:'Cinzel',serif;font-weight:700;letter-spacing:1px;margin-top:4px;">${p.bmcId}</div>` : ''}
    </div>
  </div>`;
}

/* ═══════════════════════════════════════
   INIT
═══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  showPage('home');
  document.querySelector('.membership-option')?.classList.add('selected');
  document.querySelector('.sector-option')?.classList.add('selected');
  document.querySelector('.tab-btn')?.classList.add('active');
  document.querySelector('.tab-panel')?.classList.add('active');
});

/* ═══════════════════════════════════════
   NOTICE PAGE
═══════════════════════════════════════ */
async function loadNotice() {
  const el = document.getElementById('noticeList');
  if (!el) return;
  el.innerHTML = '<div class="loading">লোড হচ্ছে...</div>';
  try {
    const snap = await getDocs(query(collection(db,'notices'), orderBy('createdAt','desc')));
    if (snap.empty) {
      el.innerHTML = '<div class="empty-state"><span class="empty-icon">📋</span><p>কোনো নোটিশ নেই।</p></div>';
      return;
    }
    el.innerHTML = snap.docs.map(d => {
      const n = d.data();
      const date = n.createdAt?.toDate
        ? n.createdAt.toDate().toLocaleDateString('bn-BD', {day:'2-digit',month:'long',year:'numeric'})
        : '';
      return `<div class="notice-card">
        <div class="notice-date">${date}</div>
        <div class="notice-title">${n.title||'—'}</div>
        <div class="notice-body">${n.body||''}</div>
      </div>`;
    }).join('');
  } catch(e) { el.innerHTML = '<div class="loading">লোড করতে সমস্যা হয়েছে।</div>'; }
}

/* ═══════════════════════════════════════
   FEEDBACK FORM (Contact Page)
═══════════════════════════════════════ */
window.submitFeedback = async function() {
  const name    = document.getElementById('fbName')?.value?.trim() || 'Anonymous';
  const type    = document.getElementById('fbType')?.value || 'Suggestion';
  const subject = document.getElementById('fbSubject')?.value?.trim();
  const message = document.getElementById('fbMessage')?.value?.trim();
  const st      = document.getElementById('fbStatus');

  if (!subject) { st.textContent = '⚠️ বিষয় লিখুন।'; st.style.color='#B8111A'; return; }
  if (!message) { st.textContent = '⚠️ বিস্তারিত লিখুন।'; st.style.color='#B8111A'; return; }

  st.textContent = 'পাঠানো হচ্ছে...'; st.style.color = '#888';
  try {
    await addDoc(collection(db,'feedback'), {
      name, type, subject, message,
      createdAt: serverTimestamp()
    });
    document.getElementById('feedbackForm').style.display = 'none';
    document.getElementById('feedbackSuccess').style.display = 'block';
  } catch(e) {
    st.textContent = 'Error: ' + e.message; st.style.color = '#B8111A';
  }
};

/* ═══════════════════════════════════════
   ABOUT PAGE — Firebase থেকে load
═══════════════════════════════════════ */
async function loadAbout() {
  const el = document.getElementById('aboutContent');
  if (!el) return;
  el.innerHTML = '<div class="loading">লোড হচ্ছে...</div>';
  try {
    const snap = await getDocs(collection(db, 'settings'));
    let about = null;
    snap.docs.forEach(d => { if (d.id === 'about') about = d.data(); });

    if (!about) {
      about = {
        intro: 'Bangladesh Musician\'s Club (BMC) ২০২২ সালে প্রতিষ্ঠিত হয়েছে বাংলাদেশের সঙ্গীত শিল্পের সকল পেশাদারদের একটি ঐক্যবদ্ধ প্ল্যাটফর্মে আনার লক্ষ্যে।\n\nমঞ্চের শিল্পী থেকে সাউন্ড ইঞ্জিনিয়ার, লাইটিং ডিজাইনার থেকে প্রোডাকশন ম্যানেজার — BMC প্রতিটি পেশাদারকে সমান মর্যাদায় স্বীকৃতি দেয়।',
        goals: 'সঙ্গীত শিল্পে শক্তিশালী পেশাদার নেটওয়ার্ক গড়ে তোলা\nউদীয়মান পেশাদারদের দক্ষতা উন্নয়নে সহায়তা\nযোগ্য পেশাদারদের ক্যারিয়ার সুযোগ খুঁজে পেতে সাহায্য\nসঙ্গীত শিল্প ও সংস্কৃতির মর্যাদা প্রতিষ্ঠা\nসারা বাংলাদেশে সঙ্গীতজ্ঞদের প্রতিনিধিত্বকারী জাতীয় সংগঠনে পরিণত হওয়া'
      };
    }

    const introParas = (about.intro||'').split('\n\n').filter(p=>p.trim())
      .map(p => `<p style="margin-bottom:1rem;line-height:1.9;color:var(--text-muted);">${p}</p>`).join('');

    const goalItems = (about.goals||'').split('\n').filter(g=>g.trim())
      .map(g => `<li>${g}</li>`).join('');

    el.innerHTML = `
      <div class="about-grid">
        <div class="about-text">
          <span class="sec-tag on-light" style="margin-bottom:1rem;display:inline-block;">আমাদের পরিচয়</span>
          <h2 class="sec-title on-light" style="margin-bottom:1.5rem;">"We Are The Soul Of Music"</h2>
          ${introParas}
        </div>
        <div>
          <span class="sec-tag on-light" style="margin-bottom:1rem;display:inline-block;">আমাদের লক্ষ্য</span>
          <h3 style="font-family:'Playfair Display',serif;font-size:1.4rem;margin-bottom:1.5rem;color:var(--text);">Our Goals</h3>
          <ul class="goals-list">${goalItems}</ul>
        </div>
      </div>`;
  } catch(e) {
    el.innerHTML = '<p style="color:#888;">Content load করতে সমস্যা হয়েছে।</p>';
  }
}
