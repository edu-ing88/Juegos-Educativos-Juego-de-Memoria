/* almacenamiento.js — Persistencia: actividades en localStorage, imágenes (Blob) en IndexedDB */
const TIPOS = {
  imagen:   {nombre:'Palabra – Imagen',        a:'Palabra',  b:'Imagen',     ayuda:'Cada pareja une una palabra con su imagen.'},
  pregunta: {nombre:'Pregunta – Respuesta',    a:'Pregunta', b:'Respuesta',  ayuda:'Ideal para Ciencias Sociales y Ciencia y Tecnología.'},
  concepto: {nombre:'Concepto – Definición',   a:'Concepto', b:'Definición', ayuda:'Ideal para Comunicación y Ciencia y Tecnología.'},
  operacion:{nombre:'Operación – Resultado',   a:'Operación',b:'Resultado',  ayuda:'Ideal para Matemática. Ej.: 7 × 8  →  56.'}
};
const Almacen = (() => {
  let db;
  const K = 'memoria_actividades', KA = 'memoria_activa';
  const abrir = () => db ? Promise.resolve(db) : new Promise((ok, ko) => {
    const r = indexedDB.open('memoriaDB', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('img');
    r.onsuccess = () => { db = r.result; ok(db); };
    r.onerror = () => ko(r.error);
  });
  const tx = async (modo, fn) => { const d = await abrir(); return new Promise((ok, ko) => {
    const t = d.transaction('img', modo), rq = fn(t.objectStore('img'));
    t.oncomplete = () => ok(rq && rq.result); t.onerror = () => ko(t.error); t.onabort = () => ko(t.error); }); };
  const guardarImg = (id, blob) => tx('readwrite', s => s.put(blob, id));
  const obtenerImg = id => tx('readonly', s => s.get(id));
  const borrarImg  = id => tx('readwrite', s => s.delete(id));
  const leer = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const listar = () => leer(K, []);
  const obtener = id => listar().find(a => a.id === id);
  const nuevaId = () => 'act_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const activaId = () => localStorage.getItem(KA);
  const setActiva = id => localStorage.setItem(KA, id);
  function guardar(act) {
    const l = listar(), i = l.findIndex(a => a.id === act.id);
    i >= 0 ? l[i] = act : l.push(act);
    localStorage.setItem(K, JSON.stringify(l)); setActiva(act.id);
  }
  async function eliminar(id) {
    const a = obtener(id);
    if (a) for (const p of a.pares) if (p.img) await borrarImg(p.img).catch(() => {});
    localStorage.setItem(K, JSON.stringify(listar().filter(x => x.id !== id)));
    if (activaId() === id) localStorage.removeItem(KA);
  }
  function actividadActiva() { const l = listar(); return l.find(a => a.id === activaId()) || l[0] || null; }
  // Reduce la imagen (máx. 500 px) para ahorrar espacio; devuelve Blob JPEG
  async function reducir(file) {
    const bmp = await createImageBitmap(file), e = Math.min(1, 500 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * e); c.height = Math.round(bmp.height * e);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise(ok => c.toBlob(ok, 'image/jpeg', .85));
  }
  // Primera ejecución: actividad de ejemplo con imágenes generadas desde emojis
  async function sembrar() {
    const datos = [['MANZANA','🍎'],['PERRO','🐶'],['COMPUTADORA','💻'],['MARIPOSA','🦋'],['LIBRO','📚'],['SOL','☀️'],['GATO','🐱'],['CASA','🏠'],['FLOR','🌸'],['LUNA','🌙']];
    const pares = [];
    for (const [a, em] of datos) {
      const c = document.createElement('canvas'); c.width = c.height = 300; const x = c.getContext('2d');
      x.fillStyle = '#fff8e6'; x.fillRect(0, 0, 300, 300); x.font = '180px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(em, 150, 160);
      const blob = await new Promise(ok => c.toBlob(ok, 'image/png')), img = 'img_' + a;
      await guardarImg(img, blob); pares.push({id: 'p_' + a, a, b: '', img});
    }
    guardar({id: nuevaId(), titulo: 'Mi primera actividad', tipo: 'imagen', pares});
  }
  async function iniciar() { await abrir(); if (!listar().length) await sembrar(); }
  return {iniciar, listar, obtener, guardar, eliminar, nuevaId, activaId, setActiva, actividadActiva, guardarImg, obtenerImg, borrarImg, reducir};
})();
