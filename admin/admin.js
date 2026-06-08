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
    founders: () => loadCommMgr('founders','mgr-founders'),
    managing: () => loadCommMgr('managing','mgr-managing'),
    committee: () => loadCommMgr('committee','mgr-committee'),
    subcommittee: () => loadCommMgr('subcommittee','mgr-subcommittee'),
    news: loadNews, events: loadEvents, jobs: loadJobs,
    gallery: loadGallery, videos: loadVideos,
    achievements: loadAchievements, sponsors: loadSponsors,
    tribute: loadTribute, feedback: loadFeedback
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
    const [p,m,e,n,j] = await Promise.all([
      getDocs(query(collection(db,'members'),where('status','==','pending'))),
      getDocs(query(collection(db,'members'),where('status','==','approved'))),
      getDocs(collection(db,'events')),
      getDocs(collection(db,'news')),
      getDocs(collection(db,'jobs'))
    ]);
    ['sPending','sMembers','sEvents','sNews','sJobs'].forEach((id,i) => {
      const el=$(id); if(el) el.textContent=[p,m,e,n,j][i].size;
    });
    const con = $('dashApps');
    if (p.empty) {
      con.innerHTML='<p style="color:#888;font-size:13px;padding:1rem;">No pending applications.</p>';
      return;
    }
    con.innerHTML = tbl(['Photo','Name','Sector','Mobile','Action'],
      p.docs.slice(0,5).map(d=>{
        const m=d.data();
        const photo = m.photoURL ? `<img src="${m.photoURL}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">` : '<div style="width:36px;height:36px;border-radius:50%;background:#0B3D20;display:flex;align-items:center;justify-content:center;color:#7EE8A2;font-size:11px;font-weight:700;">'+(m.fullname||'?').charAt(0)+'</div>';
        return `<tr>
          <td>${photo}</td>
          <td><strong>${m.fullname||'—'}</strong><br><small style="color:#888;">${m.specialty||''}</small></td>
          <td>${m.sector||''}</td>
          <td>${m.mobile||''}</td>
          <td>
            <button class="abtn btn-approve" onclick="upStatus('${d.id}','approved')">✓ Approve</button>
            <button class="abtn btn-reject" onclick="upStatus('${d.id}','rejected')">✗ Reject</button>
          </td>
        </tr>`;
      }).join(''));
  } catch(e) {
    console.error('Dashboard error:', e);
  }
}

// ── APPLICATIONS ──
async function loadApplications() {
  const con = $('applicationsList');
  con.innerHTML = '<div style="color:#888;font-size:13px;padding:1rem;">Loading...</div>';
  try {
    const snap = await getDocs(query(collection(db,'members'),where('status','==','pending'),orderBy('createdAt','desc')));
    $('pendingBadge').textContent = snap.size + ' pending';
    if (snap.empty) {
      con.innerHTML='<p style="color:#888;font-size:13px;padding:1rem;">No pending applications.</p>';
      return;
    }
    con.innerHTML = tbl(['Photo','Name','NID','Sector','Type','Mobile','District','Action'],
      snap.docs.map(d=>{
        const m=d.data();
        const photo = m.photoURL ? `<img src="${m.photoURL}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb;">` : '<div style="width:40px;height:40px;border-radius:50%;background:#0B3D20;display:flex;align-items:center;justify-content:center;color:#7EE8A2;font-weight:700;">'+(m.fullname||'?').charAt(0)+'</div>';
        return `<tr>
          <td>${photo}</td>
          <td><strong>${m.fullname||'—'}</strong><br><small style="color:#888;">${m.specialty||''}</small></td>
          <td style="font-size:12px;">${m.nid||'—'}</td>
          <td>${m.sector||''}</td>
          <td>${m.membership||''}</td>
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
  alert(status==='approved' ? '✓ Member approved successfully!' : '✗ Application rejected.');
};

// ── MEMBERS ──
// Store all members data for modal access
let allMembersData = {};

async function loadMembers() {
  const con = $('membersList');
  con.innerHTML='<div style="color:#888;padding:1rem;">Loading...</div>';
  try {
    const snap = await getDocs(query(collection(db,'members'),where('status','==','approved')));
    if (snap.empty) {
      con.innerHTML='<p style="color:#888;padding:1rem;">No approved members yet.</p>';
      return;
    }
    // Store all members data for modal
    snap.docs.forEach(d => { allMembersData[d.id] = {...d.data(), id:d.id}; });

    con.innerHTML = tbl(['Photo','Name','Sector','Membership','Mobile','District','Action'],
      snap.docs.map(d=>{
        const m=d.data();
        const photo = m.photoURL
          ? `<img src="${m.photoURL}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb;">`
          : `<div style="width:44px;height:44px;border-radius:50%;background:#0B3D20;display:flex;align-items:center;justify-content:center;color:#7EE8A2;font-weight:700;font-size:14px;">${(m.fullname||'?').charAt(0)}</div>`;
        const badge = m.membership==='Lifetime'
          ? `<span class="status-badge status-approved">Lifetime</span>`
          : `<span class="status-badge" style="background:rgba(11,61,32,0.07);color:#0F5530;border:1px solid rgba(11,61,32,0.2);">General</span>`;
        return `<tr style="cursor:pointer;" onclick="viewMemberDetail('${d.id}')">
          <td>${photo}</td>
          <td><strong>${m.fullname||'—'}</strong><br><small style="color:#888;">${m.specialty||''}</small></td>
          <td>${m.sector||''}</td>
          <td>${badge}</td>
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
  // If not cached yet (called from applications), fetch from Firestore
  if (!m) {
    try {
      const snap = await getDoc(doc(db,'members',id));
      if (snap.exists()) m = {...snap.data(), id};
    } catch(e) { alert('Could not load member details.'); return; }
  }
  if (!m) { alert('Member not found.'); return; }

  const init = (m.fullname||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const avatarHtml = m.photoURL
    ? `<img src="${m.photoURL}" alt="${m.fullname}">`
    : init;

  $('modalHeader').innerHTML = `
    <div class="a-modal-avatar">${avatarHtml}</div>
    <div>
      <div class="a-modal-name">${m.fullname||'—'}</div>
      <div class="a-modal-role">${m.specialty||''} · ${m.sector||''}</div>
      <div style="margin-top:6px;">
        <span class="status-badge ${m.status==='approved'?'status-approved':m.status==='pending'?'status-pending':'status-rejected'}">${m.status||'pending'}</span>
        ${m.membership==='Lifetime'?'<span class="status-badge" style="background:rgba(184,17,26,0.1);color:#B8111A;border:1px solid rgba(184,17,26,0.25);margin-left:6px;">Lifetime Member</span>':''}
      </div>
    </div>`;

  const rows = [
    ['Full Name', m.fullname],
    ['Sector', m.sector],
    ['Specialization', m.specialty],
    ['Experience', m.experience],
    ['Membership', m.membership],
    ['Mobile', m.mobile],
    ['WhatsApp', m.whatsapp],
    ['Email', m.email],
    ['Facebook', m.facebook ? `<a href="${m.facebook}" target="_blank" style="color:#0B3D20;">${m.facebook}</a>` : '—'],
    ['NID Number', m.nid],
    ['Date of Birth', m.dob],
    ['Blood Group', m.blood],
    ['Current Address', [m.thana_c, m.dist_c, m.div_c, m.addr_c].filter(Boolean).join(', ')],
    ['Permanent Address', [m.thana_p, m.dist_p, m.div_p, m.addr_p].filter(Boolean).join(', ')],
    ['Organization', m.organization],
    ['Joined', m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}) : '—'],
  ];

  $('modalBody').innerHTML = rows.map(([label, value]) =>
    value ? `<div class="a-modal-row"><div class="a-modal-label">${label}</div><div class="a-modal-value">${value||'—'}</div></div>` : ''
  ).join('');

  $('modalActions').innerHTML = `
    <button class="add-btn" onclick="printMember('${id}')">🖨 Print</button>
    <button class="add-btn" style="background:#B8111A;" onclick="downloadMemberPDF('${id}')">⬇ Download PDF</button>
    <button class="abtn btn-delete" onclick="event.stopPropagation();delMember('${id}');closeMemberModal()">Delete Member</button>
  `;

  $('memberModal').classList.add('open');
};

window.closeMemberModal = () => $('memberModal').classList.remove('open');
$('memberModal')?.addEventListener('click', e => { if(e.target===$('memberModal')) closeMemberModal(); });

// ── PRINT MEMBER ──
window.printMember = (id) => {
  const m = allMembersData[id];
  if (!m) return;
  const printWin = window.open('','_blank','width=800,height=900');
  const avatar = m.photoURL ? `<img src="${m.photoURL}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid #0B3D20;">` : `<div style="width:100px;height:100px;border-radius:50%;background:#0B3D20;display:flex;align-items:center;justify-content:center;color:#7EE8A2;font-size:2rem;font-weight:700;">${(m.fullname||'?').charAt(0)}</div>`;
  printWin.document.write(`<!DOCTYPE html><html><head><title>BMC Member — ${m.fullname}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Playfair+Display:wght@400;700&family=Inter:wght@400;600&display=swap');
    body{font-family:'Inter',sans-serif;margin:0;padding:0;background:#fff;color:#111;}
    .header{background:#0B3D20;padding:2rem;display:flex;align-items:center;gap:1.5rem;color:#fff;}
    .name{font-family:'Playfair Display',serif;font-size:1.8rem;font-weight:700;}
    .role{font-size:13px;color:rgba(255,255,255,0.65);margin-top:4px;}
    .badge{display:inline-block;padding:3px 12px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:rgba(201,168,76,0.2);color:#C9A84C;border:1px solid rgba(201,168,76,0.4);margin-top:6px;}
    .body{padding:2rem;}
    .section-title{font-family:'Cinzel',serif;font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#B8111A;margin:1.5rem 0 0.8rem;padding-bottom:6px;border-bottom:1px solid rgba(184,17,26,0.2);}
    .row{display:flex;gap:0.5rem;padding:0.5rem 0;border-bottom:1px solid #f0f0f0;font-size:13px;}
    .row:last-child{border:none;}
    .label{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#888;min-width:140px;flex-shrink:0;padding-top:1px;}
    .value{color:#222;flex:1;}
    .footer{margin-top:2rem;padding:1rem 2rem;background:#f9f9f9;border-top:2px solid #0B3D20;text-align:center;font-family:'Cinzel',serif;font-size:9px;letter-spacing:2px;color:#888;text-transform:uppercase;}
    .org-logo{height:36px;margin-bottom:0.5rem;}
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
    <div class="section-title">Personal Information</div>
    ${row('Full Name',m.fullname)}
    ${row('Date of Birth',m.dob)}
    ${row('Blood Group',m.blood)}
    ${row('NID Number',m.nid)}
    <div class="section-title">Contact Information</div>
    ${row('Mobile',m.mobile)}
    ${row('WhatsApp',m.whatsapp)}
    ${row('Email',m.email)}
    ${row('Facebook',m.facebook)}
    <div class="section-title">Current Address</div>
    ${row('Division',m.div_c)}
    ${row('District',m.dist_c)}
    ${row('Thana / Upazila',m.thana_c)}
    ${row('Full Address',m.addr_c)}
    <div class="section-title">Permanent Address</div>
    ${row('Division',m.div_p)}
    ${row('District',m.dist_p)}
    ${row('Thana / Upazila',m.thana_p)}
    ${row('Full Address',m.addr_p)}
    <div class="section-title">Professional Information</div>
    ${row('Sector',m.sector)}
    ${row('Specialization',m.specialty)}
    ${row('Experience',m.experience)}
    ${row('Organization',m.organization)}
    ${row('Membership Type',m.membership)}
    ${row('Member Since',m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}) : '—')}
  </div>
  <div class="footer">
    Bangladesh Musician's Club · Est. 2022 · Dhaka, Bangladesh · bangladeshmusiciansclub2022@gmail.com
  </div>
  <script>window.onload=()=>{ window.print(); }<\/script>
  </body></html>`);
  printWin.document.close();
};
function row(label, value) {
  if (!value) return '';
  return `<div class="row"><div class="label">${label}</div><div class="value">${value}</div></div>`;
}

// ── PDF DOWNLOAD ──
window.downloadMemberPDF = async (id) => {
  // Using browser print-to-PDF — same as print but with a note
  alert('PDF ডাউনলোডের জন্য:\n1. Print উইন্ডো খুলবে\n2. Destination এ "Save as PDF" সিলেক্ট করুন\n3. Save করুন');
  printMember(id);
};

// ── COMMITTEE MANAGER ──
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
        <input type="text" id="${col}_sector" placeholder="Sector (e.g. Musicians)">
        <input type="number" id="${col}_order" placeholder="Display Order" value="1">
      </div>
      <input type="file" id="${col}_photo" accept="image/*">
      <p style="font-size:12px;color:#888;">Upload a clear profile photo. Recommended: square image, min 200×200px.</p>
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

  const wrapMap = {founders:'mgr-founders',managing:'mgr-managing',committee:'mgr-committee',subcommittee:'mgr-subcommittee'};
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
    st.textContent='✓ Added successfully!';
    const wrapMap = {founders:'mgr-founders',managing:'mgr-managing',committee:'mgr-committee',subcommittee:'mgr-subcommittee'};
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

// ── JOBS ──
async function loadJobs() {
  const con=$('jobsList'); if(!con)return; con.innerHTML='Loading...';
  try{
    const snap=await getDocs(query(collection(db,'jobs'),orderBy('createdAt','desc')));
    if(snap.empty){con.innerHTML='<p style="color:#888;padding:1rem;">No opportunities.</p>';return;}
    con.innerHTML=tbl(['Title','Organization','Type','Sector','Location','Pay','Action'],
      snap.docs.map(d=>{
        const j=d.data();
        return `<tr>
          <td><strong>${j.title||'—'}</strong></td>
          <td>${j.organization||''}</td>
          <td>${j.type||''}</td>
          <td>${j.sector||''}</td>
          <td>${j.location||''}</td>
          <td>${j.pay||''}</td>
          <td>${delBtn('delJob',d.id)}</td>
        </tr>`;
      }).join(''));
  }catch(e){console.error(e);}
}
window.addJob=async()=>{
  const title=val('jb_title'); if(!title){alert('Title is required.');return;}
  try{
    await addDoc(collection(db,'jobs'),{
      title,organization:val('jb_organization'),type:$('jb_type').value,
      sector:$('jb_sector').value,location:val('jb_location'),
      pay:val('jb_pay'),description:val('jb_desc'),createdAt:serverTimestamp()
    });
    alert('✓ Posted!');
    ['jb_title','jb_organization','jb_location','jb_pay','jb_desc'].forEach(id=>{const el=$(id);if(el)el.value='';});
    loadJobs();
  }catch(e){alert('Error: '+e.message);}
};
window.delJob=async id=>{if(!confirm('Delete?'))return;await deleteDoc(doc(db,'jobs',id));loadJobs();};

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

// ── ACHIEVEMENTS ──
async function loadAchievements(){
  const con=$('achievementsList'); if(!con)return; con.innerHTML='Loading...';
  try{
    const snap=await getDocs(query(collection(db,'achievements'),orderBy('order','asc')));
    if(snap.empty){con.innerHTML='<p style="color:#888;padding:1rem;">No achievements.</p>';return;}
    con.innerHTML=tbl(['Icon','Title','Year','Description','Action'],
      snap.docs.map(d=>{
        const a=d.data();
        return `<tr>
          <td style="font-size:1.5rem;">${a.icon||'🏆'}</td>
          <td><strong>${a.title||'—'}</strong></td>
          <td>${a.year||''}</td>
          <td style="font-size:12px;max-width:250px;">${a.description||''}</td>
          <td>${delBtn('delAchievement',d.id)}</td>
        </tr>`;
      }).join(''));
  }catch(e){console.error(e);}
}
window.addAchievement=async()=>{
  const title=val('ac_title'); if(!title){alert('Title is required.');return;}
  try{
    await addDoc(collection(db,'achievements'),{
      title,year:val('ac_year'),icon:val('ac_icon')||'🏆',
      description:val('ac_desc'),order:parseInt(val('ac_order'))||1,createdAt:serverTimestamp()
    });
    alert('✓ Added!');
    ['ac_title','ac_year','ac_icon','ac_desc','ac_order'].forEach(id=>{const el=$(id);if(el)el.value='';});
    loadAchievements();
  }catch(e){alert('Error: '+e.message);}
};
window.delAchievement=async id=>{if(!confirm('Delete?'))return;await deleteDoc(doc(db,'achievements',id));loadAchievements();};

// ── SPONSORS ──
async function loadSponsors(){
  const con=$('sponsorsList'); if(!con)return; con.innerHTML='Loading...';
  try{
    const snap=await getDocs(query(collection(db,'sponsors'),orderBy('order','asc')));
    if(snap.empty){con.innerHTML='<p style="color:#888;padding:1rem;">No sponsors.</p>';return;}
    con.innerHTML=tbl(['Logo','Name','Type','Order','Action'],
      snap.docs.map(d=>{
        const s=d.data();
        return `<tr>
          <td>${s.logoURL?`<img src="${s.logoURL}" style="height:40px;object-fit:contain;">`:'—'}</td>
          <td><strong>${s.name||'—'}</strong></td>
          <td>${s.type||''}</td>
          <td>${s.order||''}</td>
          <td>${delBtn('delSponsor',d.id)}</td>
        </tr>`;
      }).join(''));
  }catch(e){console.error(e);}
}
window.addSponsor=async()=>{
  const name=val('sp_name'); if(!name){alert('Name is required.');return;}
  const st=$('sp_status'); st.textContent='Saving...';
  try{
    const data={name,type:val('sp_type'),order:parseInt(val('sp_order'))||1,createdAt:serverTimestamp()};
    const url=await upload('sp_logo'); if(url)data.logoURL=url;
    await addDoc(collection(db,'sponsors'),data);
    st.textContent='✓ Added!';
    ['sp_name','sp_type','sp_order'].forEach(id=>{const el=$(id);if(el)el.value='';});
    loadSponsors();
  }catch(e){st.textContent='Error: '+e.message;}
};
window.delSponsor=async id=>{if(!confirm('Delete?'))return;await deleteDoc(doc(db,'sponsors',id));loadSponsors();};

// ── TRIBUTE ──
async function loadTribute(){
  const con=$('tributeList'); if(!con)return; con.innerHTML='Loading...';
  try{
    const snap=await getDocs(collection(db,'tribute'));
    if(snap.empty){con.innerHTML='<p style="color:#888;padding:1rem;">No entries.</p>';return;}
    con.innerHTML=tbl(['Photo','Name','Role','Years','Message','Action'],
      snap.docs.map(d=>{
        const t=d.data();
        const photo = t.photoURL ? `<img src="${t.photoURL}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;">` : '👤';
        return `<tr>
          <td>${photo}</td>
          <td><strong>${t.name||'—'}</strong></td>
          <td>${t.role||''}</td>
          <td>${t.born||''} — ${t.passed||''}</td>
          <td style="font-size:12px;max-width:200px;">${t.message||''}</td>
          <td>${delBtn('delTribute',d.id)}</td>
        </tr>`;
      }).join(''));
  }catch(e){console.error(e);}
}
window.addTribute=async()=>{
  const name=val('tr_name'); if(!name){alert('Name is required.');return;}
  try{
    const data={name,role:val('tr_role'),born:val('tr_born'),passed:val('tr_passed'),message:val('tr_message'),createdAt:serverTimestamp()};
    const url=await upload('tr_photo'); if(url)data.photoURL=url;
    await addDoc(collection(db,'tribute'),data);
    alert('✓ Added!'); loadTribute();
  }catch(e){alert('Error: '+e.message);}
};
window.delTribute=async id=>{if(!confirm('Delete?'))return;await deleteDoc(doc(db,'tribute',id));loadTribute();};

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
