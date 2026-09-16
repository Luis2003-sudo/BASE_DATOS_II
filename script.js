const $=id=>document.getElementById(id);
const appPage=$('appPage'),trabajoForm=$('trabajoForm'),btnAdmin=$('btnAdmin'),adminLoginPage=$('adminLoginPage'),adminLoginForm=$('adminLoginForm'),adminUsuario=$('adminUsuario'),adminPassword=$('adminPassword'),btnCancelarAdmin=$('btnCancelarAdmin'),adminPage=$('adminPage'),btnVolver=$('btnVolver'),adminForm=$('adminForm'),adminUnidad=$('adminUnidad'),adminSemana=$('adminSemana'),adminTexto=$('adminTexto'),adminContenidoLista=$('adminContenidoLista'),trabajosContainer=$('trabajosContainer'),unidadesContainer=$('unidadesContainer'),totalTrabajos=$('totalTrabajos'),emptyMessage=$('emptyMessage'),buscar=$('buscar'),filtroUnidad=$('filtroUnidad'),filtroSemana=$('filtroSemana'),limpiarFiltros=$('limpiarFiltros'),btnVerTareas=$('btnVerTareas'),btnMiPerfil=$('btnMiPerfil');
const adminCorrecto='admin@campus.com',passwordAdminCorrecto='admin_2003';

const SUPABASE_URL='https://uxaxkbadbuugteinbepc.supabase.co';
const SUPABASE_KEY='sb_publishable_IGQGQSn8uL21h6XiHV3jOQ_Jbe42vZR';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

let trabajos=[];
let textosSemanas=JSON.parse(localStorage.getItem('textosSemanasCampus'))||{};
let sesionAdminActiva=false;

const NOMBRES_UNIDADES={1:'Unidad I: Arquitecturas de Bases de Datos y Configuración del Entorno Corporativo. Capacidad'};
const NOMBRES_SEMANAS={'1_1':'Formulación del Proyecto y Selección de la Arquitectura','1_2':'Despliegue y Configuración de Motores de Datos (DBMS)','1_3':'Modelamiento Físico y Mecanismos de Integración','1_4':'Sustentación y Validación de la Infraestructura de Datos'};
function nombreUnidad(u){return NOMBRES_UNIDADES[u]||`Unidad ${u}`}
function nombreSemana(u,s){return NOMBRES_SEMANAS[`${u}_${s}`]||`Semana ${semanaGlobal(u,s)}`}

if($('archivo'))$('archivo').setAttribute('multiple','multiple');

async function cargarTrabajos(){
  const {data,error}=await sb.from('trabajos').select('*, trabajo_archivos(*)').order('fecha',{ascending:false});
  if(error){console.error('Error al cargar trabajos:',error);return;}
  trabajos=data||[];
  renderizarTodo();
}

function semanaGlobal(u,s){return(Number(u)-1)*4+Number(s)}
function clave(u,s){return`unidad_${u}_semana_${s}`}
function textoSemana(u,s){return textosSemanas[clave(u,s)]||''}
function guardarTextos(){localStorage.setItem('textosSemanasCampus',JSON.stringify(textosSemanas))}
function escapeAttr(str){return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function mostrarApp(){adminLoginPage.classList.add('hidden');adminPage.classList.add('hidden');appPage.classList.remove('hidden');cargarTrabajos()}
btnAdmin.onclick=()=>{appPage.classList.add('hidden');adminLoginPage.classList.remove('hidden')};btnCancelarAdmin.onclick=()=>{adminLoginPage.classList.add('hidden');appPage.classList.remove('hidden')};btnVolver.onclick=()=>{adminPage.classList.add('hidden');appPage.classList.remove('hidden');cargarTrabajos()};btnVerTareas.onclick=()=>document.querySelector('.works-section').scrollIntoView({behavior:'smooth'});btnMiPerfil.onclick=()=>document.querySelector('#perfilSection').scrollIntoView({behavior:'smooth'});
adminLoginForm.addEventListener('submit',e=>{e.preventDefault();if(adminUsuario.value.trim()===adminCorrecto&&adminPassword.value.trim()===passwordAdminCorrecto){sesionAdminActiva=true;adminLoginPage.classList.add('hidden');adminPage.classList.remove('hidden');adminUsuario.value='';adminPassword.value='';renderizarPanelAdmin()}else alert('Usuario o contraseña de admin incorrectos.')});

trabajoForm.addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=trabajoForm.querySelector('button[type="submit"]');
  const textoOriginal=btn.textContent;
  btn.disabled=true;btn.textContent='Guardando...';

  const {data:insertado,error}=await sb.from('trabajos').insert({
    titulo:$('titulo').value,
    curso:$('curso').value,
    categoria:'Proyectos',
    unidad:Number($('unidad').value),
    semana:Number($('semana').value),
    descripcion:$('descripcion').value||'Sin descripción.',
    autor:$('autor').value||'Estudiante'
  }).select();

  if(error){
    btn.disabled=false;btn.textContent=textoOriginal;
    alert('Error al guardar el trabajo: '+error.message);
    return;
  }

  const nuevoTrabajo=insertado[0];
  nuevoTrabajo.trabajo_archivos=[];

  const a=$('archivo');
  if(a.files.length){
    for(const file of a.files){
      const nombreLimpio=file.name.replace(/[^a-zA-Z0-9.\-_]/g,'_');
      const ruta=`${nuevoTrabajo.id}/${Date.now()}_${nombreLimpio}`;
      const {error:errorSubida}=await sb.storage.from('trabajos').upload(ruta,file);
      if(errorSubida){
        alert('Error al subir "'+file.name+'": '+errorSubida.message);
        continue;
      }
      const {data:urlData}=sb.storage.from('trabajos').getPublicUrl(ruta);
      const {data:archivoInsertado,error:errorArchivo}=await sb.from('trabajo_archivos').insert({
        trabajo_id:nuevoTrabajo.id,
        nombre:file.name,
        url:urlData.publicUrl
      }).select();
      if(!errorArchivo&&archivoInsertado&&archivoInsertado.length){
        nuevoTrabajo.trabajo_archivos.push(archivoInsertado[0]);
      }
    }
  }

  btn.disabled=false;btn.textContent=textoOriginal;

  trabajos.unshift(nuevoTrabajo);
  renderizarTodo();

  trabajoForm.reset();
  $('autor').value='JOSE LUIS ESPINAL HUAMAN';
  alert('Trabajo guardado correctamente. Ya es visible para todos.');
});

adminForm.addEventListener('submit',e=>{e.preventDefault();let u=Number(adminUnidad.value),s=Number(adminSemana.value);textosSemanas[clave(u,s)]=adminTexto.value.trim();guardarTextos();renderizarPanelAdmin();renderizarUnidades();alert('Texto guardado correctamente.')});

function filtrados(){let tx=buscar.value.toLowerCase(),u=filtroUnidad.value,s=filtroSemana.value;return trabajos.filter(t=>`${t.titulo} ${t.curso} ${t.descripcion} ${t.autor}`.toLowerCase().includes(tx)&&(u==='Todas'||Number(t.unidad)===Number(u))&&(s==='Todas'||Number(t.semana)===Number(s)))}

function archivosDe(t){
  const lista=Array.isArray(t.trabajo_archivos)?[...t.trabajo_archivos]:[];
  if(t.archivo_url&&!lista.some(f=>f.url===t.archivo_url)){
    lista.unshift({nombre:t.archivo_nombre||'archivo',url:t.archivo_url});
  }
  return lista;
}

function renderizarTrabajos(){
  let arr=filtrados();
  trabajosContainer.innerHTML='';
  if(!arr.length){emptyMessage.classList.remove('hidden');return}
  emptyMessage.classList.add('hidden');
  arr.forEach(t=>{
    let sg=semanaGlobal(t.unidad,t.semana),txt=textoSemana(t.unidad,t.semana);
    let fechaCorta=t.fecha?String(t.fecha).slice(0,10):'';
    let archivos=archivosDe(t);
    let etiquetaArchivo=archivos.length?`🏷️ ${archivos.length} archivo${archivos.length>1?'s':''} adjunto${archivos.length>1?'s':''}`:'🏷️ Sin archivo adjunto';
    let card=document.createElement('article');
    card.className='work-card';
    card.innerHTML=`<div class="work-top"><div class="file-icon">📄</div><span class="category">${t.categoria}</span></div><h3>${t.titulo}</h3><p>📘 ${t.curso}</p><p>📚 ${nombreUnidad(t.unidad)} - ${nombreSemana(t.unidad,t.semana)}</p><p>👤 ${t.autor}</p><p>🗓️ ${fechaCorta}</p>${txt?`<p class="week-content-card">📝 ${txt}</p>`:''}<p class="description">${t.descripcion}</p><div class="file-name">${etiquetaArchivo}</div><div class="work-actions"><button class="btn-light" onclick="verTrabajo(${t.id})">Ver</button><button class="btn-danger" onclick="eliminarTrabajo(${t.id})">Eliminar</button></div>`;
    trabajosContainer.appendChild(card)
  })
}

function renderizarUnidades(){unidadesContainer.innerHTML='';for(let u=1;u<=4;u++){let total=trabajos.filter(t=>Number(t.unidad)===u).length,html='';for(let s=1;s<=4;s++){let cant=trabajos.filter(t=>Number(t.unidad)===u&&Number(t.semana)===s).length,txt=textoSemana(u,s),res=txt?txt.substring(0,45)+(txt.length>45?'...':''):'Sin texto';html+=`<button class="week-btn" onclick="filtrarPorSemana(${u},${s})"><span class="week-title">${nombreSemana(u,s)}</span><strong>${cant}</strong><small>${res}</small></button>`}let div=document.createElement('div');div.className='unit-card';div.innerHTML=`<div class="unit-head"><h3>${nombreUnidad(u)}</h3><span>${total} trabajos</span></div><div class="weeks-grid">${html}</div>`;unidadesContainer.appendChild(div)}}

function renderizarPanelAdmin(){adminContenidoLista.innerHTML='';for(let u=1;u<=4;u++){let html='';for(let s=1;s<=4;s++){html+=`<div class="admin-week-item"><div><strong>${nombreUnidad(u)} - ${nombreSemana(u,s)}</strong><p>${textoSemana(u,s)||'Sin texto agregado todavía.'}</p></div><button class="btn-secondary btn-small" onclick="editarTextoSemana(${u},${s})">Editar</button></div>`}let div=document.createElement('div');div.className='admin-unit-block';div.innerHTML=`<h3>${nombreUnidad(u)}</h3>${html}`;adminContenidoLista.appendChild(div)}}

function editarTextoSemana(u,s){adminUnidad.value=String(u);adminSemana.value=String(s);adminTexto.value=textoSemana(u,s);adminTexto.focus()}

function renderizarTodo(){if(totalTrabajos)totalTrabajos.textContent=trabajos.length;renderizarUnidades();renderizarTrabajos()}

async function eliminarTrabajo(id){
  if(!confirm('¿Seguro que quieres eliminar este trabajo? Esta acción no se puede deshacer.'))return;

  const {data:listado}=await sb.storage.from('trabajos').list(String(id));
  if(listado&&listado.length){
    const rutas=listado.map(f=>`${id}/${f.name}`);
    await sb.storage.from('trabajos').remove(rutas);
  }

  const {error}=await sb.from('trabajos').delete().eq('id',id);
  if(error){alert('Error al eliminar: '+error.message);return;}
  trabajos=trabajos.filter(t=>t.id!==id);
  renderizarTodo();
}

function filtrarPorSemana(u,s){filtroUnidad.value=String(u);filtroSemana.value=String(s);renderizarTrabajos();document.querySelector('.works-section').scrollIntoView({behavior:'smooth'})}

function inyectarEstilosModal(){
  if($('modalTrabajosEstilos'))return;
  const style=document.createElement('style');
  style.id='modalTrabajosEstilos';
  style.textContent=`
    .modal-trabajos-overlay{position:fixed;inset:0;background:rgba(5,8,20,.75);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px}
    .modal-trabajos-caja{background:#12172b;border:1px solid rgba(255,255,255,.1);border-radius:16px;max-width:480px;width:100%;max-height:80vh;overflow-y:auto;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
    .modal-trabajos-caja h3{color:#fff;margin:0 0 4px;font-size:1.3rem}
    .modal-trabajos-caja p.sub{color:#9aa3c7;margin:0 0 18px;font-size:.9rem}
    .modal-trabajos-lista{display:flex;flex-direction:column;gap:10px}
    .modal-trabajo-item{display:flex;align-items:center;justify-content:space-between;gap:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:12px 14px}
    .modal-trabajo-item span{color:#e6e9f7;font-size:.92rem;word-break:break-word}
    .modal-trabajo-item a{flex-shrink:0;background:#3b5bfd;color:#fff;text-decoration:none;padding:7px 14px;border-radius:8px;font-size:.85rem;font-weight:600}
    .modal-trabajos-vacio{color:#9aa3c7;text-align:center;padding:20px 0}
    .modal-trabajos-cerrar{margin-top:20px;width:100%;background:rgba(255,255,255,.08);color:#fff;border:none;padding:10px;border-radius:10px;cursor:pointer;font-weight:600}
    .modal-trabajos-cerrar:hover{background:rgba(255,255,255,.15)}
    .modal-trabajos-divisor{border:none;border-top:1px solid rgba(255,255,255,.1);margin:22px 0 18px}
    .modal-agregar-titulo{color:#fff;font-size:1.05rem;margin:0 0 14px;font-weight:700}
    .modal-campo-label{display:block;color:#e6e9f7;font-weight:600;font-size:.9rem;margin:14px 0 8px}
    .modal-archivo-input{display:block;width:100%;color:#9aa3c7;font-size:.85rem}
    .modal-enlace-fila{display:flex;gap:8px;margin-bottom:10px}
    .modal-enlace-nombre,.modal-enlace-url{flex:1;min-width:0;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 12px;color:#e6e9f7;font-size:.9rem}
    .modal-enlace-nombre::placeholder,.modal-enlace-url::placeholder{color:#6b7394}
    .modal-enlace-quitar{flex-shrink:0;background:rgba(220,53,69,.15);border:1px solid rgba(220,53,69,.3);color:#ff8a95;width:38px;border-radius:8px;cursor:pointer;font-size:.9rem}
    .modal-enlace-quitar:hover{background:rgba(220,53,69,.25)}
    .modal-btn-agregar-enlace{background:rgba(255,255,255,.08);color:#e6e9f7;border:none;padding:9px 16px;border-radius:8px;cursor:pointer;font-size:.85rem;font-weight:600;margin-bottom:20px}
    .modal-btn-agregar-enlace:hover{background:rgba(255,255,255,.15)}
    .modal-btn-guardar{width:100%;background:#3b5bfd;color:#fff;border:none;padding:12px;border-radius:10px;cursor:pointer;font-weight:700;font-size:.95rem;margin-bottom:10px}
    .modal-btn-guardar:hover{background:#2f4be0}
    .modal-btn-guardar:disabled{opacity:.6;cursor:not-allowed}
    .modal-titulo-editable{display:flex;gap:8px;align-items:center;margin-bottom:4px}
    .modal-titulo-input{flex:1;min-width:0;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:8px 12px;color:#fff;font-size:1.15rem;font-weight:700}
    .modal-btn-guardar-titulo{flex-shrink:0;background:#3b5bfd;color:#fff;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-weight:600;font-size:.85rem}
    .modal-btn-guardar-titulo:hover{background:#2f4be0}
    .modal-btn-guardar-titulo:disabled{opacity:.6;cursor:not-allowed}
  `;
  document.head.appendChild(style);
}

function cerrarModalTrabajos(){
  const existente=$('modalTrabajosOverlay');
  if(existente)existente.remove();
}

function agregarFilaEnlaceModal(){
  const cont=$('modalEnlacesContainer');
  if(!cont)return;
  const fila=document.createElement('div');
  fila.className='modal-enlace-fila';
  fila.innerHTML=`<input type="text" placeholder="Nombre del enlace" class="modal-enlace-nombre" />
    <input type="url" placeholder="https://..." class="modal-enlace-url" />
    <button type="button" class="modal-enlace-quitar" onclick="this.parentElement.remove()">✕</button>`;
  cont.appendChild(fila);
}

async function guardarTituloTrabajo(id){
  const input=$('modalTituloInput');
  if(!input)return;
  const nuevoTitulo=input.value.trim();
  if(!nuevoTitulo){alert('El título no puede estar vacío.');return;}

  const btn=document.querySelector('.modal-btn-guardar-titulo');
  const textoOriginal=btn?btn.textContent:'';
  if(btn){btn.disabled=true;btn.textContent='Guardando...';}

  const {error}=await sb.from('trabajos').update({titulo:nuevoTitulo}).eq('id',id);

  if(btn){btn.disabled=false;btn.textContent=textoOriginal;}

  if(error){alert('Error al guardar el título: '+error.message);return;}

  const t=trabajos.find(x=>x.id===id);
  if(t)t.titulo=nuevoTitulo;
  renderizarTrabajos();
  alert('Título actualizado correctamente.');
}

async function guardarMasATrabajo(id){
  const t=trabajos.find(x=>x.id===id);
  if(!t)return;

  const btn=document.querySelector('.modal-btn-guardar');
  const textoOriginal=btn?btn.textContent:'';
  if(btn){btn.disabled=true;btn.textContent='Guardando...';}

  const archivosNuevos=[];

  const inputArchivos=$('modalNuevosArchivos');
  if(inputArchivos&&inputArchivos.files.length){
    for(const file of inputArchivos.files){
      const nombreLimpio=file.name.replace(/[^a-zA-Z0-9.\-_]/g,'_');
      const ruta=`${id}/${Date.now()}_${nombreLimpio}`;
      const {error:errorSubida}=await sb.storage.from('trabajos').upload(ruta,file);
      if(errorSubida){alert('Error al subir "'+file.name+'": '+errorSubida.message);continue;}
      const {data:urlData}=sb.storage.from('trabajos').getPublicUrl(ruta);
      const {data:archivoInsertado,error:errorArchivo}=await sb.from('trabajo_archivos').insert({trabajo_id:id,nombre:file.name,url:urlData.publicUrl}).select();
      if(!errorArchivo&&archivoInsertado&&archivoInsertado.length)archivosNuevos.push(archivoInsertado[0]);
    }
  }

  const filasEnlace=document.querySelectorAll('#modalEnlacesContainer .modal-enlace-fila');
  for(const fila of filasEnlace){
    const nombre=fila.querySelector('.modal-enlace-nombre').value.trim();
    const url=fila.querySelector('.modal-enlace-url').value.trim();
    if(!url)continue;
    const {data:enlaceInsertado,error:errorEnlace}=await sb.from('trabajo_archivos').insert({trabajo_id:id,nombre:nombre||url,url}).select();
    if(!errorEnlace&&enlaceInsertado&&enlaceInsertado.length)archivosNuevos.push(enlaceInsertado[0]);
  }

  if(btn){btn.disabled=false;btn.textContent=textoOriginal;}

  if(!archivosNuevos.length){
    alert('Agrega al menos un archivo o un enlace válido.');
    return;
  }

  t.trabajo_archivos=[...archivosDe(t),...archivosNuevos];
  renderizarTrabajos();
  verTrabajo(id);
  alert('Se agregó correctamente a este trabajo.');
}

function verTrabajo(id){
  const t=trabajos.find(x=>x.id===id);
  if(!t)return;
  inyectarEstilosModal();
  cerrarModalTrabajos();

  const archivos=archivosDe(t);
  const overlay=document.createElement('div');
  overlay.id='modalTrabajosOverlay';
  overlay.className='modal-trabajos-overlay';
  overlay.onclick=(e)=>{if(e.target===overlay)cerrarModalTrabajos()};

  const itemsHtml=archivos.length
    ?archivos.map(f=>`<div class="modal-trabajo-item"><span>📎 ${f.nombre}</span><a href="${f.url}" target="_blank" rel="noopener">Ver</a></div>`).join('')
    :`<div class="modal-trabajos-vacio">Este trabajo no tiene archivos adjuntos todavía.</div>`;

  const tituloHtml=sesionAdminActiva
    ?`<div class="modal-titulo-editable">
        <input type="text" id="modalTituloInput" class="modal-titulo-input" value="${escapeAttr(t.titulo)}" />
        <button type="button" class="modal-btn-guardar-titulo" onclick="guardarTituloTrabajo(${t.id})">Guardar</button>
      </div>`
    :`<h3>${t.titulo}</h3>`;

  const seccionAgregarHtml=sesionAdminActiva
    ?`<hr class="modal-trabajos-divisor" />
      <h4 class="modal-agregar-titulo">Agregar más a este trabajo</h4>

      <label class="modal-campo-label">Archivos</label>
      <input type="file" id="modalNuevosArchivos" multiple class="modal-archivo-input" />

      <label class="modal-campo-label">Enlaces</label>
      <div id="modalEnlacesContainer"></div>
      <button type="button" class="modal-btn-agregar-enlace" onclick="agregarFilaEnlaceModal()">+ Agregar enlace</button>

      <button type="button" class="modal-btn-guardar" onclick="guardarMasATrabajo(${t.id})">Agregar a este trabajo</button>`
    :'';

  overlay.innerHTML=`<div class="modal-trabajos-caja">
    ${tituloHtml}
    <p class="sub">${t.curso} · ${nombreUnidad(t.unidad)} - ${nombreSemana(t.unidad,t.semana)}</p>
    <div class="modal-trabajos-lista">${itemsHtml}</div>

    ${seccionAgregarHtml}
    <button class="modal-trabajos-cerrar" onclick="cerrarModalTrabajos()">Cerrar</button>
  </div>`;

  document.body.appendChild(overlay);
  if(sesionAdminActiva)agregarFilaEnlaceModal();
}

buscar.oninput=renderizarTrabajos;filtroUnidad.onchange=renderizarTrabajos;filtroSemana.onchange=renderizarTrabajos;limpiarFiltros.onclick=()=>{buscar.value='';filtroUnidad.value='Todas';filtroSemana.value='Todas';renderizarTrabajos()};

mostrarApp();
