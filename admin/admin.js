import { db, auth } from '../js/firebase-config.js';
import { uploadToCloudinary } from '../js/cloudinary.js';
import {
  collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, setDoc, doc,
  query, orderBy, where, serverTimestamp, limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ── AUTH ──
onAuthStateChanged(auth, user => {
  if (user) {
    document.getElementById('loginWrap').classList.add('hidden');
    document.getElementById('adminWrap').classList.remove('hidden');
    loadDashboard();
  } else {
    document.getElementById('loginWrap').classList.remove('hidden');
    document.getElementById('adminWrap').classList.add('hidden');
  }
});

window.adminLogin = async () => {
  const err = document.getElementById('loginError');
  err.style.display = 'none';
  try {
    await signInWithEmailAndPassword(auth,
      document.getElementById('adminEmail').value,
      document.getElementById('adminPassword').value);
  } catch(e) {
    err.textContent = 'Invalid email or password. Please try again.';
    err.style.display = 'block';
  }
};
window.adminLogout = () => signOut(auth);

// ── NAV ──
window.showSec = (id, el) => {
  document.querySelectorAll('.sc').forEach(s => s.classList.remove('active'));
  document.getElementById('sec-'+id).classList.add('active');
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  if (el) el.classList.add('active');
  loadSec(id);
};
function loadSec(id) {
  const map = {
    dashboard: loadDashboard,
    applications: loadApplications,
    members: loadMembers,
    founders:     () => loadCategoryMgr('Founder', 'mgr-founders'),
    advisers: () => loadCategoryMgr('Honorary Member', 'mgr-advisers'),
    executive: () => loadExecutiveMgr('mgr-executive'),
    committee: () => loadCommMgr('committee','mgr-committee'),
    subcommittee: () => loadCommMgr('subcommittee','mgr-subcommittee'),
    events: loadEvents,
    gallery: loadGallery,
    videos: loadVideos,
    feedback: loadFeedback,
    notice: loadNotice,
    about: loadAbout
  };
  if (map[id]) map[id]();
}

// ── HELPERS ──
const $ = id => document.getElementById(id);
const val = id => $(id)?.value?.trim() || '';
function tbl(headers, rows) {
  return `<div style="overflow-x:auto;"><table class="table">
    <tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr>
    ${rows}
  </table></div>`;
}
function delBtn(fn, id) {
  return `<button class="abtn btn-delete" onclick="${fn}('${id}')">Delete</button>`;
}
async function upload(fileInputId) {
  const f = $(fileInputId)?.files[0];
  return f ? await uploadToCloudinary(f) : null;
}

// ── DASHBOARD ──
async function loadDashboard() {
  try {
    const [p,m,e,g,v] = await Promise.all([
      getDocs(query(collection(db,'members'),where('status','==','pending'))),
      getDocs(query(collection(db,'members'),where('status','==','approved'))),
      getDocs(collection(db,'events')),
      getDocs(collection(db,'gallery')),
      getDocs(collection(db,'videos')),
    ]);
    const el1=$('sPending'); if(el1) el1.textContent=p.size;
    const el2=$('sMembers'); if(el2) el2.textContent=m.size;
    const el3=$('sEvents');  if(el3) el3.textContent=e.size;
    const el4=$('sGallery'); if(el4) el4.textContent=g.size;
    const el5=$('sVideos');  if(el5) el5.textContent=v.size;
    const con = $('dashApps');
    if (!con) return;
    if (p.empty) {
      con.innerHTML='<p style="color:#888;font-size:13px;padding:1rem;">No pending applications.</p>';
      return;
    }
    con.innerHTML = tbl(['Photo','Name','Sector','Mobile','Action'],
      p.docs.slice(0,5).map(d=>{
        const m=d.data();
        const photo = m.photoURL
          ? `<img src="${m.photoURL}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">`
          : `<div style="width:36px;height:36px;border-radius:50%;background:#0B3D20;display:flex;align-items:center;justify-content:center;color:#7EE8A2;font-size:11px;font-weight:700;">${(m.fullname||'?').charAt(0)}</div>`;
        return `<tr>
          <td>${photo}</td>
          <td><strong>${m.fullname||'—'}</strong><br><small style="color:#888;">${m.sector||''}</small></td>
          <td>${m.sector||''}</td>
          <td>${m.mobile||''}</td>
          <td>
            <button class="abtn btn-approve" onclick="upStatus('${d.id}','approved')">✓ Approve</button>
            <button class="abtn btn-reject" onclick="upStatus('${d.id}','rejected')">✗ Reject</button>
          </td>
        </tr>`;
      }).join(''));
  } catch(e) { console.error('Dashboard error:', e); }
}

// ── APPLICATIONS ──
async function loadApplications() {
  const con = $('applicationsList');
  if (!con) return;
  con.innerHTML = '<div style="color:#888;font-size:13px;padding:1rem;">Loading...</div>';
  try {
    const snap = await getDocs(query(collection(db,'members'),where('status','==','pending'),orderBy('createdAt','desc')));
    const badge = $('pendingBadge');
    if (badge) badge.textContent = snap.size + ' pending';
    if (snap.empty) {
      con.innerHTML='<p style="color:#888;font-size:13px;padding:1rem;">No pending applications.</p>';
      return;
    }
    con.innerHTML = tbl(['Photo','Name','NID','Sector','Mobile','District','Action'],
      snap.docs.map(d=>{
        const m=d.data();
        const photo = m.photoURL
          ? `<img src="${m.photoURL}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb;">`
          : `<div style="width:40px;height:40px;border-radius:50%;background:#0B3D20;display:flex;align-items:center;justify-content:center;color:#7EE8A2;font-weight:700;">${(m.fullname||'?').charAt(0)}</div>`;
        return `<tr>
          <td>${photo}</td>
          <td><strong>${m.fullname||'—'}</strong><br><small style="color:#888;">${m.sector||''}</small></td>
          <td style="font-size:12px;">${m.nid||'—'}</td>
          <td>${m.sector||''}</td>
          <td>${m.mobile||''}</td>
          <td>${m.dist_c||''}</td>
          <td>
            <button class="abtn btn-approve" onclick="upStatus('${d.id}','approved')">✓ Approve</button>
            <button class="abtn btn-reject" onclick="upStatus('${d.id}','rejected')">✗ Reject</button>
            <button class="abtn btn-view" onclick="viewMemberDetail('${d.id}')">👁 View</button>
          </td>
        </tr>`;
      }).join(''));
  } catch(e) { console.error(e); }
}
window.upStatus = async (id, status) => {
  if (status === 'approved') {
    const choice = prompt(
      'Member category সিলেক্ট করুন:\n\n1 → General Member (Paid)\n2 → Honorary Member (Unpaid)\n\nনম্বর লিখুন (default: 1):',
      '1'
    );
    if (choice === null) return;
    const cat = choice.trim() === '2' ? 'Honorary Member' : 'General Member';
    await updateDoc(doc(db,'members',id), { status, category: cat });
    loadApplications(); loadDashboard();
    alert('✓ Approved as ' + cat + '!');
  } else {
    await updateDoc(doc(db,'members',id), { status });
    loadApplications(); loadDashboard();
    alert('✗ Application rejected.');
  }
};


// ── MEMBERS ──
let allMembersData = {};

async function loadMembers() {
  const con = $('membersList');
  if (!con) return;
  con.innerHTML='<div style="color:#888;padding:1rem;">Loading...</div>';
  try {
    const snap = await getDocs(query(collection(db,'members'),where('status','==','approved')));
    if (snap.empty) { con.innerHTML='<p style="color:#888;padding:1rem;">No approved members yet.</p>'; return; }
    snap.docs.forEach(d => { allMembersData[d.id] = {...d.data(), id:d.id}; });
    con.innerHTML = tbl(['Photo','Name','Sector','Category','Mobile','District','Action'],
      snap.docs.map(d=>{
        const m=d.data();
        const photo = m.photoURL
          ? `<img src="${m.photoURL}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb;">`
          : `<div style="width:44px;height:44px;border-radius:50%;background:#0B3D20;display:flex;align-items:center;justify-content:center;color:#7EE8A2;font-weight:700;font-size:14px;">${(m.fullname||'?').charAt(0)}</div>`;
        const cat = m.category || 'General Member';
        const catColor = cat==='Founding Member'?'#B8111A':cat==='Honorary Member'?'#C9A84C':'#157040';
        return `<tr style="cursor:pointer;" onclick="viewMemberDetail('${d.id}')">
          <td>${photo}</td>
          <td><strong>${m.fullname||'—'}</strong><br><small style="color:#888;">${m.sector||''}</small></td>
          <td>${m.sector||''}</td>
          <td><span style="font-size:10px;font-weight:700;color:${catColor};">${cat}</span></td>
          <td>${m.mobile||''}</td>
          <td>${m.dist_c||''}</td>
          <td>
            <button class="abtn btn-view" onclick="event.stopPropagation();viewMemberDetail('${d.id}')">👁 Details</button>
            ${delBtn('delMember',d.id)}
          </td>
        </tr>`;
      }).join(''));
  } catch(e) { console.error(e); }
}
window.delMember = async id => {
  if(!confirm('Delete this member? This cannot be undone.')) return;
  await deleteDoc(doc(db,'members',id));
  delete allMembersData[id];
  loadMembers();
};

// ── MEMBER DETAIL MODAL ──
window.viewMemberDetail = async (id) => {
  let m = allMembersData[id];
  if (!m) {
    try {
      const snap = await getDoc(doc(db,'members',id));
      if (snap.exists()) m = {...snap.data(), id};
    } catch(e) { alert('Could not load member details.'); return; }
  }
  if (!m) { alert('Member not found.'); return; }

  const init = (m.fullname||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const avatarHtml = m.photoURL ? `<img src="${m.photoURL}" alt="${m.fullname}">` : init;

  $('modalHeader').innerHTML = `
    <div class="a-modal-avatar">${avatarHtml}</div>
    <div>
      <div class="a-modal-name">${m.fullname||'—'}</div>
      <div class="a-modal-role">${m.sector||''}</div>
      <div style="margin-top:6px;">
        <span class="status-badge status-approved">${m.status||'approved'}</span>
        ${m.category?`<span class="status-badge" style="background:rgba(184,17,26,0.1);color:#B8111A;border:1px solid rgba(184,17,26,0.25);margin-left:6px;">${m.category}</span>`:''}
      </div>
    </div>`;

  const rows = [
    ['Full Name', m.fullname],
    ['Sector', m.sector],
    ['Category', m.category||'General Member'],
    ['Experience', m.experience],
    ['Mobile', m.mobile],
    ['WhatsApp', m.whatsapp],
    ['Email', m.email],
    ['Facebook', m.facebook ? `<a href="${m.facebook}" target="_blank" style="color:#0B3D20;">${m.facebook}</a>` : '—'],
    ['NID Number', m.nid],
    ['Date of Birth', m.dob],
    ['Blood Group', m.blood],
    ['Current Address', [m.thana_c, m.dist_c, m.div_c, m.addr_c].filter(Boolean).join(', ')],
    ['Organization', m.organization],
    ['Joined', m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}) : '—'],
  ];
  $('modalBody').innerHTML = rows.map(([label, value]) =>
    value ? `<div class="a-modal-row"><div class="a-modal-label">${label}</div><div class="a-modal-value">${value||'—'}</div></div>` : ''
  ).join('');

  $('modalActions').innerHTML = `
    <button class="add-btn" onclick="editMember('${id}')">✏️ Edit Info</button>
    <button class="add-btn" style="background:#C9A84C;color:#0B3D20;" onclick="editBmcId('${id}')">🪪 Assign BMC-ID</button>
    <button class="add-btn" onclick="printMember('${id}')">🖨 Print</button>
    <button class="abtn btn-delete" onclick="event.stopPropagation();delMember('${id}');closeMemberModal()">Delete Member</button>
  `;
  $('memberModal').classList.add('open');
};
window.closeMemberModal = () => $('memberModal').classList.remove('open');
$('memberModal')?.addEventListener('click', e => { if(e.target===$('memberModal')) closeMemberModal(); });

// ── PRINT ──
window.printMember = (id) => {
  const m = allMembersData[id];
  if (!m) return;
  const printWin = window.open('','_blank','width=800,height=900');
  const avatar = m.photoURL
    ? `<img src="${m.photoURL}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid #0B3D20;">`
    : `<div style="width:100px;height:100px;border-radius:50%;background:#0B3D20;display:flex;align-items:center;justify-content:center;color:#7EE8A2;font-size:2rem;font-weight:700;">${(m.fullname||'?').charAt(0)}</div>`;
  function prow(label, value) {
    if (!value) return '';
    return `<div style="display:flex;gap:0.5rem;padding:0.5rem 0;border-bottom:1px solid #f0f0f0;font-size:13px;"><div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#888;min-width:140px;flex-shrink:0;">${label}</div><div style="color:#222;flex:1;">${value}</div></div>`;
  }
  printWin.document.write(`<!DOCTYPE html><html><head><title>BMC — ${m.fullname}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Playfair+Display:wght@400;700&family=Inter:wght@400;600&display=swap');
    body{font-family:'Inter',sans-serif;margin:0;padding:0;background:#fff;color:#111;}
    .header{background:#0B3D20;padding:2rem;display:flex;align-items:center;gap:1.5rem;color:#fff;}
    .name{font-family:'Playfair Display',serif;font-size:1.8rem;font-weight:700;}
    .role{font-size:13px;color:rgba(255,255,255,0.65);margin-top:4px;}
    .body{padding:2rem;}
    .sec{font-family:'Cinzel',serif;font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#B8111A;margin:1.5rem 0 0.8rem;padding-bottom:6px;border-bottom:1px solid rgba(184,17,26,0.2);}
    .footer{margin-top:2rem;padding:1rem 2rem;background:#f9f9f9;border-top:2px solid #0B3D20;text-align:center;font-family:'Cinzel',serif;font-size:9px;letter-spacing:2px;color:#888;}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
  </style></head><body>
  <div class="header">${avatar}
    <div><div class="name">${m.fullname||'—'}</div><div class="role">${m.sector||''}</div></div>
    <div style="margin-left:auto;text-align:right;font-family:Cinzel,serif;font-size:10px;letter-spacing:2px;color:rgba(255,255,255,0.4);text-transform:uppercase;">Bangladesh Musician's Club</div>
  </div>
  <div class="body">
    <div class="sec">Personal Information</div>
    ${prow('Full Name',m.fullname)}${prow('Date of Birth',m.dob)}${prow('Blood Group',m.blood)}${prow('NID Number',m.nid)}
    <div class="sec">Contact Information</div>
    ${prow('Mobile',m.mobile)}${prow('WhatsApp',m.whatsapp)}${prow('Email',m.email)}
    <div class="sec">Professional Information</div>
    ${prow('Sector',m.sector)}${prow('Experience',m.experience)}${prow('Organization',m.organization)}${prow('Category',m.category||'General Member')}
  </div>
  <div class="footer">Bangladesh Musician's Club · Est. 2022 · Dhaka, Bangladesh</div>
  <script>window.onload=()=>window.print()<\/script></body></html>`);
  printWin.document.close();
};

// ═══════════════════════════════════════════════════════
// ── CATEGORY MANAGER (Founders / Advisers) ──
// Approved members list থেকে select করে category assign
// ═══════════════════════════════════════════════════════
async function loadCategoryMgr(categoryName, wrapperId) {
  const w = $(wrapperId);
  if (!w) return;
  w.innerHTML = '<div style="color:#888;padding:1rem;">Loading...</div>';

  try {
    const snap = await getDocs(query(collection(db,'members'), where('status','==','approved')));
    const allApproved = snap.docs.map(d => ({id:d.id, ...d.data()}));

    // এই category তে assigned members
    const assigned = allApproved.filter(m => m.category === categoryName);
    // Unassigned (General Member বা category নেই)
    const unassigned = allApproved.filter(m => !m.category || m.category === 'General Member');

    const catLabel = categoryName === 'Founding Member' ? 'Founding Member' : 'Honorary Member (Adviser)';
    const catColor = categoryName === 'Founding Member' ? '#B8111A' : '#C9A84C';
    const catBg    = categoryName === 'Founding Member' ? 'rgba(184,17,26,0.07)' : 'rgba(201,168,76,0.1)';

    w.innerHTML = `
      <!-- Assign from Members -->
      <div class="panel">
        <div class="panel-title" style="color:${catColor};">
          👥 Assign Member as ${catLabel}
        </div>
        <div style="margin-bottom:1rem;">
          <input type="text" id="${wrapperId}_search" placeholder="নাম দিয়ে খুঁজুন..."
            oninput="filterAssignList('${wrapperId}','${categoryName}')"
            style="width:100%;padding:10px 13px;border:1.5px solid #d1d5db;font-size:13px;font-family:'Inter',sans-serif;outline:none;">
        </div>
        <div id="${wrapperId}_list" style="max-height:320px;overflow-y:auto;border:1px solid #e5e7eb;">
          ${unassigned.length === 0
            ? '<p style="color:#888;padding:1rem;font-size:13px;">সব approved member ইতিমধ্যে assign করা আছে।</p>'
            : unassigned.map(m => memberAssignRow(m, categoryName, wrapperId)).join('')
          }
        </div>
        <p style="font-size:11px;color:#aaa;margin-top:8px;">* General Member হিসেবে আছেন এমন approved members দেখাচ্ছে।</p>
      </div>

      <!-- Currently Assigned -->
      <div class="panel">
        <div class="panel-title">
          ✅ Current ${catLabel}s
          <span style="background:${catColor};color:#fff;padding:3px 12px;font-size:10px;letter-spacing:1px;">${assigned.length} জন</span>
        </div>
        ${assigned.length === 0
          ? '<p style="color:#888;font-size:13px;padding:1rem;">কেউ এখনো assign করা হয়নি।</p>'
          : `<div style="overflow-x:auto;"><table class="table">
              <tr><th>Photo</th><th>Name</th><th>Sector</th><th>Mobile</th><th>Action</th></tr>
              ${assigned.map(m => {
                const photo = m.photoURL
                  ? `<img src="${m.photoURL}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb;">`
                  : `<div style="width:44px;height:44px;border-radius:50%;background:#0B3D20;display:flex;align-items:center;justify-content:center;color:#7EE8A2;font-weight:700;">${(m.fullname||'?').charAt(0)}</div>`;
                return `<tr>
                  <td>${photo}</td>
                  <td><strong>${m.fullname||'—'}</strong><br><small style="color:#888;">${m.bmcId||''}</small></td>
                  <td>${m.sector||''}</td>
                  <td>${m.mobile||''}</td>
                  <td><button class="abtn btn-delete" onclick="removeCategory('${m.id}','${wrapperId}','${categoryName}')">Remove</button></td>
                </tr>`;
              }).join('')}
            </table></div>`
        }
      </div>`;

    // Store unassigned list for search filtering
    window[`_assignData_${wrapperId}`] = { unassigned, categoryName };

  } catch(e) {
    w.innerHTML = `<p style="color:#B8111A;padding:1rem;">Error: ${e.message}</p>`;
  }
}

function memberAssignRow(m, categoryName, wrapperId) {
  const photo = m.photoURL
    ? `<img src="${m.photoURL}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb;">`
    : `<div style="width:40px;height:40px;border-radius:50%;background:#0B3D20;display:flex;align-items:center;justify-content:center;color:#7EE8A2;font-weight:700;">${(m.fullname||'?').charAt(0)}</div>`;
  return `<div class="assign-row" data-name="${(m.fullname||'').toLowerCase()}" data-id="${m.id}"
    style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid #f0f0f0;transition:background 0.15s;"
    onmouseover="this.style.background='#f9f9f9'" onmouseout="this.style.background=''">
    ${photo}
    <div style="flex:1;">
      <div style="font-weight:600;font-size:13px;color:#111;">${m.fullname||'—'}</div>
      <div style="font-size:11px;color:#888;">${m.sector||''} ${m.bmcId?'· '+m.bmcId:''}</div>
    </div>
    <button class="abtn btn-approve" onclick="assignCategory('${m.id}','${categoryName}','${wrapperId}')">
      + Assign
    </button>
  </div>`;
}

window.filterAssignList = function(wrapperId, categoryName) {
  const q = $(`${wrapperId}_search`)?.value?.toLowerCase() || '';
  const data = window[`_assignData_${wrapperId}`];
  if (!data) return;
  const listEl = $(`${wrapperId}_list`);
  if (!listEl) return;
  const filtered = data.unassigned.filter(m =>
    !q || (m.fullname||'').toLowerCase().includes(q) || (m.bmcId||'').toLowerCase().includes(q)
  );
  listEl.innerHTML = filtered.length
    ? filtered.map(m => memberAssignRow(m, categoryName, wrapperId)).join('')
    : '<p style="color:#888;padding:1rem;font-size:13px;">কোনো member পাওয়া যায়নি।</p>';
};

window.assignCategory = async (memberId, categoryName, wrapperId) => {
  try {
    await updateDoc(doc(db,'members',memberId), { category: categoryName });
    alert(`✓ ${categoryName} হিসেবে assign করা হয়েছে!`);
    loadCategoryMgr(categoryName, wrapperId);
  } catch(e) {
    alert('Error: ' + e.message);
  }
};

window.removeCategory = async (memberId, wrapperId, categoryName) => {
  if (!confirm('এই member কে category থেকে remove করবেন? তিনি General Member হয়ে যাবেন।')) return;
  try {
    await updateDoc(doc(db,'members',memberId), { category: 'General Member' });
    alert('✓ Remove করা হয়েছে।');
    loadCategoryMgr(categoryName, wrapperId);
  } catch(e) {
    alert('Error: ' + e.message);
  }
};

// ── OLD COMMITTEE MANAGER (committee, subcommittee এর জন্য) ──
async function loadCommMgr(col, wrapperId) {
  const w = $(wrapperId); if (!w) return;
  const snap = await getDocs(query(collection(db,col),orderBy('order','asc'))).catch(()=>null);
  w.innerHTML = `
    <div class="panel"><div class="panel-title">Add Person</div>
    <div class="fi">
      <div class="fr2">
        <input type="text" id="${col}_name" placeholder="Full Name *">
        <input type="text" id="${col}_role" placeholder="Role / Position *">
      </div>
      <div class="fr2">
        <input type="text" id="${col}_sector" placeholder="Sector">
        <input type="number" id="${col}_order" placeholder="Display Order" value="1">
      </div>
      <input type="file" id="${col}_photo" accept="image/*">
      <button class="add-btn" onclick="addComm('${col}')">Add Person</button>
      <p id="${col}_st" style="font-size:12px;color:#888;"></p>
    </div></div>
    <div class="panel"><div class="panel-title">Current Members</div>
    ${snap&&!snap.empty
      ? tbl(['Photo','Name','Role','Sector','Order','Action'],
          snap.docs.map(d=>{
            const m=d.data();
            const photo = m.photoURL
              ? `<img src="${m.photoURL}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb;">`
              : `<div style="width:44px;height:44px;border-radius:50%;background:#0B3D20;display:flex;align-items:center;justify-content:center;color:#7EE8A2;font-weight:700;">${(m.name||'?').charAt(0)}</div>`;
            return `<tr>
              <td>${photo}</td>
              <td><strong>${m.name||'—'}</strong></td>
              <td>${m.role||''}</td>
              <td>${m.sector||''}</td>
              <td>${m.order||''}</td>
              <td>${delBtn(`delComm_${col}`,d.id)}</td>
            </tr>`;
          }).join(''))
      : '<p style="color:#888;font-size:13px;padding:1rem;">No members added yet.</p>'}
    </div>`;

  const wrapMap = {committee:'mgr-committee',subcommittee:'mgr-subcommittee'};
  window[`delComm_${col}`] = async id => {
    if(!confirm('Delete this person?')) return;
    await deleteDoc(doc(db,col,id));
    loadCommMgr(col, wrapMap[col]);
  };
}
window.addComm = async col => {
  const name = val(`${col}_name`), role = val(`${col}_role`);
  if (!name||!role) { alert('Name and role are required.'); return; }
  const st = $(`${col}_st`); st.textContent='Saving...';
  try {
    const data = { name, role, sector:val(`${col}_sector`), order:parseInt(val(`${col}_order`))||1, createdAt:serverTimestamp() };
    const url = await upload(`${col}_photo`);
    if (url) data.photoURL = url;
    await addDoc(collection(db,col), data);
    st.textContent='✓ Added!';
    const wrapMap = {committee:'mgr-committee',subcommittee:'mgr-subcommittee'};
    setTimeout(()=>loadCommMgr(col,wrapMap[col]),800);
  } catch(e) { st.textContent='Error: '+e.message; }
};

// ── NEWS ──
async function loadNews() {
  const con = $('newsList'); if(!con) return; con.innerHTML='Loading...';
  try {
    const snap = await getDocs(query(collection(db,'news'),orderBy('createdAt','desc')));
    if(snap.empty){con.innerHTML='<p style="color:#888;padding:1rem;">No news yet.</p>';return;}
    con.innerHTML = tbl(['Image','Title','Tag','Action'],
      snap.docs.map(d=>{
        const n=d.data();
        return `<tr>
          <td>${n.imageURL?`<img src="${n.imageURL}" style="width:70px;height:48px;object-fit:cover;">`:'—'}</td>
          <td><strong>${n.title||'—'}</strong><br><small style="color:#888;">${(n.excerpt||'').slice(0,60)}</small></td>
          <td>${n.tag||''}</td>
          <td>${delBtn('delNews',d.id)}</td>
        </tr>`;
      }).join(''));
  } catch(e){ console.error(e); }
}
window.addNews = async () => {
  const title=val('nw_title'); if(!title){alert('Title is required.');return;}
  const st=$('nw_status'); st.textContent='Publishing...';
  try {
    const data={title,tag:val('nw_tag'),excerpt:val('nw_excerpt'),createdAt:serverTimestamp()};
    const url=await upload('nw_image'); if(url)data.imageURL=url;
    await addDoc(collection(db,'news'),data);
    st.textContent='✓ Published!';
    ['nw_title','nw_tag','nw_excerpt'].forEach(id=>{const el=$(id);if(el)el.value='';});
    loadNews();
  } catch(e){st.textContent='Error: '+e.message;}
};
window.delNews = async id=>{if(!confirm('Delete?'))return;await deleteDoc(doc(db,'news',id));loadNews();};

// ── EVENTS ──
async function loadEvents() {
  const con=$('eventsList'); if(!con)return; con.innerHTML='Loading...';
  try {
    const snap=await getDocs(query(collection(db,'events'),orderBy('date','desc')));
    if(snap.empty){con.innerHTML='<p style="color:#888;padding:1rem;">No events.</p>';return;}
    con.innerHTML=tbl(['Title','Date','Location','Tag','Status','Action'],
      snap.docs.map(d=>{
        const e=d.data();
        return `<tr>
          <td><strong>${e.title||'—'}</strong></td>
          <td>${e.date||''}</td>
          <td>${e.location||''}</td>
          <td>${e.tag||''}</td>
          <td><span style="font-size:10px;padding:3px 10px;background:${e.upcoming?'rgba(21,112,64,0.1)':'rgba(0,0,0,0.05)'};color:${e.upcoming?'#157040':'#888'};font-weight:700;border:1px solid ${e.upcoming?'rgba(21,112,64,0.2)':'#ddd'};">${e.upcoming?'Upcoming':'Past'}</span></td>
          <td>${delBtn('delEvent',d.id)}</td>
        </tr>`;
      }).join(''));
  } catch(e){console.error(e);}
}
window.addEvent = async()=>{
  const title=val('ev_title'); if(!title){alert('Title is required.');return;}
  try{
    await addDoc(collection(db,'events'),{
      title,location:val('ev_location'),date:val('ev_date'),
      tag:val('ev_tag'),upcoming:$('ev_upcoming').checked,createdAt:serverTimestamp()
    });
    alert('✓ Event added!');
    ['ev_title','ev_location','ev_date','ev_tag'].forEach(id=>{const el=$(id);if(el)el.value='';});
    loadEvents();
  }catch(e){alert('Error: '+e.message);}
};
window.delEvent=async id=>{if(!confirm('Delete?'))return;await deleteDoc(doc(db,'events',id));loadEvents();};

// ── GALLERY ──
async function loadGallery(){
  const con=$('galleryList'); if(!con)return;
  try{
    const snap=await getDocs(query(collection(db,'gallery'),orderBy('createdAt','desc')));
    if(snap.empty){con.innerHTML='<p style="color:#888;padding:1rem;">No photos.</p>';return;}
    con.innerHTML=snap.docs.map(d=>{
      const g=d.data();
      return `<div style="position:relative;">
        <img src="${g.url}" style="width:100%;aspect-ratio:4/3;object-fit:cover;display:block;">
        <div style="padding:6px;font-size:11px;color:#888;">${g.caption||''}</div>
        <button onclick="delGallery('${d.id}')" style="position:absolute;top:6px;right:6px;background:#B8111A;color:#fff;border:none;cursor:pointer;padding:4px 10px;font-size:11px;font-weight:700;">✕</button>
      </div>`;
    }).join('');
  }catch(e){console.error(e);}
}
window.uploadGallery=async()=>{
  const st=$('galleryStatus'); st.textContent='Uploading...';
  try{
    const url=await upload('galleryPhoto');
    if(!url){st.textContent='Please select a photo.';return;}
    await addDoc(collection(db,'gallery'),{url,caption:val('galleryCaption'),createdAt:serverTimestamp()});
    st.textContent='✓ Uploaded!';
    $('galleryPhoto').value=''; $('galleryCaption').value='';
    loadGallery();
  }catch(e){st.textContent='Error: '+e.message;}
};
window.delGallery=async id=>{if(!confirm('Delete?'))return;await deleteDoc(doc(db,'gallery',id));loadGallery();};

// ── VIDEOS ──
async function loadVideos(){
  const con=$('videosList'); if(!con)return; con.innerHTML='Loading...';
  try{
    const snap=await getDocs(query(collection(db,'videos'),orderBy('createdAt','desc')));
    if(snap.empty){con.innerHTML='<p style="color:#888;padding:1rem;">No videos.</p>';return;}
    con.innerHTML=tbl(['Preview','Title','YouTube ID','Date','Action'],
      snap.docs.map(d=>{
        const v=d.data();
        return `<tr>
          <td><img src="https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg" style="width:80px;height:50px;object-fit:cover;"></td>
          <td><strong>${v.title||'—'}</strong></td>
          <td style="font-size:12px;color:#888;">${v.youtubeId||''}</td>
          <td>${v.date||''}</td>
          <td>${delBtn('delVideo',d.id)}</td>
        </tr>`;
      }).join(''));
  }catch(e){console.error(e);}
}
window.addVideo=async()=>{
  const title=val('vd_title'),ytId=val('vd_youtubeId');
  if(!title||!ytId){alert('Title and YouTube ID are required.');return;}
  try{
    await addDoc(collection(db,'videos'),{title,youtubeId:ytId,date:val('vd_date'),createdAt:serverTimestamp()});
    alert('✓ Video added!');
    ['vd_title','vd_youtubeId','vd_date'].forEach(id=>{const el=$(id);if(el)el.value='';});
    loadVideos();
  }catch(e){alert('Error: '+e.message);}
};
window.delVideo=async id=>{if(!confirm('Delete?'))return;await deleteDoc(doc(db,'videos',id));loadVideos();};

// ── FEEDBACK ──
async function loadFeedback(){
  const con=$('feedbackList'); if(!con)return; con.innerHTML='Loading...';
  try{
    const snap=await getDocs(query(collection(db,'feedback'),orderBy('createdAt','desc')));
    if(snap.empty){con.innerHTML='<p style="color:#888;padding:1rem;">No feedback.</p>';return;}
    con.innerHTML=tbl(['Type','Name','Subject','Message','Date','Action'],
      snap.docs.map(d=>{
        const f=d.data();
        const date = f.createdAt?.toDate ? f.createdAt.toDate().toLocaleDateString('en-GB') : '';
        return `<tr>
          <td><span style="font-size:10px;padding:3px 10px;background:${f.type==='Complaint'?'rgba(184,17,26,0.1)':'rgba(21,112,64,0.1)'};color:${f.type==='Complaint'?'#B8111A':'#157040'};font-weight:700;border:1px solid ${f.type==='Complaint'?'rgba(184,17,26,0.25)':'rgba(21,112,64,0.25)'};">${f.type||'Suggestion'}</span></td>
          <td>${f.name||'Anonymous'}</td>
          <td><strong>${f.subject||'—'}</strong></td>
          <td style="font-size:12px;max-width:250px;">${f.message||''}</td>
          <td style="font-size:12px;color:#888;">${date}</td>
          <td>${delBtn('delFeedback',d.id)}</td>
        </tr>`;
      }).join(''));
  }catch(e){console.error(e);}
}
window.delFeedback=async id=>{if(!confirm('Delete?'))return;await deleteDoc(doc(db,'feedback',id));loadFeedback();};

// ═══════════════════════════════════════════════════════
// ── Fix #3: EDIT MEMBER INFO ──
// ═══════════════════════════════════════════════════════
window.editMember = async (id) => {
  const m = allMembersData[id];
  if (!m) return;

  $('modalBody').innerHTML = `
    <div style="padding:1rem 0;">
      <p style="font-size:12px;color:#888;margin-bottom:1rem;">যা edit করতে চান তা পরিবর্তন করুন, বাকিগুলো আগের মতো থাকবে।</p>
      <div class="fi">
        <div class="fr2">
          <div><label style="font-size:10px;color:#888;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:4px;">Full Name</label>
          <input type="text" id="edit_fullname" value="${m.fullname||''}" style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;box-sizing:border-box;"></div>
          <div><label style="font-size:10px;color:#888;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:4px;">Sector / Instrument</label>
          <input type="text" id="edit_sector" value="${m.sector||''}" style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;box-sizing:border-box;"></div>
        </div>
        <div class="fr2">
          <div><label style="font-size:10px;color:#888;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:4px;">Mobile</label>
          <input type="text" id="edit_mobile" value="${m.mobile||''}" style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;box-sizing:border-box;"></div>
          <div><label style="font-size:10px;color:#888;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:4px;">WhatsApp</label>
          <input type="text" id="edit_whatsapp" value="${m.whatsapp||''}" style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;box-sizing:border-box;"></div>
        </div>
        <div class="fr2">
          <div><label style="font-size:10px;color:#888;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:4px;">Email</label>
          <input type="text" id="edit_email" value="${m.email||''}" style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;box-sizing:border-box;"></div>
          <div><label style="font-size:10px;color:#888;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:4px;">Facebook</label>
          <input type="text" id="edit_facebook" value="${m.facebook||''}" style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;box-sizing:border-box;"></div>
        </div>
        <div class="fr2">
          <div><label style="font-size:10px;color:#888;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:4px;">Experience</label>
          <input type="text" id="edit_experience" value="${m.experience||''}" style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;box-sizing:border-box;"></div>
          <div><label style="font-size:10px;color:#888;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:4px;">Organization / Band</label>
          <input type="text" id="edit_organization" value="${m.organization||''}" style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;box-sizing:border-box;"></div>
        </div>
        <p id="edit_status" style="font-size:12px;color:#888;"></p>
      </div>
    </div>`;

  $('modalActions').innerHTML = `
    <button class="add-btn" onclick="saveMemberEdit('${id}')">💾 Save Changes</button>
    <button class="abtn btn-view" onclick="viewMemberDetail('${id}')">← Back</button>
  `;
};

window.saveMemberEdit = async (id) => {
  const st = $('edit_status');
  st.textContent = 'Saving...';
  try {
    const updates = {
      fullname:     $('edit_fullname')?.value?.trim() || allMembersData[id]?.fullname,
      sector:       $('edit_sector')?.value?.trim()   || allMembersData[id]?.sector,
      mobile:       $('edit_mobile')?.value?.trim()   || allMembersData[id]?.mobile,
      whatsapp:     $('edit_whatsapp')?.value?.trim(),
      email:        $('edit_email')?.value?.trim(),
      facebook:     $('edit_facebook')?.value?.trim(),
      experience:   $('edit_experience')?.value?.trim(),
      organization: $('edit_organization')?.value?.trim(),
    };
    await updateDoc(doc(db,'members',id), updates);
    // cache update
    allMembersData[id] = {...allMembersData[id], ...updates};
    st.textContent = '✓ Saved!';
    st.style.color = '#157040';
    setTimeout(() => viewMemberDetail(id), 800);
  } catch(e) {
    st.textContent = 'Error: ' + e.message;
    st.style.color = '#B8111A';
  }
};

// ── BMC-ID ASSIGN ──
window.editBmcId = async (id) => {
  const m = allMembersData[id];
  if (!m) return;

  $('modalBody').innerHTML = `
    <div style="padding:1.5rem 0;">
      <p style="font-size:13px;color:#888;margin-bottom:1.5rem;">
        Member: <strong>${m.fullname||'—'}</strong><br>
        Current BMC-ID: <strong style="color:#C9A84C;font-family:'Cinzel',serif;">${m.bmcId || 'Not assigned'}</strong>
      </p>
      <label style="font-size:10px;color:#888;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:6px;">New BMC-ID</label>
      <input type="text" id="edit_bmcid"
        value="${m.bmcId||''}"
        placeholder="BMC-YYYY-NNNN"
        style="width:100%;padding:11px 14px;border:2px solid #C9A84C;font-family:'Cinzel',serif;font-size:14px;font-weight:700;letter-spacing:2px;box-sizing:border-box;">
      <p style="font-size:11px;color:#aaa;margin-top:6px;">Format: BMC-2024-0001</p>
      <p id="bmcid_status" style="font-size:12px;margin-top:8px;"></p>
    </div>`;

  $('modalActions').innerHTML = `
    <button class="add-btn" style="background:#C9A84C;color:#0B3D20;" onclick="saveBmcId('${id}')">💾 Save BMC-ID</button>
    <button class="abtn btn-view" onclick="viewMemberDetail('${id}')">← Back</button>
  `;
};

window.saveBmcId = async (id) => {
  const bmcId = $('edit_bmcid')?.value?.trim();
  const st = $('bmcid_status');
  if (!bmcId) { st.textContent = 'BMC-ID লিখুন।'; st.style.color='#B8111A'; return; }
  st.textContent = 'Saving...'; st.style.color = '#888';
  try {
    await updateDoc(doc(db,'members',id), { bmcId });
    allMembersData[id] = {...allMembersData[id], bmcId};
    st.textContent = '✓ BMC-ID assigned!'; st.style.color = '#157040';
    setTimeout(() => viewMemberDetail(id), 800);
  } catch(e) {
    st.textContent = 'Error: ' + e.message; st.style.color = '#B8111A';
  }
};

// ═══════════════════════════════════════════════════════
// ── Fix #5: EXECUTIVE COMMITTEE MANAGER ──
// Founders/Advisers এর মতো assign + Role system
// ═══════════════════════════════════════════════════════
async function loadExecutiveMgr(wrapperId) {
  const w = $(wrapperId);
  if (!w) return;
  w.innerHTML = '<div style="color:#888;padding:1rem;">Loading...</div>';

  try {
    const snap = await getDocs(query(collection(db,'members'), where('status','==','approved')));
    const allApproved = snap.docs.map(d => ({id:d.id, ...d.data()}));

    // Executive role আছে এমন members
    const assigned = allApproved.filter(m => m.executiveRole);
    // Unassigned
    const unassigned = allApproved.filter(m => !m.executiveRole);

    // Existing roles from Firebase
    const rolesSnap = await getDocs(collection(db,'executiveRoles')).catch(()=>null);
    const roles = rolesSnap ? rolesSnap.docs.map(d => d.data().name).filter(Boolean) : [];

    w.innerHTML = `
      <!-- Role Create Panel -->
      <div class="panel">
        <div class="panel-title" style="color:#C9A84C;">⚙️ Manage Roles</div>
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:1rem;">
          <input type="text" id="new_role_input" placeholder="New role name (e.g. President)"
            style="flex:1;padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;">
          <button class="add-btn" onclick="addExecutiveRole()">+ Add Role</button>
        </div>
        <div id="roles_list" style="display:flex;flex-wrap:wrap;gap:8px;">
          ${roles.length === 0
            ? '<span style="font-size:12px;color:#aaa;">কোনো role তৈরি হয়নি।</span>'
            : roles.map(r => `
              <span style="background:#f0f9f4;border:1px solid #157040;color:#157040;padding:5px 14px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:8px;">
                ${r}
                <button onclick="deleteExecutiveRole('${r}')" style="background:none;border:none;color:#B8111A;cursor:pointer;font-size:14px;padding:0;line-height:1;">✕</button>
              </span>`).join('')
          }
        </div>
        <p id="role_status" style="font-size:12px;color:#888;margin-top:8px;"></p>
      </div>

      <!-- Assign Panel -->
      <div class="panel">
        <div class="panel-title" style="color:#0B3D20;">👥 Assign Executive Member</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:1rem;">
          <input type="text" id="exec_search" placeholder="নাম দিয়ে খুঁজুন..."
            oninput="filterExecList()"
            style="padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;">
          <select id="exec_role_select" style="padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;">
            <option value="">— Role সিলেক্ট করুন —</option>
            ${roles.map(r=>`<option value="${r}">${r}</option>`).join('')}
          </select>
        </div>
        <div id="exec_assign_list" style="max-height:300px;overflow-y:auto;border:1px solid #e5e7eb;">
          ${unassigned.length === 0
            ? '<p style="color:#888;padding:1rem;font-size:13px;">সব approved member ইতিমধ্যে assign করা আছে।</p>'
            : unassigned.map(m => execAssignRow(m)).join('')
          }
        </div>
        <p style="font-size:11px;color:#aaa;margin-top:8px;">* প্রথমে Role সিলেক্ট করুন, তারপর member এ Assign ক্লিক করুন।</p>
      </div>

      <!-- Current Executive Members -->
      <div class="panel">
        <div class="panel-title">
          ✅ Current Executive Committee
          <span style="background:#0B3D20;color:#fff;padding:3px 12px;font-size:10px;letter-spacing:1px;">${assigned.length} জন</span>
        </div>
        ${assigned.length === 0
          ? '<p style="color:#888;font-size:13px;padding:1rem;">কেউ এখনো assign করা হয়নি।</p>'
          : `<div style="overflow-x:auto;"><table class="table">
              <tr><th>Photo</th><th>Name</th><th>Role</th><th>Sector</th><th>Action</th></tr>
              ${assigned.map(m => {
                const photo = m.photoURL
                  ? `<img src="${m.photoURL}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb;">`
                  : `<div style="width:44px;height:44px;border-radius:50%;background:#0B3D20;display:flex;align-items:center;justify-content:center;color:#7EE8A2;font-weight:700;">${(m.fullname||'?').charAt(0)}</div>`;
                return `<tr>
                  <td>${photo}</td>
                  <td><strong>${m.fullname||'—'}</strong><br><small style="color:#888;">${m.bmcId||''}</small></td>
                  <td><span style="background:rgba(11,61,32,0.08);color:#0B3D20;padding:3px 10px;font-size:11px;font-weight:700;">${m.executiveRole||'—'}</span></td>
                  <td>${m.sector||''}</td>
                  <td><button class="abtn btn-delete" onclick="removeExecutiveRole('${m.id}')">Remove</button></td>
                </tr>`;
              }).join('')}
            </table></div>`
        }
      </div>`;

    // store for filter
    window._execUnassigned = unassigned;

  } catch(e) {
    w.innerHTML = `<p style="color:#B8111A;padding:1rem;">Error: ${e.message}</p>`;
  }
}

function execAssignRow(m) {
  const photo = m.photoURL
    ? `<img src="${m.photoURL}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb;">`
    : `<div style="width:40px;height:40px;border-radius:50%;background:#0B3D20;display:flex;align-items:center;justify-content:center;color:#7EE8A2;font-weight:700;">${(m.fullname||'?').charAt(0)}</div>`;
  return `<div class="exec-row" data-name="${(m.fullname||'').toLowerCase()}" data-id="${m.id}"
    style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid #f0f0f0;"
    onmouseover="this.style.background='#f9f9f9'" onmouseout="this.style.background=''">
    ${photo}
    <div style="flex:1;">
      <div style="font-weight:600;font-size:13px;">${m.fullname||'—'}</div>
      <div style="font-size:11px;color:#888;">${m.sector||''} ${m.bmcId?'· '+m.bmcId:''}</div>
    </div>
    <button class="abtn btn-approve" onclick="assignExecutiveRole('${m.id}')">+ Assign</button>
  </div>`;
}

window.filterExecList = function() {
  const q = $('exec_search')?.value?.toLowerCase() || '';
  const listEl = $('exec_assign_list');
  if (!listEl || !window._execUnassigned) return;
  const filtered = window._execUnassigned.filter(m =>
    !q || (m.fullname||'').toLowerCase().includes(q) || (m.bmcId||'').toLowerCase().includes(q)
  );
  listEl.innerHTML = filtered.length
    ? filtered.map(m => execAssignRow(m)).join('')
    : '<p style="color:#888;padding:1rem;font-size:13px;">পাওয়া যায়নি।</p>';
};

window.assignExecutiveRole = async (memberId) => {
  const role = $('exec_role_select')?.value;
  if (!role) { alert('প্রথমে একটি Role সিলেক্ট করুন।'); return; }
  try {
    await updateDoc(doc(db,'members',memberId), { executiveRole: role });
    alert(`✓ "${role}" হিসেবে assign করা হয়েছে!`);
    loadExecutiveMgr('mgr-executive');
  } catch(e) { alert('Error: ' + e.message); }
};

window.removeExecutiveRole = async (memberId) => {
  if (!confirm('Executive role remove করবেন?')) return;
  try {
    await updateDoc(doc(db,'members',memberId), { executiveRole: '' });
    alert('✓ Remove করা হয়েছে।');
    loadExecutiveMgr('mgr-executive');
  } catch(e) { alert('Error: ' + e.message); }
};

window.addExecutiveRole = async () => {
  const name = $('new_role_input')?.value?.trim();
  const st = $('role_status');
  if (!name) { st.textContent = 'Role name লিখুন।'; st.style.color='#B8111A'; return; }
  st.textContent = 'Saving...'; st.style.color='#888';
  try {
    await addDoc(collection(db,'executiveRoles'), { name, createdAt: serverTimestamp() });
    st.textContent = `✓ "${name}" role যোগ হয়েছে!`; st.style.color='#157040';
    $('new_role_input').value = '';
    setTimeout(() => loadExecutiveMgr('mgr-executive'), 600);
  } catch(e) { st.textContent = 'Error: ' + e.message; st.style.color='#B8111A'; }
};

window.deleteExecutiveRole = async (name) => {
  if (!confirm(`"${name}" role delete করবেন?`)) return;
  try {
    const snap = await getDocs(query(collection(db,'executiveRoles'), where('name','==',name)));
    for (const d of snap.docs) await deleteDoc(doc(db,'executiveRoles',d.id));
    loadExecutiveMgr('mgr-executive');
  } catch(e) { alert('Error: ' + e.message); }
};

// ═══════════════════════════════════════════════════════
// ── ADD MEMBER (Admin) ──
// Public registration form এর মতো, auto-approved
// ═══════════════════════════════════════════════════════
window.openAddMemberModal = function() {
  $('modalHeader').innerHTML = `
    <div class="a-modal-avatar" style="font-size:1.5rem;">➕</div>
    <div>
      <div class="a-modal-name">Add New Member</div>
      <div class="a-modal-role">Admin Entry · Auto Approved</div>
    </div>`;

  $('modalBody').innerHTML = `
    <div style="padding:0.5rem 0;">
      <p style="font-size:12px;color:#888;margin-bottom:1.2rem;background:#f0f9f4;padding:10px;border-left:3px solid #157040;">
        এই form এর মাধ্যমে যোগ করা member সরাসরি <strong>approved</strong> হবে।
      </p>

      <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#B8111A;margin:0 0 0.8rem;padding-bottom:6px;border-bottom:1px solid #f0f0f0;">Personal Information</div>
      <div class="fi">
        <div class="fr2">
          <div><label style="font-size:10px;color:#888;display:block;margin-bottom:3px;">Full Name *</label>
          <input type="text" id="am_fullname" placeholder="Full name" style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;box-sizing:border-box;"></div>
          <div><label style="font-size:10px;color:#888;display:block;margin-bottom:3px;">Date of Birth</label>
          <input type="date" id="am_dob" style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;box-sizing:border-box;"></div>
        </div>
        <div class="fr2">
          <div><label style="font-size:10px;color:#888;display:block;margin-bottom:3px;">Blood Group</label>
          <select id="am_blood" style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;box-sizing:border-box;">
            <option value="">Select</option>
            <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
            <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
          </select></div>
          <div><label style="font-size:10px;color:#888;display:block;margin-bottom:3px;">NID Number</label>
          <input type="text" id="am_nid" placeholder="NID" style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;box-sizing:border-box;"></div>
        </div>
      </div>

      <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#B8111A;margin:1.2rem 0 0.8rem;padding-bottom:6px;border-bottom:1px solid #f0f0f0;">Contact Information</div>
      <div class="fi">
        <div class="fr2">
          <div><label style="font-size:10px;color:#888;display:block;margin-bottom:3px;">Mobile *</label>
          <input type="text" id="am_mobile" placeholder="01XXXXXXXXX" style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;box-sizing:border-box;"></div>
          <div><label style="font-size:10px;color:#888;display:block;margin-bottom:3px;">WhatsApp</label>
          <input type="text" id="am_whatsapp" placeholder="01XXXXXXXXX" style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;box-sizing:border-box;"></div>
        </div>
        <div class="fr2">
          <div><label style="font-size:10px;color:#888;display:block;margin-bottom:3px;">Email</label>
          <input type="email" id="am_email" placeholder="email@example.com" style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;box-sizing:border-box;"></div>
          <div><label style="font-size:10px;color:#888;display:block;margin-bottom:3px;">Facebook</label>
          <input type="text" id="am_facebook" placeholder="https://facebook.com/..." style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;box-sizing:border-box;"></div>
        </div>
      </div>

      <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#B8111A;margin:1.2rem 0 0.8rem;padding-bottom:6px;border-bottom:1px solid #f0f0f0;">Address</div>
      <div class="fi">
        <div class="fr2">
          <div><label style="font-size:10px;color:#888;display:block;margin-bottom:3px;">Division</label>
          <select id="am_div" style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;box-sizing:border-box;">
            <option value="">Select Division</option>
            <option>Dhaka</option><option>Chattagram</option><option>Rajshahi</option>
            <option>Khulna</option><option>Barisal</option><option>Sylhet</option>
            <option>Rangpur</option><option>Mymensingh</option>
          </select></div>
          <div><label style="font-size:10px;color:#888;display:block;margin-bottom:3px;">District</label>
          <input type="text" id="am_dist" placeholder="District" style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;box-sizing:border-box;"></div>
        </div>
      </div>

      <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#B8111A;margin:1.2rem 0 0.8rem;padding-bottom:6px;border-bottom:1px solid #f0f0f0;">Professional Information</div>
      <div class="fi">
        <div class="fr2">
          <div><label style="font-size:10px;color:#888;display:block;margin-bottom:3px;">Main Instrument / Vocal *</label>
          <select id="am_sector" style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;box-sizing:border-box;">
            <option value="">— Select —</option>
            <optgroup label="🎤 Vocal"><option>Singer (Classical)</option><option>Singer (Folk / Baul)</option><option>Singer (Modern / Pop)</option><option>Singer (Rabindra Sangeet)</option><option>Singer (Nazrul Sangeet)</option><option>Singer (Band / Rock)</option><option>Singer (Devotional)</option><option>Singer (Other)</option></optgroup>
            <optgroup label="🎸 String"><option>Guitar (Acoustic)</option><option>Guitar (Electric)</option><option>Guitar (Bass)</option><option>Sitar</option><option>Violin / Fiddle</option><option>Dotara</option><option>Esraj</option></optgroup>
            <optgroup label="🥁 Percussion"><option>Tabla</option><option>Dhol</option><option>Drum Kit</option><option>Cajon</option><option>Khol</option><option>Mridanga</option></optgroup>
            <optgroup label="🎹 Keys"><option>Harmonium</option><option>Piano</option><option>Keyboard / Synthesizer</option><option>Accordion</option></optgroup>
            <optgroup label="🎺 Wind"><option>Bansuri / Flute</option><option>Shehnai</option><option>Saxophone</option><option>Trumpet</option><option>Clarinet</option></optgroup>
            <optgroup label="🔊 Technical"><option>Sound Engineer</option><option>Mixing Engineer</option><option>Audio Technician</option><option>Live Sound Operator</option></optgroup>
            <optgroup label="🎬 Production"><option>Stage Manager</option><option>Lighting Operator</option><option>Production Manager</option></optgroup>
            <optgroup label="🎵 Other"><option>Music Composer</option><option>Lyricist</option><option>Music Director</option><option>Music Teacher</option><option>Other</option></optgroup>
          </select></div>
          <div><label style="font-size:10px;color:#888;display:block;margin-bottom:3px;">Experience</label>
          <select id="am_experience" style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;box-sizing:border-box;">
            <option value="">Select</option>
            <option>Less than 1 year</option><option>1–3 years</option>
            <option>3–5 years</option><option>5–10 years</option><option>10+ years</option>
          </select></div>
        </div>
        <div class="fr2">
          <div><label style="font-size:10px;color:#888;display:block;margin-bottom:3px;">Member Category *</label>
          <select id="am_category" style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;box-sizing:border-box;">
            <option value="General Member">General Member — Paid</option>
            <option value="Honorary Member">Honorary Member — Unpaid</option>
          </select></div>
          <div><label style="font-size:10px;color:#888;display:block;margin-bottom:3px;">BMC-ID (optional)</label>
          <input type="text" id="am_bmcid" placeholder="BMC-2024-0001" style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;font-family:'Cinzel',serif;font-size:13px;box-sizing:border-box;"></div>
        </div>
        <div><label style="font-size:10px;color:#888;display:block;margin-bottom:3px;">Profile Photo</label>
        <input type="file" id="am_photo" accept="image/*" style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;font-size:13px;box-sizing:border-box;"></div>
      </div>

      <p id="am_status" style="font-size:12px;margin-top:1rem;text-align:center;"></p>
    </div>`;

  $('modalActions').innerHTML = `
    <button class="add-btn" onclick="submitAddMember()">✓ Add Member</button>
    <button class="abtn btn-delete" onclick="closeMemberModal()">Cancel</button>
  `;

  $('memberModal').classList.add('open');
};

window.submitAddMember = async () => {
  const g = id => $(id)?.value?.trim() || '';
  const st = $('am_status');

  // Validation
  if (!g('am_fullname')) { st.textContent='⚠️ Full Name required.'; st.style.color='#B8111A'; return; }
  if (!g('am_mobile'))   { st.textContent='⚠️ Mobile required.'; st.style.color='#B8111A'; return; }
  if (!g('am_sector'))   { st.textContent='⚠️ Instrument/Vocal required.'; st.style.color='#B8111A'; return; }

  st.textContent = 'Saving...'; st.style.color = '#888';

  try {
    const data = {
      fullname:   g('am_fullname'),
      dob:        g('am_dob'),
      blood:      g('am_blood'),
      nid:        g('am_nid'),
      mobile:     g('am_mobile'),
      whatsapp:   g('am_whatsapp'),
      email:      g('am_email'),
      facebook:   g('am_facebook'),
      div_c:      g('am_div'),
      dist_c:     g('am_dist'),
      sector:     g('am_sector'),
      experience: g('am_experience'),
      category:   g('am_category') || 'General Member',
      bmcId:      g('am_bmcid') || '',
      status:     'approved', // auto approved
      createdAt:  serverTimestamp(),
    };

    // Photo upload
    const photoInput = $('am_photo');
    if (photoInput?.files[0]) {
      try {
        const url = await uploadToCloudinary(photoInput.files[0]);
        if (url) data.photoURL = url;
      } catch(e) { console.warn('Photo upload failed:', e); }
    }

    await addDoc(collection(db,'members'), data);
    st.textContent = '✓ Member added successfully!'; st.style.color = '#157040';
    setTimeout(() => { closeMemberModal(); loadMembers(); }, 1000);
  } catch(e) {
    st.textContent = 'Error: ' + e.message; st.style.color = '#B8111A';
  }
};

// ── NOTICE ──
async function loadNotice() {
  const con = $('noticeList'); if(!con) return;
  con.innerHTML = '<div style="color:#888;padding:1rem;">Loading...</div>';
  try {
    const snap = await getDocs(query(collection(db,'notices'), orderBy('createdAt','desc')));
    if(snap.empty){ con.innerHTML='<p style="color:#888;padding:1rem;">কোনো নোটিশ নেই।</p>'; return; }
    con.innerHTML = snap.docs.map(d => {
      const n = d.data();
      const date = n.createdAt?.toDate ? n.createdAt.toDate().toLocaleDateString('en-GB') : '';
      return `<div style="padding:1.2rem;border-bottom:1px solid #f0f0f0;">
        <div style="font-size:10px;color:#888;margin-bottom:4px;">${date}</div>
        <div style="font-weight:700;font-size:14px;margin-bottom:6px;">${n.title||'—'}</div>
        <div style="font-size:13px;color:#555;">${n.body||''}</div>
      </div>`;
    }).join('');
  } catch(e){ con.innerHTML='<p style="color:#B8111A;padding:1rem;">Load error: '+e.message+'</p>'; }
}
window.addNotice = async () => {
  const title = val('noticeTitle'); if(!title){alert('Title required.');return;}
  try {
    await addDoc(collection(db,'notices'),{title, body:val('noticeBody'), createdAt:serverTimestamp()});
    alert('✓ Notice added!');
    ['noticeTitle','noticeBody'].forEach(id=>{const el=$(id);if(el)el.value='';});
    loadNotice();
  } catch(e){alert('Error: '+e.message);}
};
window.delNotice = async id => {
  if(!confirm('Delete?'))return;
  await deleteDoc(doc(db,'notices',id));
  loadNotice();
};

// ── ABOUT (Admin edit) ──
async function loadAbout() {
  const con = $('aboutEditContent'); if(!con) return;
  con.innerHTML = '<div style="color:#888;padding:1rem;">Loading...</div>';
  try {
    const snap = await getDocs(collection(db,'settings'));
    let about = null;
    snap.docs.forEach(d => { if(d.id==='about') about = d.data(); });
    const intro = about?.intro || '';
    const goals = about?.goals || '';
    // index.html এ existing textarea গুলো populate করি
  const introEl = $('aboutIntro'); if(introEl) introEl.value = intro;
  const goalsEl = $('aboutGoals'); if(goalsEl) goalsEl.value = goals;
  con.innerHTML = '<p style="color:#157040;font-size:12px;padding:4px 0;">✓ Content loaded — edit করুন এবং Save করুন।</p>';
  } catch(e){ con.innerHTML='<p style="color:#B8111A;padding:1rem;">Error: '+e.message+'</p>'; }
}
window.saveAbout = async () => {
  const st = document.createElement('span'); st.textContent = 'Saving...';
  try {
    await setDoc(doc(db,'settings','about'), {
      intro: $('aboutIntro')?.value || '',
      goals: $('aboutGoals')?.value || '',
      updatedAt: serverTimestamp()
    });
    st.textContent = '✓ Saved!'; st.style.color = '#157040'; const as=$('aboutStatus'); if(as){as.textContent='✓ Saved!';as.style.color='#157040';}
  } catch(e){ st.textContent = 'Error: '+e.message; st.style.color='#B8111A'; }
};
