/* configuracion.js — Panel del docente: actividades, parejas (alta/edición/baja), validaciones y guardado */
(() => {
  const $ = id => document.getElementById(id);
  const MAYUS = {imagen: 1, concepto: 1};   // tipos cuyo primer campo se convierte a mayúsculas
  let act, guardada = false, borrar = [], editId = null, nuevoBlob = null, nuevaUrl = null;

  function msg(t, ok = true) { const m = $('msg'); m.textContent = t; m.className = 'msg ' + (ok ? 'ok' : 'err') + ' ver';
    clearTimeout(msg.t); msg.t = setTimeout(() => m.classList.remove('ver'), 3200); }

  async function cargar(id) {
    act = JSON.parse(JSON.stringify(Almacen.obtener(id))); borrar = []; guardada = true; Almacen.setActiva(id);
    for (const p of act.pares) if (p.img) { const b = await Almacen.obtenerImg(p.img).catch(() => null); if (b) { p.blob = b; p.url = URL.createObjectURL(b); } }
    limpiarForm(); render();
  }
  function nueva() { act = {id: Almacen.nuevaId(), titulo: '', tipo: 'imagen', pares: []}; guardada = false; borrar = []; limpiarForm(); render(); }

  function render() {
    const sel = $('selAct'); sel.innerHTML = '';
    Almacen.listar().forEach(a => sel.add(new Option(a.titulo, a.id)));
    if (!guardada) sel.add(new Option('➕ Nueva actividad (sin guardar)', act.id));
    sel.value = act.id;
    $('titulo').value = act.titulo;
    const t = $('tipo'); if (!t.options.length) Object.entries(TIPOS).forEach(([k, v]) => t.add(new Option(v.nombre, k)));
    t.value = act.tipo; t.disabled = act.pares.length > 0;
    $('tipoAyuda').textContent = TIPOS[act.tipo].ayuda + (t.disabled ? ' (Elimina las parejas para cambiar el tipo.)' : '');
    const img = act.tipo === 'imagen';
    $('lblA').textContent = TIPOS[act.tipo].a; $('lblB').textContent = TIPOS[act.tipo].b;
    $('boxFile').hidden = !img; $('boxB').hidden = img;
    $('formTitulo').textContent = editId ? 'Editar pareja' : 'Agregar pareja';
    $('btnAgregar').textContent = editId ? 'GUARDAR CAMBIOS' : 'AGREGAR'; $('btnCancelar').hidden = !editId;
    $('cont').textContent = act.pares.length;
    const ul = $('lista'); ul.innerHTML = '';
    if (!act.pares.length) ul.innerHTML = '<li class="vacio">Aún no hay parejas. Agrega la primera arriba.</li>';
    act.pares.forEach(p => {
      const li = document.createElement('li');
      if (img && p.url) { const i = document.createElement('img'); i.src = p.url; i.className = 'mini'; i.alt = p.a; li.appendChild(i); }
      const d = document.createElement('div'); d.className = 'txt'; const b = document.createElement('b'); b.textContent = p.a; d.appendChild(b);
      if (!img) { const s = document.createElement('small'); s.textContent = '→ ' + p.b; d.appendChild(s); }
      li.appendChild(d);
      const e = document.createElement('button'); e.textContent = '✏️'; e.title = 'Editar'; e.onclick = () => editar(p.id);
      const x = document.createElement('button'); x.textContent = '🗑️'; x.title = 'Eliminar'; x.onclick = () => quitar(p.id);
      li.append(e, x); ul.appendChild(li);
    });
  }

  function limpiarForm() { editId = null; nuevoBlob = null; nuevaUrl = null; $('inpA').value = ''; $('inpB').value = ''; $('inpFile').value = '';
    $('prev').removeAttribute('src'); $('prevBox').hidden = true; }   // restablece el formulario al estado inicial
  function editar(id) {
    const p = act.pares.find(x => x.id === id); editId = id; nuevoBlob = null; nuevaUrl = null; render();
    $('inpA').value = p.a; $('inpB').value = p.b || ''; $('inpFile').value = '';
    if (p.url) { $('prev').src = p.url; $('prevBox').hidden = false; } else $('prevBox').hidden = true;
    $('inpA').focus(); $('inpA').scrollIntoView({behavior: 'smooth', block: 'center'});
  }
  // Eliminación en dos pasos: quitar() abre el modal; confirmarEliminar() borra y persiste de inmediato
  let pendienteId = null;
  const modalElim = $('modalElim');
  function quitar(id) { pendienteId = id; modalElim.classList.add('abierto'); $('elimNo').focus(); }
  function cerrarModal() { pendienteId = null; modalElim.classList.remove('abierto'); }
  async function confirmarEliminar() {
    const p = act.pares.find(x => x.id === pendienteId); cerrarModal(); if (!p) return;
    if (p.img) borrar.push(p.img);
    act.pares = act.pares.filter(x => x.id !== p.id); if (editId === p.id) limpiarForm();
    render();
    if (!guardada || await persistir()) msg('Pareja eliminada.');   // si la actividad ya estaba guardada, el juego se actualiza al instante
  }

  $('inpFile').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    if (!f.type.startsWith('image/')) { msg('El archivo debe ser una imagen.', false); e.target.value = ''; return; }
    try { nuevoBlob = await Almacen.reducir(f); nuevaUrl = URL.createObjectURL(nuevoBlob); $('prev').src = nuevaUrl; $('prevBox').hidden = false; }
    catch { msg('No se pudo leer la imagen.', false); }
  };

  function agregar() {
    const t = act.tipo; let a = $('inpA').value.trim();
    if (!a) return msg('Escribe ' + TIPOS[t].a.toLowerCase() + ' antes de agregar.', false);
    if (MAYUS[t]) a = a.toUpperCase();
    if (act.pares.some(p => p.id !== editId && p.a.toLowerCase() === a.toLowerCase())) return msg('"' + a + '" ya está registrada.', false);
    const prev = act.pares.find(p => p.id === editId);
    const par = {id: prev ? prev.id : 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), a, b: '', img: null};
    if (t === 'imagen') {
      if (nuevoBlob) { par.img = 'img_' + par.id + '_' + Date.now().toString(36); par.blob = nuevoBlob; par.url = nuevaUrl; par.nuevo = true; if (prev && prev.img) borrar.push(prev.img); }
      else if (prev && prev.blob) Object.assign(par, {img: prev.img, blob: prev.blob, url: prev.url, nuevo: prev.nuevo});
      else return msg('Selecciona una imagen para la palabra.', false);
    } else {
      par.b = $('inpB').value.trim(); if (!par.b) return msg('Escribe ' + TIPOS[t].b.toLowerCase() + '.', false);
    }
    prev ? Object.assign(prev, par) : act.pares.push(par);
    const edito = !!prev; limpiarForm(); render(); msg(edito ? 'Pareja actualizada.' : 'Pareja agregada.'); $('inpA').focus();
  }

  // Escribe en IndexedDB (imágenes) y localStorage (actividad) sin validar el formulario
  async function persistir() {
    try {
      for (const p of act.pares) if (p.nuevo) { await Almacen.guardarImg(p.img, p.blob); p.nuevo = false; }
      for (const id of borrar) await Almacen.borrarImg(id).catch(() => {}); borrar = [];
      const previo = Almacen.obtener(act.id);
      Almacen.guardar({id: act.id, titulo: act.titulo.trim() || (previo ? previo.titulo : ''), tipo: act.tipo,
        pares: act.pares.map(({id, a, b, img}) => ({id, a, b, img}))});
      guardada = true; return true;
    } catch (e) { msg('No se pudo guardar (almacenamiento lleno o bloqueado).', false); return false; }
  }
  async function guardar() {
    act.titulo = $('titulo').value.trim();
    if (!act.titulo) { msg('Escribe el título de la actividad.', false); return false; }
    if (act.pares.length < 2) { msg('Registra al menos 2 parejas.', false); return false; }
    if (!await persistir()) return false;
    render(); msg('Configuración guardada.'); return true;
  }

  async function eliminarAct() {
    if (!confirm('¿Eliminar esta actividad y sus imágenes?')) return;
    if (guardada) await Almacen.eliminar(act.id);
    const l = Almacen.listar(); l.length ? await cargar(l[0].id) : nueva(); msg('Actividad eliminada.');
  }

  $('titulo').oninput = e => act.titulo = e.target.value;
  $('tipo').onchange = e => { act.tipo = e.target.value; limpiarForm(); render(); };
  $('selAct').onchange = e => { const id = e.target.value; if (Almacen.obtener(id)) cargar(id); };
  $('inpA').onkeydown = $('inpB').onkeydown = e => { if (e.key === 'Enter') agregar(); };
  $('btnAgregar').onclick = agregar; $('btnCancelar').onclick = () => { limpiarForm(); render(); };
  $('btnGuardar').onclick = guardar; $('btnNueva').onclick = nueva; $('btnElimAct').onclick = eliminarAct;
  $('elimNo').onclick = cerrarModal; $('elimSi').onclick = confirmarEliminar;
  modalElim.onclick = e => { if (e.target === modalElim) cerrarModal(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && pendienteId) cerrarModal(); });

  (async () => { await Almacen.iniciar(); const a = Almacen.actividadActiva(); a ? await cargar(a.id) : nueva(); })();
})();
