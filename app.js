'use strict';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
const STORE = 'nms_snapshot_posts_v2';
const TOKEN_KEY = 'nms_buffer_token';

const samplePosts = [
  { id:'p1', date:'2026-06-03', time:'9:00 AM', platform:'Instagram', caption:'Behind the scenes look at our summer launch setup. Less polished. More real. Exactly how the internet likes it.', mediaUrl:'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop', status:'Review', note:'Client asked for a more human campaign angle.', comments:[] },
  { id:'p2', date:'2026-06-04', time:'1:30 PM', platform:'LinkedIn', caption:'Most content calendars fail because they organize posts, not decisions. Here is how we are making approvals easier this month.', mediaUrl:'', status:'Draft', note:'Needs stronger hook before sharing.', comments:[] },
  { id:'p3', date:'2026-06-06', time:'11:15 AM', platform:'TikTok', caption:'POV: your client approves the calendar without asking for screenshots, a PDF, and one tiny change that breaks everything.', mediaUrl:'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1200&auto=format&fit=crop', status:'Approved', note:'Use trend audio if still active.', comments:[{author:'Client', text:'Approved. This one feels very us.'}] },
  { id:'p4', date:'2026-06-07', time:'4:00 PM', platform:'Threads', caption:'Content approval should not require three Slack threads, two screenshots, and one emotionally damaged spreadsheet.', mediaUrl:'', status:'Needs Edits', note:'Maybe soften the spreadsheet joke for the client view.', comments:[{author:'Client', text:'Can we make this slightly less spicy? Still funny, just less haunted.'}] }
];

const state = { posts: loadPosts(), filter: 'all', shareUrl: '' };

function loadPosts(){ try { return JSON.parse(localStorage.getItem(STORE)) || samplePosts; } catch { return samplePosts; } }
function savePosts(){ localStorage.setItem(STORE, JSON.stringify(state.posts)); }
function uid(prefix='post'){ return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`; }
function esc(v){ return String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function validStatus(s){ return ['Draft','Review','Approved','Needs Edits'].includes(s) ? s : 'Review'; }
function statusClass(s){ return validStatus(s).replace(/\s+/g,''); }
function sortedPosts(){ return [...state.posts].sort((a,b)=>`${a.date || ''} ${a.time || ''}`.localeCompare(`${b.date || ''} ${b.time || ''}`)); }
function visiblePosts(){ return sortedPosts().filter(p => state.filter === 'all' || p.status === state.filter); }
function metrics(posts = state.posts){ return { total:posts.length, approved:posts.filter(p=>p.status==='Approved').length, review:posts.filter(p=>p.status==='Review').length, edits:posts.filter(p=>p.status==='Needs Edits').length, draft:posts.filter(p=>p.status==='Draft').length }; }
function toast(msg){ const t = $('#toast'); if(!t) return; t.textContent = msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 2300); }
function b64Encode(obj){ return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function b64Decode(str){ const normalized = String(str || '').replace(/-/g,'+').replace(/_/g,'/'); const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4); return JSON.parse(decodeURIComponent(escape(atob(padded)))); }
function project(){ return { name: $('#projectName')?.value || 'Content Plan', range: $('#rangeLabel')?.value || 'Upcoming posts', intro: $('#intro')?.value || '' }; }
function setProject(p){ if(!p) return; if($('#projectName')) $('#projectName').value = p.name || 'Content Plan'; if($('#rangeLabel')) $('#rangeLabel').value = p.range || 'Upcoming posts'; if($('#intro')) $('#intro').value = p.intro || ''; }

function statMarkup(m){
  return [ ['Total',m.total], ['Draft',m.draft], ['Review',m.review], ['Approved',m.approved] ].map(([label,value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join('');
}

function renderMetrics(){
  const html = statMarkup(metrics());
  const a = $('#metrics'); if(a) a.innerHTML = html;
  const b = $('#statusMetrics'); if(b) b.innerHTML = html;
}

function postCard(post, client=false){
  const comments = (post.comments || []).map(c => `<div class="comment"><strong>${esc(c.author || 'Client')}:</strong> ${esc(c.text)}</div>`).join('');
  const media = post.mediaUrl ? `<img src="${esc(post.mediaUrl)}" alt="Post media preview" loading="lazy" />` : `<span>No media linked</span>`;
  return `
    <article class="post-card" data-id="${esc(post.id)}">
      <div class="media">${media}</div>
      <div class="post-main">
        <div class="post-top">
          <div>
            <div class="platform">${esc(post.platform || 'Platform')}</div>
            <div class="date">${esc(post.date || 'Unscheduled')} · ${esc(post.time || '')}</div>
          </div>
          <span class="status ${statusClass(post.status)}">${esc(validStatus(post.status))}</span>
        </div>
        <div class="caption">${esc(post.caption || 'No caption yet.')}</div>
        ${post.note ? `<div class="note">Note: ${esc(post.note)}</div>` : ''}
        ${comments ? `<div class="comments">${comments}</div>` : ''}
        ${client ? `
          <div class="post-actions">
            <button class="mini approve" data-action="approve">Approve</button>
            <button class="mini edits" data-action="edits">Needs edits</button>
          </div>
          <div class="comment-row">
            <input data-comment-input placeholder="Leave a comment..." />
            <button class="mini" data-action="comment">Send</button>
          </div>` : `
          <div class="post-actions">
            <button class="mini" data-action="edit">Edit</button>
            <button class="mini" data-action="Draft">Draft</button>
            <button class="mini" data-action="Review">Review</button>
            <button class="mini" data-action="Approved">Approved</button>
            <button class="mini" data-action="Needs Edits">Needs edits</button>
            <button class="mini" data-action="delete">Delete</button>
          </div>`}
      </div>
    </article>`;
}

function renderPosts(){
  const list = $('#postList');
  if(list) list.innerHTML = visiblePosts().map(p=>postCard(p)).join('') || `<div class="note">No posts yet. Load sample posts, upload a CSV, or import from Buffer.</div>`;
  const review = $('#reviewList');
  if(review) review.innerHTML = sortedPosts().map(p=>postCard(p, true)).join('') || `<div class="note">No posts in this Snapshot yet.</div>`;
  renderReviewHeader();
  renderStatus();
  renderMetrics();
  renderSide();
  savePosts();
}

function renderSide(){
  const p = project(); const m = metrics();
  const name = $('#sideProjectName'); if(name) name.textContent = p.name;
  const meta = $('#sideProjectMeta'); if(meta) meta.textContent = `${m.total} posts · ${m.approved} approved · ${m.review} in review`;
}

function renderReviewHeader(){
  const p = project(); const m = metrics();
  if($('#reviewTitle')) $('#reviewTitle').textContent = p.name;
  if($('#reviewIntro')) $('#reviewIntro').textContent = p.intro;
  if($('#approvalScore')) $('#approvalScore').innerHTML = `<strong>${m.approved}</strong> of <strong>${m.total}</strong> approved · ${esc(p.range)}`;
  const dates = [...new Set(sortedPosts().map(p=>p.date).filter(Boolean))];
  const strip = $('#calendarStrip');
  if(strip) strip.innerHTML = dates.map(d => {
    const date = new Date(`${d}T00:00:00`);
    const label = Number.isNaN(date.getTime()) ? d : date.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
    const count = state.posts.filter(p=>p.date===d).length;
    return `<div class="day-pill"><small>${esc(label)}</small>${count} post${count === 1 ? '' : 's'}</div>`;
  }).join('');
}

function renderStatus(){
  const list = $('#statusList'); if(!list) return;
  list.innerHTML = sortedPosts().map(p => `
    <div class="status-row">
      <div>
        <strong>${esc(p.platform)} · ${esc(p.date)}</strong>
        <p>${esc((p.caption || '').slice(0, 130))}${(p.caption || '').length > 130 ? '…' : ''}</p>
      </div>
      <span class="status ${statusClass(p.status)}">${esc(validStatus(p.status))}</span>
      <strong>${(p.comments || []).length} comments</strong>
    </div>`).join('') || `<div class="note">No posts yet.</div>`;
}

function setView(view){
  $$('.view').forEach(v => v.classList.toggle('active', v.id === view));
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $('#sideNav')?.classList.remove('open');
  if(view === 'clientView') renderReviewHeader();
}

function parseCsvLine(line){
  const out = []; let current = ''; let quoted = false;
  for(let i=0;i<line.length;i++){
    const ch = line[i], next = line[i+1];
    if(ch === '"' && quoted && next === '"'){ current += '"'; i++; continue; }
    if(ch === '"'){ quoted = !quoted; continue; }
    if(ch === ',' && !quoted){ out.push(current.trim()); current=''; continue; }
    current += ch;
  }
  out.push(current.trim());
  return out;
}

function importCsv(text){
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if(lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const vals = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((h,i)=>[h, vals[i] || '']));
    return {
      id: uid('csv'),
      date: row.date || row['publish date'] || row['scheduled date'] || new Date().toISOString().slice(0,10),
      time: row.time || '9:00 AM',
      platform: row.platform || row.channel || 'Instagram',
      caption: row.caption || row.copy || row.text || 'Imported post caption',
      mediaUrl: row.mediaurl || row['media url'] || row.asset || row.link || '',
      status: validStatus(row.status || 'Review'),
      note: row.note || row.notes || '',
      comments: []
    };
  });
}

function addPost(post={}){
  state.posts.push({
    id: uid('manual'), date: post.date || new Date(Date.now()+86400000).toISOString().slice(0,10), time: post.time || '9:00 AM',
    platform: post.platform || 'Instagram', caption: post.caption || 'New planned post goes here.', mediaUrl: post.mediaUrl || '', status: post.status || 'Draft', note: post.note || '', comments: post.comments || []
  });
  renderPosts();
}

function openEdit(id){
  const p = state.posts.find(x=>x.id===id); if(!p) return;
  $('#editId').value = p.id; $('#editDate').value = p.date || ''; $('#editTime').value = p.time || '';
  $('#editPlatform').value = p.platform || ''; $('#editStatus').value = validStatus(p.status);
  $('#editCaption').value = p.caption || ''; $('#editMediaUrl').value = p.mediaUrl || ''; $('#editNote').value = p.note || '';
  $('#editDialog').showModal();
}

function saveEdit(){
  const id = $('#editId').value;
  state.posts = state.posts.map(p => p.id === id ? { ...p, date:$('#editDate').value, time:$('#editTime').value, platform:$('#editPlatform').value, status:validStatus($('#editStatus').value), caption:$('#editCaption').value, mediaUrl:$('#editMediaUrl').value, note:$('#editNote').value } : p);
  renderPosts(); toast('Post updated');
}

function updatePostStatus(id, status){ state.posts = state.posts.map(p => p.id === id ? { ...p, status: validStatus(status) } : p); renderPosts(); }
function deletePost(id){ state.posts = state.posts.filter(p => p.id !== id); renderPosts(); }
function addComment(id, text){ state.posts = state.posts.map(p => p.id === id ? { ...p, comments:[...(p.comments||[]), { author:'Client', text }] } : p); renderPosts(); }

function makeSharePayload(){ return { version: 1, generatedAt: new Date().toISOString(), project: project(), posts: sortedPosts() }; }
function generateShareLink(){
  const payload = b64Encode(makeSharePayload());
  const url = `${location.origin}${location.pathname}#snapshot=${payload}`;
  state.shareUrl = url;
  if($('#shareLink')) $('#shareLink').value = url;
  if($('#copyLink')) $('#copyLink').disabled = false;
  if($('#openLink')) $('#openLink').disabled = false;
  setView('shareView');
  toast('Review link generated');
  return url;
}

async function copyShareLink(){
  const url = state.shareUrl || $('#shareLink')?.value || generateShareLink();
  try { await navigator.clipboard.writeText(url); toast('Link copied'); }
  catch { $('#shareLink')?.select(); document.execCommand('copy'); toast('Link copied'); }
}

function loadSharedSnapshot(){
  if(!location.hash.startsWith('#snapshot=')) return false;
  try {
    const payload = b64Decode(location.hash.replace('#snapshot=',''));
    if(!payload?.posts) throw new Error('Bad payload');
    state.posts = payload.posts.map(p => ({ ...p, status: validStatus(p.status), comments: Array.isArray(p.comments) ? p.comments : [] }));
    setProject(payload.project);
    document.body.classList.add('shared-mode');
    setView('clientView');
    renderPosts();
    return true;
  } catch(err) {
    console.error(err);
    toast('Snapshot link could not be opened');
    return false;
  }
}

async function importBufferPosts(){
  const token = $('#bufferToken')?.value || localStorage.getItem(TOKEN_KEY) || '';
  if(!token.trim()){ $('#bufferStatus').textContent = 'Paste or save a Buffer token first.'; return; }
  $('#bufferStatus').textContent = 'Importing from Buffer...';
  try {
    const res = await fetch('/.netlify/functions/buffer-proxy', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ token }) });
    const data = await res.json();
    if(!res.ok) throw new Error(data?.error || 'Buffer import failed');
    const imported = normalizeBufferResponse(data);
    if(!imported.length) throw new Error('No scheduled posts found in the proxy response.');
    state.posts = imported;
    renderPosts();
    $('#bufferStatus').textContent = `Imported ${imported.length} posts.`;
    $('#importDrawer')?.close();
  } catch(err) {
    console.error(err);
    $('#bufferStatus').textContent = err.message || 'Buffer import failed.';
  }
}

function normalizeBufferResponse(data){
  const raw = data?.posts || data?.data?.posts || data?.data?.scheduledPosts || data?.data?.organization?.posts || [];
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((p, i) => {
    const dateObj = new Date(p.scheduledAt || p.scheduled_at || p.dueAt || p.date || Date.now());
    const date = Number.isNaN(dateObj.getTime()) ? new Date().toISOString().slice(0,10) : dateObj.toISOString().slice(0,10);
    const time = Number.isNaN(dateObj.getTime()) ? '9:00 AM' : dateObj.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' });
    const media = p.mediaUrl || p.media_url || p.thumbnail || p.image || p.assets?.[0]?.url || '';
    return { id:String(p.id || uid(`buffer-${i}`)), date, time, platform:p.platform || p.channel || p.channelName || 'Buffer', caption:p.text || p.caption || p.content || p.body || 'Buffer post', mediaUrl:media, status:'Review', note:'Imported from Buffer.', comments:[] };
  });
}

function bind(){
  $$('.nav-btn').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.view)));
  $('#toggleSide')?.addEventListener('click', () => $('#sideNav')?.classList.toggle('open'));
  ['sideGenerateLink','mobileGenerateLink','heroGenerateLink','generateLink'].forEach(id => $('#'+id)?.addEventListener('click', generateShareLink));
  $('#heroClientPreview')?.addEventListener('click', () => setView('clientView'));
  ['loadSample','sideLoadSample'].forEach(id => $('#'+id)?.addEventListener('click', () => { state.posts = JSON.parse(JSON.stringify(samplePosts)); renderPosts(); toast('Sample posts loaded'); }));
  $('#addPost')?.addEventListener('click', () => addPost());
  $('#copyLink')?.addEventListener('click', copyShareLink);
  $('#openLink')?.addEventListener('click', () => { const url = state.shareUrl || $('#shareLink')?.value || generateShareLink(); window.open(url, '_blank', 'noopener'); });
  $('#openImportDrawer')?.addEventListener('click', () => $('#importDrawer')?.showModal());
  $('#csvUpload')?.addEventListener('change', (e) => { const file = e.target.files?.[0]; if(!file) return; const reader = new FileReader(); reader.onload = () => { const imported = importCsv(String(reader.result || '')); if(imported.length){ state.posts = imported; renderPosts(); toast(`Imported ${imported.length} posts`); $('#importDrawer')?.close(); } else toast('CSV had no rows'); }; reader.readAsText(file); });
  $('#saveToken')?.addEventListener('click', () => { localStorage.setItem(TOKEN_KEY, $('#bufferToken').value || ''); $('#bufferStatus').textContent = 'Token saved locally in this browser.'; });
  $('#clearToken')?.addEventListener('click', () => { localStorage.removeItem(TOKEN_KEY); if($('#bufferToken')) $('#bufferToken').value=''; $('#bufferStatus').textContent = 'Token cleared.'; });
  $('#bufferImport')?.addEventListener('click', importBufferPosts);
  $('#saveEdit')?.addEventListener('click', saveEdit);
  $('#projectName')?.addEventListener('input', renderSide); $('#rangeLabel')?.addEventListener('input', renderReviewHeader); $('#intro')?.addEventListener('input', renderReviewHeader);
  $('#filters')?.addEventListener('click', (e) => { const btn = e.target.closest('[data-filter]'); if(!btn) return; state.filter = btn.dataset.filter; $$('#filters .chip').forEach(b => b.classList.toggle('active', b === btn)); renderPosts(); });
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.post-card'); if(!card) return;
    const actionEl = e.target.closest('[data-action]'); if(!actionEl) return;
    const id = card.dataset.id; const action = actionEl.dataset.action;
    if(action === 'edit') openEdit(id);
    else if(action === 'delete') deletePost(id);
    else if(action === 'approve') updatePostStatus(id, 'Approved');
    else if(action === 'edits') updatePostStatus(id, 'Needs Edits');
    else if(action === 'comment') { const input = card.querySelector('[data-comment-input]'); const text = input?.value.trim(); if(text){ addComment(id, text); input.value=''; } }
    else updatePostStatus(id, action);
  });
}

function init(){
  if($('#bufferToken')) $('#bufferToken').value = localStorage.getItem(TOKEN_KEY) || '';
  bind();
  if(!loadSharedSnapshot()) renderPosts();
}

document.addEventListener('DOMContentLoaded', init);
