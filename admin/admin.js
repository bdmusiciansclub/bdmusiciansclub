import { db, auth } from '../js/firebase-config.js';
import { uploadToCloudinary } from '../js/cloudinary.js';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
  query, orderBy, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ── AUTH ──
onAuthStateChanged(auth, (user) => {
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
  const email = document.getElementById('adminEmail').value;
  const pass = document.getElementById('adminPassword').value;
  const err = document.getElementById('loginError');
  err.style.display = 'none';
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch(e) {
    err.textContent = 'Invalid email or password.';
    err.style.display = 'block';
  }
};

window.adminLogout = async () => { await signOut(auth); };

// ── NAVIGATION ──
window.showSection = (id, el) => {
  document.querySelectorAll('.section-content').forEach(s => s.classList.add('hidden'));
  document.getElementById('sec-' + id).classList.remove('hidden');
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  if (el) el.classList.add('active');
  loadSection(id);
};

function loadSection(id) {
  switch(id) {
    case 'dashboard': loadDashboard(); break;
    case 'applications': loadApplications(); break;
    case 'members': loadMembers(); break;
    case 'founders': loadCommitteeManager('founders', 'committeeManager'); break;
    case 'managing': loadCommitteeManager('managing', 'managingManager'); break;
    case 'committee': loadCommitteeManager('committee', 'committeeManagerEC'); break;
    case 'subcommittee': loadCommitteeManager('subcommittee', 'subcommitteeManagerSC'); break;
    case 'events': loadEvents(); break;
    case 'gallery': loadGallery(); break;
    case 'tribute': loadTribute(); break;
    case 'feedback': loadFeedback(); break;
  }
}

// ── DASHBOARD ──
async function loadDashboard() {
  try {
    const [pending, members, events, gallery] = await Promise.all([
      getDocs(query(collection(db, 'members'), where('status','==','pending'))),
      getDocs(query(collection(db, 'members'), where('status','==','approved'))),
      getDocs(collection(db, 'events')),
      getDocs(collection(db, 'gallery'))
    ]);
    document.getElementById('statPending').textContent = pending.size;
    document.getElementById('statMembers').textContent = members.size;
    document.getElementById('statEvents').textContent = events.size;
    document.getElementById('statGallery').textContent = gallery.size;

    const recentSnap = await getDocs(query(collection(db, 'members'), where('status','==','pending'), orderBy('createdAt','desc')));
    const container = document.getElementById('recentApplications');
    if (recentSnap.empty) { container.innerHTML = '<p style="color:#666;font-size:13px;">No pending applications.</p>'; return; }
    container.innerHTML = `<table class="table">
      <tr><th>Name</th><th>Sector</th><th>Mobile</th><th>Action</th></tr>
      ${recentSnap.docs.slice(0,5).map(d => {
        const m = d.data();
        return `<tr>
          <td><strong>${m.fullname||'—'}</strong></td>
          <td>${m.sector||''}</td>
          <td>${m.mobile||''}</td>
          <td>
            <button class="action-btn btn-approve" onclick="updateStatus('${d.id}','approved')">✓ Approve</button>
            <button class="action-btn btn-reject" onclick="updateStatus('${d.id}','rejected')">✗ Reject</button>
          </td>
        </tr>`;
      }).join('')}
    </table>`;
  } catch(e) {}
}

// ── APPLICATIONS ──
async function loadApplications() {
  const container = document.getElementById('applicationsList');
  container.innerHTML = '<div style="color:#666;font-size:13px;">Loading...</div>';
  try {
    const snap = await getDocs(query(collection(db, 'members'), where('status','==','pending'), orderBy('createdAt','desc')));
    document.getElementById('pendingBadge').textContent = snap.size + ' pending';
    if (snap.empty) { container.innerHTML = '<p style="color:#666;font-size:13px;padding:1rem;">No pending applications.</p>'; return; }
    container.innerHTML = `<table class="table">
      <tr><th>Photo</th><th>Name</th><th>NID</th><th>Sector</th><th>Membership</th><th>Mobile</th><th>District</th><th>Action</th></tr>
      ${snap.docs.map(d => {
        const m = d.data();
        return `<tr>
          <td>${m.photoURL ? `<img src="${m.photoURL}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">` : '—'}</td>
          <td><strong>${m.fullname||'—'}</strong><br><span style="font-size:11px;color:#666;">${m.specialty||''}</span></td>
          <td style="font-size:12px;">${m.nid||'—'}</td>
          <td>${m.sector||''}</td>
          <td>${m.membership||''}</td>
          <td>${m.mobile||''}</td>
          <td>${m.dist_c||''}</td>
          <td>
            <button class="action-btn btn-approve" onclick="updateStatus('${d.id}','approved')">✓ Approve</button>
            <button class="action-btn btn-reject" onclick="updateStatus('${d.id}','rejected')">✗ Reject</button>
          </td>
        </tr>`;
      }).join('')}
    </table>`;
  } catch(e) { container.innerHTML = '<p style="color:#666;">Error loading.</p>'; }
}

window.updateStatus = async (id, status) => {
  try {
    await updateDoc(doc(db, 'members', id), { status });
    loadApplications(); loadDashboard();
    alert(status === 'approved' ? '✓ Member approved!' : '✗ Application rejected.');
  } catch(e) { alert('Error updating status.'); }
};

// ── MEMBERS ──
async function loadMembers() {
  const container = document.getElementById('membersList');
  container.innerHTML = '<div style="color:#666;font-size:13px;">Loading...</div>';
  try {
    const snap = await getDocs(query(collection(db, 'members'), where('status','==','approved')));
    if (snap.empty) { container.innerHTML = '<p style="color:#666;font-size:13px;padding:1rem;">No approved members yet.</p>'; return; }
    container.innerHTML = `<table class="table">
      <tr><th>Photo</th><th>Name</th><th>Sector</th><th>Membership</th><th>Mobile</th><th>District</th><th>Action</th></tr>
      ${snap.docs.map(d => {
        const m = d.data();
        return `<tr>
          <td>${m.photoURL ? `<img src="${m.photoURL}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">` : '—'}</td>
          <td><strong>${m.fullname||'—'}</strong><br><span style="font-size:11px;color:#666;">${m.specialty||''}</span></td>
          <td>${m.sector||''}</td>
          <td>${m.membership||''}</td>
          <td>${m.mobile||''}</td>
          <td>${m.dist_c||''}</td>
          <td><button class="action-btn btn-delete" onclick="deleteMember('${d.id}')">Delete</button></td>
        </tr>`;
      }).join('')}
    </table>`;
  } catch(e) {}
}

window.deleteMember = async (id) => {
  if (!confirm('Delete this member?')) return;
  await deleteDoc(doc(db, 'members', id));
  loadMembers();
};

// ── COMMITTEE MANAGER ──
async function loadCommitteeManager(colName, wrapperId) {
  const wrapper = document.getElementById(wrapperId);
  if (!wrapper) return;
  const snap = await getDocs(query(collection(db, colName), orderBy('order','asc'))).catch(() => null);

  wrapper.innerHTML = `
    <div class="panel">
      <div class="panel-title">Add New Person</div>
      <div class="form-inline">
        <div class="form-row2">
          <input type="text" id="${colName}_name" placeholder="Full Name *">
          <input type="text" id="${colName}_role" placeholder="Role / Position *">
        </div>
        <div class="form-row2">
          <input type="text" id="${colName}_sector" placeholder="Sector">
          <input type="number" id="${colName}_order" placeholder="Display Order (1, 2, 3...)" value="1">
        </div>
        <div>
          <label style="font-size:11px;color:#666;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:6px;">Profile Photo</label>
          <input type="file" id="${colName}_photo" accept="image/*">
        </div>
        <button class="add-btn" onclick="addCommitteeMember('${colName}')">Add Person</button>
        <p id="${colName}_status" style="font-size:12px;color:#666;margin-top:8px;"></p>
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">Current Members</div>
      <div id="${colName}_list">${snap && !snap.empty ? `<table class="table">
        <tr><th>Photo</th><th>Name</th><th>Role</th><th>Sector</th><th>Order</th><th>Action</th></tr>
        ${snap.docs.map(d => {
          const m = d.data();
          return `<tr>
            <td>${m.photoURL ? `<img src="${m.photoURL}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">` : '👤'}</td>
            <td><strong>${m.name||'—'}</strong></td>
            <td>${m.role||''}</td>
            <td>${m.sector||''}</td>
            <td>${m.order||''}</td>
            <td><button class="action-btn btn-delete" onclick="deleteCommitteeMember('${colName}','${d.id}')">Delete</button></td>
          </tr>`;
        }).join('')}
      </table>` : '<p style="color:#666;font-size:13px;">No members added yet.</p>'}</div>
    </div>`;
}

window.addCommitteeMember = async (colName) => {
  const name = document.getElementById(`${colName}_name`).value.trim();
  const role = document.getElementById(`${colName}_role`).value.trim();
  if (!name || !role) { alert('Name and role are required.'); return; }
  const status = document.getElementById(`${colName}_status`);
  status.textContent = 'Saving...';
  try {
    const data = {
      name, role,
      sector: document.getElementById(`${colName}_sector`).value,
      order: parseInt(document.getElementById(`${colName}_order`).value) || 1,
      createdAt: serverTimestamp()
    };
    const photoFile = document.getElementById(`${colName}_photo`)?.files[0];
    if (photoFile) {
      status.textContent = 'Uploading photo...';
      data.photoURL = await uploadToCloudinary(photoFile);
    }
    await addDoc(collection(db, colName), data);
    status.textContent = '✓ Added successfully!';
    const wrappers = { founders: 'committeeManager', managing: 'managingManager', committee: 'committeeManagerEC', subcommittee: 'subcommitteeManagerSC' };
    setTimeout(() => loadCommitteeManager(colName, wrappers[colName]), 800);
  } catch(e) { status.textContent = 'Error: ' + e.message; }
};

window.deleteCommitteeMember = async (colName, id) => {
  if (!confirm('Delete this person?')) return;
  await deleteDoc(doc(db, colName, id));
  const wrappers = { founders: 'committeeManager', managing: 'managingManager', committee: 'committeeManagerEC', subcommittee: 'subcommitteeManagerSC' };
  loadCommitteeManager(colName, wrappers[colName]);
};

// ── EVENTS ──
async function loadEvents() {
  const container = document.getElementById('eventsList');
  try {
    const snap = await getDocs(query(collection(db, 'events'), orderBy('date', 'desc')));
    if (snap.empty) { container.innerHTML = '<p style="color:#666;font-size:13px;">No events yet.</p>'; return; }
    container.innerHTML = `<table class="table">
      <tr><th>Title</th><th>Date</th><th>Location</th><th>Tag</th><th>Status</th><th>Action</th></tr>
      ${snap.docs.map(d => {
        const e = d.data();
        return `<tr>
          <td><strong>${e.title||'—'}</strong></td>
          <td>${e.date||''}</td>
          <td>${e.location||''}</td>
          <td>${e.tag||''}</td>
          <td><span style="font-size:10px;padding:2px 8px;background:${e.upcoming?'rgba(13,92,46,0.1)':'rgba(0,0,0,0.05)'};color:${e.upcoming?'#0D5C2E':'#666'};font-weight:700;">${e.upcoming?'Upcoming':'Past'}</span></td>
          <td><button class="action-btn btn-delete" onclick="deleteEvent('${d.id}')">Delete</button></td>
        </tr>`;
      }).join('')}
    </table>`;
  } catch(e) {}
}

window.addEvent = async () => {
  const title = document.getElementById('ev_title').value.trim();
  if (!title) { alert('Event title is required.'); return; }
  try {
    await addDoc(collection(db, 'events'), {
      title,
      location: document.getElementById('ev_location').value,
      date: document.getElementById('ev_date').value,
      tag: document.getElementById('ev_tag').value,
      upcoming: document.getElementById('ev_upcoming').checked,
      createdAt: serverTimestamp()
    });
    alert('✓ Event added!');
    ['ev_title','ev_location','ev_date','ev_tag'].forEach(id => document.getElementById(id).value = '');
    loadEvents();
  } catch(e) { alert('Error: ' + e.message); }
};

window.deleteEvent = async (id) => {
  if (!confirm('Delete this event?')) return;
  await deleteDoc(doc(db, 'events', id));
  loadEvents();
};

// ── GALLERY ──
async function loadGallery() {
  const container = document.getElementById('galleryList');
  try {
    const snap = await getDocs(query(collection(db, 'gallery'), orderBy('createdAt', 'desc')));
    if (snap.empty) { container.innerHTML = '<p style="color:#666;font-size:13px;">No photos yet.</p>'; return; }
    container.innerHTML = snap.docs.map(d => {
      const g = d.data();
      return `<div style="position:relative;background:#f5f5f5;border-radius:4px;overflow:hidden;">
        <img src="${g.url}" style="width:100%;aspect-ratio:4/3;object-fit:cover;display:block;">
        <div style="padding:6px 8px;font-size:11px;color:#666;">${g.caption||''}</div>
        <button onclick="deleteGallery('${d.id}')" style="position:absolute;top:6px;right:6px;background:#C1121F;color:#fff;border:none;cursor:pointer;padding:4px 10px;font-size:11px;font-weight:700;">✕</button>
      </div>`;
    }).join('');
  } catch(e) {}
}

window.uploadGalleryPhoto = async () => {
  const file = document.getElementById('galleryPhoto').files[0];
  const status = document.getElementById('galleryUploadStatus');
  if (!file) { alert('Please select a photo.'); return; }
  status.textContent = 'Uploading...';
  try {
    const url = await uploadToCloudinary(file);
    await addDoc(collection(db, 'gallery'), {
      url,
      caption: document.getElementById('galleryCaption').value,
      createdAt: serverTimestamp()
    });
    status.textContent = '✓ Photo uploaded!';
    document.getElementById('galleryPhoto').value = '';
    document.getElementById('galleryCaption').value = '';
    loadGallery();
  } catch(e) { status.textContent = 'Error: ' + e.message; }
};

window.deleteGallery = async (id) => {
  if (!confirm('Delete this photo?')) return;
  await deleteDoc(doc(db, 'gallery', id));
  loadGallery();
};

// ── TRIBUTE ──
async function loadTribute() {
  const container = document.getElementById('tributeList');
  try {
    const snap = await getDocs(collection(db, 'tribute'));
    if (snap.empty) { container.innerHTML = '<p style="color:#666;font-size:13px;">No entries yet.</p>'; return; }
    container.innerHTML = `<table class="table">
      <tr><th>Photo</th><th>Name</th><th>Role</th><th>Years</th><th>Action</th></tr>
      ${snap.docs.map(d => {
        const t = d.data();
        return `<tr>
          <td>${t.photoURL ? `<img src="${t.photoURL}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">` : '👤'}</td>
          <td><strong>${t.name||'—'}</strong></td>
          <td>${t.role||''}</td>
          <td>${t.born||''} — ${t.passed||''}</td>
          <td><button class="action-btn btn-delete" onclick="deleteTribute('${d.id}')">Delete</button></td>
        </tr>`;
      }).join('')}
    </table>`;
  } catch(e) {}
}

window.addTribute = async () => {
  const name = document.getElementById('tr_name').value.trim();
  if (!name) { alert('Name is required.'); return; }
  try {
    const data = {
      name,
      role: document.getElementById('tr_role').value,
      born: document.getElementById('tr_born').value,
      passed: document.getElementById('tr_passed').value,
      message: document.getElementById('tr_message').value,
      createdAt: serverTimestamp()
    };
    const photoFile = document.getElementById('tr_photo')?.files[0];
    if (photoFile) data.photoURL = await uploadToCloudinary(photoFile);
    await addDoc(collection(db, 'tribute'), data);
    alert('✓ Added to In Memoriam.');
    loadTribute();
  } catch(e) { alert('Error: ' + e.message); }
};

window.deleteTribute = async (id) => {
  if (!confirm('Delete this entry?')) return;
  await deleteDoc(doc(db, 'tribute', id));
  loadTribute();
};

// ── FEEDBACK ──
async function loadFeedback() {
  const container = document.getElementById('feedbackList');
  try {
    const snap = await getDocs(query(collection(db, 'feedback'), orderBy('createdAt', 'desc')));
    if (snap.empty) { container.innerHTML = '<p style="color:#666;font-size:13px;">No feedback yet.</p>'; return; }
    container.innerHTML = `<table class="table">
      <tr><th>Type</th><th>Name</th><th>Subject</th><th>Message</th><th>Action</th></tr>
      ${snap.docs.map(d => {
        const f = d.data();
        return `<tr>
          <td><span style="font-size:10px;padding:2px 8px;background:${f.type==='Complaint'?'rgba(193,18,31,0.1)':'rgba(13,92,46,0.1)'};color:${f.type==='Complaint'?'#C1121F':'#0D5C2E'};font-weight:700;">${f.type||'Suggestion'}</span></td>
          <td>${f.name||'Anonymous'}</td>
          <td><strong>${f.subject||'—'}</strong></td>
          <td style="font-size:12px;max-width:280px;">${f.message||''}</td>
          <td><button class="action-btn btn-delete" onclick="deleteFeedback('${d.id}')">Delete</button></td>
        </tr>`;
      }).join('')}
    </table>`;
  } catch(e) {}
}

window.deleteFeedback = async (id) => {
  if (!confirm('Delete this feedback?')) return;
  await deleteDoc(doc(db, 'feedback', id));
  loadFeedback();
};
