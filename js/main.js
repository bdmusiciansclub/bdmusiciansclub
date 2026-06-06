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
  if (pageId === 'members') renderMembers();
  if (pageId === 'admin') renderAdmin();
}
window.addEventListener('popstate', (e) => navigate(e.state?.page || 'home', false));
navigate(location.hash.replace('#', '') || 'home', false);

// ── GEO DROPDOWNS (Division → District → Thana) ──
document.addEventListener('DOMContentLoaded', () => {
  if (typeof initGeoDropdowns === 'function') {
    initGeoDropdowns('div_c', 'dist_c', 'thana_c');
    initGeoDropdowns('div_p', 'dist_p', 'thana_p');
  }

  // Same address checkbox
  const sameCheck = document.getElementById('sameAddress');
  if (sameCheck) {
    sameCheck.addEventListener('change', () => {
      document.getElementById('permanentAddress').style.display = sameCheck.checked ? 'none' : 'block';
    });
  }

  // Sector selection
  document.querySelectorAll('.sector-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const group = opt.closest('.sector-options');
      group.querySelectorAll('.sector-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      opt.querySelector('input').checked = true;
    });
  });

  // Membership selection
  document.querySelectorAll('.membership-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.membership-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      opt.querySelector('input').checked = true;
    });
  });

  // Feedback type
  document.querySelectorAll('.feedback-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.feedback-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });
});

// ── REGISTRATION ──
let registrations = JSON.parse(localStorage.getItem('bmc_reg') || '[]');
function saveReg() { localStorage.setItem('bmc_reg', JSON.stringify(registrations)); }

const regForm = document.getElementById('regForm');
if (regForm) {
  regForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const sector = document.querySelector('.sector-option.selected')?.dataset.value;
    const membership = document.querySelector('.membership-option.selected')?.dataset.value;
    if (!sector) { alert('Please select a sector.'); return; }
    if (!membership) { alert('Please select membership type.'); return; }
    const data = Object.fromEntries(new FormData(regForm).entries());
    data.sector = sector; data.membership = membership;
    data.id = Date.now(); data.status = 'pending';
    data.appliedAt = new Date().toLocaleDateString('en-BD');
    registrations.push(data); saveReg();
    regForm.style.display = 'none';
    document.getElementById('regSuccess').classList.add('show');
  });
}

// ── FEEDBACK ──
const fbForm = document.getElementById('feedbackForm');
if (fbForm) {
  fbForm.addEventListener('submit', (e) => {
    e.preventDefault();
    fbForm.style.display = 'none';
    document.getElementById('feedbackSuccess').classList.add('show');
  });
}

// ── DEMO MEMBERS ──
const demoMembers = [
  { name: 'Riyad Ahmed', role: 'Guitarist', sector: 'Artists', membership: 'Lifetime', district: 'Dhaka' },
  { name: 'Sumaiya Karim', role: 'Sound Engineer', sector: 'Sound & Light', membership: 'General', district: 'Chittagong' },
  { name: 'Nafis Hasan', role: 'Lighting Designer', sector: 'Sound & Light', membership: 'General', district: 'Sylhet' },
  { name: 'Tanvir Mahmud', role: 'LED Operator', sector: 'LED & Stage', membership: 'Lifetime', district: 'Dhaka' },
  { name: 'Fariha Chowdhury', role: 'Vocalist', sector: 'Artists', membership: 'General', district: 'Rajshahi' },
  { name: 'Munir Rahman', role: 'Production Manager', sector: 'Behind the Scenes', membership: 'Lifetime', district: 'Dhaka' },
];

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
}

function renderMembers() {
  const container = document.getElementById('membersGrid');
  if (!container) return;
  const search = (document.getElementById('memberSearch')?.value || '').toLowerCase();
  const filter = document.getElementById('sectorFilter')?.value || '';
  const extra = registrations.filter(r => r.status === 'approved').map(r => ({
    name: r.fullname || '', role: r.specialty || '', sector: r.sector || '', membership: r.membership || '', district: r.dist_c || ''
  }));
  const all = [...demoMembers, ...extra].filter(m => {
    return (!search || m.name.toLowerCase().includes(search) || m.role.toLowerCase().includes(search)) &&
           (!filter || m.sector === filter);
  });
  if (!all.length) { container.innerHTML = '<div class="no-results">No members found.</div>'; return; }
  container.innerHTML = all.map(m => `
    <div class="member-card">
      <div class="member-avatar">${getInitials(m.name)}</div>
      <div class="member-name">${m.name}</div>
      <div class="member-role">${m.role}</div>
      <span class="member-badge ${m.membership==='Lifetime'?'lifetime':''}">${m.sector}</span>
    </div>`).join('');
}

document.getElementById('memberSearch')?.addEventListener('input', renderMembers);
document.getElementById('sectorFilter')?.addEventListener('change', renderMembers);

// ── ADMIN ──
const ADMIN_PASS = 'bmc2022admin';
function adminLogin() {
  if (document.getElementById('adminPass').value === ADMIN_PASS) {
    document.getElementById('adminLoginBox').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    renderAdmin();
  } else { alert('Incorrect password.'); }
}
function renderAdmin() {
  const container = document.getElementById('adminList');
  if (!container) return;
  document.getElementById('pendingCount').textContent = registrations.filter(r=>r.status==='pending').length;
  document.getElementById('approvedCount').textContent = registrations.filter(r=>r.status==='approved').length;
  if (!registrations.length) { container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">No applications yet.</p>'; return; }
  container.innerHTML = registrations.map(r => `
    <div style="background:var(--light);border:2px solid var(--border);border-radius:var(--radius);padding:1.2rem;margin-bottom:1rem;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;">
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px;">${r.fullname||'—'}</div>
          <div style="font-size:12px;color:var(--text-muted);">${r.sector||''} · ${r.specialty||''} · ${r.dist_c||''}</div>
          <div style="font-size:11px;color:var(--text-light);margin-top:4px;">📞 ${r.mobile||''} · Applied: ${r.appliedAt||''} · ${r.membership||''}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          ${r.status==='pending'?`
            <button onclick="updateStatus(${r.id},'approved')" style="padding:7px 18px;background:var(--accent2);color:#fff;border:none;cursor:pointer;font-size:12px;font-weight:700;border-radius:50px;">✓ Approve</button>
            <button onclick="updateStatus(${r.id},'rejected')" style="padding:7px 18px;background:var(--primary);color:#fff;border:none;cursor:pointer;font-size:12px;font-weight:700;border-radius:50px;">✗ Reject</button>
          `:r.status==='approved'?`<span class="approved-badge">✓ Approved</span>`:`<span class="pending-badge">✗ Rejected</span>`}
        </div>
      </div>
    </div>`).join('');
}
function updateStatus(id, status) {
  registrations = registrations.map(r => r.id===id ? {...r, status} : r);
  saveReg(); renderAdmin(); renderMembers();
}
