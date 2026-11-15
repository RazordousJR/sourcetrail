let data, selected = 'a1', sourceId;
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const name = id => [...data.articles,...data.claims,...data.sources].find(n=>n.id===id)?.title || id;
const impacted = id => data.impacts.filter(i=>i.article===id);
function notify(message, error = false) {$('#alert').textContent=message; $('#alert').className=error?'error':'';}
async function request(path, body) {
  const r = await fetch(path, body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : {});
  const result=await r.json(); if (!r.ok) throw new Error(result.error || 'Request failed'); return result;
}
function render() {
  const affected=new Set(data.impacts.map(i=>i.article)).size;
  $('#stats').innerHTML=[['ARTICLES IN THIS EDITION',data.articles.length,'Stories with a traceable evidence trail'],['NEED A SECOND LOOK',affected,affected?'Source changes reached these stories':'No open source alerts'],['CONNECTED SOURCES',data.sources.length,'Including indirect citation chains'],['CLAIMS MAPPED',data.claims.length,'Evidence linked across the desk']].map(([label,n,hint],i)=>`<div class="stat ${i===1&&affected?'warn':''}"><span>${label}</span><strong>${String(n).padStart(2,'0')}</strong><small>${hint}</small></div>`).join('');
  const filter=$('#search').value.toLowerCase();
  const articles=data.articles.filter(a=>[a.title,...data.edges.filter(e=>e.from===a.id).map(e=>name(e.to))].join(' ').toLowerCase().includes(filter));
  $('#story-count').textContent=articles.length;
  $('#articles').innerHTML=articles.length?articles.map(a=>`<button class="article ${a.id===selected?'selected':''}" data-article="${a.id}"><div class="desk">${esc(a.desk)} <span style="float:right">↗</span></div><h3>${esc(a.title)}</h3><div class="meta"><span>${esc(a.owner)} · ${esc(a.edition)}</span><span class="badge ${impacted(a.id).length?'issue':''}">${impacted(a.id).length?'Needs review':'Evidence current'}</span></div></button>`).join(''):'<p>No stories match this search.</p>';
  const a=data.articles.find(a=>a.id===selected);
  const claims=data.edges.filter(e=>e.from===a.id&&e.type==='CONTAINS').map(e=>data.claims.find(c=>c.id===e.to)).sort((a,b)=>a.id.localeCompare(b.id));
  $('#detail').innerHTML=`<div class="detail-top"><span class="eyebrow">${esc(a.desk)}</span><span class="badge ${impacted(a.id).length?'issue':''}">${impacted(a.id).length?'Review required':esc(a.stage)}</span></div><h2>${esc(a.title)}</h2><p>${claims.length} claims · ${esc(a.owner)} is the reviewing editor</p>`+claims.map(c=>{
    const impacts=data.impacts.filter(i=>i.article===a.id&&i.claim===c.id);
    return `<div class="claim"><div class="claim-title"><span class="check">${impacts.length?'△':'✓'}</span>${esc(c.title)}</div><div class="evidence">`+data.edges.filter(e=>e.from===c.id&&e.type==='SUPPORTED_BY').map(e=>`<button class="source-link" data-source="${e.to}">◉ &nbsp;${esc(name(e.to))}</button>${impacts.some(i=>i.via===e.to)?`<button class="review" data-review="${c.id}:${e.to}">Record review</button>`:''}`).join('')+'</div>'+[...new Map(impacts.map(i=>[i.source,i])).values()].map(i=>`<div class="reason">${i.source!==i.via?'↳ Via '+esc(name(i.via))+' → ':''}${esc(name(i.source))}: ${i.status==='current'?'review is stale after a source update':esc(i.status)}.</div>`).join('')+'</div>';
  }).join('');
  $('#sources').innerHTML='<div class="section-title"><h2>Source register</h2><p>Change a source once. Trace its impact across the edition.</p></div><div class="register">'+data.sources.map(s=>`<article class="source-card"><span class="badge ${s.status!=='current'?'issue':''}">${esc(s.status)} · revision ${s.revision}</span><h3>${esc(s.title)}</h3><p>${esc(s.publisher)}</p><p>${esc(s.note)}</p><button data-source="${s.id}">Review source ↗</button></article>`).join('')+'</div>';
  $('#history').innerHTML='<h2>Review history</h2><p>Source changes and evidence reviews saved in the local graph.</p>'+(data.history.length?data.history.map(h=>`<div class="history-item"><time>${esc(new Date(h.at).toLocaleString())}</time><span class="badge ${h.status!=='current'&&h.status!=='reviewed'?'issue':''}">${esc(h.status)}</span><h3>${esc(name(h.source))}</h3><p>${esc(h.note)}</p>${h.claim?`<p>${esc(name(h.claim))}</p>`:''}</div>`).join(''):'<div class="history-item"><p>No changes yet. Try withdrawing the river survey to see the evidence trail respond.</p></div>');
  renderGraph();
}
function renderGraph() {
  const nodes=[...data.articles.map((a,i)=>({...a,x:5,y:20+i*88,w:205,kind:'article'})),...data.claims.map((c,i)=>({...c,x:300,y:4+i*54,w:242,kind:'claim'})),...data.sources.map((s,i)=>({...s,x:640,y:12+i*68,w:205,kind:'source'}))];
  const lines=data.edges.map(e=>{const f=nodes.find(n=>n.id===e.from),t=nodes.find(n=>n.id===e.to);return `<path d="M${f.x+f.w},${f.y+19} C${f.x+f.w+60},${f.y+19} ${t.x-55},${t.y+19} ${t.x},${t.y+19}" stroke="${e.type==='CITES'?'#bba876':'#d6e1d2'}" fill="none" stroke-width="1.3" ${e.type==='CITES'?'stroke-dasharray="4 3"':''}/>`}).join('');
  $('#graph').innerHTML=`<svg viewBox="0 0 860 287" role="img" aria-label="Graph connecting three articles, five claims and four sources">${lines}${nodes.map(n=>{
    const flag=data.impacts.some(i=>i.article===n.id||i.claim===n.id||i.source===n.id);
    const fill=flag?'#fbefdc':({article:'#eaf1e5',claim:'#f5f0df',source:'#eaf1f1'}[n.kind]);
    const label=n.title.length>35?n.title.slice(0,33)+'…':n.title;
    return `<g class="graph-node ${flag?'flag':''}" data-${n.kind==='article'?'article':n.kind==='source'?'source':'claim'}="${n.id}" role="button" tabindex="0" aria-label="${esc(n.title)}"><title>${esc(n.title)}</title><rect x="${n.x}" y="${n.y}" width="${n.w}" height="38" rx="6" fill="${fill}" stroke="${flag?'#e6c493':'#dfe6d8'}"/><text x="${n.x+10}" y="${n.y+23}">${esc(label)}</text></g>`;
  }).join('')}</svg>`;
}
function openSource(id) { const s=data.sources.find(s=>s.id===id); sourceId=id; $('#source-title').textContent=s.title; $('#source-publisher').textContent=s.publisher+' · revision '+s.revision; $('#source-form').elements.status.value=s.status; $('#source-form').elements.note.value=''; $('#source-dialog').showModal(); }
document.addEventListener('click',async e=>{
  const article=e.target.closest('[data-article]'); if(article){selected=article.dataset.article;render();}
  const source=e.target.closest('[data-source]'); if(source)openSource(source.dataset.source);
  const claim=e.target.closest('[data-claim]'); if(claim){selected=data.edges.find(edge=>edge.to===claim.dataset.claim&&edge.type==='CONTAINS').from;render();$('#detail').scrollIntoView({behavior:'smooth',block:'nearest'});}
  const review=e.target.closest('[data-review]'); if(review){try{const [claim,source]=review.dataset.review.split(':');data=await request('/api/review',{claim,source});render();notify('Review recorded for this evidence link.');}catch(err){notify(err.message,true);}}
});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.graph-node')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
$('.sidebar nav').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(!b)return;document.querySelectorAll('[data-view]').forEach(n=>n.classList.toggle('active',n===b));['desk','sources','history'].forEach(id=>$('#'+id).hidden=id!==b.dataset.view);$('#breadcrumb').textContent=b.textContent.trim().slice(1).trim();$('#scenario').hidden=b.dataset.view==='history';});
$('#search').addEventListener('input',()=>render());
$('#scenario').addEventListener('click',()=>{openSource('s1');$('#source-form').elements.status.value='withdrawn';$('#source-form').elements.note.value='Demo: survey withdrawn after a sampling error. Recheck every dependent claim before publication.';});
$('#cancel').addEventListener('click',()=>$('#source-dialog').close());
$('#source-form').addEventListener('submit',async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{data=await request('/api/source',{id:sourceId,status:e.target.elements.status.value,note:e.target.elements.note.value});$('#source-dialog').close();render();notify('Source update saved. Dependent claims are flagged for editorial review.');}catch(err){notify(err.message,true);}finally{button.disabled=false;}});
try {data=await request('/api/graph');render();}catch(e){notify('Could not load the local graph: '+e.message,true);}
