(function(){
  // Core refs
  var ws = document.getElementById('ws');
  var edgesSvg = document.getElementById('edges');
  var runBtn = document.getElementById('runBtn');
  var bar = document.getElementById('bar');
  var preview = document.getElementById('preview');
  var cta = document.getElementById('cta');

  // SVG sizing
  function resizeSvg(){ var r = ws.getBoundingClientRect(); edgesSvg.setAttribute('viewBox', '0 0 ' + r.width + ' ' + r.height); }
  window.addEventListener('resize', function(){ resizeSvg(); updateEdges(); if (!userMoved && mqMobile.matches) alignNodesLeftMobile(12); layoutColumn2(); });
  resizeSvg();

  // Dragging
  var dragging = null;
  document.addEventListener('mousedown', function(e){
    var port = e.target.closest ? e.target.closest('.port') : null; if (port) return;
    var node = e.target.closest ? e.target.closest('#demo .node') : null; if(!node) return;
    var rect = node.getBoundingClientRect(); var wsrect = ws.getBoundingClientRect();
    dragging = { el: node, dx: e.clientX - rect.left, dy: e.clientY - rect.top, wsx: wsrect.left, wsy: wsrect.top };
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e){
    if(!dragging) return;
    var x = e.clientX - dragging.wsx - dragging.dx;
    var y = e.clientY - dragging.wsy - dragging.dy;
    dragging.el.style.left = Math.max(8, x) + 'px';
    dragging.el.style.top  = Math.max(8, y) + 'px';
    updateEdges();
  });
  document.addEventListener('mouseup', function(){ dragging=null; });

  // Edges
  var edges = []; var selected = null;
  function portCenter(port){ var pr = port.getBoundingClientRect(), wr = ws.getBoundingClientRect(); return { x: pr.left - wr.left + pr.width/2, y: pr.top - wr.top + pr.height/2 }; }
  function pathD(a,b){ var dx = Math.abs(b.x - a.x); var c1 = {x: a.x + dx*0.5, y: a.y}; var c2 = {x: b.x - dx*0.5, y: b.y}; return 'M ' + a.x + ' ' + a.y + ' C ' + c1.x + ' ' + c1.y + ', ' + c2.x + ' ' + c2.y + ', ' + b.x + ' ' + b.y; }
  function updateEdges(){ for (var i=0;i<edges.length;i++){ edges[i].path.setAttribute('d', pathD(portCenter(edges[i].from), portCenter(edges[i].to))); } }
  function createPath(stroke){ var p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('fill','none'); p.setAttribute('stroke', stroke||'url(#grad)'); p.setAttribute('stroke-width','3'); p.setAttribute('stroke-linecap','round'); edgesSvg.appendChild(p); return p; }
  (function(){ var defs = document.createElementNS('http://www.w3.org/2000/svg','defs'); var g = document.createElementNS('http://www.w3.org/2000/svg','linearGradient'); g.setAttribute('id','grad'); g.setAttribute('x1','0%'); g.setAttribute('x2','100%'); var s1 = document.createElementNS('http://www.w3.org/2000/svg','stop'); s1.setAttribute('offset','0%'); s1.setAttribute('stop-color','#0ea5e9'); var s2 = document.createElementNS('http://www.w3.org/2000/svg','stop'); s2.setAttribute('offset','100%'); s2.setAttribute('stop-color','#7c3aed'); g.appendChild(s1); g.appendChild(s2); defs.appendChild(g); edgesSvg.appendChild(defs); })();
  function clearHighlights(){ var ports = ws.querySelectorAll('.port'); for (var i=0;i<ports.length;i++){ ports[i].classList.remove('can-connect'); ports[i].classList.remove('active'); } }
  function highlightCompatible(port){ clearHighlights(); port.classList.add('active'); var type = port.getAttribute('data-type'); var want = port.getAttribute('data-dir') === 'out' ? 'in' : 'out'; var sel = ws.querySelectorAll('.port[data-dir="' + want + '"]'); for (var i=0;i<sel.length;i++){ if (sel[i].getAttribute('data-type') === type){ sel[i].classList.add('can-connect'); } } }
  function edgeExists(fromPort, toPort){ for (var i=0;i<edges.length;i++){ if (edges[i].from === fromPort && edges[i].to === toPort) return true; } return false; }
  function findEdgeToPort(inPort){ for (var i=0;i<edges.length;i++){ if (edges[i].to === inPort) return {edge: edges[i], index: i}; } return null; }
  function removeEdgeAt(index){ var e = edges[index]; if (e && e.path && e.path.parentNode) e.path.parentNode.removeChild(e.path); edges.splice(index,1); }

  document.addEventListener('click', function(e){
    var port = e.target.closest ? e.target.closest('#demo .port') : null; if(!port){ selected = null; clearHighlights(); return; }
    if (port.getAttribute('data-dir')==='in' && !selected){ var ex = findEdgeToPort(port); if (ex){ removeEdgeAt(ex.index); return; } }
    if (!selected){ selected = port; highlightCompatible(port); return; }
    if (port === selected){ selected = null; clearHighlights(); return; }
    var typeOk = port.getAttribute('data-type') === selected.getAttribute('data-type'); var dirA = selected.getAttribute('data-dir'); var dirB = port.getAttribute('data-dir');
    if (!typeOk || dirA === dirB){ port.animate([{transform:'translateX(0)'},{transform:'translateX(-3px)'},{transform:'translateX(0)'}],{duration:180}); return; }
    var from = dirA==='out' ? selected : port; var to   = dirA==='out' ? port     : selected;
    var ex2 = findEdgeToPort(to); if (ex2){ removeEdgeAt(ex2.index); }
    if (edgeExists(from, to)){ selected = null; clearHighlights(); return; }
    var final = createPath('url(#grad)'); edges.push({from: from, to: to, path: final}); updateEdges(); selected = null; clearHighlights();
  });

  function hasEdge(fromNodeId, fromPortId, toNodeId, toPortId){
    for (var i=0;i<edges.length;i++){ var e = edges[i]; var fn = e.from.closest ? e.from.closest('.node').id : e.from.parentNode.parentNode.id; var tn = e.to.closest ? e.to.closest('.node').id : e.to.parentNode.parentNode.id; if (fn === fromNodeId && e.from.getAttribute('data-id') === fromPortId && tn === toNodeId && e.to.getAttribute('data-id') === toPortId) return true; }
    return false;
  }
  function graphValid(){ return ( hasEdge('n-checkpoint','model','n-ksampler','model') && hasEdge('n-checkpoint','clip','n-pos','clip') && hasEdge('n-checkpoint','clip','n-neg','clip') && hasEdge('n-pos','pos','n-ksampler','pos') && hasEdge('n-neg','neg','n-ksampler','neg') && hasEdge('n-size','latent','n-ksampler','latent') && hasEdge('n-checkpoint','vae','n-vae','vae') && hasEdge('n-ksampler','out_latent','n-vae','samples') && hasEdge('n-vae','image','n-save','image') ); }

  runBtn.addEventListener('click', function(){ if(!graphValid()){ runBtn.animate([{transform:'translateY(0)'},{transform:'translateY(-3px)'},{transform:'translateY(0)'}],{duration:260}); return; } preview.style.display = 'none'; cta.style.display = 'none'; bar.style.width = '0%'; var t = 0; var timer = setInterval(function(){ t += Math.random()*18+6; if(t>=100){t=100; clearInterval(timer);} bar.style.width = t+'%'; if(t===100){ var img=preview.querySelector('img'); img.src='assets/Cat.png';
; preview.style.display='block'; cta.style.display='block'; } }, 160); });

  // --- Mobile-only left align (AFTER ws is defined) ---
  const mqMobile = window.matchMedia("(max-width: 640px)");
  let userMoved = false;
  let basePos = null;
  function captureBasePositions(){ if (basePos) return; basePos = Array.from(ws.querySelectorAll('.node')).map(n => ({ el:n, left: parseFloat(n.style.left)||n.offsetLeft, top: parseFloat(n.style.top)||n.offsetTop })); }
  function restoreBasePositions(){ if (!basePos) return; basePos.forEach(p => { p.el.style.left = p.left + 'px'; p.el.style.top = p.top + 'px'; }); updateEdges(); }
  function alignNodesLeftMobile(targetLeft = 12){ const nodes = ws.querySelectorAll('.node'); let min = Infinity; nodes.forEach(n => { const l = parseFloat(n.style.left) || n.offsetLeft; if (l < min) min = l; }); const dx = min - targetLeft; nodes.forEach(n => { const l = parseFloat(n.style.left) || n.offsetLeft; n.style.left = (l - dx) + 'px'; }); updateEdges(); }
  
// --- 2-й столбец: Save между CK и KS, VAE под KS ---
function layoutColumn2(){
  if (userMoved) return;

  var ks  = document.getElementById('n-ksampler');
  var ck  = document.getElementById('n-checkpoint');
  var vae = document.getElementById('n-vae');
  var sav = document.getElementById('n-save');
  if (!ks || !sav || !vae) return;

  // та же колонка, что у KSampler
  var left = parseFloat(ks.style.left) || ks.offsetLeft;
  vae.style.left = sav.style.left = left + 'px';

  var GAP = 20;

  // коридор между Checkpoint и KSampler
  var ksTop = (parseFloat(ks.style.top) || ks.offsetTop);
  var ksBot = ksTop + ks.offsetHeight;
  var ckBot = ck ? ((parseFloat(ck.style.top) || ck.offsetTop) + ck.offsetHeight) : 8;

  var topBound = ckBot + GAP;
  var botBound = ksTop - GAP;

  // 1) SAVE: центрируем в коридоре (если места мало — прижимаем к KS сверху)
  var corridor = botBound - topBound;
  var saveH = sav.offsetHeight;
  var saveTop = (corridor >= saveH)
    ? topBound + Math.round((corridor - saveH)/2)
    : Math.max(8, ksTop - GAP - saveH);
  sav.style.top = saveTop + 'px';

  // 2) VAE: всегда под KSampler
  var vaeTop = ksBot + GAP;
  vae.style.top = Math.round(vaeTop) + 'px';

  updateEdges();
}

 
  function applyMobileAlignment(){ if (userMoved) return; if (mqMobile.matches){ captureBasePositions(); alignNodesLeftMobile(12); } else { restoreBasePositions(); } layoutColumn2();}
  applyMobileAlignment();
  layoutColumn2();
  if (mqMobile.addEventListener) mqMobile.addEventListener('change', applyMobileAlignment);
  else mqMobile.addListener(applyMobileAlignment);
  document.addEventListener('mousedown', function(e){ if (e.target.closest && e.target.closest('#demo .node')) userMoved = true; });

  })();

  var hint = document.getElementById('wsHint');
function hideHint(){
  if (!hint) return;
  hint.classList.add('hide');
  setTimeout(function(){ if (hint && hint.parentNode) hint.parentNode.removeChild(hint); }, 350);
}

// скрыть при любом взаимодействии внутри канваса
ws.addEventListener('pointerdown', function(e){
  if (!e.target.closest) return;
  if (e.target.closest('#demo .node') || e.target.closest('#demo .port')) {
    hideHint();
  }
});

// скрыть при запуске демо
runBtn.addEventListener('click', hideHint);

 
  // --- Articles scroller logic (translate3d, double clones, seamless wrap) ---
  (function() {
  var vp = document.getElementById('articles-vp');
  if (!vp) return;
  var leftBtn = document.getElementById('articles-left');
  var rightBtn = document.getElementById('articles-right');
  var track = vp.querySelector('.track');
  
  // Берем только реальные карточки (без клонов)
  var cards = track.querySelectorAll('.article-card');
  var N = cards.length;
  if (!N) return;

  var idx = 0;        // Текущий индекс (0 - первый слайд)
  var step = 0;       // Ширина прокрутки (карточка + gap)
  var maxIdx = 0;     // Максимально возможный индекс
  var locked = false; // Блокировка частых кликов

  function computeLayout() {
    var card = cards[0];
    var cardWidth = card.getBoundingClientRect().width;
    
    // Получаем значение gap из CSS
    var cs = getComputedStyle(track);
    var gap = parseFloat(cs.columnGap || cs.gap);
    if (isNaN(gap)) gap = 16;
    
    step = cardWidth + gap;

    // Считаем, сколько карточек помещается в видимую область
    var visibleCount = Math.floor(vp.offsetWidth / step);
    if (visibleCount < 1) visibleCount = 1;

    // Ограничиваем прокрутку, чтобы в конце не было пустой дырки
    maxIdx = Math.max(0, N - visibleCount);

    // Если при ресайзе индекс стал больше допустимого — сбрасываем его
    if (idx > maxIdx) idx = maxIdx;

    setTransform(false);
    updateArrows();
  }

  function setTransform(animate) {
    track.style.transition = animate ? 'transform .38s ease' : 'none';
    // Сдвигаем влево (отрицательное значение)
    track.style.transform = 'translate3d(' + (-idx * step) + 'px, 0, 0)';
  }

  function updateArrows() {
    // Делаем стрелки полупрозрачными на границах
    leftBtn.style.opacity = (idx <= 0) ? "0.3" : "1";
    leftBtn.style.pointerEvents = (idx <= 0) ? "none" : "auto";

    rightBtn.style.opacity = (idx >= maxIdx) ? "0.3" : "1";
    rightBtn.style.pointerEvents = (idx >= maxIdx) ? "none" : "auto";
  }

  rightBtn.addEventListener('click', function() {
    if (locked || idx >= maxIdx) return;
    locked = true;
    idx++;
    setTransform(true);
    updateArrows();
  });

  leftBtn.addEventListener('click', function() {
    if (locked || idx <= 0) return;
    locked = true;
    idx--;
    setTransform(true);
    updateArrows();
  });

  track.addEventListener('transitionend', function() {
    locked = false;
  });

  window.addEventListener('resize', computeLayout);
  
  // Инициализация
  computeLayout();
})();


  // --- Services hover/touch preview (image + video) ---
(function(){
  var wrap = document.querySelector('#services .srv-wrap'); if (!wrap) return;
  var list = document.getElementById('srv-list');
  var preview = document.getElementById('srv-preview');
  var img = document.getElementById('srv-img');
  var vid = document.getElementById('srv-vid');   // <-- добавили
  var showing = false;

  function clamp(val, min, max){ return Math.max(min, Math.min(max, val)); }
  
  function place(e) {
  const r = wrap.getBoundingClientRect();
  const el = (vid && vid.style.display === 'block') ? vid : img;

  const w = el.offsetWidth || 360;
  const h = el.offsetHeight || 240;

  const x = (e.clientX || (e.touches && e.touches[0].clientX) || r.left + r.width/2) - r.left;
  let y = (e.clientY || (e.touches && e.touches[0].clientY) || r.top  + r.height/2) - r.top;

  // 🔸 без выхода за границы блока
  const topLimit = h / 2 + 12;
  const bottomLimit = r.height - h / 2 - 12;

  // 🔸 сдвиг относительно курсора (управляемое значение)
  const offsetY = 110; // <-- здесь ты можешь сам регулировать величину отступа!

  // если курсор в верхней зоне — сдвигаем вниз
  if (y < topLimit + offsetY) {
    y += offsetY;
  }
  // если курсор в нижней зоне — сдвигаем вверх
  else if (y > bottomLimit - offsetY) {
    y -= offsetY;
  }

  // ограничение по контейнеру
  y = clamp(y, topLimit, bottomLimit);
  const px = clamp(x, 12 + w*0.5, r.width - 12 - w*0.5);

  preview.style.left = px + 'px';
  preview.style.top  = y + 'px';
}





function sizeToFit(el){
  const r = wrap.getBoundingClientRect();
  // Мягкие пределы: не выходить за блок и за окно
  const maxW = Math.min(r.width - 24, 560);
  const maxH = Math.min(r.height - 24, 420, window.innerHeight - 120);

  const natW = (el.tagName === 'IMG' ? el.naturalWidth  : el.videoWidth)  || 400;
  const natH = (el.tagName === 'IMG' ? el.naturalHeight : el.videoHeight) || 300;

  const k = Math.min(1, maxW / natW, maxH / natH); // только уменьшать, не увеличивать
  el.style.width  = Math.round(natW * k) + 'px';
  el.style.height = Math.round(natH * k) + 'px';
}

function sizeToNatural(el){
  var wrapR = wrap.getBoundingClientRect();
  var maxW = wrapR.width  - 24;   // небольшой внутренний отступ
  var maxH = wrapR.height - 24;

  var natW, natH;
  if (el.tagName === 'IMG'){
    natW = el.naturalWidth  || 360;
    natH = el.naturalHeight || 240;
  } else { // <video>
    natW = el.videoWidth  || 360;
    natH = el.videoHeight || 240;
  }

  // Масштаб <= 1 — уменьшаем только если не помещается
  var scale = Math.min(1, maxW / natW, maxH / natH);
  el.style.width  = Math.round(natW * scale) + 'px';
  el.style.height = Math.round(natH * scale) + 'px';
}
  function can(type){ var v = document.createElement('video'); return !!v.canPlayType && v.canPlayType(type) !== ''; }

  function showForItem(item, e){
    var webm = item.getAttribute('data-video-webm');
    var mp4  = item.getAttribute('data-video-mp4');
    var poster = item.getAttribute('data-poster');

    if ((webm || mp4) && vid){
      var src = (webm && can('video/webm')) ? webm : mp4;
      if (src){
        vid.src = src;
        vid.onloadedmetadata = function(){
            sizeToFit(vid);
            place(e || {});
        };
        if (poster) vid.setAttribute('poster', poster); else vid.removeAttribute('poster');
        vid.style.display = 'block';
        img.style.display = 'none';
        vid.play().catch(function(){ /* ок, автоплей на iOS может требовать тап */ });
        place(e || {});
        preview.classList.add('show'); showing = true;
        return;
      }
    }
    // fallback: картинка
    var srcImg = item.getAttribute('data-img');
    if (srcImg) img.src = srcImg;
    if (img.complete){
       sizeToFit(img);
       place(e || {});
       } else {
      img.onload = function(){
       sizeToFit(img);
       place(e || {});
      };
    }

    img.style.display = 'block';
    if (vid && !vid.paused){ vid.pause(); }
    if (vid) vid.style.display = 'none';
    place(e || {});
    preview.classList.add('show'); showing = true;
  }

  function hide(){
    preview.classList.remove('show'); showing = false;
    if (vid && !vid.paused) vid.pause();
  }

  // Наведение/тач
  list.addEventListener('pointerenter', function(e){
    var it = e.target.closest('.srv-item'); if (!it) return;
    showForItem(it, e);
  }, true);
  list.addEventListener('pointermove', function(e){ if (!showing) return; place(e); });
  list.addEventListener('pointerleave', function(){ hide(); }, true);

  // Тач: тап по пункту — показать, тап вне — скрыть
  list.addEventListener('pointerdown', function(e){
    if (e.pointerType !== 'touch') return;
    var it = e.target.closest('.srv-item'); if (!it) return;
    showForItem(it, e);
  }, true);
  document.addEventListener('pointerdown', function(e){
    if (e.pointerType !== 'touch') return;
    if (!e.target.closest('#services')) hide();
  });
})();

// --- Переход по клику на пункт службы ---
(function(){
  var list = document.getElementById('srv-list');
  if (!list) return;

  list.addEventListener('click', function(e){
    var item = e.target.closest('.srv-item');
    if (!item) return;

    var link = item.getAttribute('data-link');
    if (!link) return;

    // Открыть в новой вкладке — безопасно (noopener)
    window.open(link, '_blank', 'noopener');
    // --- если предпочитаешь переход в той же вкладке, раскомментируй:
    // window.location.href = link;
  }, false);
})();





// Скрипт для загрузки pdf-файла презентации
// Используем событие загрузки DOM, чтобы скрипт точно увидел все элементы
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Создаем обзервер с уникальным именем, чтобы он не пересекался с другими
    const blueprintObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal');
                // Если анимация нужна только один раз, можно перестать следить:
                // blueprintObserver.unobserve(entry.target); 
            }
        });
    }, { 
        threshold: 0.1 // Сработает, когда 10% блока покажется на экране
    });

    // 2. Ищем элементы конкретно нашего блока пайплайна
    const elementsToWatch = document.querySelectorAll('.blueprint, .blueprint-action-wrapper');
    
    // 3. Запускаем слежку только если элементы найдены
    if (elementsToWatch.length > 0) {
        elementsToWatch.forEach(el => blueprintObserver.observe(el));
        console.log(">>> Blueprint Pipeline Observer initialized.");
    }
});








(function(){
  const btn = document.getElementById('toTop');
  if(!btn) return;

  // Показывать только у «низа страницы».
  const THRESHOLD = 320; // px до низа; при желании поменяйте

  function atBottom(){
    const scrolledBottom = window.scrollY + window.innerHeight;
    const docHeight = Math.max(
      document.body.scrollHeight, document.documentElement.scrollHeight
    );
    return scrolledBottom >= (docHeight - THRESHOLD);
  }

  function onScroll(){
    if (atBottom() || window.scrollY > 600) btn.classList.add('show');
    else btn.classList.remove('show');
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  btn.addEventListener('click', function(){
    // Плавно вверх; с html{scroll-behavior:smooth} достаточно scrollTo
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();


(function(){
  const stack = document.getElementById('photoStack');
  if (!stack) return;

  // get live nodeList -> convert to array on refresh
  function getCards() { return Array.from(stack.querySelectorAll('.card')); }

  // вычисляем и выставляем визуальную стопку (z-index + базовый transform)
  function layoutStack() {
  const cards = getCards();
  const N = cards.length;
  for (let i = 0; i < N; i++) {
    const el = cards[i];
    const depth = N - 1 - i;
    const ty = Math.min(24, depth * 12);
    const rot = (i % 3 === 0) ? -3 : (i % 3 === 1 ? 2 : -1);
    const scale = 1 - (depth * 0.01);
    el.style.zIndex = 100 + i;
    el.style.transition = 'transform 420ms cubic-bezier(.2,.9,.25,1), opacity 380ms ease';
    el.style.transform = `translateY(${ty}px) rotate(${rot}deg) scale(${scale})`;
    el.style.opacity = '1';
    // убрать классы подсветки у всех по умолчанию
    el.classList.remove('top-glow', 'dragging');
  }

  // Добавляем glow только на верхнюю карточку (последний в списке)
  if (N > 0) {
    const top = cards[N - 1];
    top.classList.add('top-glow');
  }
}

  // pause all videos then play top if it's a video
  function handleTopVideo() {
    const cards = getCards();
    const N = cards.length;
    const topCard = cards[N-1];
    // pause all first
    stack.querySelectorAll('video').forEach(v=>{
      try { v.pause(); v.currentTime = 0; } catch(e){}
    });
    if (!topCard) return;
    const vid = topCard.querySelector('video');
    if (vid) {
      // lazy init: set src if data-src used (optional)
      if (vid.dataset && vid.dataset.src && !vid.src) vid.src = vid.dataset.src;
      // try to play; mobile requires muted + playsinline - we set muted in HTML
      vid.currentTime = 0;
      const p = vid.play();
      if (p && p.catch) { p.catch(()=>{/* autoplay blocked — OK */}); }
    }
  }

  // initiate layout
  layoutStack();
  handleTopVideo();

  // re-layout on resize
  window.addEventListener('resize', () => {
    layoutStack();
  });

  // --- Drag / swipe logic (only for top card) ---
  let dragging = null;
  let startX = 0, startY = 0, moved = false;

  function hideHobbyHint(){
   const h = document.getElementById('hobbyHint');
   if (!h) return;
   if (!h.classList.contains('hidden')){
    h.classList.add('hidden');
    // удалить из DOM через время (чтобы не мешать tab-order)
    setTimeout(()=>{ if (h && h.parentNode) h.parentNode.removeChild(h); }, 300);
   }
  }

  function onPointerDown(e) {
    const cards = getCards();
    if (!cards.length) return;
    const top = cards[cards.length - 1];
    // only allow drag on top card
    if (e.target.closest('.card') !== top && !top.contains(e.target)) return;

    // Скрываем подсказку сразу при попытке перетаскивания
    hideHobbyHint();

    dragging = top;
    dragging.classList.add('dragging'); // усилить glow (класс dragging)
    startX = e.clientX;
    startY = e.clientY;
    moved = false;

    // disable transition while dragging
    dragging.style.transition = 'none';
    dragging.classList.add('dragging');
    dragging.setPointerCapture && dragging.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;

    // apply inline transform combining base translation with drag
    // (we simply translate from current layout)
    dragging.style.transform = `translate(${dx}px, ${0}px) rotate(${dx/18}deg)`;
  }

  function performSwipe(card, dx) {
  const rect = card.getBoundingClientRect();
  const clone = card.cloneNode(true);
  clone.classList.add('flying-clone');
  clone.style.position = 'fixed';
  clone.style.left = rect.left + 'px';
  clone.style.top  = rect.top  + 'px';
  clone.style.width = rect.width + 'px';
  clone.style.height = rect.height + 'px';
  clone.style.margin = '0';
  clone.style.transform = 'translate(0,0) rotate(0deg) scale(1)';
  clone.style.opacity = '1';
  clone.style.zIndex = 9999;
  clone.style.transition = 'transform 520ms cubic-bezier(.2,.9,.25,1), opacity 520ms ease';
  document.body.appendChild(clone);

  // спрячем оригинал во время анимации
  card.style.visibility = 'hidden';

  requestAnimationFrame(()=>{
    const outX = (dx > 0 ? window.innerWidth : -window.innerWidth) * 0.9;
    const rotate = dx / 8;
    clone.style.transform = `translate(${outX}px, 20px) rotate(${rotate}deg) scale(.92)`;
    clone.style.opacity = '0';
  });

  const cleanup = () => {
    // удалить клон
    clone.remove();
    // показать оригинал (он будет перемещён в DOM)
    card.style.visibility = '';
    // ВАЖНО: перемещаем оригинал В НАЧАЛО (вниз визуально)
    // Это делает card первым элементом → оно окажется "внизу" стопки
    stack.insertBefore(card, stack.firstChild);
    // Сброс inline-стилей, если нужно
    card.style.transition = '';
    card.style.transform = '';
    card.style.opacity = '1';
    // Перерисовать стопку и запустить/поставить на паузу видео
    requestAnimationFrame(()=>{
      layoutStack();
      handleTopVideo();
    });
  };

  clone.addEventListener('transitionend', cleanup, { once: true });
}

 function onPointerUp(e) {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const threshold = Math.max(100, (stack.clientWidth * 0.18)); // swipe threshold adaptive
    // restore pointer capture
    try { dragging.releasePointerCapture && dragging.releasePointerCapture(e.pointerId); } catch(err){}

    if (moved && Math.abs(dx) > threshold) {
      // swipe — perform flight animation to side and move original to end
      performSwipe(dragging, dx);
    } else {
      // no swipe: restore to base position (animated)
      dragging.style.transition = 'transform 420ms cubic-bezier(.2,.9,.25,1)';
      // restore based on layoutStack (call layoutStack to recompute and animate)
      layoutStack();
    }
    
    if (dragging) dragging.classList.remove('dragging');
    dragging = null; moved = false;
  }

  // listen at stack level (pointerdown, move, up)
  stack.addEventListener('pointerdown', onPointerDown, {passive:false});
  window.addEventListener('pointermove', onPointerMove, {passive:true});
  window.addEventListener('pointerup', onPointerUp, {passive:true});

  // Prevent accidental image dragging
  stack.querySelectorAll('img').forEach(img => img.ondragstart = () => false);

  // If user clicks (tap) we do nothing — enlargement disabled by request.

  // Also update (recompute cards) when DOM changes (someone else may append children)
  const mo = new MutationObserver(()=> {
    layoutStack();
    handleTopVideo();
  });
  mo.observe(stack, {childList:true});

})();


// Замена фона - не используется
//document.getElementById('themeToggle').addEventListener('click', function() { document.body.classList.toggle('green-theme');});



(function(){
  const stack = document.getElementById('photoStack');
  if (!stack) return;

  // Помечаем карточки с <video> классом .portrait
  stack.querySelectorAll('.card').forEach(card=>{
    if (card.querySelector('video')) {
      card.classList.add('portrait');
      // Авто-плей: остановим автоплей всех видео, будем запускать поверхной логикой (опционно)
      const v = card.querySelector('video');
      if (v){
        v.preload = 'metadata';
        v.muted = true;
        v.playsInline = true;
        // не запускаем пока — запустим, когда карточка окажется наверху
      }
    }
  });

  // Обновление размеров при ресайзе (подстраиваем max высоту)
  function adjustStackMax(){
    const vh = window.innerHeight;
    // оставляем запас для шапки+фута — можно изменить
    const spare = 220;
    document.documentElement.style.setProperty('--max-h', `calc(${vh - spare}px)`);
  }
  adjustStackMax();
  window.addEventListener('resize', adjustStackMax);

  // Центрируем стопку внутри секции: сам .photo-stack уже центрируется margin:auto;
  // если видишь смещение — проверь padding контейнера .container
})();


(function(){
  const stack = document.getElementById('photoStack');
  if (!stack) return;

  // --- 1) Убедимся, что .photo-stack физически центрирован в своём родителе ---
  function centerStackWithinSection(){
    const parent = stack.parentElement; // обычно это секция #hobbies
    const pRect = parent.getBoundingClientRect();
    const sRect = stack.getBoundingClientRect();
    // смещение (в пикселях) которое нужно применить к .photo-stack, чтобы оно оказ. по центру родителя:
    const desiredLeftWithinParent = (pRect.width - sRect.width) / 2;
    // текущее left относительно parent:
    const currentLeft = sRect.left - pRect.left;
    const shift = desiredLeftWithinParent - currentLeft;
    // аккуратно сдвинем контейнер (не трогаем inline трансформы карточек)
    // запомним текущую transform и добавим translateX(shift)
    const prev = window.getComputedStyle(stack).transform;
    // Если transform == 'none' то ставим translateX, иначе комбинируем
    let extra = ` translateX(${shift}px)`;
    // используем translateX на style.transform (перезаписываем)
    // чтобы не ломать другие inline-трансформы, применим через CSS custom property:
    stack.style.transform = (prev && prev !== 'none' ? prev : '') + extra;
  }

  // --- 2) Центрируем portrait-карточки внутри стопки (точно позиционируем left) ---
  function centerPortraitCards(){
    const stackW = stack.clientWidth;
    stack.querySelectorAll('.card.portrait').forEach(card=>{
      const cw = card.offsetWidth;
      // left в px внутри .photo-stack для центрирования
      const leftPx = Math.round((stackW - cw) / 2);
      card.style.left = leftPx + 'px';
      // снимаем возможный translateX(-50%) для этих карточек, чтобы не было двойной центровки
      card.style.transform = 'none';
    });
  }

  // Вызовем на старт и на ресайз
  function recomputeAll(){
    // снимем временный transform (если были ранее) чтобы получить корректные размеры
    stack.style.transform = '';
    // небольшая микро-ожидалка — если твоя логика стопки асинхронно расставляет карточки,
    // подождём пару кадров, затем центрируем (надёжнее)
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        centerStackWithinSection();
        centerPortraitCards();
      });
    });
  }

  window.addEventListener('resize', recomputeAll);
  // вызовим единожды
  recomputeAll();

  // Если у тебя есть drag / layout script, можно вызвать recomputeAll() после него.
  // Например, если у тебя layoutStack() вызывается где-то — добавь туда тоже recomputeAll().
})();






// Функция для падающего снега или листьев
(function() {
    const canvas = document.getElementById('weather-canvas');
    const ctx = canvas.getContext('2d');
    const toggleBtn = document.getElementById('weatherToggle');
    let particles = [];
    let isWeatherActive = true; 
    
    let mouseX = 0;
    let mouseWind = 0;

    // 1. Возвращаем реальное определение месяца
    const month = new Date().getMonth(); // 0 - Январь, 2 - Март (сейчас), 11 - Декабрь
    
    // 2. Устанавливаем правильные условия для сезонов
    const isWinter = [11, 0, 1].includes(month); // Декабрь, Январь, Февраль
    const isAutumn = [8, 9, 10].includes(month); // Сентябрь, Октябрь, Ноябрь

    // 3. РАСКОММЕНТИРУЕМ ЭТУ СТРОКУ: 
    // Если сейчас не зима и не осень (т.е. весна или лето) — скрипт полностью останавливается
    if (!isWinter && !isAutumn) {
        if (toggleBtn) toggleBtn.style.display = 'none'; // Скрываем кнопку, если нет анимации
        return; 
    }

    toggleBtn.addEventListener('click', () => {
        isWeatherActive = !isWeatherActive;
        if (isWeatherActive) {
            toggleBtn.classList.remove('is-off');
            animate(); 
        } else {
            toggleBtn.classList.add('is-off');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    });

    window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
    });

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * (canvas.height + 100) - (canvas.height + 100);
            
            // Настройки размеров и скорости теперь зависят от сезона
            this.size = isWinter ? (Math.random() * 3 + 1) : (Math.random() * 15 + 10);
            this.speedY = Math.random() * 1 + (isWinter ? 0.5 : 1);
            this.speedX = Math.random() * 1 - 0.5;
            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = Math.random() * 0.02 * (Math.random() > 0.5 ? 1 : -1);
            
            const colors = ['#e67e22', '#d35400', '#f1c40f', '#c0392b'];
            this.color = isWinter ? '#ffffff' : colors[Math.floor(Math.random() * colors.length)];
        }
        update() {
            this.y += this.speedY;
            this.x += this.speedX + (mouseWind * 2) + Math.sin(this.y / 50); 
            this.rotation += this.rotationSpeed;
            if (this.x > canvas.width + 20) this.x = -20;
            if (this.x < -20) this.x = canvas.width + 20;
            if (this.y > canvas.height) { this.reset(); this.y = -20; }
        }
        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.beginPath();
            if (isWinter) {
                ctx.fillStyle = this.color;
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (isAutumn) {
                ctx.fillStyle = this.color;
                ctx.moveTo(0, -this.size / 2);
                ctx.quadraticCurveTo(this.size / 2, 0, 0, this.size / 2);
                ctx.quadraticCurveTo(-this.size / 2, 0, 0, -this.size / 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    const particleCount = isWinter ? 150 : 40;
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    function animate() {
        if (!isWeatherActive) return; 
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        mouseWind += (mouseX - mouseWind) * 0.05;
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        requestAnimationFrame(animate);
    }

    animate();
})();

// Функция для новогодней гирлянды в шапке сайта
(function() {
    const today = new Date();
    const month = today.getMonth(); // 0 - Январь, 11 - Декабрь
    const day = today.getDate();
    
    // Для теста
    //const month = 11; 
    //const day = 31;

    const isHolidayRange = (month === 11 && day >= 25) || (month === 0 && day <= 15);
    const garland = document.getElementById('holiday-garland');

    if (isHolidayRange && garland) {
        // Создаем 20 лампочек (можно изменить количество под ширину)
        for (let i = 0; i < 18; i++) {
            const light = document.createElement('div');
            light.className = 'garland-light';
            garland.appendChild(light);
        }
    } else if (garland) {
        garland.style.display = 'none'; // Скрываем, если не сезон
    }
})();



















// Логика работы формы в конце сайта
document.addEventListener('DOMContentLoaded', function () {
    const terminalSection = document.getElementById('terminal-section');
    const terminalWindow = document.getElementById('terminalWindow');
    const typingContainer = document.getElementById('typing-container');
    const contactForm = document.getElementById('contact-form');
    
    // 1. Создаем объект с переводами для строк терминала
    const termStrings = {
        ru: {
            r: "C:\\> Чтение данных пользователя...",
            p: "C:\\> Загрузка протокола DAK_Pipeline_v3.1...",
            l: "C:\\> Запуск: Blender 3D, ComfyUI, After Effects, Nuke...",
            s: ">>> Успешно... Демо пройдено.",
            w: ">>> Успешно... <span style='color: #ff4d4d; font-weight: bold;'>ВНИМАНИЕ: Демо не пройдено. Рекомендуется соединить узлы выше и получить подарок.</span>",
            f: "C:\\> Пользователь просмотрел сайт. Загрузка формы..."
        },
        en: {
            r: "C:\\> Reading user data...",
            p: "C:\\> Loading DAK_Pipeline_v3.1 protocol...",
            l: "C:\\> Launching: Blender 3D, ComfyUI, After Effects, Nuke...",
            s: ">>> Success... Demo completed.",
            w: ">>> Success... <span style='color: #ff4d4d; font-weight: bold;'>WARNING: Demo not completed. Recommended to connect nodes above to get a gift.</span>",
            f: "C:\\> User viewed the site. Loading form..."
        }
    };

    let currentLine = 0;
    let hasAnimated = false;

    function typeNextLine() {
        // Определяем язык ПРЯМО В МОМЕНТ ПЕЧАТИ
        const L = document.documentElement.lang === 'en' ? termStrings.en : termStrings.ru;

        const lines = [
            { text: L.r, hasSpinner: true, delay: 1200 },
            { text: L.p, hasSpinner: true, delay: 1500 },
            { text: L.l, delay: 1800 },
            { text: L.s, delay: 800, isStatusLine: true }, 
            { text: L.f, hasSpinner: true, delay: 1500 }
        ];

        if (currentLine < lines.length) {
            let lineData = lines[currentLine];
            const p = document.createElement('p');
            p.style.margin = "0 0 8px 0";
            p.style.color = "#00ff00";

            if (lineData.isStatusLine) {
                const ctaBlock = document.getElementById('cta');
                const isSuccess = ctaBlock && window.getComputedStyle(ctaBlock).display !== 'none';
                // Подставляем либо успех, либо ворнинг
                p.innerHTML = isSuccess ? L.s : L.w;
            } else {
                p.textContent = lineData.text;
            }

            if (lineData.hasSpinner) {
                const spinner = document.createElement('span');
                spinner.className = 'spinner';
                p.appendChild(spinner);
            }

            typingContainer.appendChild(p);
            currentLine++;
            setTimeout(typeNextLine, lineData.delay);
        } else {
            // Переход к форме...
            // (К этому моменту форма уже переведена твоим основным скриптом)
            setTimeout(() => {
                typingContainer.style.opacity = '0';
                setTimeout(() => {
                    typingContainer.style.display = 'none';
                    contactForm.style.display = 'block';
                    setTimeout(() => contactForm.classList.add('show'), 50);
                }, 500);
            }, 1000);
        }
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !hasAnimated) {
                hasAnimated = true;
                terminalWindow.classList.add('active');
                setTimeout(typeNextLine, 500);
            }
        });
    }, { threshold: 0.1 });

    if (terminalSection) observer.observe(terminalSection);
});


/* ── Расшифровка почтового ящика ── */
document.querySelectorAll('.js-mail').forEach(function(link) {
    link.addEventListener('click', function(e) {
        e.preventDefault(); // Запрещаем переход по ссылке "#"
        
        // Декодируем из Base64
        var encoded = this.getAttribute('data-mail');
        var decoded = atob(encoded); // Стандартная функция браузера для Base64
        
        // Открываем почту
        window.location.href = 'mailto:' + decoded;
    });
});


/* ── Конечная форма для отправки запроса в конце сайта ── */
document.getElementById('contact-form').addEventListener('submit', function(e) {
    e.preventDefault(); // Останавливаем стандартную отправку
    
    // 1. Собираем данные из полей
    var name = this.querySelector('input[name="name"]').value;
    var email = this.querySelector('input[name="email"]').value;
    var message = this.querySelector('textarea[name="message"]').value;
    
    // 2. Расшифровываем почту
    var myMail = atob("bXJkYWswOTZAZ21haWwuY29t"); 
    
    // 3. Формируем тему и тело письма
    var subject = encodeURIComponent("Запрос с сайта от " + name);
    var body = encodeURIComponent("Имя: " + name + "\nEmail: " + email + "\n\nЗадача:\n" + message);
    
    // 4. Собираем финальную ссылку (сначала создаем переменную, потом используем!)
    var mailtoUrl = "mailto:" + myMail + "?subject=" + subject + "&body=" + body;

    // --- ЛОГ ДЛЯ ПРОВЕРКИ (теперь всё подтянулось) ---
    console.log("Сгенерированная ссылка:", mailtoUrl);
    
    // 5. Открываем почтовый клиент
    window.location.href = mailtoUrl;
    
    // Опционально: очистить форму после нажатия
    this.reset();
});



/* ── Language toggle EN / RU ── */
(function () {
  var lang = 'ru';

  /* Каждый ключ: [селектор, индекс текстового узла (0=весь textContent), ru-текст, en-текст] */
  var tr = [
    /* NAV */
    ['a[href="#work"].btn',              0, 'Кейсы',    'Cases'],
    ['a[href="#services"].btn',          0, 'Услуги',   'Services'],
    ['a[href="#demo"].btn',              0, 'Демо',     'Demo'],
    /* HERO */
    ['.hero h1.title',                   0,
      'AI и CGI-пайплайны, которые ускоряют продакшн и улучшают качество',
      'AI & CGI pipelines that speed up production and improve quality'],
    ['.hero p.subtitle',                 0,
      'Специализация: Stable Diffusion (Forge/ComfyUI/InvokeAI), граф- и web дизайн, моушн, пост-прод, методология и обучение команд.',
      'Specialization: Stable Diffusion (Forge/ComfyUI/InvokeAI), graphic & web design, motion, post-production, methodology and team training.'],
    ['.tagrow .tag:nth-child(1)',         0, '⏱ −30–60% времени',       '⏱ −30–60% time saved'],
    ['.tagrow .tag:nth-child(2)',         0, '🎯 Стабильные результаты', '🎯 Consistent results'],
    ['.tagrow .tag:nth-child(3)',         0, '🧩 Внедрение за 1–2 недели','🧩 Deployed in 1–2 weeks'],
    ['.hero .cta .btn.primary',          0, 'Записаться на разбор пайплайна', 'Book a pipeline review'],
    ['.hero .cta .btn:not(.primary)',     0, 'Скачать резюме (PDF)',           'Download CV (PDF)'],
    /* WORK */
    ['#work .title-underlay',            0, 'Выбранные кейсы', 'Selected Cases'],
    /* ARTICLES */
    ['#articles-vp .article-card:nth-child(1) h3', 0, 'Inkscape с 0 до Pro за 5 дней', 'Inkscape from 0 to Pro in 5 days'],
    ['#articles-vp .article-card:nth-child(1) p.meta:nth-child(2)', 0, 'Обучающий мини-курс по программе для векторной графики Inkscape', 'A mini video course on the Inkscape vector graphics program'],
    ['#articles-vp .article-card:nth-child(2) h3', 0, '5 бесплатных программ для масштабирования видео как альтернатива платному Topaz Video AI', '5 free video upscaling tools as alternatives to Topaz Video AI'],
    ['#articles-vp .article-card:nth-child(2) p.meta:nth-child(2)', 0, 'Разбор 5 БЕСПЛАТНЫХ программ, которые помогут улучшить твои видео.', 'Overview of 5 FREE programs to improve your video quality.'],
    ['#articles-vp .article-card:nth-child(3) h3', 0, 'Девушки, котики и Flux Kontext: как выжать максимум из WebUI Forge?', 'Girls, cats & Flux Kontext: getting the most from WebUI Forge'],
    ['#articles-vp .article-card:nth-child(4) h3', 0, 'LLM в кармане: запускаю локальные модели на Samsung S24 Ultra через PocketPal — бенчмарки, настройки и туториал', 'LLM in your pocket: running local models on Samsung S24 Ultra via PocketPal'],
    ['#articles-vp .article-card:nth-child(5) h3', 0, 'Flux Kontext проигрывает ControlNET: уроки новичкам', 'Flux Kontext vs ControlNET: lessons for beginners'],
    ['#articles-vp .article-card:nth-child(6) h3', 0, 'Герои из самых узнаваемых компьютерных игр детства', 'Heroes from the most iconic childhood video games'],
    ['#articles-vp .article-card:nth-child(7) h3', 0, 'Видео в 1 клик: новости AI', 'Video in 1 click: AI news'],
    // Статья 1
    ['#articles-vp .article-card:nth-child(1) p.meta:nth-child(2)', 0, 'Обучающий мини-курс по программе для векторной графики Inkscape', 'A mini video course on the Inkscape vector graphics program'],
    ['#articles-vp .article-card:nth-child(1) p.meta:nth-child(3)', 0, '62K просмотров • 294 сохранения • 43 комментария', '62K views • 294 saves • 43 comments'],
    // Статья 2
    ['#articles-vp .article-card:nth-child(2) p.meta:nth-child(2)', 0, 'Разбор 5 БЕСПЛАТНЫХ программ, которые помогут улучшить твои видео.', 'Overview of 5 FREE programs to improve your video quality.'],
    ['#articles-vp .article-card:nth-child(2) p.meta:nth-child(3)', 0, '10K просмотров • 50 сохранений • 14 комментариев', '10K views • 50 saves • 14 comments'],
    // Статья 3
    ['#articles-vp .article-card:nth-child(3) p.meta:nth-child(2)', 0, 'Будет рассмотрено сравнение моделей Flux dev Q8_0.GGUF с Flux Kontext dev Q8_0.GGUF и Flux Kontext dev bnb-nf4 + Hyper Flux.1 dev-8steps Lora и с Flux Kontext dev.safetensors', 'Comparison of Flux dev Q8_0.GGUF vs Flux Kontext dev Q8_0.GGUF, Flux Kontext dev bnb-nf4 + Hyper Flux.1 dev-8steps Lora and Flux Kontext dev.safetensors'],
    ['#articles-vp .article-card:nth-child(3) p.meta:nth-child(3)', 0, '8K просмотров • 35 сохранений • 16 комментариев', '8K views • 35 saves • 16 comments'],
    // Статья 4
    ['#articles-vp .article-card:nth-child(4) p.meta:nth-child(2)', 0, 'Разбор PocketPal на Samsung S24 Ultra: как поставить модели в GGUF, какие кванты выбирать под 12 ГБ RAM', 'PocketPal on Samsung S24 Ultra: how to set up GGUF models and choose quants for 12 GB RAM'],
    ['#articles-vp .article-card:nth-child(4) p.meta:nth-child(3)', 0, '8.5K просмотров • 70 сохранение • 11 комментариев', '8.5K views • 70 saves • 11 comments'],
    // Статья 5
    ['#articles-vp .article-card:nth-child(5) p.meta:nth-child(2)', 0, 'Сравнение и анализ Flux Kontext 1-Dev.safetensors с ControlNet (ControlNET для SD 1.5 и SDXL и FluxTools-V2 для Flux) и с ChatGPT', 'Comparison of Flux Kontext 1-Dev.safetensors vs ControlNet (for SD 1.5, SDXL, FluxTools-V2) and ChatGPT'],
    ['#articles-vp .article-card:nth-child(5) p.meta:nth-child(3)', 0, '9.9K просмотров • 140 сохранений • 22 комментария', '9.9K views • 140 saves • 22 comments'],
    // Статья 6
    ['#articles-vp .article-card:nth-child(6) p.meta:nth-child(2)', 0, 'Работа выполнена в ChatGPT + Photoshop, использован бесплатный пиксельный шрифт GNF.', 'Created in ChatGPT + Photoshop using a free pixel font GNF.'],
    ['#articles-vp .article-card:nth-child(6) p.meta:nth-child(3)', 0, '2K просмотров • 5 сохранений • 14 комментария', '2K views • 5 saves • 14 comments'],
    // Статья 7
    ['#articles-vp .article-card:nth-child(7) p.meta:nth-child(2)', 0, 'Китайская корпорация ByteDance - они владеют TikTok и CapCut - готовят к выходу новый генератор видео...', 'ByteDance — the company behind TikTok and CapCut — is preparing to launch a new video generator...'],
    ['#articles-vp .article-card:nth-child(7) p.meta:nth-child(3)', 0, '5.3K просмотров • 60 лайков • 5 комментариев', '5.3K views • 60 likes • 5 comments'],
    /* SERVICES */
    ['#services h2',                     0, 'Услуги', 'Services'],
    ['#srv-list .srv-item:nth-child(1) .title',  0, 'Настройка AI‑пайплайнов (ComfyUI/Forge/InvokeAI/Text Generation WebUI/Flowise/Relevance AI/n8n)', 'AI pipeline setup (ComfyUI/Forge/InvokeAI/Text Generation WebUI/Flowise/Relevance AI/n8n)'],
    ['#srv-list .srv-item:nth-child(2) .title',  0, 'Создание анимированных 3D/2D баннеров, постеров', 'Animated 3D/2D banners and posters'],
    ['#srv-list .srv-item:nth-child(3) .title',  0, 'Создание дизайна упаковки', 'Packaging design'],
    ['#srv-list .srv-item:nth-child(4) .title',  0, 'Создание статичных рекламных баннеров, постеров, обложек, флаеров, промо-арт', 'Static banners, posters, covers, flyers, promo art'],
    ['#srv-list .srv-item:nth-child(5) .title',  0, 'AI генерация и монтаж видео, цветокор, звук', 'AI video generation, editing, color grading, sound'],
    ['#srv-list .srv-item:nth-child(6) .title',  0, 'Полиграфия. Создание комиксов, обложек книг', 'Print design: comics, book covers'],
    ['#srv-list .srv-item:nth-child(7) .title',  0, 'Создание сайтов/приложений на Tilda, Framer, Webflow, WordPress, Битрикс24', 'Websites/apps on Tilda, Framer, Webflow, WordPress, Bitrix24'],
    ['#srv-list .srv-item:nth-child(8) .title',  0, 'Разработка курсов для корпоративного сегмента и обучение команд (Power Point, ISpring Suite, OBS)', 'Corporate e-learning course development and team training (PowerPoint, iSpring, OBS)'],
    ['#srv-list .srv-item:nth-child(9) .title',  0, 'Создание корпоративных презентаций (Power Point)', 'Corporate presentations (PowerPoint)'],
    ['#srv-list .srv-item:nth-child(10) .title', 0, 'Ретушь фото', 'Photo retouching'],
    /*Stages of work execution*/
    /* PIPELINE SECTION */
    // Этап 1
    ['.pipeline-container .blueprint:nth-child(1) .blueprint-header', 0, 'Этап 1', 'Stage 1'],
    ['.pipeline-container .blueprint:nth-child(1) h4', 0, 'Аналитика и R&D', 'Analytics & R&D'],
    ['.pipeline-container .blueprint:nth-child(1) p', 0, 'Анализ ТЗ, аудит текущего пайплайна и создание Roadmap проекта.', 'Requirement analysis, current pipeline audit, and project roadmap creation.'],
    ['.pipeline-container .blueprint:nth-child(1) .extra-badge', 0, '+ ТЗ / Аудит', '+ Specs / Audit'],

    // Этап 2
    ['.pipeline-container .blueprint:nth-child(2) .blueprint-header', 0, 'Этап 2', 'Stage 2'],
    ['.pipeline-container .blueprint:nth-child(2) h4', 0, 'AI Production', 'AI Production'],
    ['.pipeline-container .blueprint:nth-child(2) p', 0, 'Генерация концептов и ассетов в Local ComfyUI, MJ или Google Nano Banana.', 'Concept and asset generation in Local ComfyUI, MJ, or Google Nano Banana.'],
    ['.pipeline-container .blueprint:nth-child(2) .extra-badge', 0, '+ LoRA / .PSD', '+ LoRA / .PSD'],

    // Этап 3
    ['.pipeline-container .blueprint:nth-child(3) .blueprint-header', 0, 'Этап 3', 'Stage 3'],
    ['.pipeline-container .blueprint:nth-child(3) h4', 0, 'CGI и 3D Моделинг', 'CGI & 3D Modeling'],
    ['.pipeline-container .blueprint:nth-child(3) p', 0, 'Создание геометрии и симуляций в Blender или Houdini.', 'Geometry and simulations in Blender or Houdini.'],
    ['.pipeline-container .blueprint:nth-child(3) .extra-badge', 0, '+ .blend / .hip', '+ .blend / .hip'],

    // Этап 4
    ['.pipeline-container .blueprint:nth-child(4) .blueprint-header', 0, 'Этап 4', 'Stage 4'],
    ['.pipeline-container .blueprint:nth-child(4) h4', 0, 'VFX & Compositing', 'VFX & Compositing'],
    ['.pipeline-container .blueprint:nth-child(4) p', 0, 'Финальная сборка слоев и техническая ретушь в Nuke или After Effects.', 'Final compositing and technical retouching in Nuke or After Effects.'],
    ['.pipeline-container .blueprint:nth-child(4) .extra-badge', 0, '+ Проекты слоев', '+ Layer Projects'],

    // Этап 5
    ['.pipeline-container .blueprint:nth-child(5) .blueprint-header', 0, 'Этап 5', 'Stage 5'],
    ['.pipeline-container .blueprint:nth-child(5) h4', 0, 'Монтаж и Финиш', 'Editing & Finish'],
    ['.pipeline-container .blueprint:nth-child(5) p', 0, 'Сборка видео, цветокоррекция и саунд-дизайн в DaVinci или Premiere.', 'Video editing, color grading, and sound design in DaVinci or Premiere.'],
    ['.pipeline-container .blueprint:nth-child(5) .extra-badge', 0, '+ Исходники монтажа', '+ Project Files'],

    // Этап 6
    ['.pipeline-container .blueprint:nth-child(6) .blueprint-header', 0, 'Этап 6', 'Stage 6'],
    ['.pipeline-container .blueprint:nth-child(6) h4', 0, 'Delivery & EDU', 'Delivery & EDU'],
    ['.pipeline-container .blueprint:nth-child(6) p', 0, 'Обучение команды работе с пайплайном и создание веб-презентации.', 'Team pipeline training and web presentation creation.'],
    ['.pipeline-container .blueprint:nth-child(6) .extra-badge', 0, '+ Видеокурс / Web / .PPTX / .HTML', '+ Video Course / Web / .PPTX / .HTML'],

    // Кнопка скачать
    ['.btn-text', 0, 'Скачать Технический Roadmap (PDF)', 'Download Technical Roadmap (PDF)'],
    /* DEMO */
    ['#demo .section-title',             0, 'Соберите мини-граф и запустите демо', 'Build a mini-graph and run the demo'],
    ['#runBtn',                          0, 'Запустить демо', 'Run demo'],
    ['#bookBtn',                         0, 'Записаться на разбор пайплайна', 'Book a pipeline review'],
    ['#wsHint',                          0, 'Подсказка: кликай по портам, соединяй узлы и жми «Запустить демо».', 'Tip: click ports, connect nodes, then press "Run demo".'],
    ['#n-pos .title',                    0, 'Кодировщик текста CLIP (Положительный)', 'CLIP Text Encoder (Positive)'],
    ['#n-neg .title',                    0, 'Кодировщик текста CLIP (Отрицательный)', 'CLIP Text Encoder (Negative)'],
    ['#n-size .title',                   0, 'Параметры изображения', 'Image Parameters'],
    ['#n-checkpoint .title',             0, 'Загрузить Checkpoint', 'Load Checkpoint'],
    ['#n-vae .title',                    0, 'Декодировать VAE', 'VAE Decode'],
    ['#n-save .title',                   0, 'Сохранить изображение', 'Save Image'],
    /* LINKS & HOBBIES */
    ['#ssulki',                          0, 'Мои ссылки', 'My Links'],
    ['#hobbies-title',                   0, 'Обо мне',  'About me'],
    /* HOBBIES CARDS */
    // Карточка 1 (Пятигорск)
    ['#photoStack .card:nth-child(1) .lang-txt', 0, 'Пятигорск. Автопортрет на смартфон', 'Pyatigorsk. Smartphone self-portrait'],
    // Карточка 2 (Весна)
    ['#photoStack .card:nth-child(2) .lang-txt', 0, 'Весна.', 'Spring.'],
    // Карточка 3 (Портрет)
    ['#photoStack .card:nth-child(3) .lang-txt', 0, 'Женский портрет.', 'Female portrait.'],
    // Карточка 4 (Плов - видео)
    ['#photoStack .card:nth-child(4) .lang-txt', 0, 'Готовим плов', 'Cooking pilaf'],
    // Карточка 5 (Tutor)
    ['#photoStack .card:nth-child(5) .lang-txt', 0, 'Flux Kontext проигрывает ControlNET: уроки новичкам', 'Flux Kontext vs ControlNET: lessons for beginners'],
    // Карточка 6 (Спорт - видео)
    ['#photoStack .card:nth-child(6) .lang-txt', 0, 'Занятие спортом. Юмористический монтаж', 'Workout. Humorous edit'],
    // Карточка 7 (Концепт)
    ['#photoStack .card:nth-child(7) .lang-txt', 0, 'Концептуальная фотография.', 'Conceptual photography.'],
    // Карточка 8 (Роза Хутор)
    ['#photoStack .card:nth-child(8) .lang-txt', 0, 'Роза Хутор.', 'Rosa Khutor.'],
    // Карточка 9 (Муравей)
    ['#photoStack .card:nth-child(9) .lang-txt', 0, 'Муравей.', 'Ant.'],
    // Карточка 10 (Предметка)
    ['#photoStack .card:nth-child(10) .lang-txt', 0, 'Предметное фото.', 'Product photography.'],
    // Карточка 11 (Нитки)
    ['#photoStack .card:nth-child(11) .lang-txt', 0, 'Нитки.', 'Threads.'],
    // Карточка 12 (Сказка)
    ['#photoStack .card:nth-child(12) .lang-txt', 0, 'Сказка.', 'Fairytale.'],
    // Карточка 13 (Город)
    ['#photoStack .card:nth-child(13) .lang-txt', 0, 'Пустые городские улицы.', 'Empty city streets.'],
    ['#hobbyHint', 0, 'Проведите пальцем(мышкой) по верхней карточке — она уйдёт в конец стопки.', 'Swipe (or drag) the top card — it will move to the bottom of the stack.'],

    // Порты ноды n-pos (Положительный кодировщик)
    ['#n-pos .port:nth-child(2) .port-label', 0, 'положительный', 'positive'],

    // Порты ноды n-neg (Отрицательный кодировщик)
    ['#n-neg .port:nth-child(2) .port-label', 0, 'отрицательный', 'negative'],

    // Порты Checkpoint
    ['#n-checkpoint .port:nth-child(1) .port-label', 0, 'модель', 'model'],

    // Порты KSampler
   ['#n-ksampler .port:nth-child(1) .port-label', 0, 'модель',    'model'],
   ['#n-ksampler .port:nth-child(2) .port-label', 0, 'положительный', 'positive'],
   ['#n-ksampler .port:nth-child(3) .port-label', 0, 'отрицательный', 'negative'],
   ['#n-ksampler .port:nth-child(4) .port-label', 0, 'Latent (вход)', 'Latent (input)'],
   ['#n-ksampler .port:nth-child(5) .port-label', 0, 'Latent (выход)','Latent (output)'],

   // Порты VAE Decode
   ['#n-vae .port:nth-child(1) .port-label', 0, 'образцы',     'samples'],
   ['#n-vae .port:nth-child(3) .port-label', 0, 'изображение', 'image'],

   // Порт Save Image
   ['#n-save .port:nth-child(1) .port-label', 0, 'изображение', 'image'],

   // CTA внутри ноды Save
   ['#cta .cta-text', 0, 'Помогу собрать ваш реальный пайплайн за 1–2 недели.', "I'll help you build your real pipeline in 1–2 weeks."],
   ['.download-btn .dl-text', 0, 'Скачать демо workflow', 'Download demo workflow'],
   
   /* LIFESTYLE & FOOTER */
   // Ссылка на Instagram (используем класс .lang-txt внутри ссылки на инсту)
   ['a[href*="instagram.com"] .lang-txt', 0, 'Моя жизнь', 'My life'],

   /* TERMINAL & FORM */
   ['#contact-form h3',                   0, 'Связаться со специалистом DMITRII DAK', 'Contact specialist DMITRII DAK'],
   ['.lang-txt-btn',                      0, 'Отправить запрос', 'Send Request'],
   ['input[name="name"]',     0, 'Ваше имя',     'Your Name'],
   ['input[name="email"]',    0, 'Ваш Email',    'Your Email'],
   ['textarea[name="message"]', 0, 'Опишите задачу или пайплайн', 'Describe the task or pipeline'],

   // Футер
   ['.footer-text', 0, '© 2026 Dmitrii DAK · дизайн и разработка', '© 2026 Dmitrii DAK · design & development'],
  ];

  function applyLang(newLang) {
  var idx = newLang === 'ru' ? 2 : 3;
  tr.forEach(function (row) {
    var el = document.querySelector(row[0]);
    if (el) {
      // Если это поле ввода, меняем placeholder, иначе textContent
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = row[idx];
      } else {
        el.textContent = row[idx];
      }
    }
  });
  document.documentElement.lang = newLang;
  var btn = document.getElementById('langToggle');
  if (btn) btn.textContent = newLang === 'ru' ? 'EN' : 'RU';
  lang = newLang; // Обновляем глобальную переменную lang
  
  // Добавьте в конец:
  if (typeof CatGame !== 'undefined') CatGame.setLang(newLang);
}

  document.addEventListener('DOMContentLoaded', function () {
    // 1. Пытаемся взять язык из памяти, если нет — смотрим язык браузера
    var savedLang = localStorage.getItem('siteLang');
    var browserLang = navigator.language.slice(0, 2); // 'ru' или 'en'
    
    // Если в памяти пусто, а браузер не русский — ставим 'en'
    if (!savedLang) {
      savedLang = (browserLang === 'ru') ? 'ru' : 'en';
    }

    // Применяем начальный язык
    applyLang(savedLang);

    var btn = document.getElementById('langToggle');
    if (btn) {
      btn.addEventListener('click', function () {
        var newLang = (lang === 'ru' ? 'en' : 'ru');
        applyLang(newLang);
        // 2. Сохраняем выбор пользователя в память браузера
        localStorage.setItem('siteLang', newLang);
      });
    }
  });
})();
