import { db, auth } from '../js/firebase-config.js';
import { uploadToCloudinary } from '../js/cloudinary.js';
import {
  collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc,
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
    founders: () => loadCategoryMgr('Founding Member', 'mgr-founders'),
    advisers: () => loadCategoryMgr('Honorary Member', 'mgr-advisers'),
    committee: () => loadCommMgr('committee','mgr-committee'),
    subcommittee: () => loadCommMgr('subcommittee','mgr-subcommittee'),
    news: loadNews, events: loadEvents,
    gallery: loadGallery, videos: loadVideos,
    feedback: loadFeedback
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
    const [p,m,e] = await Promise.all([
      getDocs(query(collection(db,'members'),where('status','==','pending'))),
      getDocs(query(collection(db,'members'),where('status','==','approved'))),
      getDocs(collection(db,'events')),
    ]);
    const el1=$('sPending'); if(el1) el1.textContent=p.size;
    const el2=$('sMembers'); if(el2) el2.textContent=m.size;
    const el3=$('sEvents');  if(el3) el3.textContent=e.size;
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
  await updateDoc(doc(db,'members',id), {status});
  loadApplications(); loadDashboard();
  alert(status==='approved' ? '✓ Member approved!' : '✗ Application rejected.');
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
