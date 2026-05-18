(() => {
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
  const STORE = "nms_demo_posts_v1";
  const TOKEN_STORE = "nms_buffer_token";
  const b64 = {
    enc: obj => btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""),
    dec: str => JSON.parse(decodeURIComponent(escape(atob(String(str).replace(/-/g,"+").replace(/_/g,"/") + "===".slice((String(str).length+3)%4)))))
  };

  const samplePosts = [
    {id:"p1",date:"2026-06-03",time:"9:00 AM",platform:"Instagram",caption:"Behind the scenes look at our summer launch setup. Less polished. More real. Exactly how the internet likes it.",mediaUrl:"https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop",status:"Review",note:"Client asked for a more human campaign angle.",comments:[]},
    {id:"p2",date:"2026-06-04",time:"1:30 PM",platform:"LinkedIn",caption:"Most content calendars fail because they organize posts, not decisions. Here is how we are making approvals easier this month.",mediaUrl:"",status:"Draft",note:"Needs stronger hook before sharing.",comments:[]},
    {id:"p3",date:"2026-06-06",time:"11:15 AM",platform:"TikTok",caption:"POV: your client approves the calendar without asking for screenshots, a PDF, and one tiny change that breaks everything.",mediaUrl:"https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1200&auto=format&fit=crop",status:"Approved",note:"Use trend audio if still active.",comments:[{author:"Client",text:"Approved. This one feels very us."}]},
    {id:"p4",date:"2026-06-07",time:"4:00 PM",platform:"Threads",caption:"Content approval should not require three Slack threads, two screenshots, and one emotionally damaged spreadsheet.",mediaUrl:"",status:"Needs Edits",note:"Maybe soften the spreadsheet joke for the client view.",comments:[{author:"Client",text:"Can we make this slightly less spicy? Still funny, just less haunted."}]}
  ];

  const state = {
    posts: loadPosts(),
    filter: "all",
    snacks: []
  };

  function loadPosts(){
    try { return JSON.parse(localStorage.getItem(STORE)) || samplePosts; } catch { return samplePosts; }
  }
  function savePosts(){
    localStorage.setItem(STORE, JSON.stringify(state.posts));
  }
  function uid(prefix="post"){ return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`; }
  function esc(v){ return String(v ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function cleanStatus(s){ return ["Draft","Review","Approved","Needs Edits"].includes(s) ? s : "Review"; }
  function statusClass(s){ return cleanStatus(s).replace(/\s+/g,""); }
  function sortedPosts(){ return [...state.posts].sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)); }
  function filteredPosts(){
    return sortedPosts().filter(p => state.filter === "all" || p.status === state.filter);
  }
  function metrics(){
    const posts = state.posts;
    return {
      total: posts.length,
      approved: posts.filter(p=>p.status==="Approved").length,
      review: posts.filter(p=>p.status==="Review").length,
      edits: posts.filter(p=>p.status==="Needs Edits").length
    };
  }
  function toast(msg){
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(()=>t.classList.remove("show"), 2500);
  }

  function renderMetrics(target="#metrics"){
    const m = metrics();
    const el = $(target);
    if(!el) return;
    el.innerHTML = [
      ["Total posts",m.total],
      ["Approved",m.approved],
      ["In review",m.review],
      ["Need edits",m.edits]
    ].map(([label,value])=>`<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join("");
  }

  function postCard(post, client=false){
    const media = post.mediaUrl ? `<img src="${esc(post.mediaUrl)}" alt="Media preview" loading="lazy">` : `No media preview`;
    const comments = (post.comments || []).map(c=>`<div class="comment"><strong>${esc(c.author||"Client")}:</strong> ${esc(c.text)}</div>`).join("");
    return `
      <article class="post-card" data-id="${esc(post.id)}">
        <div class="media">${media}</div>
        <div class="post-body">
          <div class="post-top">
            <div>
              <div class="post-platform">${esc(post.platform)}</div>
              <div class="post-date">${esc(post.date)} · ${esc(post.time || "")}</div>
            </div>
            <span class="status ${statusClass(post.status)}">${esc(post.status)}</span>
          </div>
          <div class="caption">${esc(post.caption)}</div>
          ${post.note ? `<div class="note">Note: ${esc(post.note)}</div>` : ""}
          ${comments ? `<div class="comments">${comments}</div>` : ""}
          ${client ? `
            <div class="post-actions">
              <button class="mini approve" data-action="approve">Approve</button>
              <button class="mini edits" data-action="edits">Needs edits</button>
            </div>
            <div class="comment-row">
              <input data-comment-input placeholder="Leave a comment..." />
              <button class="mini" data-action="comment">Send</button>
            </div>
          ` : `
            <div class="post-actions">
              <button class="mini" data-action="edit">Edit</button>
              <button class="mini" data-action="Draft">Draft</button>
              <button class="mini" data-action="Review">Review</button>
              <button class="mini" data-action="Approved">Approved</button>
              <button class="mini" data-action="Needs Edits">Needs edits</button>
              <button class="mini" data-action="delete">Delete</button>
            </div>
          `}
        </div>
      </article>
    `;
  }

  function renderPosts(){
    $("#postGrid").innerHTML = filteredPosts().map(p=>postCard(p)).join("") || empty("No posts yet. Load sample data, upload CSV, import Buffer, or add a manual post.");
    $("#reviewGrid").innerHTML = sortedPosts().map(p=>postCard(p,true)).join("") || empty("No posts in this Snapshot.");
    renderMetrics("#metrics");
    renderReviewHeader();
    renderStatus();
    savePosts();
  }
  function empty(text){ return `<div class="hint-card" style="grid-column:1/-1">${esc(text)}</div>`; }

  function renderReviewHeader(){
    $("#reviewTitle").textContent = $("#projectName").value || "Content Plan";
    $("#reviewIntro").textContent = $("#intro").value || "";
    const m = metrics();
    $("#approvalScore").textContent = `${m.approved} of ${m.total} approved`;
    const dates = [...new Set(sortedPosts().map(p=>p.date))];
    $("#calendarStrip").innerHTML = dates.map(d=>{
      const count = state.posts.filter(p=>p.date===d).length;
      const label = new Date(d + "T00:00:00");
      const day = Number.isNaN(label.getTime()) ? d : label.toLocaleDateString(undefined,{weekday:"short", day:"numeric"});
      return `<div class="day-pill"><small>${esc(day)}</small>${count} post${count===1?"":"s"}<br><span class="dot"></span></div>`;
    }).join("");
  }

  function renderStatus(){
    renderMetrics("#statusMetrics");
    $("#statusList").innerHTML = sortedPosts().map(p=>`
      <div class="status-row">
        <div>
          <strong>${esc(p.platform)} · ${esc(p.date)}</strong>
          <p>${esc((p.caption||"").slice(0,110))}${(p.caption||"").length>110?"…":""}</p>
        </div>
        <span class="status ${statusClass(p.status)}">${esc(p.status)}</span>
        <strong>${(p.comments||[]).length} comments</strong>
      </div>
    `).join("") || empty("No status to show yet.");
  }

  function setView(view){
    $$(".view").forEach(v=>v.classList.toggle("active", v.id===view));
    $$(".tab").forEach(t=>t.classList.toggle("active", t.dataset.view===view));
    if(view==="review") renderReviewHeader();
  }

  function parseCsvLine(line){
    const out=[]; let cur=""; let q=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i], next=line[i+1];
      if(ch === '"' && q && next === '"'){ cur+='"'; i++; continue; }
      if(ch === '"'){ q=!q; continue; }
      if(ch === "," && !q){ out.push(cur.trim()); cur=""; continue; }
      cur+=ch;
    }
    out.push(cur.trim());
    return out;
  }

  function importCsv(text){
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if(lines.length < 2) return [];
    const headers = parseCsvLine(lines[0]).map(h=>h.trim().toLowerCase());
    return lines.slice(1).map((line,i)=>{
      const vals = parseCsvLine(line);
      const row = Object.fromEntries(headers.map((h,idx)=>[h, vals[idx] || ""]));
      return {
        id: uid("csv"),
        date: row.date || row["publish date"] || row["scheduled date"] || new Date().toISOString().slice(0,10),
        time: row.time || "9:00 AM",
        platform: row.platform || row.channel || "Instagram",
        caption: row.caption || row.copy || row.text || "Imported post caption",
        mediaUrl: row.mediaurl || row["media url"] || row.asset || row.link || "",
        status: cleanStatus(row.status || "Review"),
        note: row.note || row.notes || "Imported from CSV.",
        comments:[]
      };
    });
  }

  function addManualPost(post={}){
    state.posts.push({
      id: uid("manual"),
      date: post.date || new Date(Date.now()+86400000).toISOString().slice(0,10),
      time: post.time || "9:00 AM",
      platform: post.platform || "Instagram",
      caption: post.caption || "New post idea goes here. Be brilliant. Or at least approved.",
      mediaUrl: post.mediaUrl || "",
      status: post.status || "Draft",
      note: post.note || "Manual post added inside No More Screenshots.",
      comments: post.comments || []
    });
    renderPosts();
  }

  function openEdit(id){
    const p = state.posts.find(x=>x.id===id);
    if(!p) return;
    $("#editId").value=p.id; $("#editDate").value=p.date; $("#editTime").value=p.time || "";
    $("#editPlatform").value=p.platform; $("#editStatus").value=p.status; $("#editCaption").value=p.caption;
    $("#editMediaUrl").value=p.mediaUrl || ""; $("#editNote").value=p.note || "";
    $("#editDialog").showModal();
  }

  function saveEdit(){
    const id=$("#editId").value;
    state.posts = state.posts.map(p=>p.id===id ? {
      ...p,
      date:$("#editDate").value,
      time:$("#editTime").value,
      platform:$("#editPlatform").value,
      status:cleanStatus($("#editStatus").value),
      caption:$("#editCaption").value,
      mediaUrl:$("#editMediaUrl").value,
      note:$("#editNote").value
    } : p);
    renderPosts(); toast("Post updated");
  }

  function generateLink(){
    const payload = {
      type:"nms-snapshot-v0",
      projectName: $("#projectName").value,
      rangeLabel: $("#rangeLabel").value,
      intro: $("#intro").value,
      posts: sortedPosts(),
      createdAt: new Date().toISOString()
    };
    const encoded = b64.enc(payload);
    const url = `${location.origin}${location.pathname}#review=${encoded}`;
    $("#shareLink").value = url;
    $("#copyLink").disabled = false;
    toast(encoded.length > 6000 ? "Link generated, but it is long. Fewer posts may share better." : "Review link generated");
  }

  function loadReviewFromHash(){
    const match = location.hash.match(/^#review=(.+)$/);
    if(!match) return false;
    try{
      const payload = b64.dec(match[1]);
      $("#projectName").value = payload.projectName || "Content Plan";
      $("#rangeLabel").value = payload.rangeLabel || "";
      $("#intro").value = payload.intro || "";
      state.posts = (payload.posts || []).map(p=>({...p, comments:p.comments||[]}));
      setView("review");
      renderPosts();
      return true;
    } catch(e){
      toast("Snapshot link could not be opened");
      return false;
    }
  }

  async function copyShare(){
    const val = $("#shareLink").value;
    if(!val) return;
    await navigator.clipboard.writeText(val);
    toast("Review link copied");
  }

  async function importFromBuffer(){
    const token = localStorage.getItem(TOKEN_STORE) || sessionStorage.getItem(TOKEN_STORE) || $("#bufferToken").value.trim();
    if(!token){ toast("Add a Buffer token first"); return; }
    const status = $("#bufferStatus");
    status.textContent = "Importing scheduled posts from Buffer…";
    try{
      const qOrg = "query { account { organizations { id name } } }";
      const orgRes = await callProxy(token, qOrg, {});
      const orgId = orgRes?.data?.account?.organizations?.[0]?.id;
      if(!orgId) throw new Error("No Buffer organization found.");
      const qChannels = "query C($organizationId: OrganizationId!) { channels(input:{organizationId:$organizationId}){ id displayName name service } }";
      const chRes = await callProxy(token, qChannels, {organizationId: orgId});
      const channels = chRes?.data?.channels || [];
      const qPosts = "query P($organizationId: OrganizationId!, $first: Int!) { posts(first:$first,input:{organizationId:$organizationId,filter:{status:[scheduled]}}){edges{node{id text dueAt channelId}} pageInfo{hasNextPage endCursor} } }";
      const postsRes = await callProxy(token, qPosts, {organizationId: orgId, first: 50});
      const edges = postsRes?.data?.posts?.edges || [];
      const imported = edges.map(edge => {
        const node = edge.node || {};
        const ch = channels.find(c=>c.id===node.channelId) || {};
        const dt = node.dueAt ? new Date(node.dueAt) : new Date();
        return {
          id: node.id || uid("buffer"),
          date: Number.isNaN(dt.getTime()) ? new Date().toISOString().slice(0,10) : dt.toISOString().slice(0,10),
          time: Number.isNaN(dt.getTime()) ? "9:00 AM" : dt.toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}),
          platform: ch.displayName || ch.name || ch.service || "Buffer",
          caption: node.text || "",
          mediaUrl:"",
          status:"Review",
          note:"Imported from Buffer scheduled posts.",
          comments:[]
        };
      });
      if(!imported.length){ status.textContent = "Connected, but no scheduled posts returned."; toast("No scheduled posts found"); return; }
      state.posts = imported;
      renderPosts();
      status.textContent = `Imported ${imported.length} Buffer posts.`;
      toast(`Imported ${imported.length} posts`);
      setView("builder");
    }catch(err){
      status.textContent = `Buffer import failed: ${err.message || err}`;
      toast("Buffer import failed");
    }
  }

  async function callProxy(token, query, variables){
    const res = await fetch("/.netlify/functions/buffer-proxy", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({token, query, variables})
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok || data.errors?.length) throw new Error(data.errors?.[0]?.message || data.error || "Buffer request failed");
    return data;
  }

  function generateSnacks(){
    const brand = $("#snackBrand").value || $("#projectName").value || "the brand";
    const goal = $("#snackGoal").value || "Build trust";
    const audience = $("#snackAudience").value || "the audience";
    const ideas = [
      {title:"Behind-the-scenes proof", body:`Show what ${brand} is doing before the polished version exists. Tie it back to why ${audience} should care.`},
      {title:"Problem clarity post", body:`Name the annoying problem ${audience} keeps running into, then explain how ${brand} thinks about solving it differently.`},
      {title:"Tiny customer/story moment", body:`Share one real quote, DM, question, or small win that connects ${brand} to ${audience}. Keep it human.`},
      {title:"Myth vs. reality", body:`Call out a common assumption in the space, then correct it with a useful, specific POV. Goal: ${goal}.`},
      {title:"Decision post", body:`Explain one choice behind the product/campaign/event and why it matters. People love seeing the strategy underneath.`}
    ];
    state.snacks = ideas;
    $("#snackOutput").innerHTML = ideas.map(i=>`<div class="snack-idea"><strong>${esc(i.title)}</strong>${esc(i.body)}</div>`).join("");
    toast("Snack pack generated");
  }

  function addSnacks(){
    if(!state.snacks.length) generateSnacks();
    const start = new Date();
    state.snacks.forEach((idea, idx)=>{
      const d = new Date(start);
      d.setDate(d.getDate() + idx + 1);
      addManualPost({
        date: d.toISOString().slice(0,10),
        platform: ["LinkedIn","Instagram","Threads","TikTok","Facebook"][idx % 5],
        caption: `${idea.title}: ${idea.body}`,
        status:"Draft",
        note:"Generated from Strategy Snack Machine."
      });
    });
    toast("Snack ideas added as drafts");
    setView("builder");
  }

  function bind(){
    $$(".tab").forEach(btn=>btn.addEventListener("click",()=>setView(btn.dataset.view)));
    $("#loadSample").addEventListener("click",()=>{ state.posts = structuredClone(samplePosts); renderPosts(); toast("Sample data loaded"); });
    $("#loadSampleTop").addEventListener("click",()=>$("#loadSample").click());
    $("#generateLink").addEventListener("click",generateLink);
    $("#generateLinkTop").addEventListener("click",generateLink);
    $("#copyLink").addEventListener("click",copyShare);
    $("#addPost").addEventListener("click",()=>addManualPost());
    $("#clearAll").addEventListener("click",()=>{ state.posts=[]; renderPosts(); toast("Cleared"); });
    $("#csvUpload").addEventListener("change", e=>{
      const file = e.target.files?.[0]; if(!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const imported = importCsv(String(reader.result || ""));
        if(imported.length){ state.posts = imported; renderPosts(); toast(`Imported ${imported.length} CSV posts`); }
        else toast("CSV looked empty");
      };
      reader.readAsText(file);
    });
    $$(".chip").forEach(c=>c.addEventListener("click",()=>{
      state.filter = c.dataset.filter;
      $$(".chip").forEach(x=>x.classList.toggle("active", x===c));
      renderPosts();
    }));
    $("#postGrid").addEventListener("click", e=>{
      const card = e.target.closest(".post-card"); const action = e.target.dataset.action;
      if(!card || !action) return;
      const id = card.dataset.id;
      if(action==="edit") return openEdit(id);
      if(action==="delete"){ state.posts = state.posts.filter(p=>p.id!==id); renderPosts(); return toast("Post deleted"); }
      if(["Draft","Review","Approved","Needs Edits"].includes(action)){ state.posts = state.posts.map(p=>p.id===id ? {...p,status:action} : p); renderPosts(); toast("Status updated"); }
    });
    $("#reviewGrid").addEventListener("click", e=>{
      const card = e.target.closest(".post-card"); const action = e.target.dataset.action;
      if(!card || !action) return;
      const id = card.dataset.id;
      if(action==="approve") state.posts = state.posts.map(p=>p.id===id ? {...p,status:"Approved"} : p);
      if(action==="edits") state.posts = state.posts.map(p=>p.id===id ? {...p,status:"Needs Edits"} : p);
      if(action==="comment"){
        const input = card.querySelector("[data-comment-input]");
        const text = input.value.trim();
        if(text){ state.posts = state.posts.map(p=>p.id===id ? {...p,comments:[...(p.comments||[]),{author:"Client",text}]} : p); input.value=""; }
      }
      renderPosts();
      toast(action==="comment" ? "Comment added" : "Review updated");
    });
    $("#saveEdit").addEventListener("click", e=>{ e.preventDefault(); saveEdit(); $("#editDialog").close(); });
    $("#saveToken").addEventListener("click",()=>{ const t=$("#bufferToken").value.trim(); if(t){ localStorage.setItem(TOKEN_STORE,t); toast("Token saved locally"); }});
    $("#clearToken").addEventListener("click",()=>{ localStorage.removeItem(TOKEN_STORE); sessionStorage.removeItem(TOKEN_STORE); $("#bufferToken").value=""; toast("Token cleared"); });
    $("#bufferImport").addEventListener("click",importFromBuffer);
    $("#generateSnacks").addEventListener("click",generateSnacks);
    $("#addSnacks").addEventListener("click",addSnacks);
    ["projectName","intro","rangeLabel"].forEach(id=>$("#"+id).addEventListener("input",renderReviewHeader));
    window.addEventListener("hashchange",loadReviewFromHash);
  }

  bind();
  const savedToken = localStorage.getItem(TOKEN_STORE) || "";
  if(savedToken) $("#bufferToken").value = savedToken;
  if(!loadReviewFromHash()) renderPosts();
})();