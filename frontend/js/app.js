/* ============================================================
   EcoVecinos — app.js
   Apache: DocumentRoot → frontend/  |  Alias /backend → backend/
   Rutas API:  /backend/api.php
   Rutas imgs: /backend/uploads/archivo.ext
============================================================ */

const API     = '/backend/api.php';
const UPLOADS = '/backend/';

const esDashboard = window.location.pathname.includes('dashboard');
if (esDashboard) initDashboard();

/* ============================================================
   DASHBOARD
============================================================ */
function initDashboard() {

  const userId = localStorage.getItem('userId');
  if (!userId) { window.location.href = 'login.html'; return; }

  const userName = localStorage.getItem('userName') || 'Vecino/a';

  /* ── Sidebar y topbar ──────────────────────────────── */
  document.getElementById('topbar-saludo').textContent  = `Hola, ${userName} 👋`;
  document.getElementById('sidebar-nombre').textContent = userName;
  document.getElementById('sidebar-avatar').textContent = userName.charAt(0).toUpperCase();

  // Cargar puntos del sidebar al arrancar
  actualizarPuntosSidebar();

  /* ── Badge notificaciones intercambios ─ */

  // Botón de intercambios en el sidebar
  const btnIntercambios = document.querySelector('.nav-btn[data-section="intercambios"]');
  const btnIntercambiosMobile = document.querySelector('.mobile-nav-btn[data-section="intercambios"]');

 async function actualizarBadge() {
    try {
      const res  = await fetch(`${API}?action=contar_pendientes&usuario_id=${userId}`);
      const data = await res.json();

      if (data.status !== 'ok') return;

      // Badge sidebar (escritorio)
      if (btnIntercambios) {
        const anterior = btnIntercambios.querySelector('.nav-badge');
        if (anterior) anterior.remove();
        if (data.pendientes > 0) {
          const badge = document.createElement('span');
          badge.className   = 'nav-badge';
          badge.textContent = data.pendientes > 9 ? '9+' : data.pendientes;
          btnIntercambios.appendChild(badge);
        }
      }

      // Badge nav móvil
      if (btnIntercambiosMobile) {
        const anteriorM = btnIntercambiosMobile.querySelector('.nav-badge');
        if (anteriorM) anteriorM.remove();
        if (data.pendientes > 0) {
          const badgeM = document.createElement('span');
          badgeM.className   = 'nav-badge';
          badgeM.textContent = data.pendientes > 9 ? '9+' : data.pendientes;
          btnIntercambiosMobile.appendChild(badgeM);
        }
      }
    } catch {}
  }

  actualizarBadge();
  setInterval(actualizarBadge, 30000);

  if (btnIntercambios) {
    btnIntercambios.addEventListener('click', () => {
      const badge = btnIntercambios.querySelector('.nav-badge');
      if (badge) badge.remove();
      const badgeM = btnIntercambiosMobile?.querySelector('.nav-badge');
      if (badgeM) badgeM.remove();
    });
  }

  if (btnIntercambiosMobile) {
    btnIntercambiosMobile.addEventListener('click', () => {
      const badge = btnIntercambiosMobile.querySelector('.nav-badge');
      if (badge) badge.remove();
      const badgeS = btnIntercambios?.querySelector('.nav-badge');
      if (badgeS) badgeS.remove();
    });
  }

  /* ── Navegación ────────────────────────────────────── */
  const secciones = document.querySelectorAll('.seccion-dashboard');
  const navBtns   = document.querySelectorAll('.nav-btn');

  function mostrarSeccion(id) {
    secciones.forEach(sec => {
      sec.style.display = sec.id === id ? 'block' : 'none';
    });
    navBtns.forEach(btn => {
      btn.classList.toggle('activa', btn.dataset.section === id);
    });

    if (id === 'inicio')             cargarAlimentosBarrio();
    if (id === 'mis-alimentos')      cargarMisAlimentos();
    if (id === 'intercambios')       cargarIntercambios();
    if (id === 'mi-barrio')          cargarMiBarrio();
    if (id === 'ranking')            cargarRanking();
    if (id === 'chats-intercambios') cargarIntercambiosAceptados();
    if (id === 'perfil')             cargarPerfil();
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => mostrarSeccion(btn.dataset.section));
  });

  mostrarSeccion('inicio');

  // Nav inferior móvil
  const mobileNavBtns = document.querySelectorAll('.mobile-nav-btn');
  mobileNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      mobileNavBtns.forEach(b => b.classList.remove('activa'));
      btn.classList.add('activa');
      mostrarSeccion(btn.dataset.section);
    });
  });

  /* ── Logout ────────────────────────────────────────── */
  document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
  });

  // Logout móvil
  const btnMobileLogout = document.getElementById('mobile-logout');
  if (btnMobileLogout) {
    btnMobileLogout.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = 'login.html';
    });
  }

  /* ── Modal publicar alimento ───────────────────────── */
  const modalAlimento     = document.getElementById('modal-alimento');
  const btnAbrirForm      = document.getElementById('btn-abrir-form');
  const btnCerrarAlimento = document.getElementById('modal-alimento-cerrar');

  btnAbrirForm.addEventListener('click', () => modalAlimento.classList.add('visible'));
  btnCerrarAlimento.addEventListener('click', () => modalAlimento.classList.remove('visible'));
  modalAlimento.addEventListener('click', e => {
    if (e.target === modalAlimento) modalAlimento.classList.remove('visible');
  });

  /* ── Crear alimento ────────────────────────────────── */
  document.getElementById('foodForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('btn-publicar');
    btn.textContent = 'Publicando...';
    btn.disabled    = true;

    const fd = new FormData(e.target);
    fd.append('action',     'crear_alimento');
    fd.append('usuario_id', userId);

    try {
      const res  = await fetch(API, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.status === 'ok') {
        e.target.reset();
        modalAlimento.classList.remove('visible');
        cargarAlimentosBarrio();
        cargarMisAlimentos();
      } else {
        alert(data.mensaje || 'Error al crear alimento');
      }
    } catch { alert('Error de conexión'); }

    btn.textContent = 'Publicar alimento 🌿';
    btn.disabled    = false;
  });

  /* ── Modal ticket ──────────────────────────────────── */
  const modalTicket      = document.getElementById('modal-ticket');
  const modalTicketFrame = document.getElementById('modal-ticket-frame');
  const btnCerrarTicket  = document.getElementById('modal-ticket-cerrar');

  btnCerrarTicket.addEventListener('click', () => {
    modalTicket.classList.remove('visible');
    modalTicketFrame.src = '';
  });
  modalTicket.addEventListener('click', e => {
    if (e.target === modalTicket) {
      modalTicket.classList.remove('visible');
      modalTicketFrame.src = '';
    }
  });
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn-ver-ticket');
    if (!btn) return;
    modalTicketFrame.src = btn.dataset.ticket;
    modalTicket.classList.add('visible');
  });

  /* ── Filtros alimentos barrio ──────────────────────── */
  let filtroActivo   = '';
  let todosAlimentos = [];

  document.querySelectorAll('.filtro').forEach(f => {
    f.addEventListener('click', () => {
      document.querySelectorAll('.filtro').forEach(x => x.classList.remove('activo'));
      f.classList.add('activo');
      filtroActivo = f.dataset.cat;
      const filtrados = filtroActivo
        ? todosAlimentos.filter(a => a.categoria === filtroActivo)
        : todosAlimentos;
      pintarAlimentos(document.getElementById('lista-alimentos'), filtrados, true);
    });
  });

  /* ── Cargar alimentos del barrio ───────────────────── */
  async function cargarAlimentosBarrio() {
    try {
      const res  = await fetch(`${API}?action=alimentos_barrio&usuario_id=${userId}`);
      const data = await res.json();
      if (data.status === 'ok') {
        todosAlimentos = data.alimentos;
        pintarAlimentos(document.getElementById('lista-alimentos'), data.alimentos, true);
        // El stat de intercambios se actualiza en cargarIntercambios()
      }
    } catch {
      document.getElementById('lista-alimentos').innerHTML =
        '<div class="vacio"><p>Error al cargar alimentos</p></div>';
    }
  }

  /* ── Cargar mis alimentos ──────────────────────────── */
  async function cargarMisAlimentos() {
    try {
      const res  = await fetch(`${API}?action=mis_alimentos&usuario_id=${userId}`);
      const data = await res.json();
      if (data.status === 'ok') {
        pintarAlimentos(document.getElementById('lista-mis-alimentos'), data.alimentos, false);
        document.getElementById('stat-publicaciones').textContent = data.alimentos.length;
        const co2 = (data.alimentos.length * 0.3 * 2.5).toFixed(1);
        document.getElementById('stat-co2').textContent = co2 + ' kg';
      }
    } catch {}
  }

  /* ── Actualizar puntos sidebar y stat ──────────────── */
  async function actualizarPuntosSidebar() {
    try {
      const res  = await fetch(`${API}?action=mis_puntos&usuario_id=${userId}`);
      const data = await res.json();
      if (data.status === 'ok') {
        const pts = data.puntos ?? 0;
        const elSidebar = document.getElementById('sidebar-puntos');
        const elStat    = document.getElementById('stat-puntos');
        if (elSidebar) elSidebar.textContent = pts + ' pts';
        if (elStat)    elStat.textContent    = pts;
      }
    } catch {}
  }

  /* ── Helpers ───────────────────────────────────────── */
  function emojiCategoria(cat) {
    const mapa = { fruta:'🍎', verdura:'🥦', pan:'🍞', lacteos:'🧀', cereales:'🌾', otros:'📦' };
    return mapa[(cat || '').toLowerCase()] || '🍽️';
  }

  function urlArchivo(ruta) {
    if (!ruta) return null;
    return UPLOADS + ruta;  // /backend/uploads/archivo.jpg
  }

  /* ── Pintar alimentos ──────────────────────────────── */
  function pintarAlimentos(contenedor, alimentos, mostrarSolicitar) {
    if (!alimentos || alimentos.length === 0) {
      contenedor.innerHTML = `
        <div class="vacio">
          <div class="vacio-icon">🌿</div>
          <p>No hay alimentos disponibles</p>
        </div>`;
      return;
    }

    contenedor.innerHTML = '';
    alimentos.forEach(a => {
      const hoy     = new Date();
      const cad     = new Date(a.fecha_caducidad);
      const dias    = Math.ceil((cad - hoy) / 86400000);
      const urgente = dias <= 1;

      const imgUrl    = urlArchivo(a.imagen);
      const ticketUrl = urlArchivo(a.ticket);

      const card = document.createElement('article');
      card.className = 'card-alimento';
      card.innerHTML = `
        ${imgUrl
          ? `<img src="${imgUrl}" alt="${a.nombre}" class="card-alimento-img" onerror="this.style.display='none'">`
          : `<div class="card-alimento-img-placeholder">${emojiCategoria(a.categoria)}</div>`
        }
        <div class="card-alimento-body">
          <div class="card-alimento-header">
            <h3>${emojiCategoria(a.categoria)} ${a.nombre}</h3>
            <span class="badge" style="${urgente ? 'background:#FFF3E0;color:#B06000;' : ''}">${a.categoria}</span>
          </div>
          <div>
            <small>📅 Caduca: <strong>${a.fecha_caducidad}</strong>${urgente ? ' ⚠️' : ''}</small>
          </div>
          <div class="card-alimento-footer">
            <small>👤 ${a.usuario_nombre || 'Vecino/a'}</small>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
              ${ticketUrl ? `<button class="btn-ver-ticket" data-ticket="${ticketUrl}">📄 Ticket</button>` : ''}
              ${mostrarSolicitar && a.usuario_id != userId
                ? `<button class="btn-solicitar" data-alimento-id="${a.id}" data-propietario="${a.usuario_id}">Solicitar</button>`
                : ''}
            </div>
          </div>
        </div>
      `;
      contenedor.appendChild(card);
    });
  }

  /* ── Solicitar alimento ────────────────────────────── */
  document.addEventListener('click', async e => {
    const btn = e.target.closest('.btn-solicitar');
    if (!btn) return;

    btn.disabled    = true;
    btn.textContent = '...';

    const fd = new FormData();
    fd.append('action',      'solicitar_intercambio');
    fd.append('usuario_id',  userId);
    fd.append('alimento_id', btn.dataset.alimentoId);

    try {
      const res  = await fetch(API, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.status === 'ok') {
        btn.textContent      = '✓ Solicitado';
        btn.style.background = '#E8F5E9';
        btn.style.color      = '#2E7D32';
      } else {
        btn.textContent = 'Solicitar';
        btn.disabled    = false;
        alert(data.mensaje || 'Error al solicitar');
      }
    } catch {
      btn.textContent = 'Solicitar';
      btn.disabled    = false;
    }
  });

  /* ── Responder intercambio ─────────────────────────── */
  document.addEventListener('click', async e => {
    const btn = e.target.closest('.btn-responder');
    if (!btn) return;

    btn.disabled = true;

    const fd = new FormData();
    fd.append('action',         'responder_intercambio');
    fd.append('usuario_id',     userId);
    fd.append('intercambio_id', btn.dataset.id);
    fd.append('estado',         btn.dataset.estado);

    try {
      const res  = await fetch(API, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.status === 'ok') {
        cargarIntercambios();
        actualizarPuntosSidebar();  // refrescar puntos si aceptó
      } else {
        alert(data.mensaje || 'Error al responder');
        btn.disabled = false;
      }
    } catch { btn.disabled = false; }
  });

  /* ── Cargar intercambios ───────────────────────────── */
  async function cargarIntercambios() {
    try {
      const [recRes, envRes] = await Promise.all([
        fetch(`${API}?action=intercambios_recibidos&usuario_id=${userId}`),
        fetch(`${API}?action=intercambios_enviados&usuario_id=${userId}`)
      ]);
      const recData = await recRes.json();
      const envData = await envRes.json();

      pintarIntercambios('intercambios-recibidos', recData.intercambios || [], true);
      pintarIntercambios('intercambios-enviados',  envData.intercambios || [], false);
      // Stat correcto: total de intercambios del usuario
      const total = (recData.intercambios || []).length + (envData.intercambios || []).length;
      document.getElementById('stat-intercambios').textContent = total;
    } catch {}
  }

  /* ── Pintar intercambios ───────────────────────────── */
  function pintarIntercambios(contenedorId, intercambios, esRecibidos) {
    const el = document.getElementById(contenedorId);
    if (!intercambios.length) {
      el.innerHTML = '<div class="vacio"><p>Sin intercambios</p></div>';
      return;
    }

    el.innerHTML = '';
    intercambios.forEach(i => {
      const estado = i.estado || 'pendiente';
      const fecha  = i.fecha ? new Date(i.fecha).toLocaleDateString('es-ES') : '';

      const botonesHTML = (esRecibidos && estado === 'pendiente')
        ? `<div class="intercambio-acciones">
             <button class="btn-responder btn-aceptar" data-id="${i.id}" data-estado="aceptado">✅ Aceptar</button>
             <button class="btn-responder btn-rechazar" data-id="${i.id}" data-estado="rechazado">❌ Rechazar</button>
           </div>`
        : '';

      const div = document.createElement('div');
      div.className = 'intercambio-card';
      div.innerHTML = `
        <div class="intercambio-info">
          <div class="intercambio-nombre">🍽️ ${i.alimento_nombre || 'Alimento'}</div>
          <div class="intercambio-meta">👤 ${i.otro_nombre || 'Vecino/a'} · ${fecha}</div>
          ${botonesHTML}
        </div>
        <span class="intercambio-estado estado-${estado}">${estado.charAt(0).toUpperCase() + estado.slice(1)}</span>
      `;
      el.appendChild(div);
    });
  }

  /* ── Mi barrio ─────────────────────────────────────── */
  async function cargarMiBarrio() {
    const seccion = document.getElementById('mi-barrio');
    const bloque  = seccion.querySelector('.card-bloque') || seccion;
    bloque.innerHTML = '<p style="color:var(--texto-suave)">Cargando datos del barrio...</p>';

    try {
      const res  = await fetch(`${API}?action=mi_barrio&usuario_id=${userId}`);
      const data = await res.json();

      if (data.status === 'ok') {
        bloque.innerHTML = `
          <div class="barrio-stats">
            <div class="barrio-nombre">📍 ${data.barrio}</div>
            <div class="barrio-grid">
              <div class="barrio-stat">
                <div class="barrio-stat-valor">${data.total_vecinos}</div>
                <div class="barrio-stat-label">Vecinos</div>
              </div>
              <div class="barrio-stat">
                <div class="barrio-stat-valor">${data.total_alimentos}</div>
                <div class="barrio-stat-label">Alimentos compartidos</div>
              </div>
              <div class="barrio-stat">
                <div class="barrio-stat-valor">${data.total_intercambios}</div>
                <div class="barrio-stat-label">Intercambios completados</div>
              </div>
              <div class="barrio-stat">
                <div class="barrio-stat-valor">${(data.total_intercambios * 0.3 * 2.5).toFixed(1)} kg</div>
                <div class="barrio-stat-label">CO₂ evitado</div>
              </div>
            </div>
          </div>
        `;
      } else {
        bloque.innerHTML = '<p style="color:var(--texto-suave)">No se pudieron cargar los datos del barrio.</p>';
      }
    } catch {
      bloque.innerHTML = '<p style="color:var(--texto-suave)">Error de conexión.</p>';
    }
  }

  /* ── Ranking ───────────────────────────────────────── */
  async function cargarRanking() {
    try {
      const res  = await fetch(`${API}?action=ranking`);
      const data = await res.json();
      const lista = document.getElementById('lista-ranking');

      if (!data.ranking || !data.ranking.length) {
        lista.innerHTML = '<div class="vacio"><div class="vacio-icon">🏆</div><p>Sin datos de ranking aún</p></div>';
        return;
      }

      lista.innerHTML = '';
      data.ranking.forEach((u, i) => {
        const pos    = i + 1;
        const clsPos = pos === 1 ? 'top1' : pos === 2 ? 'top2' : pos === 3 ? 'top3' : '';
        const div    = document.createElement('div');
        div.className = 'ranking-item';
        div.innerHTML = `
          <div class="ranking-pos ${clsPos}">${pos <= 3 ? ['🥇','🥈','🥉'][i] : pos}</div>
          <div class="ranking-avatar">${u.nombre.charAt(0).toUpperCase()}</div>
          <div class="ranking-nombre">${u.nombre}</div>
          <div class="ranking-puntos">⭐ ${u.puntos} pts</div>
        `;
        lista.appendChild(div);
      });

      // Actualizar stat de puntos con el valor real del ranking
      const miPosicion = data.ranking.find(u => u.id == userId);
      if (miPosicion) {
        const elStat = document.getElementById('stat-puntos');
        if (elStat) elStat.textContent = miPosicion.puntos;
      }
    } catch {}
  }

  /* ── Perfil ────────────────────────────────────────── */
  function cargarPerfil() {
    const contenido = document.getElementById('perfil-contenido');
    const pubs = document.getElementById('stat-publicaciones').textContent;
    const pts  = document.getElementById('sidebar-puntos')?.textContent?.replace(' pts','') || '0';

    contenido.innerHTML = `
      <div class="perfil-bloque">
        <div class="perfil-avatar-grande">${userName.charAt(0).toUpperCase()}</div>
        <div class="perfil-nombre">${userName}</div>
        <div class="perfil-email">ID de usuario: ${userId}</div>
        <div class="perfil-dato"><span>Publicaciones</span><span>${pubs}</span></div>
        <div class="perfil-dato"><span>Puntos verdes</span><span>⭐ ${pts}</span></div>
        <div class="perfil-dato"><span>CO₂ evitado</span><span>${document.getElementById('stat-co2').textContent}</span></div>
        <div class="perfil-dato"><span>Miembro desde</span><span>${new Date().getFullYear()}</span></div>
      </div>
    `;
  }

  /* ── Chat global ───────────────────────────────────── */
  const btnChatGlobal       = document.getElementById('btn-chat-global');
  const chatGlobal          = document.getElementById('chat-global');
  const chatGlobalCerrar    = document.getElementById('chat-global-cerrar');
  const chatGlobalHistorial = document.getElementById('chat-global-historial');
  const chatGlobalForm      = document.getElementById('chat-global-form');
  const chatGlobalInput     = document.getElementById('chat-global-input');

  btnChatGlobal.addEventListener('click', () => {
    chatGlobal.classList.toggle('visible');
    if (chatGlobal.classList.contains('visible')) cargarChatGlobal();
  });
  chatGlobalCerrar.addEventListener('click', () => chatGlobal.classList.remove('visible'));

  async function cargarChatGlobal() {
    try {
      const res  = await fetch(`${API}?action=chat_global_listar&limite=50`);
      const data = await res.json();
      if (data.status === 'ok') pintarChat(chatGlobalHistorial, data.mensajes, true);
    } catch {}
  }

  chatGlobalForm.addEventListener('submit', async e => {
    e.preventDefault();
    const texto = chatGlobalInput.value.trim();
    if (!texto) return;
    const fd = new FormData();
    fd.append('action', 'chat_enviar');
    fd.append('de_id',  userId);
    fd.append('para_id', 0);
    fd.append('mensaje', texto);
    await fetch(API, { method: 'POST', body: fd });
    chatGlobalInput.value = '';
    cargarChatGlobal();
  });

  setInterval(() => {
    if (chatGlobal.classList.contains('visible')) cargarChatGlobal();
  }, 8000);

  /* ── Chat privado por intercambio ──────────────────── */
  const listaChats               = document.getElementById('lista-chats-intercambios');
  const chatIntercambioConten    = document.getElementById('chat-intercambio-contenedor');
  const chatIntercambioTitulo    = document.getElementById('chat-intercambio-titulo');
  const chatIntercambioHistorial = document.getElementById('chat-intercambio-historial');
  const chatIntercambioForm      = document.getElementById('chat-intercambio-form');
  const chatIntercambioInput     = document.getElementById('chat-intercambio-input');
  let chatIntercambioOtroId      = null;

  async function cargarIntercambiosAceptados() {
    try {
      const res  = await fetch(`${API}?action=intercambios_aceptados&usuario_id=${userId}`);
      const data = await res.json();
      if (data.status === 'ok') pintarChatsIntercambios(data.intercambios);
    } catch {}
  }

  function pintarChatsIntercambios(intercambios) {
    if (!intercambios || !intercambios.length) {
      listaChats.innerHTML = '<div class="vacio"><p>Sin chats de intercambio activos</p></div>';
      return;
    }

    listaChats.innerHTML = '';
    intercambios.forEach(i => {
      const soySolicitante = (i.usuario_solicitante == userId);
      const otroId         = soySolicitante ? i.usuario_receptor  : i.usuario_solicitante;
      const otroNombre     = soySolicitante ? i.receptor_nombre   : i.solicitante_nombre;

      const card = document.createElement('article');
      card.className = 'card-chat-intercambio';
      card.innerHTML = `
        <div class="card-chat-intercambio-header">
          <div class="card-chat-avatar">${(otroNombre || '?').charAt(0).toUpperCase()}</div>
          <div>
            <strong>${otroNombre || 'Vecino/a'}</strong><br>
            <small style="color:var(--texto-suave);">🍽️ ${i.alimento_nombre || ''} · ${i.estado}</small>
          </div>
        </div>
        <div class="card-chat-intercambio-footer">
          <button class="btn-secundario btn-abrir-chat"
            data-otro-id="${otroId}"
            data-otro-nombre="${otroNombre || 'Vecino/a'}">
            Abrir chat 💬
          </button>
        </div>
      `;
      listaChats.appendChild(card);
    });
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn-abrir-chat');
    if (!btn) return;
    chatIntercambioOtroId = parseInt(btn.dataset.otroId);
    chatIntercambioTitulo.textContent = `💬 Chat con ${btn.dataset.otroNombre}`;
    chatIntercambioConten.classList.add('visible');
    cargarChatIntercambio();
  });

  async function cargarChatIntercambio() {
    if (!chatIntercambioOtroId) return;
    try {
      const res  = await fetch(`${API}?action=chat_listar&usuario_id=${userId}&otro_id=${chatIntercambioOtroId}`);
      const data = await res.json();
      if (data.status === 'ok') pintarChat(chatIntercambioHistorial, data.mensajes, false);
    } catch {}
  }

  chatIntercambioForm.addEventListener('submit', async e => {
    e.preventDefault();
    const texto = chatIntercambioInput.value.trim();
    if (!texto || !chatIntercambioOtroId) return;
    const fd = new FormData();
    fd.append('action',  'chat_enviar');
    fd.append('de_id',   userId);
    fd.append('para_id', chatIntercambioOtroId);
    fd.append('mensaje', texto);
    await fetch(API, { method: 'POST', body: fd });
    chatIntercambioInput.value = '';
    cargarChatIntercambio();
  });

  /* ── Pintar chat ───────────────────────────────────── */
  function pintarChat(contenedor, mensajes, esGlobal) {
    contenedor.innerHTML = '';
    if (!mensajes || !mensajes.length) {
      contenedor.innerHTML =
        '<p style="text-align:center;color:var(--texto-suave);font-size:0.82rem;padding:1rem;">Sin mensajes aún. ¡Di hola!</p>';
      return;
    }
    mensajes.forEach(m => {
      const esMio = (m.de_id == userId);
      const div   = document.createElement('div');
      div.className = 'chat-mensaje ' + (esMio ? 'de' : 'para');
      div.innerHTML = `<span>${esGlobal && !esMio ? '<strong>' + m.de_nombre + '</strong>: ' : ''}${m.mensaje}</span>`;
      contenedor.appendChild(div);
    });
    contenedor.scrollTop = contenedor.scrollHeight;
  }

  /* ── Carga inicial ─────────────────────────────────── */
  cargarAlimentosBarrio();
  cargarMisAlimentos();
}