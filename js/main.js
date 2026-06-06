// ── NAVIGATION ──
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

if (hamburger) {
  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
  });
}

function navigate(pageId, pushState = true) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');

  document.querySelectorAll('[data-page]').forEach(a => {
    a.classList.toggle('active', a.dataset.page === pageId);
  });

  if (mobileMenu) mobileMenu.classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (pushState) history.pushState({ page: pageId }, '', '#' + pageId);

  if (pageId === 'members') renderMembers();
  if (pageId === 'admin') renderAdmin();
}

window.addEventListener('popstate', (e) => {
  const page = e.state?.page || 'home';
  navigate(page, false);
});

// initial load
const initialPage = location.hash.replace('#', '') || 'home';
navigate(initialPage, false);

// ── REGISTRATION DATA ──
let registrations = JSON.parse(localStorage.getItem('bmc_registrations') || '[]');

function saveRegistrations() {
  localStorage.setItem('bmc_registrations', JSON.stringify(registrations));
}

// ── SECTOR SELECTION ──
document.querySelectorAll('.sector-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.sector-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    opt.querySelector('input').checked = true;
  });
});

document.querySelectorAll('.membership-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.membership-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    opt.querySelector('input').checked = true;
  });
});

document.querySelectorAll('.feedback-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.feedback-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    opt.dataset.selected = opt.dataset.type;
  });
});

// ── SAME ADDRESS CHECKBOX ──
const sameAddrCheck = document.getElementById('sameAddress');
if (sameAddrCheck) {
  sameAddrCheck.addEventListener('change', () => {
    const permanentFields = document.getElementById('permanentAddress');
    permanentFields.style.display = sameAddrCheck.checked ? 'none' : 'block';
    if (sameAddrCheck.checked) {
      ['division_p', 'district_p', 'thana_p', 'address_p'].forEach(id => {
        const el = document.getElementById(id);
        const src = document.getElementById(id.replace('_p', '_c'));
        if (el && src) el.value = src.value;
      });
    }
  });
}

// ── REGISTRATION FORM SUBMIT ──
const regForm = document.getElementById('regForm');
if (regForm) {
  regForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const sector = document.querySelector('.sector-option.selected')?.dataset.value;
    const membership = document.querySelector('.membership-option.selected')?.dataset.value;

    if (!sector) { alert('অনুগ্রহ করে সেক্টর নির্বাচন করুন।'); return; }
    if (!membership) { alert('অনুগ্রহ করে সদস্যপদের ধরন নির্বাচন করুন।'); return; }

    const formData = new FormData(regForm);
    const data = Object.fromEntries(formData.entries());
    data.sector = sector;
    data.membership = membership;
    data.id = Date.now();
    data.status = 'pending';
    data.appliedAt = new Date().toLocaleDateString('bn-BD');

    registrations.push(data);
    saveRegistrations();

    regForm.style.display = 'none';
    document.getElementById('regSuccess').classList.add('show');
  });
}

// ── FEEDBACK FORM SUBMIT ──
const feedbackForm = document.getElementById('feedbackForm');
if (feedbackForm) {
  feedbackForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.querySelector('.feedback-option.selected')?.dataset.type || 'পরামর্শ';
    const name = document.getElementById('fb_name').value;
    const msg = document.getElementById('fb_message').value;
    if (!msg) { alert('বার্তা লিখুন।'); return; }

    feedbackForm.style.display = 'none';
    document.getElementById('feedbackSuccess').classList.add('show');
  });
}

// ── DEMO MEMBERS DATA ──
const demoMembers = [
  { name: 'রিয়াদ আহমেদ', role: 'গিটারিস্ট', sector: 'শিল্পী', membership: 'আজীবন', status: 'approved', district: 'ঢাকা' },
  { name: 'সুমাইয়া করিম', role: 'সাউন্ড ইঞ্জিনিয়ার', sector: 'সাউন্ড ও আলো', membership: 'সাধারণ', status: 'approved', district: 'চট্টগ্রাম' },
  { name: 'নাফিস হাসান', role: 'লাইটিং ডিজাইনার', sector: 'সাউন্ড ও আলো', membership: 'সাধারণ', status: 'approved', district: 'সিলেট' },
  { name: 'তানভীর মাহমুদ', role: 'এলইডি অপারেটর', sector: 'এলইডি ও মঞ্চ', membership: 'আজীবন', status: 'approved', district: 'ঢাকা' },
  { name: 'ফারিহা চৌধুরী', role: 'ভোকালিস্ট', sector: 'শিল্পী', membership: 'সাধারণ', status: 'approved', district: 'রাজশাহী' },
  { name: 'মুনির রহমান', role: 'প্রোডাকশন ম্যানেজার', sector: 'পর্দা পিছে', membership: 'আজীবন', status: 'approved', district: 'ঢাকা' },
];

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── RENDER MEMBERS ──
function renderMembers() {
  const container = document.getElementById('membersGrid');
  if (!container) return;

  const search = document.getElementById('memberSearch')?.value?.toLowerCase() || '';
  const filter = document.getElementById('sectorFilter')?.value || '';

  const approvedRegistrations = registrations
    .filter(r => r.status === 'approved')
    .map(r => ({ name: r.fullname || r.name, role: r.specialty || r.role || '', sector: r.sector, membership: r.membership, status: 'approved', district: r.district_c || '' }));

  const allMembers = [...demoMembers, ...approvedRegistrations];

  const filtered = allMembers.filter(m => {
    const matchSearch = !search || m.name?.toLowerCase().includes(search) || m.role?.toLowerCase().includes(search);
    const matchFilter = !filter || m.sector === filter;
    return matchSearch && matchFilter;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="no-results">কোনো সদস্য পাওয়া যায়নি।</div>';
    return;
  }

  container.innerHTML = filtered.map(m => `
    <div class="member-card">
      <div class="member-avatar">${getInitials(m.name || '?')}</div>
      <div class="member-name">${m.name}</div>
      <div class="member-role">${m.role}</div>
      <span class="member-badge ${m.membership === 'আজীবন' ? 'lifetime' : ''}">${m.sector}</span>
    </div>
  `).join('');
}

// ── MEMBER SEARCH EVENTS ──
document.getElementById('memberSearch')?.addEventListener('input', renderMembers);
document.getElementById('sectorFilter')?.addEventListener('change', renderMembers);

// ── ADMIN PANEL ──
const ADMIN_PASS = 'bmc2022admin';

function adminLogin() {
  const pass = document.getElementById('adminPass').value;
  if (pass === ADMIN_PASS) {
    document.getElementById('adminLoginBox').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    renderAdmin();
  } else {
    alert('পাসওয়ার্ড ভুল।');
  }
}

function renderAdmin() {
  const container = document.getElementById('adminList');
  if (!container) return;

  const pending = registrations.filter(r => r.status === 'pending');
  const approved = registrations.filter(r => r.status === 'approved');

  document.getElementById('pendingCount').textContent = pending.length;
  document.getElementById('approvedCount').textContent = approved.length;

  if (registrations.length === 0) {
    container.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:2rem;">এখনো কোনো আবেদন নেই।</p>';
    return;
  }

  container.innerHTML = registrations.map(r => `
    <div style="background:var(--dark4);border:1px solid rgba(255,255,255,0.06);padding:1.2rem;margin-bottom:1rem;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;">
        <div>
          <div style="font-size:15px;font-weight:600;color:var(--white);margin-bottom:4px;">${r.fullname || r.name || '—'}</div>
          <div style="font-size:12px;color:var(--text-muted);">${r.sector || ''} · ${r.specialty || ''} · ${r.district_c || ''}</div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:4px;">📞 ${r.mobile || ''} · আবেদন: ${r.appliedAt || ''}</div>
          <div style="font-size:11px;color:var(--text-dim);">সদস্যপদ: ${r.membership || ''}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          ${r.status === 'pending' ? `
            <button onclick="updateStatus(${r.id}, 'approved')" style="padding:6px 16px;background:var(--green);color:#fff;border:none;cursor:pointer;font-size:12px;">✓ অনুমোদন</button>
            <button onclick="updateStatus(${r.id}, 'rejected')" style="padding:6px 16px;background:var(--red);color:#fff;border:none;cursor:pointer;font-size:12px;">✗ প্রত্যাখ্যান</button>
          ` : r.status === 'approved' ? `<span class="approved-badge">✓ অনুমোদিত</span>` : `<span class="pending-badge">✗ প্রত্যাখ্যাত</span>`}
        </div>
      </div>
    </div>
  `).join('');
}

function updateStatus(id, status) {
  registrations = registrations.map(r => r.id === id ? { ...r, status } : r);
  saveRegistrations();
  renderAdmin();
  renderMembers();
}
