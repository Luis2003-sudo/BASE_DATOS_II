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
  if(error){console.error('Error al cargar trabajos:',error);renderizarTodo();return;}
  trabajos=data||[];
  renderizarTodo();
}

function semanaGlobal(u,s){return(Number(u)-1)*4+Number(s)}
function clave(u,s){return`unidad_${u}_semana_${s}`}
function textoSemana(u,s){return textosSemanas[clave(u,s)]||''}
function guardarTextos(){localStorage.setItem('textosSemanasCampus',JSON.stringify(textosSemanas))}
function escapeAttr(str){return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function rutaDeUrl(url){
  const i=String(url).indexOf('/trabajos/');
  return i>=0?decodeURIComponent(String(url).slice(i+10)):null;
}
function mostrarApp(){adminLoginPage.classList.add('hidden');adminPage.classList.add('hidden');appPage.classList.remove('hidden');cargarTrabajos()}

btnAdmin.onclick=()=>{appPage.classList.add('hidden');adminLoginPage.classList.remove('hidden')};
btnCancelarAdmin.onclick=()=>{adminLoginPage.classList.add('hidden');appPage.classList.remove('hidden')};
btnVolver.onclick=()=>{adminPage.classList.add('hidden');appPage.classList.remove('hidden');cargarTrabajos()};
btnVerTareas.onclick=()=>document.querySelector('.works-section').scrollIntoView({behavior:'smooth'});
btnMiPerfil.onclick=()=>document.querySelector('#perfilSection').scrollIntoView({behavior:'smooth'});

adminLoginForm.addEventListener('submit',e=>{
  e.preventDefault();
  if(adminUsuario.value.trim()===adminCorrecto&&adminPassword.value.trim()===passwordAdminCorrecto){
    sesionAdminActiva=true;
    adminLoginPage.classList.add('hidden');
    adminPage.classList.remove('hidden');
    adminUsuario.value='';adminPassword.value='';
    renderizarPanelAdmin();
  }else alert('Usuario o contraseña de admin incorrectos.');
});

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

adminForm.addEventListener('submit',e=>{
  e.preventDefault();
  let u=Number(adminUnidad.value),s=Number(adminSemana.value);
  textosSemanas[clave(u,s)]=adminTexto.value.trim();
  guardarTextos();
  renderizarPanelAdmin();
  renderizarUnidades();
  alert('Texto guardado correctamente.');
});

function cargarSemanasFiltro(u){
  filtroSemana.innerHTML='<option value="Todas">Todas</option>';
  const unidades=(u==='Todas')?[1,2,3,4]:[Number(u)];
  unidades.forEach(un=>{
    for(let s=1;s<=4;s++){
      const g=semanaGlobal(un,s);
      const o=document.createElement('option');
      o.value=g;
      o.textContent=`Semana ${g}`;
      filtroSemana.appendChild(o);
    }
  });
}

function filtrados(){
  let tx=buscar.value.toLowerCase(),u=filtroUnidad.value,s=filtroSemana.value;
  return trabajos.filter(t=>
    `${t.titulo} ${t.curso} ${t.descripcion} ${t.autor}`.toLowerCase().includes(tx)&&
    (u==='Todas'||Number(t.unidad)===Number(u))&&
    (s==='Todas'||semanaGlobal(t.unidad,t.semana)===Number(s))
  );
}

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
    let txt=textoSemana(t.unidad,t.semana);
    let fechaCorta=t.fecha?String(t.fecha).slice(0,10):'';
    let archivos=archivosDe(t);
    let etiquetaArchivo=archivos.length?`🏷️ ${archivos.length} archivo${archivos.length>1?'s':''} adjunto${archivos.length>1?'s':''}`:'🏷️ Sin archivo adjunto';
    let botonesHtml=sesionAdminActiva
      ?`<button class="btn-light" onclick="verTrabajo(${t.id})">Ver</button><button class="btn-danger" onclick="eliminarTrabajo(${t.id})">Eliminar</button>`
      :`<button class="btn-light" onclick="verTrabajo(${t.id})">Ver</button>`;
    let card=document.createElement('article');
    card.className='work-card';
    card.innerHTML=`<div class="work-top"><div class="file-icon">📄</div><span class="category">${t.categoria}</span></div><h3>${t.titulo}</h3><p>📘 ${t.curso}</p><p>📚 ${nombreUnidad(t.unidad)} - ${nombreSemana(t.unidad,t.semana)}</p><p>👤 ${t.autor}</p><p>🗓️ ${fechaCorta}</p>${txt?`<p class="week-content-card">📝 ${txt}</p>`:''}<p class="description">${t.descripcion}</p><div class="file-name">${etiquetaArchivo}</div><div class="work-actions">${botonesHtml}</div>`;
    trabajosContainer.appendChild(card);
  });
}

function renderizarUnidades(){
  unidadesContainer.innerHTML='';
  for(let u=1;u<=4;u++){
    const total=trabajos.filter(t=>Number(t.unidad)===u).length;
    let semanas='';
    for(let s=1;s<=4;s++){
      const cant=trabajos.filter(t=>Number(t.unidad)===u&&Number(t.semana)===s).length;
      const txt=textoSemana(u,s);
      semanas+=`<button class="week-btn" data-u="${u}" data-s="${s}"><span class="week-title">${nombreSemana(u,s)}</span><strong>${cant}</strong><small>${txt?txt:'Sin texto'}</small></button>`;
    }
    const card=document.createElement('div');
    card.className='unit-card';
    card.innerHTML=`<div class="unit-head"><h3>${nombreUnidad(u)}</h3><span>${total} trabajo${total===1?'':'s'}</span></div><div class="weeks-grid">${semanas}</div>`;
    unidadesContainer.appendChild(card);
  }
  unidadesContainer.querySelectorAll('.week-btn').forEach(b=>{
    b.onclick=()=>irASemana(b.dataset.u,b.dataset.s);
  });
}

function irASemana(u,s){
  buscar.value='';
  filtroUnidad.value=String(u);
  cargarSemanasFiltro(String(u));
  filtroSemana.value=String(semanaGlobal(u,s));
  renderizarTrabajos();
  document.querySelector('.works-section').scrollIntoView({behavior:'smooth'});
}

function renderizarTodo(){
  renderizarTrabajos();
  renderizarUnidades();
  if(totalTrabajos)totalTrabajos.textContent=trabajos.length;
}

function verTrabajo(id){
  const t=trabajos.find(x=>Number(x.id)===Number(id));
  if(!t)return;
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px';
  const caja=document.createElement('div');
  caja.style.cssText='background:#111827;color:#fff;border-radius:14px;padding:24px;max-width:560px;width:100%;max-height:85vh;overflow:auto';
  ov.appendChild(caja);
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove()});
  const est='width:100%;padding:10px;margin:6px 0 12px;border-radius:8px;border:1px solid #334155;background:#0b1220;color:#fff;font:inherit;box-sizing:border-box';

  function pintar(){
    const admin=sesionAdminActiva;
    const archivos=archivosDe(t);
    const lista=archivos.length
      ?archivos.map(f=>`<li style="margin-bottom:6px"><a href="${escapeAttr(f.url)}" target="_blank" rel="noopener" style="color:#60a5fa">${f.nombre}</a>${admin&&f.id?` <button class="btn-danger" data-del="${f.id}" style="padding:2px 8px">✕</button>`:''}</li>`).join('')
      :'<li>Sin archivos adjuntos</li>';

    caja.innerHTML=admin
      ?`<h2>Editar trabajo</h2>
        <label>Título</label>
        <input id="vTitulo" style="${est}" value="${escapeAttr(t.titulo)}">
        <p>📚 ${nombreUnidad(t.unidad)} - ${nombreSemana(t.unidad,t.semana)}</p>
        <label>Descripción</label>
        <textarea id="vDesc" rows="4" style="${est}">${t.descripcion||''}</textarea>
        <h4>Archivos</h4><ul>${lista}</ul>
        <label>Agregar archivos</label>
        <input id="vArchivos" type="file" multiple style="${est}">
        <div style="display:flex;gap:10px;margin-top:10px">
          <button class="btn-primary" id="vGuardar">Guardar cambios</button>
          <button class="btn-light" id="vCerrar">Cerrar</button>
        </div>`
      :`<h2>${t.titulo}</h2>
        <p>📘 ${t.curso}</p>
        <p>📚 ${nombreUnidad(t.unidad)} - ${nombreSemana(t.unidad,t.semana)}</p>
        <p>👤 ${t.autor}</p>
        <p>${t.descripcion}</p>
        <h4>Archivos</h4><ul>${lista}</ul>
        <button class="btn-light" id="vCerrar">Cerrar</button>`;

    caja.querySelector('#vCerrar').onclick=()=>ov.remove();
    if(!admin)return;

    caja.querySelectorAll('[data-del]').forEach(b=>{
      b.onclick=async()=>{
        if(!confirm('¿Quitar este archivo?'))return;
        const fid=b.dataset.del;
        const f=t.trabajo_archivos.find(x=>String(x.id)===String(fid));
        if(f){const r=rutaDeUrl(f.url);if(r)await sb.storage.from('trabajos').remove([r]);}
        const {error}=await sb.from('trabajo_archivos').delete().eq('id',fid);
        if(error){alert('Error: '+error.message);return;}
        t.trabajo_archivos=t.trabajo_archivos.filter(x=>String(x.id)!==String(fid));
        pintar();renderizarTodo();
      };
    });

    caja.querySelector('#vGuardar').onclick=async()=>{
      const btn=caja.querySelector('#vGuardar');
      btn.disabled=true;btn.textContent='Guardando...';
      const titulo=caja.querySelector('#vTitulo').value.trim()||t.titulo;
      const descripcion=caja.querySelector('#vDesc').value.trim()||'Sin descripción.';
      const {error}=await sb.from('trabajos').update({titulo,descripcion}).eq('id',t.id);
      if(error){alert('Error al guardar: '+error.message);btn.disabled=false;btn.textContent='Guardar cambios';return;}
      t.titulo=titulo;t.descripcion=descripcion;

      const files=caja.querySelector('#vArchivos').files;
      for(const file of files){
        const limpio=file.name.replace(/[^a-zA-Z0-9.\-_]/g,'_');
        const ruta=`${t.id}/${Date.now()}_${limpio}`;
        const {error:eSub}=await sb.storage.from('trabajos').upload(ruta,file);
        if(eSub){alert('Error al subir "'+file.name+'": '+eSub.message);continue;}
        const {data:u}=sb.storage.from('trabajos').getPublicUrl(ruta);
        const {data:ins,error:eIns}=await sb.from('trabajo_archivos').insert({trabajo_id:t.id,nombre:file.name,url:u.publicUrl}).select();
        if(!eIns&&ins&&ins.length){
          if(!Array.isArray(t.trabajo_archivos))t.trabajo_archivos=[];
          t.trabajo_archivos.push(ins[0]);
        }
      }
      pintar();renderizarTodo();
      alert('Cambios guardados.');
    };
  }

  pintar();
  document.body.appendChild(ov);
}

async function eliminarTrabajo(id){
  if(!sesionAdminActiva)return;
  if(!confirm('¿Eliminar este trabajo y sus archivos?'))return;
  const t=trabajos.find(x=>Number(x.id)===Number(id));
  if(t){
    const rutas=archivosDe(t).map(f=>rutaDeUrl(f.url)).filter(Boolean);
    if(rutas.length)await sb.storage.from('trabajos').remove(rutas);
  }
  await sb.from('trabajo_archivos').delete().eq('trabajo_id',id);
  const {error}=await sb.from('trabajos').delete().eq('id',id);
  if(error){alert('Error al eliminar: '+error.message);return;}
  trabajos=trabajos.filter(x=>Number(x.id)!==Number(id));
  renderizarTodo();
}

function renderizarPanelAdmin(){
  adminContenidoLista.innerHTML='';
  const claves=Object.keys(textosSemanas).filter(k=>textosSemanas[k]);
  if(!claves.length){adminContenidoLista.innerHTML='<p>No hay textos guardados.</p>';return}
  claves.forEach(k=>{
    const m=k.match(/unidad_(\d+)_semana_(\d+)/);
    if(!m)return;
    const u=Number(m[1]),s=Number(m[2]);
    const div=document.createElement('div');
    div.className='admin-item';
    div.innerHTML=`<strong>${nombreUnidad(u)} - Semana ${semanaGlobal(u,s)}</strong><p>${textosSemanas[k]}</p><button class="btn-light" data-k="${k}" data-a="editar">Editar</button> <button class="btn-danger" data-k="${k}" data-a="borrar">Borrar</button>`;
    adminContenidoLista.appendChild(div);
  });
  adminContenidoLista.querySelectorAll('button').forEach(b=>{
    b.onclick=()=>{
      const k=b.dataset.k,m=k.match(/unidad_(\d+)_semana_(\d+)/);
      if(b.dataset.a==='borrar'){
        delete textosSemanas[k];
        guardarTextos();
        renderizarPanelAdmin();
        renderizarUnidades();
        renderizarTrabajos();
      }else{
        adminUnidad.value=m[1];
        adminSemana.value=m[2];
        adminTexto.value=textosSemanas[k];
        adminTexto.focus();
      }
    };
  });
}

filtroUnidad.addEventListener('change',()=>{cargarSemanasFiltro(filtroUnidad.value);renderizarTrabajos()});
filtroSemana.addEventListener('change',renderizarTrabajos);
buscar.addEventListener('input',renderizarTrabajos);
limpiarFiltros.addEventListener('click',()=>{
  buscar.value='';
  filtroUnidad.value='Todas';
  cargarSemanasFiltro('Todas');
  filtroSemana.value='Todas';
  renderizarTrabajos();
});

cargarSemanasFiltro('Todas');
mostrarApp();
