const GALLERY_JSON = 'gallery.json';
const LIKES_API = 'likes.php';
let gallery = [];
let likesCache = {};
const galleryEl = document.getElementById('gallery');
const lightbox = document.getElementById('lightbox');
const lbImage = document.getElementById('lbImage');
const lbTitle = document.getElementById('lbTitle');
const lbUploader = document.getElementById('lbUploader');
const lbCaption = document.getElementById('lbCaption');
const likeBtn = document.getElementById('likeBtn');
const likeCountEl = document.getElementById('likeCount');
const shareBtn = document.getElementById('shareBtn');
const downloadBtn = document.getElementById('downloadBtn');
const lbClose = document.getElementById('lbClose');
const sortSelect = document.getElementById('sortSelect');
const uploadDemo = document.getElementById('uploadDemo');
let activePhoto = null;

async function init(){
  try{
    const res = await fetch(GALLERY_JSON, {cache: 'no-store'});
    gallery = await res.json();
  }catch(e){
    gallery = [
      {id:1,url:'https://picsum.photos/1200/800?random=1',title:'Sample 1',uploader:'Demo',caption:'A demo photo',date:'2025-01-01',likes:0},
      {id:2,url:'https://picsum.photos/1200/800?random=2',title:'Sample 2',uploader:'Demo',caption:'Another demo',date:'2025-02-12',likes:2}
    ];
  }
  await tryLoadServerLikes();
  renderGallery();
  handleDeepLink();
}

async function tryLoadServerLikes(){
  try{
    const res = await fetch(LIKES_API+'?action=list');
    if(!res.ok) throw new Error('no api');
    const data = await res.json();
    likesCache = data;
  }catch(e){
    likesCache = {};
    gallery.forEach(g => likesCache[g.id] = (g.likes || 0));
    const local = JSON.parse(localStorage.getItem('likes_local') || '{}');
    Object.keys(local).forEach(k => likesCache[k] = (likesCache[k]||0) + local[k]);
  }
}

function renderGallery(){
  galleryEl.innerHTML = '';
  const sort = sortSelect.value;
  let items = [...gallery];
  if(sort === 'liked') items.sort((a,b)=> (likesCache[b.id]||0) - (likesCache[a.id]||0));
  else items.sort((a,b)=> new Date(b.date) - new Date(a.date));
  items.forEach(item=>{
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <img class="thumb" src="${item.url}" alt="${escapeHtml(item.title)}" loading="lazy" data-id="${item.id}" />
      <div class="meta">
        <div>
          <div class="title">${escapeHtml(item.title)}</div>
          <div class="small">by ${escapeHtml(item.uploader)} · ${formatDate(item.date)}</div>
        </div>
        <div class="actions">
          <button data-like="${item.id}" aria-label="Like">❤️ ${likesCache[item.id]||0}</button>
          <button data-open="${item.id}" aria-label="Open">Open</button>
        </div>
      </div>`;
    galleryEl.appendChild(card);
  });
}

galleryEl.addEventListener('click', (e)=>{
  const likeEl = e.target.closest('[data-like]');
  if(likeEl) return handleLike(parseInt(likeEl.dataset.like,10), likeEl);
  const openEl = e.target.closest('[data-open]');
  if(openEl) return openLightboxById(parseInt(openEl.dataset.open,10));
  const img = e.target.closest('.thumb');
  if(img) return openLightboxById(parseInt(img.dataset.id,10));
});

async function handleLike(id, btnEl){
  likesCache[id] = (likesCache[id]||0) + 1;
  btnEl.innerText = `❤️ ${likesCache[id]}`;
  try{
    const res = await fetch(LIKES_API, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'like',id})});
    if(!res.ok) throw new Error('server errored');
    const json = await res.json();
    likesCache[id] = json.count;
    btnEl.innerText = `❤️ ${json.count}`;
  }catch(e){
    const local = JSON.parse(localStorage.getItem('likes_local')||'{}');
    local[id] = (local[id]||0) + 1;
    localStorage.setItem('likes_local', JSON.stringify(local));
  }
}

function openLightboxById(id){
  const item = gallery.find(g=>g.id===id);
  if(!item) return;
  activePhoto = item;
  lbImage.src = item.url;
  lbImage.alt = item.title;
  lbTitle.textContent = item.title;
  lbUploader.textContent = `by ${item.uploader} · ${formatDate(item.date)}`;
  lbCaption.textContent = item.caption || '';
  likeCountEl.textContent = likesCache[id]||0;
  likeBtn.dataset.id = id;
  downloadBtn.href = item.url;
  downloadBtn.setAttribute('download', (item.title||'photo') + '.jpg');
  lightbox.setAttribute('aria-hidden','false');
  history.replaceState(null,'', '?photo='+id);
}

lbClose.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e)=>{ if(e.target===lightbox) closeLightbox(); });
function closeLightbox(){
  lightbox.setAttribute('aria-hidden','true');
  activePhoto = null;
  history.replaceState(null,'', window.location.pathname);
}

likeBtn.addEventListener('click', ()=>{
  const id = parseInt(likeBtn.dataset.id,10);
  handleLike(id, likeBtn);
  likeCountEl.textContent = likesCache[id]||0;
});

shareBtn.addEventListener('click', async ()=>{
  if(!activePhoto) return;
  const url = location.origin + location.pathname + '?photo=' + activePhoto.id;
  if(navigator.share){
    try{ await navigator.share({title:activePhoto.title,text:activePhoto.caption,url}); return; }catch(e){}
  }
  try{ await navigator.clipboard.writeText(url); alert('Link copied to clipboard'); }catch(e){ prompt('Copy link', url); }
});

function handleDeepLink(){
  const params = new URLSearchParams(location.search);
  if(params.has('photo')){
    const id = parseInt(params.get('photo'),10);
    setTimeout(()=> openLightboxById(id), 300);
  }
}

sortSelect.addEventListener('change', renderGallery);
uploadDemo.addEventListener('click', ()=>{
  const id = Date.now();
  const item = {id,url:`https://picsum.photos/1200/800?random=${Math.floor(Math.random()*10000)}`,title:'User added',uploader:'You',caption:'Uploaded locally',date:new Date().toISOString().slice(0,10),likes:0};
  gallery.unshift(item);
  likesCache[item.id] = 0;
  renderGallery();
});

function escapeHtml(s){ return (s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
function formatDate(d){ if(!d) return ''; const dt = new Date(d); if(isNaN(dt)) return d; return dt.toLocaleDateString(); }

init();
