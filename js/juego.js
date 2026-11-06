/* juego.js — Lógica del tablero: mezcla, volteo, emparejamiento, cronómetro, puntaje, salir y victoria */
const Juego = (() => {
  const $ = id => document.getElementById(id);
  // Distribución por cantidad de tarjetas: columnas y ancho máximo del tablero (escritorio / móvil)
  const DIM = {4: {c:2, cm:2, w:'340px', wm:'300px'}, 8: {c:4, cm:4, w:'700px', wm:'100%'}, 10: {c:5, cm:2, w:'860px', wm:'300px'}};
  const MOTIVOS = ['¡Excelente memoria! Sigue así.', '¡Eres un campeón del aprendizaje!', '¡Muy bien! Practicar te hace cada vez más rápido.', '¡Increíble trabajo! ¿Puedes superar tu tiempo?'];
  let sel = [], bloq = true, aciertos = 0, total = 0, puntos = 0, seg = 0, timer = null, jugando = false, urls = [], act = null;
  const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  const mezclar = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const abrir = id => $(id).classList.add('abierto'), cerrar = id => $(id).classList.remove('abierto');

  function hud() {
    const pc = Math.round(aciertos / total * 100);
    $('hTiempo').textContent = fmt(seg); $('hPuntos').textContent = puntos;
    $('hParejas').textContent = aciertos + ' / ' + total; $('hBarra').style.width = pc + '%'; $('hPct').textContent = pc + '%';
  }
  const reloj = () => { clearInterval(timer); timer = setInterval(() => { seg++; $('hTiempo').textContent = fmt(seg); }, 1000); };
  const detener = () => { clearInterval(timer); timer = null; };

  // Construye el tablero (tarjetas boca abajo, mezcladas). El reloj aún no corre.
  async function preparar(a, nPares) {
    detener(); urls.forEach(u => URL.revokeObjectURL(u)); urls = [];
    act = a; sel = []; bloq = true; jugando = false; aciertos = 0; puntos = 0; seg = 0;
    const pares = mezclar(a.pares.slice()).slice(0, nPares); total = pares.length;
    $('juegoTitulo').textContent = a.titulo;
    const lista = [];
    for (const p of pares) {
      let img = null, b = p.b;
      if (a.tipo === 'imagen') {
        const blob = await Almacen.obtenerImg(p.img).catch(() => null);
        if (blob) { img = URL.createObjectURL(blob); urls.push(img); } else b = '(sin imagen)';
      }
      lista.push({par: p.id, txt: p.a, cls: 'tipo-a'}, {par: p.id, txt: b, img, cls: 'tipo-b'});
    }
    mezclar(lista);
    const T = $('tablero'), n = lista.length; T.innerHTML = '';
    const d = DIM[n] || DIM[8];
    T.style.setProperty('--cols', d.c); T.style.setProperty('--colsm', d.cm); T.style.setProperty('--maxw', d.w); T.style.setProperty('--maxwm', d.wm);
    lista.forEach(d => {
      const el = document.createElement('button'); el.type = 'button'; el.className = 'carta'; el.setAttribute('aria-label', 'Tarjeta boca abajo');
      el.innerHTML = '<div class="interior"><div class="cara dorso">❓</div><div class="cara frente ' + d.cls + '"></div></div>';
      const f = el.querySelector('.frente');
      if (d.img) { const i = document.createElement('img'); i.src = d.img; i.alt = ''; f.appendChild(i); }
      else { const s = document.createElement('span'); s.textContent = d.txt; if (d.txt.length > 28) s.className = 'largo'; f.appendChild(s); }
      el.onclick = () => clic({par: d.par, el}); T.appendChild(el);
    });
    hud();
  }
  const empezar = () => { bloq = false; jugando = true; reloj(); };

  function clic(c) {
    if (bloq || c.el.classList.contains('volteada') || c.el.classList.contains('acertada')) return;
    c.el.classList.add('volteada'); Sonidos.voltear(); sel.push(c);
    if (sel.length < 2) return;
    bloq = true; const [x, y] = sel; sel = [];       // bloquea para no elegir más de 2
    if (x.par === y.par) {                           // pareja correcta (en cualquier orden)
      setTimeout(() => {
        [x, y].forEach(k => k.el.classList.add('acertada'));
        aciertos++; puntos += 10; hud(); Sonidos.acierto(); bloq = false;
        if (aciertos === total) ganar();
      }, 450);
    } else {                                         // pareja incorrecta
      setTimeout(() => { Sonidos.error(); x.el.classList.add('error'); y.el.classList.add('error'); }, 450);
      setTimeout(() => { [x, y].forEach(k => k.el.classList.remove('volteada', 'error')); bloq = false; }, 1450);
    }
  }

  function ganar() {
    detener(); jugando = false; bloq = true;         // el reloj se detiene antes de mostrar resultados
    setTimeout(() => {
      Sonidos.victoria();
      $('mTitulo').textContent = act.titulo; $('mPuntos').textContent = puntos; $('mParejas').textContent = aciertos + ' / ' + total;
      $('mTiempo').textContent = fmt(seg); $('mMotivo').textContent = MOTIVOS[Math.floor(Math.random() * MOTIVOS.length)];
      const cf = $('confeti'); cf.innerHTML = '';
      for (let i = 0; i < 40; i++) { const e = document.createElement('i'); e.style.cssText =
        `left:${Math.random() * 100}%;background:hsl(${Math.random() * 360},85%,60%);animation-duration:${2 + Math.random() * 2.5}s;animation-delay:${Math.random() * 2}s`; cf.appendChild(e); }
      abrir('modalVictoria');
    }, 700);
  }

  // Salir con confirmación (el reloj se pausa mientras se decide)
  $('btnSalir').onclick = () => { if (!jugando) return; detener(); abrir('modalSalir'); };
  $('salirNo').onclick = () => { cerrar('modalSalir'); if (jugando) reloj(); };
  $('salirSi').onclick = () => { detener(); jugando = false; cerrar('modalSalir'); App.mostrar('inicio'); };
  $('bJugar').onclick = () => { cerrar('modalVictoria'); App.arrancar(); };
  $('bInicio').onclick = () => { cerrar('modalVictoria'); App.mostrar('inicio'); };
  return {preparar, empezar};
})();
