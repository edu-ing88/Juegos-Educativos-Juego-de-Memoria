/* main.js — Pantalla principal: actividad activa, niveles, cuenta regresiva y navegación */
const App = (() => {
  const $ = id => document.getElementById(id);
  const NIVELES = [{n:2, nom:'Fácil', ic:'🌱'}, {n:4, nom:'Intermedio', ic:'⭐'}, {n:5, nom:'Difícil', ic:'🔥'}];
  let act = null, nivel = 5;
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  const mostrar = id => document.querySelectorAll('.pantalla').forEach(p => p.classList.toggle('activa', p.id === id));

  function pintarNiveles() {
    const disp = act ? act.pares.length : 0, cont = $('niveles'); cont.innerHTML = '';
    const validos = NIVELES.filter(l => l.n <= disp);
    const guardado = +localStorage.getItem('memoria_nivel');
    nivel = validos.some(l => l.n === guardado) ? guardado : (validos.filter(l => l.n <= 5).pop() || validos[0] || {n: 0}).n;
    NIVELES.forEach(l => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'nivel' + (l.n === nivel ? ' sel' : ''); b.disabled = l.n > disp;
      b.innerHTML = `<span class="ic">${l.ic}</span><b>${l.nom}</b><span class="num">${l.n * 2}</span><small>${l.n} parejas</small>` + (l.n > disp ? `<small>Faltan parejas</small>` : '');
      b.onclick = () => { nivel = l.n; localStorage.setItem('memoria_nivel', l.n); pintarNiveles(); };
      cont.appendChild(b);
    });
    $('btnIniciar').disabled = disp < 2;
  }

  async function arrancar() {
    mostrar('cuenta'); const num = $('cuentaNum');
    await Juego.preparar(act, nivel);
    for (const t of ['3', '2', '1', '¡EMPEZAR!']) {
      num.textContent = t; num.style.fontSize = t.length > 1 ? 'clamp(2.5rem,12vw,6rem)' : '';
      num.classList.remove('pop'); void num.offsetWidth; num.classList.add('pop'); Sonidos.tick(); await esperar(t.length > 1 ? 800 : 900);
    }
    mostrar('juego'); Juego.empezar();
  }

  async function init() {
    await Almacen.iniciar(); act = Almacen.actividadActiva();
    $('actInfo').textContent = act ? `📘 ${act.titulo}` : 'Aún no hay actividades: configura una.';
    pintarNiveles();
    $('btnIniciar').onclick = arrancar;
    const bs = $('btnSonido'); bs.textContent = Sonidos.activo() ? '🔊' : '🔇';
    bs.onclick = () => { bs.textContent = Sonidos.alternar() ? '🔊' : '🔇'; };
  }
  init();
  return {mostrar, arrancar};
})();
