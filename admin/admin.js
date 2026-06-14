import { db, auth } from '../js/firebase-config.js';
import { uploadToCloudinary } from '../js/cloudinary.js';
import {
  collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc,
  query, orderBy, where, serverTimestamp, limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* ═══════════════════════════════════════
   AUTH
═══════════════════════════════════════ */
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

/* ═══════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════ */
window.showSec = (id, el) => {
  document.querySelectorAll('.sc').forEach(s => s.classList.remove('active'));
  const sec = document.getElementById('sec-' + id);
  if (sec) sec.classList.add('active');
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  if (el) el.classList.add('active');
  loadSec(id);
};

// Committee collection mapping
const COMM_MAP = {
  founders:     { col: 'founders',     title: 'Founders',           wrap: 'mgr-founders'     },
  president:    { col: 'president',    title: 'President',          wrap: 'mgr-president'    },
  secretary:    { col: 'secretary',    title: 'General Secretary',  wrap: 'mgr-secretary'    },
  treasurer:    { col: 'treasurer',    title: 'Treasurer',          wrap: 'mgr-treasurer'    },
  executive:    { col: 'executive',    title: 'Executive Committee',wrap: 'mgr-executive'    },
  subcommittee: { col: 'subcommittee', title: 'Sub-Committees',     wrap: 'mgr-subcommittee' },
};

function loadSec(id) {
  if (COMM_MAP[id]) {
    const m = COMM_MAP[id];
    loadCommMgr(m.col, m.wrap);
    return;
  }
  const map = {
    dashboard:    loadDashboard,
    applications: loadApplications,
    members:      loadMembers,
    events:       loadEvents,
    gallery:      loadGallery,
    videos:       loadVideos,
    feedback:     loadFeedback,
  };
  if (map[id]) map[id]();
}

/* ═══════════════════════════════════════
   HELPERS
═══════════════════════════════════════ */
const $   = id  => document.getElementById(id);
const val = id  => $(id)?.value?.trim() || '';

function tbl(headers, rows) {
  return `<div style="overflow-x:auto;">
    <table class="table">
      <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
      ${rows}
    </table>
  </div>`;
}
function delBtn(fn, id) {
  return `<button class="abtn btn-delete" onclick="${fn}('${id}')">Delete</button>`;
}
async function upload(fileInputId) {
  const f = $(fileInputId)?.files[0];
  return f ? await uploadToCloudinary(f) : null;
}
function avatarDiv(photoURL, name, size=44) {
  const init = (name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  if (photoURL) return `<img src="${photoURL}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb;">`;
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#0B3D20;display:flex;align-items:center;justify-content:center;color:#7EE8A2;font-weight:700;font-size:${Math.floor(size*0.32)}px;">${init}</div>`;
}

/* ═══════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════ */
async function loadDashboard() {
  try {
    const [pending, members, events, gallery, videos] = await Promise.all([
      getDocs(query(collection(db,'members'), where('status','==','pending'))),
      getDocs(query(collection(db,'members'), where('status','==','approved'))),
      getDocs(collection(db,'events')),
      getDocs(collection(db,'gallery')),
      getDocs(collection(db,'videos')),
    ]);
    [['sPending',pending],['sMembers',members],['sEvents',events],['sGallery',gallery],['sVideos',videos]]
      .forEach(([id, snap]) => { const el=$(id); if(el) el.textContent = snap.size; });

    const con = $('dashApps');
    if (pending.empty) {
      con.innerHTML = '<p style="color:#888;font-size:13px;padding:1rem;">No pending applications.</p>';
      return;
    }
    con.innerHTML = tbl(
      ['Photo','Name','Sector','Mobile','Action'],
      pending.docs.slice(0,5).map(d => {
        const m = d.data();
        return `<tr>
          <td>${avatarDiv(m.photoURL, m.fullname, 36)}</td>
          <td><strong>${m.fullname||'—'}</strong><br><small style="color:#888;">${m.specialty||''}</small></td>
          <td>${m.sector||''}</td>
          <td>${m.mobile||''}</td>
          <td>
            <button class="abtn btn-approve" onclick="upStatus('${d.id}','approved')">✓ Approve</button>
            <button class="abtn btn-reject"  onclick="upStatus('${d.id}','rejected')">✗ Reject</button>
          </td>
        </tr>`;
      }).join('')
    );
  } catch(e) { console.error('Dashboard error:', e); }
}

/* ═══════════════════════════════════════
   APPLICATIONS
═══════════════════════════════════════ */
async function loadApplications() {
  const con = $('applicationsList');
  con.innerHTML = '<div style="color:#888;font-size:13px;padding:1rem;">Loading...</div>';
  try {
    const snap = await getDocs(query(collection(db,'members'), where('status','==','pending'), orderBy('createdAt','desc')));
    $('pendingBadge').textContent = snap.size + ' pending';
    if (snap.empty) {
      con.innerHTML = '<p style="color:#888;font-size:13px;padding:1rem;">No pending applications.</p>';
      return;
    }
    con.innerHTML = tbl(
      ['Photo','Name','NID','Sector','Type','Mobile','District','Action'],
      snap.docs.map(d => {
        const m = d.data();
        return `<tr>
          <td>${avatarDiv(m.photoURL, m.fullname, 40)}</td>
          <td><strong>${m.fullname||'—'}</strong><br><small style="color:#888;">${m.specialty||''}</small></td>
          <td style="font-size:12px;">${m.nid||'—'}</td>
          <td>${m.sector||''}</td>
          <td>${m.membership||''}</td>
          <td>${m.mobile||''}</td>
          <td>${m.dist_c||''}</td>
          <td>
            <button class="abtn btn-approve" onclick="upStatus('${d.id}','approved')">✓ Approve</button>
            <button class="abtn btn-reject"  onclick="upStatus('${d.id}','rejected')">✗ Reject</button>
            <button class="abtn btn-view"    onclick="viewMemberDetail('${d.id}')">👁 View</button>
          </td>
        </tr>`;
      }).join('')
    );
  } catch(e) { console.error(e); }
}

window.upStatus = async (id, status) => {
  if (status === 'approved') {
    showCategoryModal(id);
  } else {
    await updateDoc(doc(db,'members',id), {status:'rejected'});
    loadApplications(); loadDashboard();
    alert('✗ Application rejected.');
  }
};

window.showCategoryModal = (memberId) => {
  const existing = document.getElementById('categoryModalOverlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'categoryModalOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:3000;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:#fff;padding:2rem;width:360px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
      <h3 style="font-family:'Playfair Display',serif;font-size:1.2rem;color:#111;margin:0 0 0.5rem;">Approve Member</h3>
      <p style="font-size:12px;color:#888;margin:0 0 1.2rem;">Select membership category before approving.</p>
      <select id="catSelect" style="width:100%;padding:10px 13px;border:1.5px solid #d1d5db;font-size:13px;font-family:'Inter',sans-serif;background:#fafafa;margin-bottom:1rem;outline:none;">
        <option value="">— Select Category —</option>
        <option value="General Member">General Member</option>
        <option value="Founding Member">Founding Member</option>
        <option value="Honorary Member">Honorary Member</option>
      </select>
      <div style="display:flex;gap:0.75rem;">
        <button onclick="confirmApprove('${memberId}')" style="flex:1;padding:11px;background:#157040;color:#fff;border:none;cursor:pointer;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;font-family:'Inter',sans-serif;">✓ Approve</button>
        <button onclick="document.getElementById('categoryModalOverlay').remove()" style="padding:11px 16px;background:#555;color:#fff;border:none;cursor:pointer;font-size:11px;font-weight:700;font-family:'Inter',sans-serif;">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
};

window.confirmApprove = async (id) => {
  const cat = document.getElementById('catSelect')?.value;
  if (!cat) { alert('Please select a category.'); return; }
  try {
    await updateDoc(doc(db,'members',id), {
      status: 'approved',
      category: cat,
      approvedAt: serverTimestamp()
    });
    document.getElementById('categoryModalOverlay')?.remove();
    loadApplications(); loadDashboard();
    alert('✓ Member approved as ' + cat + '!');
  } catch(e) { alert('Error: ' + e.message); }
};

/* ═══════════════════════════════════════
   MEMBERS
═══════════════════════════════════════ */
let allMembersData = {};

async function loadMembers() {
  const con = $('membersList');
  con.innerHTML = '<div style="color:#888;padding:1rem;">Loading...</div>';
  try {
    const snap = await getDocs(query(collection(db,'members'), where('status','==','approved')));
    if (snap.empty) {
      con.innerHTML = '<p style="color:#888;padding:1rem;">No approved members yet.</p>';
      return;
    }
    snap.docs.forEach(d => { allMembersData[d.id] = { ...d.data(), id: d.id }; });
    const catColor = {
      'Founding Member': 'background:rgba(184,17,26,0.1);color:#B8111A;border:1px solid rgba(184,17,26,0.25);',
      'Honorary Member': 'background:rgba(201,168,76,0.15);color:#7A6020;border:1px solid rgba(201,168,76,0.4);',
      'General Member':  'background:rgba(11,61,32,0.07);color:#0F5530;border:1px solid rgba(11,61,32,0.2);'
    };
    con.innerHTML = tbl(
      ['Photo','Name','Sector','Category','Mobile','District','Action'],
      snap.docs.map(d => {
        const m = d.data();
        const cat = m.category || 'General Member';
        const badge = `<span class="status-badge" style="${catColor[cat]||catColor['General Member']}">${cat}</span>`;
        return `<tr style="cursor:pointer;" onclick="viewMemberDetail('${d.id}')">
          <td>${avatarDiv(m.photoURL, m.fullname, 44)}</td>
          <td><strong>${m.fullname||'—'}</strong><br><small style="color:#888;">${m.specialty||m.sector||''}</small></td>
          <td>${m.sector||''}</td>
          <td>${badge}</td>
          <td>${m.mobile||''}</td>
          <td>${m.dist_c||''}</td>
          <td>
            <button class="abtn btn-view" onclick="event.stopPropagation();viewMemberDetail('${d.id}')">👁 Details</button>
            <button class="abtn" style="background:#C9A84C;color:#fff;" onclick="event.stopPropagation();editCategory('${d.id}','${cat}')">✎ Category</button>
            ${delBtn('delMember', d.id)}
          </td>
        </tr>`;
      }).join('')
    );
  } catch(e) { console.error(e); }
}

window.delMember = async id => {
  if (!confirm('Delete this member? This cannot be undone.')) return;
  await deleteDoc(doc(db,'members',id));
  delete allMembersData[id];
  loadMembers();
};

// ── Edit Category ──
window.editCategory = (id, currentCat) => {
  const existing = document.getElementById("categoryModalOverlay");
  if (existing) existing.remove();
  const overlay = document.createElement("div");
  overlay.id = "categoryModalOverlay";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:3000;display:flex;align-items:center;justify-content:center;";
  overlay.innerHTML = `<div style="background:#fff;padding:2rem;width:360px;box-shadow:0 20px 60px rgba(0,0,0,0.3);"><h3 style="font-family:Playfair Display,serif;font-size:1.2rem;color:#111;margin:0 0 0.5rem;">Change Category</h3><p style="font-size:12px;color:#888;margin:0 0 1.2rem;">Current: <strong>${currentCat}</strong></p><select id="catSelect" style="width:100%;padding:10px 13px;border:1.5px solid #d1d5db;font-size:13px;font-family:Inter,sans-serif;background:#fafafa;margin-bottom:1rem;outline:none;"><option value="">— Select Category —</option><option value="General Member">General Member</option><option value="Founding Member">Founding Member</option><option value="Honorary Member">Honorary Member</option></select><div style="display:flex;gap:0.75rem;"><button onclick="confirmCategoryChange('${id}')" style="flex:1;padding:11px;background:#157040;color:#fff;border:none;cursor:pointer;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;font-family:Inter,sans-serif;">Save</button><button onclick="document.getElementById('categoryModalOverlay').remove()" style="padding:11px 16px;background:#555;color:#fff;border:none;cursor:pointer;font-size:11px;font-weight:700;font-family:Inter,sans-serif;">Cancel</button></div></div>`;
  document.body.appendChild(overlay);
};
window.confirmCategoryChange = async (id) => {
  const cat = document.getElementById("catSelect")?.value;
  if (!cat) { alert("Please select a category."); return; }
  try {
    await updateDoc(doc(db,"members",id), { category: cat });
    document.getElementById("categoryModalOverlay")?.remove();
    loadMembers();
    alert("✓ Category updated to " + cat);
  } catch(e) { alert("Error: " + e.message); }
};
window.addMemberByAdmin = async () => {
  const name=document.getElementById("adm_name")?.value?.trim();
  const mobile=document.getElementById("adm_mobile")?.value?.trim();
  const sector=document.getElementById("adm_sector")?.value?.trim();
  const category=document.getElementById("adm_category")?.value;
  const email=document.getElementById("adm_email")?.value?.trim();
  const exp=document.getElementById("adm_experience")?.value?.trim();
  const dist=document.getElementById("adm_district")?.value?.trim();
  const st=document.getElementById("adm_status");
  if (!name){alert("Name is required.");return;}
  if (!category){alert("Please select a category.");return;}
  st.textContent="Saving...";st.style.color="#888";
  try{
    const photoInput=document.getElementById("adm_photo");
    let photoURL=null;
    if(photoInput?.files[0])photoURL=await uploadToCloudinary(photoInput.files[0]);
    await addDoc(collection(db,"members"),{fullname:name,mobile:mobile||"",sector:sector||"",category,email:email||"",experience:exp||"",dist_c:dist||"",status:"approved",addedByAdmin:true,createdAt:serverTimestamp(),approvedAt:serverTimestamp(),...(photoURL&&{photoURL})});
    st.textContent="✓ Member added!";st.style.color="#157040";
    ["adm_name","adm_mobile","adm_sector","adm_email","adm_experience","adm_district"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";});
    document.getElementById("adm_category").value="";
    if(photoInput)photoInput.value="";
    loadMembers();
    setTimeout(()=>{st.textContent="";},3000);
  }catch(e){st.textContent="Error: "+e.message;st.style.color="#B8111A";}
};

/* ═══════════════════════════════════════
   MEMBER DETAIL MODAL
═══════════════════════════════════════ */
window.viewMemberDetail = async (id) => {
  let m = allMembersData[id];
  if (!m) {
    try {
      const snap = await getDoc(doc(db,'members',id));
      if (snap.exists()) m = { ...snap.data(), id };
    } catch(e) { alert('Could not load member details.'); return; }
  }
  if (!m) { alert('Member not found.'); return; }

  const init = (m.fullname||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  $('modalHeader').innerHTML = `
    <div class="a-modal-avatar">${m.photoURL ? `<img src="${m.photoURL}" alt="${m.fullname}">` : init}</div>
    <div>
      <div class="a-modal-name">${m.fullname||'—'}</div>
      <div class="a-modal-role">${m.specialty||''} · ${m.sector||''}</div>
      <div style="margin-top:6px;">
        <span class="status-badge ${m.status==='approved'?'status-approved':m.status==='pending'?'status-pending':'status-rejected'}">${m.status||'pending'}</span>
        ${m.membership==='Lifetime'?'<span class="status-badge" style="background:rgba(184,17,26,0.1);color:#B8111A;border:1px solid rgba(184,17,26,0.25);margin-left:6px;">Lifetime Member</span>':''}
      </div>
    </div>`;

  const rows = [
    ['Full Name',        m.fullname],
    ['Sector',           m.sector],
    ['Specialization',   m.specialty],
    ['Experience',       m.experience],
    ['Membership',       m.membership],
    ['Mobile',           m.mobile],
    ['WhatsApp',         m.whatsapp],
    ['Email',            m.email],
    ['Facebook',         m.facebook ? `<a href="${m.facebook}" target="_blank" style="color:#0B3D20;">${m.facebook}</a>` : ''],
    ['NID Number',       m.nid],
    ['Date of Birth',    m.dob],
    ['Blood Group',      m.blood],
    ['Current Address',  [m.thana_c, m.dist_c, m.div_c, m.addr_c].filter(Boolean).join(', ')],
    ['Permanent Address',[m.thana_p, m.dist_p, m.div_p, m.addr_p].filter(Boolean).join(', ')],
    ['Organization',     m.organization],
    ['Joined',           m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}) : ''],
  ];

  $('modalBody').innerHTML = rows
    .filter(([,v]) => v)
    .map(([label, value]) =>
      `<div class="a-modal-row">
        <div class="a-modal-label">${label}</div>
        <div class="a-modal-value">${value||'—'}</div>
      </div>`
    ).join('');

  $('modalActions').innerHTML = `
    <button class="add-btn" onclick="printMember('${id}')">🖨 Print</button>
    <button class="add-btn" style="background:#B8111A;" onclick="downloadMemberPDF('${id}')">⬇ Download PDF</button>
    <button class="abtn btn-delete" onclick="delMember('${id}');closeMemberModal()">Delete Member</button>
  `;
  $('memberModal').classList.add('open');
};

window.closeMemberModal = () => $('memberModal').classList.remove('open');
$('memberModal')?.addEventListener('click', e => { if (e.target === $('memberModal')) closeMemberModal(); });

/* ═══════════════════════════════════════
   PRINT MEMBER
═══════════════════════════════════════ */
window.printMember = (id) => {
  const m = allMembersData[id];
  if (!m) return;
  const printWin = window.open('', '_blank', 'width=800,height=900');
  const avatar = m.photoURL
    ? `<img src="${m.photoURL}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid #0B3D20;">`
    : `<div style="width:100px;height:100px;border-radius:50%;background:#0B3D20;display:flex;align-items:center;justify-content:center;color:#7EE8A2;font-size:2rem;font-weight:700;">${(m.fullname||'?').charAt(0)}</div>`;

  printWin.document.write(`<!DOCTYPE html><html><head>
  <title>BMC Member — ${m.fullname}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Playfair+Display:wght@400;700&family=Inter:wght@400;600&display=swap');
    body{font-family:'Inter',sans-serif;margin:0;padding:0;background:#fff;color:#111;}
    .header{background:#0B3D20;padding:2rem;display:flex;align-items:center;gap:1.5rem;color:#fff;}
    .name{font-family:'Playfair Display',serif;font-size:1.8rem;font-weight:700;}
    .role{font-size:13px;color:rgba(255,255,255,0.65);margin-top:4px;}
    .badge{display:inline-block;padding:3px 12px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:rgba(201,168,76,0.2);color:#C9A84C;border:1px solid rgba(201,168,76,0.4);margin-top:6px;}
    .body{padding:2rem;}
    .sec-title{font-family:'Cinzel',serif;font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#B8111A;margin:1.5rem 0 0.8rem;padding-bottom:6px;border-bottom:1px solid rgba(184,17,26,0.2);}
    .row{display:flex;gap:0.5rem;padding:0.5rem 0;border-bottom:1px solid #f0f0f0;font-size:13px;}
    .row:last-child{border:none;}
    .label{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#888;min-width:140px;flex-shrink:0;padding-top:1px;}
    .value{color:#222;flex:1;}
    .footer{margin-top:2rem;padding:1rem 2rem;background:#f9f9f9;border-top:2px solid #0B3D20;text-align:center;font-family:'Cinzel',serif;font-size:9px;letter-spacing:2px;color:#888;text-transform:uppercase;}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
  </style></head><body>
  <div class="header">
    ${avatar}
    <div>
      <div class="name">${m.fullname||'—'}</div>
      <div class="role">${m.specialty||''} · ${m.sector||''}</div>
      <div class="badge">${m.membership||'General'} Member</div>
    </div>
    <div style="margin-left:auto;text-align:right;">
      <div style="font-family:Cinzel,serif;font-size:10px;letter-spacing:2px;color:rgba(255,255,255,0.4);text-transform:uppercase;">Bangladesh Musician's Club</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px;">Est. 2022 · Dhaka, Bangladesh</div>
    </div>
  </div>
  <div class="body">
    <div class="sec-title">Personal Information</div>
    ${prow('Full Name',m.fullname)}${prow('Date of Birth',m.dob)}${prow('Blood Group',m.blood)}${prow('NID Number',m.nid)}
    <div class="sec-title">Contact Information</div>
    ${prow('Mobile',m.mobile)}${prow('WhatsApp',m.whatsapp)}${prow('Email',m.email)}${prow('Facebook',m.facebook)}
    <div class="sec-title">Current Address</div>
    ${prow('Division',m.div_c)}${prow('District',m.dist_c)}${prow('Thana / Upazila',m.thana_c)}${prow('Full Address',m.addr_c)}
    <div class="sec-title">Permanent Address</div>
    ${prow('Division',m.div_p)}${prow('District',m.dist_p)}${prow('Thana / Upazila',m.thana_p)}${prow('Full Address',m.addr_p)}
    <div class="sec-title">Professional Information</div>
    ${prow('Sector',m.sector)}${prow('Specialization',m.specialty)}${prow('Experience',m.experience)}${prow('Organization',m.organization)}
    ${prow('Membership Type',m.membership)}
    ${prow('Member Since', m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}) : '—')}
  </div>
  <div class="footer">Bangladesh Musician's Club · Est. 2022 · Dhaka, Bangladesh · bangladeshmusiciansclub2022@gmail.com</div>
  <script>window.onload=()=>{ window.print(); }<\/script>
  </body></html>`);
  printWin.document.close();
};

function prow(label, value) {
  if (!value) return '';
  return `<div class="row"><div class="label">${label}</div><div class="value">${value}</div></div>`;
}

window.downloadMemberPDF = async (id) => {
  alert('PDF ডাউনলোডের জন্য:\n1. Print উইন্ডো খুলবে\n2. Destination এ "Save as PDF" সিলেক্ট করুন\n3. Save করুন');
  printMember(id);
};

/* ═══════════════════════════════════════
   COMMITTEE MANAGER (generic)
═══════════════════════════════════════ */
async function loadCommMgr(col, wrapperId) {
  const w = $(wrapperId);
  if (!w) return;
  const snap = await getDocs(query(collection(db, col), orderBy('order','asc'))).catch(() => null);

  w.innerHTML = `
    <div class="panel">
      <div class="panel-title">Add Person</div>
      <div class="fi">
        <div class="fr2">
          <input type="text"   id="${col}_name"   placeholder="Full Name *">
          <input type="text"   id="${col}_role"   placeholder="Role / Position *">
        </div>
        <div class="fr2">
          <input type="text"   id="${col}_sector" placeholder="Sector (e.g. Musicians)">
          <input type="number" id="${col}_order"  placeholder="Display Order" value="1">
        </div>
        <input type="file" id="${col}_photo" accept="image/*">
        <p style="font-size:12px;color:#888;">Clear profile photo recommended — square, min 200×200px.</p>
        <button class="add-btn" onclick="addComm('${col}')">Add Person</button>
        <p id="${col}_st" style="font-size:12px;color:#888;"></p>
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">Current Members</div>
      ${snap && !snap.empty
        ? tbl(
            ['Photo','Name','Role','Sector','Order','Action'],
            snap.docs.map(d => {
              const p = d.data();
              return `<tr>
                <td>${avatarDiv(p.photoURL, p.name, 44)}</td>
                <td><strong>${p.name||'—'}</strong></td>
                <td>${p.role||''}</td>
                <td>${p.sector||''}</td>
                <td>${p.order||''}</td>
                <td>${delBtn(`delComm_${col}`, d.id)}</td>
              </tr>`;
            }).join('')
          )
        : '<p style="color:#888;font-size:13px;padding:1rem;">No members added yet.</p>'}
    </div>`;

  window[`delComm_${col}`] = async id => {
    if (!confirm('Delete this person?')) return;
    await deleteDoc(doc(db, col, id));
    loadCommMgr(col, wrapperId);
  };
}

window.addComm = async col => {
  const name = val(`${col}_name`), role = val(`${col}_role`);
  if (!name || !role) { alert('Name and role are required.'); return; }
  const st = $(`${col}_st`);
  st.textContent = 'Saving...';
  try {
    const data = {
      name, role,
      sector: val(`${col}_sector`),
      order:  parseInt(val(`${col}_order`)) || 1,
      createdAt: serverTimestamp()
    };
    const url = await upload(`${col}_photo`);
    if (url) data.photoURL = url;
    await addDoc(collection(db, col), data);
    st.textContent = '✓ Added successfully!';
    const info = COMM_MAP[col];
    if (info) setTimeout(() => loadCommMgr(info.col, info.wrap), 800);
  } catch(e) { st.textContent = 'Error: ' + e.message; }
};

/* ═══════════════════════════════════════
   EVENTS
═══════════════════════════════════════ */
async function loadEvents() {
  const con = $('eventsList');
  if (!con) return;
  con.innerHTML = 'Loading...';
  try {
    const snap = await getDocs(query(collection(db,'events'), orderBy('date','desc')));
    if (snap.empty) { con.innerHTML = '<p style="color:#888;padding:1rem;">No events yet.</p>'; return; }
    con.innerHTML = tbl(
      ['Title','Date','Location','Tag','Status','Action'],
      snap.docs.map(d => {
        const e = d.data();
        const statusStyle = e.upcoming
          ? 'background:rgba(21,112,64,0.1);color:#157040;border:1px solid rgba(21,112,64,0.2);'
          : 'background:rgba(0,0,0,0.05);color:#888;border:1px solid #ddd;';
        return `<tr>
          <td><strong>${e.title||'—'}</strong></td>
          <td>${e.date||''}</td>
          <td>${e.location||''}</td>
          <td>${e.tag||''}</td>
          <td><span style="font-size:10px;padding:3px 10px;font-weight:700;${statusStyle}">${e.upcoming?'Upcoming':'Past'}</span></td>
          <td>${delBtn('delEvent', d.id)}</td>
        </tr>`;
      }).join('')
    );
  } catch(e) { console.error(e); }
}

window.addEvent = async () => {
  const title = val('ev_title');
  if (!title) { alert('Title is required.'); return; }
  try {
    await addDoc(collection(db,'events'), {
      title, location: val('ev_location'), date: val('ev_date'),
      tag: val('ev_tag'), upcoming: $('ev_upcoming').checked,
      createdAt: serverTimestamp()
    });
    alert('✓ Event added!');
    ['ev_title','ev_location','ev_date','ev_tag'].forEach(id => { const el=$(id); if(el) el.value=''; });
    loadEvents();
  } catch(e) { alert('Error: ' + e.message); }
};
window.delEvent = async id => {
  if (!confirm('Delete?')) return;
  await deleteDoc(doc(db,'events',id));
  loadEvents();
};

/* ═══════════════════════════════════════
   GALLERY
═══════════════════════════════════════ */
async function loadGallery() {
  const con = $('galleryList');
  if (!con) return;
  try {
    const snap = await getDocs(query(collection(db,'gallery'), orderBy('createdAt','desc')));
    if (snap.empty) { con.innerHTML = '<p style="color:#888;padding:1rem;">No photos yet.</p>'; return; }
    con.innerHTML = snap.docs.map(d => {
      const g = d.data();
      const inSlide = g.showInSlideshow ? 'border:3px solid #C9A84C;' : '';
      const slideBtnLabel = g.showInSlideshow ? '★ In Slideshow' : '☆ Add to Slideshow';
      const slideBtnStyle = g.showInSlideshow ? 'background:#C9A84C;color:#0B3D20;' : 'background:rgba(0,0,0,0.55);color:#fff;';
      return `<div style="position:relative;${inSlide}">
        <img src="${g.url}" style="width:100%;aspect-ratio:4/3;object-fit:cover;display:block;">
        <div style="padding:6px 8px;font-size:11px;color:#888;">${g.caption||''}</div>
        <button onclick="toggleSlideshow('${d.id}',${!g.showInSlideshow})" style="position:absolute;top:6px;left:6px;${slideBtnStyle}border:none;cursor:pointer;padding:4px 8px;font-size:10px;font-weight:700;">${slideBtnLabel}</button>
        <button onclick="delGallery('${d.id}')" style="position:absolute;top:6px;right:6px;background:#B8111A;color:#fff;border:none;cursor:pointer;padding:4px 10px;font-size:11px;font-weight:700;">✕</button>
      </div>`;
    }).join('');
  } catch(e) { console.error(e); }
}

window.toggleSlideshow = async (id, show) => {
  try {
    await updateDoc(doc(db,'gallery',id), { showInSlideshow: show });
    loadGallery();
  } catch(e) { alert('Error: ' + e.message); }
};

window.uploadGallery = async () => {
  const st = $('galleryStatus');
  const fileInput = $('galleryPhoto');
  const files = fileInput?.files;
  if (!files || files.length === 0) { st.textContent = 'Please select photos.'; return; }
  st.textContent = `Uploading 0 / ${files.length}...`;
  let uploaded = 0;
  for (const file of Array.from(files)) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'bmc_unsigned');
      const res = await fetch('https://api.cloudinary.com/v1_1/democloud/image/upload', { method:'POST', body:formData });
      const data = await res.json();
      if (data.secure_url) {
        await addDoc(collection(db,'gallery'), { url: data.secure_url, caption: val('galleryCaption'), showInSlideshow: false, createdAt: serverTimestamp() });
        uploaded++;
        st.textContent = `Uploading ${uploaded} / ${files.length}...`;
      }
    } catch(e) { console.error('Upload error:', file.name, e); }
  }
  st.textContent = `✓ ${uploaded} photo(s) uploaded!`;
  fileInput.value = '';
  $('galleryCaption').value = '';
  setTimeout(() => { st.textContent = ''; }, 4000);
  loadGallery();
};

window.delGallery = async id => {
  if (!confirm('Delete this photo?')) return;
  await deleteDoc(doc(db,'gallery',id));
  loadGallery();
};

/* ═══════════════════════════════════════
   VIDEOS
═══════════════════════════════════════ */
async function loadVideos() {
  const con = $('videosList');
  if (!con) return;
  con.innerHTML = 'Loading...';
  try {
    const snap = await getDocs(query(collection(db,'videos'), orderBy('createdAt','desc')));
    if (snap.empty) { con.innerHTML = '<p style="color:#888;padding:1rem;">No videos yet.</p>'; return; }
    con.innerHTML = tbl(
      ['Preview','Title','YouTube ID','Date','Action'],
      snap.docs.map(d => {
        const v = d.data();
        return `<tr>
          <td><img src="https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg" style="width:80px;height:50px;object-fit:cover;"></td>
          <td><strong>${v.title||'—'}</strong></td>
          <td style="font-size:12px;color:#888;">${v.youtubeId||''}</td>
          <td>${v.date||''}</td>
          <td>${delBtn('delVideo', d.id)}</td>
        </tr>`;
      }).join('')
    );
  } catch(e) { console.error(e); }
}

window.addVideo = async () => {
  const title = val('vd_title'), ytId = val('vd_youtubeId');
  if (!title || !ytId) { alert('Title and YouTube ID are required.'); return; }
  try {
    await addDoc(collection(db,'videos'), { title, youtubeId: ytId, date: val('vd_date'), createdAt: serverTimestamp() });
    alert('✓ Video added!');
    ['vd_title','vd_youtubeId','vd_date'].forEach(id => { const el=$(id); if(el) el.value=''; });
    loadVideos();
  } catch(e) { alert('Error: ' + e.message); }
};
window.delVideo = async id => {
  if (!confirm('Delete?')) return;
  await deleteDoc(doc(db,'videos',id));
  loadVideos();
};

/* ═══════════════════════════════════════
   FEEDBACK
═══════════════════════════════════════ */
async function loadFeedback() {
  const con = $('feedbackList');
  if (!con) return;
  con.innerHTML = 'Loading...';
  try {
    const snap = await getDocs(query(collection(db,'feedback'), orderBy('createdAt','desc')));
    if (snap.empty) { con.innerHTML = '<p style="color:#888;padding:1rem;">No feedback yet.</p>'; return; }
    con.innerHTML = tbl(
      ['Type','Name','Subject','Message','Date','Action'],
      snap.docs.map(d => {
        const f = d.data();
        const date = f.createdAt?.toDate ? f.createdAt.toDate().toLocaleDateString('en-GB') : '';
        const typeStyle = f.type === 'Complaint'
          ? 'background:rgba(184,17,26,0.1);color:#B8111A;border:1px solid rgba(184,17,26,0.25);'
          : 'background:rgba(21,112,64,0.1);color:#157040;border:1px solid rgba(21,112,64,0.25);';
        return `<tr>
          <td><span style="font-size:10px;padding:3px 10px;font-weight:700;${typeStyle}">${f.type||'Suggestion'}</span></td>
          <td>${f.name||'Anonymous'}</td>
          <td><strong>${f.subject||'—'}</strong></td>
          <td style="font-size:12px;max-width:250px;">${f.message||''}</td>
          <td style="font-size:12px;color:#888;">${date}</td>
          <td>${delBtn('delFeedback', d.id)}</td>
        </tr>`;
      }).join('')
    );
  } catch(e) { console.error(e); }
}
window.delFeedback = async id => {
  if (!confirm('Delete?')) return;
  await deleteDoc(doc(db,'feedback',id));
  loadFeedback();
};
