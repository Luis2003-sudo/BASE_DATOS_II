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

/* ===== NUEVO: llena el selector de semanas según la unidad (solo "Semana N") ===== */
function cargarSemanasFiltro(u){
  filtroSemana.innerHTML='<option>Todas</option>';
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

/* ===== CAMBIADO: ahora compara con la semana global (1 a 16) ===== */
function filtrados(){let tx=buscar.value.toLowerCase(),u=filtroUnidad.value,s=filtroSemana.value;return trabajos.filter(t=>`${t.titulo} ${t.curso} ${t.descripcion} ${t.autor}`.toLowerCase().includes(tx)&&(u==='Todas'||Number(t.unidad)===Number(u))&&(s==='Todas'||semanaGlobal(t.unidad,t.semana)===Number(s)))}

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
    let botonesHtml=sesionAdminActiva?`<button class="btn-light" onclick="verTrabajo(${t.id})">Ver</button><button class="btn-danger" onclick="eliminarTrabajo(${t.id})">Eliminar</button>`:`<button class="btn-light" onclick="verTrabajo(${t.id})">Ver</button>`;
    let card=document.createElement('article');
    card.className='work-card';
    card.innerHTML=`<div class="work-top"><div class="file-icon">📄</div><span class="category">${t.categoria}</span></div><h3>${t.titulo}</h3><p>📘 ${t.curso}</p><p>📚 ${nombreUnidad(t.unidad)} - ${nombreSemana(t.unidad,t.semana)}</p><p>👤 ${t.autor}</p><p>🗓️ ${fechaCorta}</p>${txt?`<p class="week-content-card">📝 ${txt}</p>`:''}<p class="description">${t.descripcion}</p><div class="file-name">${etiquetaArchivo}</div><div class="work-actions">${botonesHtml}</div>`;
    trabajosContainer.appendChild(card)
  })
}

function renderizarUnidades(){unidadesContainer.innerHTML='';for(let u=1;u<=4;u++){let total=trabajos.filter(t=>Number(t.unidad)===u).length,html='';for(let s=1;s<=4;s++){let
