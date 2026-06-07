import { db, auth } from '../js/firebase-config.js';
import { uploadToCloudinary } from '../js/cloudinary.js';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
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
  try { await signInWithEmailAndPassword(auth, document.getElementById('adminEmail').value, document.getElementById('adminPassword').value); }
  catch(e) { err.textContent = 'Invalid email or password.'; err.style.display = 'block'; }
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
  const map = { dashboard:loadDashboard, applications:loadApplications, members:loadMembers,
    founders:()=>loadCommMgr('founders','mgr-founders'), managing:()=>loadCommMgr('managing','mgr-managing'),
    committee:()=>loadCommMgr('committee','mgr-committee'), subcommittee:()=>loadCommMgr('subcommittee','mgr-subcommittee'),
    news:loadNews, events:loadEvents, jobs:loadJobs, gallery:loadGallery,
    videos:loadVideos, achievements:loadAchievements, sponsors:loadSponsors,
    tribute:loadTribute, feedback:loadFeedback };
  if (map[id]) map[id]();
}

// ── HELPERS ──
const $ = id => document.getElementById(id);
const val = id => $(id)?.value?.trim() || '';
function tbl(headers, rows) {
  return `<div style="overflow-x:auto;"><table class="table"><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr>${rows}</table></div>`;
}
function delBtn(fn, id) { return `<button class="abtn btn-delete" onclick="${fn}('${id}')">Delete</button>`; }
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
    ['sPending','sMembers','sEvents','sNews','sJobs'].forEach((id,i) => { const el=$(id); if(el) el.textContent=[p,m,e,n,j][i].size; });
    const con = $('dashApps');
    if (p.empty) { con.innerHTML='<p style="color:var(--text-muted);font-size:13px;">No pending applications.</p>'; return; }
    con.innerHTML = tbl(['Name','Sector','Mobile','Action'], p.docs.slice(0,5).map(d=>{const m=d.data();return`<tr><td><strong>${m.fullname||'—'}</strong></td><td>${m.sector||''}</td><td>${m.mobile||''}</td><td><button class="abtn btn-approve" onclick="upStatus('${d.id}','approved')">✓ Approve</button><button class="abtn btn-reject" onclick="upStatus('${d.id}','rejected')">✗ Reject</button></td></tr>`;}).join(''));
  } catch(e) {}
}

// ── APPLICATIONS ──
async function loadApplications() {
  const con = $('applicationsList');
  con.innerHTML = '<div style="color:var(--text-muted);font-size:13px;">Loading...</div>';
  try {
    const snap = await getDocs(query(collection(db,'members'),where('status','==','pending'),orderBy('createdAt','desc')));
    $('pendingBadge').textContent = snap.size+' pending';
    if (snap.empty) { con.innerHTML='<p style="color:var(--text-muted);font-size:13px;padding:1rem;">No pending applications.</p>'; return; }
    con.innerHTML = tbl(['Photo','Name','NID','Sector','Membership','Mobile','District','Action'],
      snap.docs.map(d=>{const m=d.data();return`<tr>
        <td>${m.photoURL?`<img src="${m.photoURL}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">`:'—'}</td>
        <td><strong>${m.fullname||'—'}</strong><br><small style="color:var(--text-muted);">${m.specialty||''}</small></td>
        <td style="font-size:12px;">${m.nid||'—'}</td><td>${m.sector||''}</td><td>${m.membership||''}</td>
        <td>${m.mobile||''}</td><td>${m.dist_c||''}</td>
        <td><button class="abtn btn-approve" onclick="upStatus('${d.id}','approved')">✓</button><button class="abtn btn-reject" onclick="upStatus('${d.id}','rejected')">✗</button></td>
      </tr>`;}).join(''));
  } catch(e) {}
}
window.upStatus = async (id, status) => {
  await updateDoc(doc(db,'members',id), {status});
  loadApplications(); loadDashboard();
  alert(status==='approved'?'✓ Approved!':'✗ Rejected.');
};

// ── MEMBERS ──
async function loadMembers() {
  const con = $('membersList'); con.innerHTML='<div style="color:var(--text-muted);">Loading...</div>';
  try {
    const snap = await getDocs(query(collection(db,'members'),where('status','==','approved')));
    if (snap.empty) { con.innerHTML='<p style="color:var(--text-muted);padding:1rem;">No approved members.</p>'; return; }
    con.innerHTML = tbl(['Photo','Name','Sector','Membership','Mobile','District','Action'],
      snap.docs.map(d=>{const m=d.data();return`<tr>
        <td>${m.photoURL?`<img src="${m.photoURL}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">`:'—'}</td>
        <td><strong>${m.fullname||'—'}</strong><br><small>${m.specialty||''}</small></td>
        <td>${m.sector||''}</td><td>${m.membership||''}</td><td>${m.mobile||''}</td><td>${m.dist_c||''}</td>
        <td>${delBtn('delMember',d.id)}</td>
      </tr>`;}).join(''));
  } catch(e) {}
}
window.delMember = async id => { if(!confirm('Delete?'))return; await deleteDoc(doc(db,'members',id)); loadMembers(); };

// ── COMMITTEE MANAGER ──
async function loadCommMgr(col, wrapperId) {
  const w = $(wrapperId); if (!w) return;
  const snap = await getDocs(query(collection(db,col),orderBy('order','asc'))).catch(()=>null);
  w.innerHTML = `
    <div class="panel"><div class="panel-title">Add Person</div>
    <div class="fi">
      <div class="fr2"><input type="text" id="${col}_name" placeholder="Full Name *"><input type="text" id="${col}_role" placeholder="Role / Position *"></div>
      <div class="fr2"><input type="text" id="${col}_sector" placeholder="Sector"><input type="number" id="${col}_order" placeholder="Display Order" value="1"></div>
      <input type="file" id="${col}_photo" accept="image/*">
      <button class="add-btn" onclick="addComm('${col}')">Add Person</button>
      <p id="${col}_st" style="font-size:12px;color:var(--text-muted);"></p>
    </div></div>
    <div class="panel"><div class="panel-title">Current Members</div>
    ${snap&&!snap.empty ? tbl(['Photo','Name','Role','Sector','Order','Action'],
      snap.docs.map(d=>{const m=d.data();return`<tr>
        <td>${m.photoURL?`<img src="${m.photoURL}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">`:'👤'}</td>
        <td><strong>${m.name||'—'}</strong></td><td>${m.role||''}</td><td>${m.sector||''}</td><td>${m.order||''}</td>
        <td>${delBtn(`delComm_${col}`,d.id)}</td>
      </tr>`;}).join(''))
    : '<p style="color:var(--text-muted);font-size:13px;">No members added yet.</p>'}</div>`;

  const wrapMap = {founders:'mgr-founders',managing:'mgr-managing',committee:'mgr-committee',subcommittee:'mgr-subcommittee'};
  window[`delComm_${col}`] = async id => {
    if(!confirm('Delete?'))return;
    await deleteDoc(doc(db,col,id));
    loadCommMgr(col, wrapMap[col]);
  };
}
window.addComm = async col => {
  const name = val(`${col}_name`), role = val(`${col}_role`);
  if (!name||!role) { alert('Name and role required.'); return; }
  const st = $(`${col}_st`); st.textContent='Saving...';
  try {
    const data = { name, role, sector:val(`${col}_sector`), order:parseInt(val(`${col}_order`))||1, createdAt:serverTimestamp() };
    const url = await upload(`${col}_photo`);
    if (url) data.photoURL = url;
    await addDoc(collection(db,col), data);
    st.textContent='✓ Added!';
    const wrapMap = {founders:'mgr-founders',managing:'mgr-managing',committee:'mgr-committee',subcommittee:'mgr-subcommittee'};
    setTimeout(()=>loadCommMgr(col,wrapMap[col]),800);
  } catch(e) { st.textContent='Error: '+e.message; }
};

// ── NEWS ──
async function loadNews() {
  const con = $('newsList'); if(!con)return; con.innerHTML='Loading...';
  try {
    const snap = await getDocs(query(collection(db,'news'),orderBy('createdAt','desc')));
    if(snap.empty){con.innerHTML='<p style="color:var(--text-muted);">No news yet.</p>';return;}
    con.innerHTML = tbl(['Image','Title','Tag','Action'],
      snap.docs.map(d=>{const n=d.data();return`<tr>
        <td>${n.imageURL?`<img src="${n.imageURL}" style="width:60px;height:40px;object-fit:cover;">`:'—'}</td>
        <td><strong>${n.title||'—'}</strong><br><small>${n.excerpt?.slice(0,60)||''}</small></td>
        <td>${n.tag||''}</td><td>${delBtn('delNews',d.id)}</td>
      </tr>`;}).join(''));
  } catch(e){}
}
window.addNews = async () => {
  const title=val('nw_title'); if(!title){alert('Title required.');return;}
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
    if(snap.empty){con.innerHTML='<p style="color:var(--text-muted);">No events.</p>';return;}
    con.innerHTML=tbl(['Title','Date','Location','Tag','Status','Action'],
      snap.docs.map(d=>{const e=d.data();return`<tr>
        <td><strong>${e.title||'—'}</strong></td><td>${e.date||''}</td><td>${e.location||''}</td><td>${e.tag||''}</td>
        <td><span style="font-size:10px;padding:2px 8px;background:${e.upcoming?'rgba(13,92,46,0.1)':'rgba(0,0,0,0.05)'};color:${e.upcoming?'var(--green)':'var(--text-muted)'};font-weight:700;">${e.upcoming?'Upcoming':'Past'}</span></td>
        <td>${delBtn('delEvent',d.id)}</td>
      </tr>`;}).join(''));
  } catch(e){}
}
window.addEvent = async()=>{
  const title=val('ev_title'); if(!title){alert('Title required.');return;}
  try{
    await addDoc(collection(db,'events'),{title,location:val('ev_location'),date:val('ev_date'),tag:val('ev_tag'),upcoming:$('ev_upcoming').checked,createdAt:serverTimestamp()});
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
    if(snap.empty){con.innerHTML='<p style="color:var(--text-muted);">No opportunities.</p>';return;}
    con.innerHTML=tbl(['Title','Org','Type','Sector','Location','Action'],
      snap.docs.map(d=>{const j=d.data();return`<tr>
        <td><strong>${j.title||'—'}</strong></td><td>${j.organization||''}</td>
        <td>${j.type||''}</td><td>${j.sector||''}</td><td>${j.location||''}</td>
        <td>${delBtn('delJob',d.id)}</td>
      </tr>`;}).join(''));
  }catch(e){}
}
window.addJob=async()=>{
  const title=val('jb_title'); if(!title){alert('Title required.');return;}
  try{
    await addDoc(collection(db,'jobs'),{title,organization:val('jb_organization'),type:$('jb_type').value,sector:$('jb_sector').value,location:val('jb_location'),pay:val('jb_pay'),description:val('jb_desc'),createdAt:serverTimestamp()});
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
    if(snap.empty){con.innerHTML='<p style="color:var(--text-muted);">No photos.</p>';return;}
    con.innerHTML=snap.docs.map(d=>{const g=d.data();return`<div style="position:relative;">
      <img src="${g.url}" style="width:100%;aspect-ratio:4/3;object-fit:cover;display:block;">
      <div style="padding:6px;font-size:11px;color:var(--text-muted);">${g.caption||''}</div>
      <button onclick="delGallery('${d.id}')" style="position:absolute;top:6px;right:6px;background:var(--red);color:#fff;border:none;cursor:pointer;padding:4px 10px;font-size:11px;font-weight:700;">✕</button>
    </div>`;}).join('');
  }catch(e){}
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
    if(snap.empty){con.innerHTML='<p style="color:var(--text-muted);">No videos.</p>';return;}
    con.innerHTML=tbl(['Title','YouTube ID','Date','Action'],
      snap.docs.map(d=>{const v=d.data();return`<tr>
        <td><strong>${v.title||'—'}</strong></td><td style="font-size:12px;">${v.youtubeId||''}</td>
        <td>${v.date||''}</td><td>${delBtn('delVideo',d.id)}</td>
      </tr>`;}).join(''));
  }catch(e){}
}
window.addVideo=async()=>{
  const title=val('vd_title'),ytId=val('vd_youtubeId');
  if(!title||!ytId){alert('Title and YouTube ID required.');return;}
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
    if(snap.empty){con.innerHTML='<p style="color:var(--text-muted);">No achievements.</p>';return;}
    con.innerHTML=tbl(['Icon','Title','Year','Description','Action'],
      snap.docs.map(d=>{const a=d.data();return`<tr>
        <td style="font-size:1.5rem;">${a.icon||'🏆'}</td><td><strong>${a.title||'—'}</strong></td>
        <td>${a.year||''}</td><td style="font-size:12px;max-width:250px;">${a.description||''}</td>
        <td>${delBtn('delAchievement',d.id)}</td>
      </tr>`;}).join(''));
  }catch(e){}
}
window.addAchievement=async()=>{
  const title=val('ac_title'); if(!title){alert('Title required.');return;}
  try{
    await addDoc(collection(db,'achievements'),{title,year:val('ac_year'),icon:val('ac_icon')||'🏆',description:val('ac_desc'),order:parseInt(val('ac_order'))||1,createdAt:serverTimestamp()});
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
    if(snap.empty){con.innerHTML='<p style="color:var(--text-muted);">No sponsors.</p>';return;}
    con.innerHTML=tbl(['Logo','Name','Type','Order','Action'],
      snap.docs.map(d=>{const s=d.data();return`<tr>
        <td>${s.logoURL?`<img src="${s.logoURL}" style="height:40px;object-fit:contain;">`:'—'}</td>
        <td><strong>${s.name||'—'}</strong></td><td>${s.type||''}</td><td>${s.order||''}</td>
        <td>${delBtn('delSponsor',d.id)}</td>
      </tr>`;}).join(''));
  }catch(e){}
}
window.addSponsor=async()=>{
  const name=val('sp_name'); if(!name){alert('Name required.');return;}
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
    if(snap.empty){con.innerHTML='<p style="color:var(--text-muted);">No entries.</p>';return;}
    con.innerHTML=tbl(['Photo','Name','Role','Years','Action'],
      snap.docs.map(d=>{const t=d.data();return`<tr>
        <td>${t.photoURL?`<img src="${t.photoURL}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">`:'👤'}</td>
        <td><strong>${t.name||'—'}</strong></td><td>${t.role||''}</td>
        <td>${t.born||''} — ${t.passed||''}</td><td>${delBtn('delTribute',d.id)}</td>
      </tr>`;}).join(''));
  }catch(e){}
}
window.addTribute=async()=>{
  const name=val('tr_name'); if(!name){alert('Name required.');return;}
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
    if(snap.empty){con.innerHTML='<p style="color:var(--text-muted);">No feedback.</p>';return;}
    con.innerHTML=tbl(['Type','Name','Subject','Message','Action'],
      snap.docs.map(d=>{const f=d.data();return`<tr>
        <td><span style="font-size:10px;padding:2px 8px;background:${f.type==='Complaint'?'rgba(193,18,31,0.1)':'rgba(13,92,46,0.1)'};color:${f.type==='Complaint'?'var(--red)':'var(--green)'};font-weight:700;">${f.type||'Suggestion'}</span></td>
        <td>${f.name||'Anonymous'}</td><td><strong>${f.subject||'—'}</strong></td>
        <td style="font-size:12px;max-width:250px;">${f.message||''}</td>
        <td>${delBtn('delFeedback',d.id)}</td>
      </tr>`;}).join(''));
  }catch(e){}
}
window.delFeedback=async id=>{if(!confirm('Delete?'))return;await deleteDoc(doc(db,'feedback',id));loadFeedback();};
