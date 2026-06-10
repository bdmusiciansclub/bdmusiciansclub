import { db, auth } from './firebase-config.js';
import {
  collection, getDocs, query, orderBy, limit, where, addDoc, serverTimestamp
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
    case 'members':   loadMembers();   break;
    case 'committee': loadCommittee(); break;
    case 'events':    loadEvents();    break;
    case 'news':      loadNews();      break;
    case 'gallery':   loadGallery();   break;
    case 'videos':    loadVideos();    break;
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
  await Promise.all([loadHomeStats(), loadHomeNews(), loadHomeEvents()]);
}
async function loadHomeStats() {
  try {
    const snap = await getDocs(collection(db, 'members'));
    const el1 = document.getElementById('statMembers');
    const el2 = document.getElementById('heroStatMembers');
    if (el1) el1.textContent = snap.size || '—';
    if (el2) el2.textContent = snap.size || '—';
  } catch(e) {}
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
    allMembers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderMembers(allMembers);
  } catch(e) { grid.innerHTML = emptyState('⚠️', 'Failed to load'); }
}
function renderMembers(list) {
  const grid = document.getElementById('membersGrid');
  if (!grid) return;
  if (!list.length) { grid.innerHTML = emptyState('🎵', 'No members found'); return; }
  grid.innerHTML = list.map(m => `
    <div class="member-card" onclick="openMemberModal('${m.id}')">
      <div class="member-avatar">
        ${m.photoURL ? `<img src="${m.photoURL}" alt="${m.fullname||m.name}" loading="lazy">` : initials(m.fullname||m.name)}
      </div>
      <div class="member-name">${m.fullname||m.name||'—'}</div>
      <div class="member-role">${m.specialty||m.specialization||m.sector||'—'}</div>
      <span class="member-badge ${m.membership==='Lifetime'||m.membershipType==='Lifetime' ? 'lifetime' : ''}">
        ${m.membership==='Lifetime'||m.membershipType==='Lifetime' ? 'Lifetime' : 'General'}
      </span>
    </div>`).join('');
}
window.filterMembers = function() {
  const search = document.getElementById('memberSearch').value.toLowerCase();
  const sector = document.getElementById('sectorFilter').value;
  const filtered = allMembers.filter(m => {
    const name = (m.fullname||m.name||'').toLowerCase();
    const spec = (m.specialty||m.specialization||'').toLowerCase();
    const matchSearch = !search || name.includes(search) || spec.includes(search);
    const matchSector = !sector || m.sector === sector;
    return matchSearch && matchSector;
  });
  renderMembers(filtered);
};
window.openMemberModal = function(memberId) {
  const m = allMembers.find(x => x.id === memberId);
  if (!m) return;
  const name = m.fullname||m.name||'—';
  document.getElementById('modalAvatar').innerHTML =
    m.photoURL ? `<img src="${m.photoURL}" alt="${name}">` : initials(name);
  document.getElementById('modalName').textContent = name;
  document.getElementById('modalRole').textContent = m.specialty||m.specialization||m.sector||'—';
  document.getElementById('modalPublicInfo').innerHTML = `
    <div class="modal-row"><span class="modal-label">Sector</span><span class="modal-value">${sectorLabel(m.sector)}</span></div>
    <div class="modal-row"><span class="modal-label">Specialization</span><span class="modal-value">${m.specialty||m.specialization||'—'}</span></div>
    <div class="modal-row"><span class="modal-label">Experience</span><span class="modal-value">${m.experience||'—'}</span></div>
    <div class="modal-row"><span class="modal-label">Membership</span><span class="modal-value">${m.membership==='Lifetime'||m.membershipType==='Lifetime'?'Lifetime Member':'General Member'}</span></div>
  `;
  const privateEl = document.getElementById('modalPrivateInfo');
  if (currentUser) {
    privateEl.innerHTML = `
      <div class="modal-row"><span class="modal-label">Mobile</span><span class="modal-value">${m.mobile||'—'}</span></div>
      <div class="modal-row"><span class="modal-label">Email</span><span class="modal-value">${m.email||'—'}</span></div>
      <div class="modal-row"><span class="modal-label">District</span><span class="modal-value">${m.dist_c||m.district||'—'}</span></div>
      <div class="modal-row"><span class="modal-label">Address</span><span class="modal-value">${m.addr_c||m.currentAddress||'—'}</span></div>
      ${m.facebook?`<div class="modal-row"><span class="modal-label">Facebook</span><span class="modal-value"><a href="${m.facebook}" target="_blank">View Profile</a></span></div>`:''}
    `;
  } else {
    privateEl.innerHTML = `<div class="modal-locked"><span class="lock-icon">🔒</span>Login as member to view contact details</div>`;
  }
  document.getElementById('memberModal').classList.add('open');
};
window.closeMemberModal = function() {
  document.getElementById('memberModal').classList.remove('open');
};

/* ═══════════════════════════════════════
   COMMITTEE
═══════════════════════════════════════ */
async function loadCommittee() {
  await Promise.all([
    loadCommitteeSection('founders',      'foundersGrid'),
    loadCommitteeSection('president',     'presidentGrid'),
    loadCommitteeSection('secretary',     'secretaryGrid'),
    loadCommitteeSection('treasurer',     'treasurerGrid'),
    loadCommitteeSection('executive',     'executiveGrid'),
    loadCommitteeSection('subcommittee',  'subcommitteeGrid'),
  ]);
}
async function loadCommitteeSection(col, elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  try {
    const snap = await getDocs(query(collection(db, col), orderBy('order','asc')));
    if (snap.empty) { el.innerHTML = emptyState('👤', 'No members added yet'); return; }
    el.innerHTML = `<div class="committee-grid">` +
      snap.docs.map(d => personCardHTML(d.data())).join('') + `</div>`;
  } catch(e) {
    // try without orderBy if index missing
    try {
      const snap2 = await getDocs(collection(db, col));
      if (snap2.empty) { el.innerHTML = emptyState('👤', 'No members added yet'); return; }
      el.innerHTML = `<div class="committee-grid">` +
        snap2.docs.map(d => personCardHTML(d.data())).join('') + `</div>`;
    } catch(e2) { el.innerHTML = emptyState('⚠️', 'Failed to load'); }
  }
}
window.switchTab = function(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const btn = document.querySelector(`[data-tab="${tabId}"]`);
  const panel = document.getElementById('tab-' + tabId);
  if (btn) btn.classList.add('active');
  if (panel) panel.classList.add('active');
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

/* ─── CASCADE DATA ─── */
const BD_DATA = {
  Dhaka:      ['Dhaka','Gazipur','Narayanganj','Narsingdi','Manikganj','Munshiganj','Rajbari','Shariatpur','Faridpur','Madaripur','Gopalganj','Kishoreganj','Tangail'],
  Chittagong: ['Chittagong',"Cox's Bazar",'Comilla','Noakhali','Feni','Lakshmipur','Chandpur','Brahmanbaria','Khagrachhari','Rangamati','Bandarban'],
  Rajshahi:   ['Rajshahi','Natore','Pabna','Sirajganj','Bogra','Joypurhat','Naogaon','Chapainawabganj'],
  Khulna:     ['Khulna','Bagerhat','Satkhira','Jessore','Narail','Magura','Jhenaidah','Kushtia','Chuadanga','Meherpur'],
  Barisal:    ['Barisal','Patuakhali','Bhola','Pirojpur','Jhalokati','Barguna'],
  Sylhet:     ['Sylhet','Moulvibazar','Habiganj','Sunamganj'],
  Rangpur:    ['Rangpur','Dinajpur','Gaibandha','Kurigram','Lalmonirhat','Nilphamari','Panchagarh','Thakurgaon'],
  Mymensingh: ['Mymensingh','Jamalpur','Sherpur','Netrokona'],
};

const BD_THANAS = {
  'Dhaka':['Adabor','Badda','Banani','Bangshal','Bimanbandar','Cantonment','Chawkbazar','Dakshinkhan','Darus Salam','Demra','Dhanmondi','Gendaria','Gulshan','Hazaribag','Jatrabari','Kafrul','Kadamtali','Kalabagan','Kamrangirchar','Khilgaon','Khilkhet','Kotwali','Lalbag','Mirpur','Mohammadpur','Motijheel','Mugda','New Market','Pallabi','Paltan','Ramna','Rayer Bazar','Sabujbagh','Shah Ali','Shahjahanpur','Sher-e-Bangla Nagar','Shyampur','Sutrapur','Tejgaon','Tejgaon Industrial','Turag','Uttara','Uttarkhan','Vatara','Wari'],
  'Gazipur':['Gazipur Sadar','Kaliakair','Kaliganj','Kapasia','Sreepur','Tongi'],
  'Narayanganj':['Araihazar','Bandar','Narayanganj Sadar','Rupganj','Sonargaon','Fatullah','Siddhirganj'],
  'Narsingdi':['Narsingdi Sadar','Belabo','Monohardi','Palash','Raipura','Shibpur'],
  'Manikganj':['Manikganj Sadar','Daulatpur','Ghior','Harirampur','Saturia','Shivalaya','Singair'],
  'Munshiganj':['Munshiganj Sadar','Gazaria','Lohajang','Sirajdikhan','Sreenagar','Tongibari'],
  'Rajbari':['Rajbari Sadar','Baliakandi','Goalanda','Kalukhali','Pangsha'],
  'Shariatpur':['Shariatpur Sadar','Bhedarganj','Damudya','Gosairhat','Naria','Zanjira'],
  'Faridpur':['Faridpur Sadar','Alfadanga','Bhanga','Boalmari','Charbhadrasan','Madhukhali','Nagarkanda','Sadarpur','Saltha'],
  'Madaripur':['Madaripur Sadar','Kalkini','Rajoir','Shibchar'],
  'Gopalganj':['Gopalganj Sadar','Kashiani','Kotalipara','Muksudpur','Tungipara'],
  'Kishoreganj':['Kishoreganj Sadar','Austagram','Bajitpur','Bhairab','Hossainpur','Itna','Karimganj','Katiadi','Kuliarchar','Mithamain','Nikli','Pakundia','Tarail'],
  'Tangail':['Tangail Sadar','Basail','Bhuapur','Delduar','Dhanbari','Ghatail','Gopalpur','Kalihati','Madhupur','Mirzapur','Nagarpur','Sakhipur'],
  'Chittagong':['Akbarshah','Bakalia','Bayazid','Boalkhali','Chandgaon','Chawk Bazar','Double Mooring','EPZ','Halishahar','Hathazari','Karnaphuli','Khulshi','Kotwali','Lohagara','Mirsharai','Pahartali','Panchlaish','Patiya','Patenga','Rangunia','Raozan','Sadarghat','Sandwip','Satkania','Sitakund'],
  "Cox's Bazar":["Cox's Bazar Sadar",'Chakaria','Kutubdia','Maheshkhali','Pekua','Ramu','Teknaf','Ukhia'],
  'Comilla':['Comilla Sadar','Barura','Brahmanpara','Burichang','Chandina','Chauddagram','Daudkandi','Debidwar','Homna','Laksam','Meghna','Monoharganj','Muradnagar','Nangalkot','Titas'],
  'Noakhali':['Noakhali Sadar','Begumganj','Chatkhil','Companiganj','Hatiya','Senbagh','Sonaimuri','Subarnachar'],
  'Feni':['Feni Sadar','Chhagalnaiya','Daganbhuiyan','Fulgazi','Parshuram','Sonagazi'],
  'Lakshmipur':['Lakshmipur Sadar','Kamalnagar','Raipur','Ramganj','Ramgati'],
  'Chandpur':['Chandpur Sadar','Faridganj','Haimchar','Haziganj','Kachua','Matlab Dakshin','Matlab Uttar','Shahrasti'],
  'Brahmanbaria':['Brahmanbaria Sadar','Akhaura','Ashuganj','Bancharampur','Bijoynagar','Kasba','Nabinagar','Nasirnagar','Sarail'],
  'Khagrachhari':['Khagrachhari Sadar','Dighinala','Lakshmichhari','Mahalchhari','Manikchhari','Matiranga','Panchhari','Ramgarh'],
  'Rangamati':['Rangamati Sadar','Bagaichhari','Barkal','Belaichhari','Juraichhari','Kaptai','Kawkhali','Langadu','Naniarchar','Rajasthali'],
  'Bandarban':['Bandarban Sadar','Alikadam','Lama','Naikhongchhari','Rowangchhari','Ruma','Thanchi'],
  'Rajshahi':['Boalia','Motihar','Rajpara','Shah Makhdum','Bagmara','Charghat','Durgapur','Godagari','Mohanpur','Paba','Puthia','Tanore'],
  'Natore':['Natore Sadar','Bagatipara','Baraigram','Gurudaspur','Lalpur','Singra'],
  'Pabna':['Pabna Sadar','Atgharia','Bera','Bhangura','Chatmohar','Faridpur','Ishwardi','Santhia','Sujanagar'],
  'Sirajganj':['Sirajganj Sadar','Belkuchi','Chauhali','Kamarkhanda','Kazipur','Raiganj','Shahjadpur','Tarash','Ullahpara'],
  'Bogra':['Bogra Sadar','Adamdighi','Dhunat','Dhupchanchia','Gabtali','Kahaloo','Nandigram','Sariakandi','Shajahanpur','Sherpur','Shibganj','Sonatala'],
  'Joypurhat':['Joypurhat Sadar','Akkelpur','Kalai','Khetlal','Panchbibi'],
  'Naogaon':['Naogaon Sadar','Atrai','Badalgachhi','Dhamoirhat','Manda','Mahadebpur','Mohadevpur','Niamatpur','Patnitala','Porsha','Raninagar','Sapahar'],
  'Chapainawabganj':['Chapainawabganj Sadar','Bholahat','Gomastapur','Nachol','Shibganj'],
  'Khulna':['Daulatpur','Khan Jahan Ali','Khalishpur','Khulna Sadar','Sonadanga','Batiaghata','Dacope','Dumuria','Koyra','Paikgachha','Phultala','Rupsa','Terokhada'],
  'Bagerhat':['Bagerhat Sadar','Chitalmari','Fakirhat','Kachua','Mollahat','Mongla','Morrelganj','Rampal','Sarankhola'],
  'Satkhira':['Satkhira Sadar','Assasuni','Debhata','Kalaroa','Kaliganj','Shyamnagar','Tala'],
  'Jessore':['Jessore Sadar','Abhaynagar','Bagherpara','Chaugachha','Jhikargachha','Keshabpur','Manirampur','Sharsha'],
  'Narail':['Narail Sadar','Kalia','Lohagara'],
  'Magura':['Magura Sadar','Mohammadpur','Shalikha','Sreepur'],
  'Jhenaidah':['Jhenaidah Sadar','Harinakunda','Kaliganj','Kotchandpur','Maheshpur','Shailkupa'],
  'Kushtia':['Kushtia Sadar','Bheramara','Daulatpur','Khoksa','Kumarkhali','Mirpur'],
  'Chuadanga':['Chuadanga Sadar','Alamdanga','Damurhuda','Jibannagar'],
  'Meherpur':['Meherpur Sadar','Gangni','Mujibnagar'],
  'Barisal':['Agailjhara','Babuganj','Bakerganj','Banaripara','Barisal Sadar','Gaurnadi','Hizla','Mehendiganj','Muladi','Wazirpur'],
  'Patuakhali':['Patuakhali Sadar','Bauphal','Dashmina','Dumki','Galachipa','Kalapara','Mirzaganj','Rangabali'],
  'Bhola':['Bhola Sadar','Borhanuddin','Char Fasson','Daulatkhan','Lalmohan','Manpura','Tazumuddin'],
  'Pirojpur':['Pirojpur Sadar','Bhandaria','Kawkhali','Mathbaria','Nazirpur','Nesarabad','Zianagar'],
  'Jhalokati':['Jhalokati Sadar','Kanthalia','Nalchity','Rajapur'],
  'Barguna':['Barguna Sadar','Amtali','Bamna','Betagi','Patharghata','Taltali'],
  'Sylhet':['Sylhet Sadar','Balaganj','Beanibazar','Biswanath','Companiganj','Dakshin Surma','Fenchuganj','Golapganj','Gowainghat','Jaintiapur','Kanaighat','Osmani Nagar','South Surma','Zakiganj'],
  'Moulvibazar':['Moulvibazar Sadar','Barlekha','Juri','Kamalganj','Kulaura','Rajnagar','Sreemangal'],
  'Habiganj':['Habiganj Sadar','Ajmiriganj','Baniachong','Bahubal','Chunarughat','Lakhai','Madhabpur','Nabiganj'],
  'Sunamganj':['Sunamganj Sadar','Bishwamvarpur','Chhatak','Derai','Dharampasha','Dowarabazar','Jagannathpur','Jamalganj','Sullah','Tahirpur'],
  'Rangpur':['Badarganj','Gangachara','Kaunia','Mithapukur','Pirgachha','Pirganj','Rangpur Sadar','Taraganj'],
  'Dinajpur':['Dinajpur Sadar','Birampur','Birganj','Biral','Bochaganj','Chirirbandar','Fulbari','Ghoraghat','Hakimpur','Kaharole','Khansama','Nawabganj','Parbatipur'],
  'Gaibandha':['Gaibandha Sadar','Fulchhari','Gobindaganj','Palashbari','Sadullapur','Saghata','Sundarganj'],
  'Kurigram':['Kurigram Sadar','Bhurungamari','Char Rajibpur','Chilmari','Nageshwari','Phulbari','Rajarhat','Raumari','Ulipur'],
  'Lalmonirhat':['Lalmonirhat Sadar','Aditmari','Hatibandha','Kaliganj','Patgram'],
  'Nilphamari':['Nilphamari Sadar','Dimla','Domar','Jaldhaka','Kishoreganj','Saidpur'],
  'Panchagarh':['Panchagarh Sadar','Atwari','Boda','Debiganj','Tetulia'],
  'Thakurgaon':['Thakurgaon Sadar','Baliadangi','Haripur','Pirganj','Ranisankail'],
  'Mymensingh':['Mymensingh Sadar','Bhaluka','Dhobaura','Fulbaria','Gaffargaon','Gauripur','Haluaghat','Ishwarganj','Muktagachha','Nandail','Phulpur','Trishal'],
  'Jamalpur':['Jamalpur Sadar','Bakshiganj','Dewanganj','Islampur','Madarganj','Melandaha','Sarishabari'],
  'Sherpur':['Sherpur Sadar','Jhenaigati','Nakla','Nalitabari','Sreebardi'],
  'Netrokona':['Netrokona Sadar','Atpara','Barhatta','Durgapur','Kalmakanda','Kendua','Khaliajuri','Madan','Mohanganj','Purbadhala'],
};

window.populateDistricts = function(divId, distId, thanaId) {
  const div = document.getElementById(divId)?.value;
  const distSel  = document.getElementById(distId);
  const thanaSel = document.getElementById(thanaId);
  if (!distSel || !thanaSel) return;
  distSel.innerHTML  = '<option value="">Select District</option>';
  thanaSel.innerHTML = '<option value="">Select Thana</option>';
  distSel.disabled  = true;
  thanaSel.disabled = true;
  if (!div || !BD_DATA[div]) return;
  BD_DATA[div].forEach(d => {
    distSel.innerHTML += `<option value="${d}">${d}</option>`;
  });
  distSel.disabled = false;
};

window.populateThanas = function(distId, thanaId) {
  const dist     = document.getElementById(distId)?.value;
  const thanaSel = document.getElementById(thanaId);
  if (!thanaSel) return;
  thanaSel.innerHTML = '<option value="">Select Thana</option>';
  thanaSel.disabled  = true;
  if (!dist || !BD_THANAS[dist]) return;
  BD_THANAS[dist].forEach(t => {
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
  const membershipEl = document.querySelector('.membership-option.selected');
  const sectorEl     = document.querySelector('.sector-option.selected');
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
    sector:       sectorEl?.dataset.sector || '',
    specialty:    get('specialization'),
    experience:   get('experience'),
    organization: get('organization'),
    membership:   membershipEl?.dataset.type || 'General',
    status:       'pending',
    createdAt:    serverTimestamp(),
  };
  if (!data.fullname || !data.mobile || !data.sector) {
    alert('Full Name, Mobile Number and Sector are required.');
    return;
  }
  try {
    await addDoc(collection(db, 'members'), data);
    document.getElementById('joinForm').classList.add('hidden');
    document.getElementById('joinSuccess').classList.add('show');
  } catch(e) {
    alert('Something went wrong. Please try again.');
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
function personCardHTML(p) {
  return `<div class="person-card">
    <div class="person-avatar">
      ${p.photoURL ? `<img src="${p.photoURL}" alt="${p.name}" loading="lazy">` : initials(p.name)}
    </div>
    <div class="person-name">${p.name||'—'}</div>
    <div class="person-role">${p.role||'—'}</div>
    <div class="person-sector">${sectorLabel(p.sector)}</div>
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
