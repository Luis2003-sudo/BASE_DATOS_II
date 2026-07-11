const $=id=>document.getElementById(id);
const loginPage=$('loginPage'),appPage=$('appPage'),loginForm=$('loginForm'),btnSalir=$('btnSalir'),trabajoForm=$('trabajoForm'),btnAdmin=$('btnAdmin'),adminLoginPage=$('adminLoginPage'),adminLoginForm=$('adminLoginForm'),adminUsuario=$('adminUsuario'),adminPassword=$('adminPassword'),btnCancelarAdmin=$('btnCancelarAdmin'),adminPage=$('adminPage'),btnVolver=$('btnVolver'),adminForm=$('adminForm'),adminUnidad=$('adminUnidad'),adminSemana=$('adminSemana'),adminTexto=$('adminTexto'),adminContenidoLista=$('adminContenidoLista'),trabajosContainer=$('trabajosContainer'),unidadesContainer=$('unidadesContainer'),totalTrabajos=$('totalTrabajos'),emptyMessage=$('emptyMessage'),buscar=$('buscar'),filtroCategoria=$('filtroCategoria'),filtroUnidad=$('filtroUnidad'),filtroSemana=$('filtroSemana'),limpiarFiltros=$('limpiarFiltros'),btnVerTareas=$('btnVerTareas'),btnMiPerfil=$('btnMiPerfil');
const usuarioCorrecto='P01898G@upla.edu.pe',passwordCorrecto='joseespinal_2003',adminCorrecto='admin@campus.com',passwordAdminCorrecto='admin_2003';

const SUPABASE_URL='https://uxaxkbadbuugteinbepc.supabase.co';
const SUPABASE_KEY='sb_publishable_IGQGQSn8uL21h6XiHV3jOQ_Jbe42vZR';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

let trabajos=[];
let textosSemanas=JSON.parse(localStorage.getItem('textosSemanasCampus'))||{};

async function cargarTrabajos(){
  const {data,error}=await sb.from('trabajos').select('*').order('fecha',{ascending:false});
  if(error){console.error('Error al cargar trabajos:',error);return;}
  trabajos=data||[];
  renderizarTodo();
}

function semanaGlobal(u,s){return(Number(u)-1)*4+Number(s)}
function clave(u,s){return`unidad_${u}_semana_${s}`}
function textoSemana(u,s){return textosSemanas[clave(u,s)]||''}
function guardarTextos(){localStorage.setItem('textosSemanasCampus',JSON.stringify(textosSemanas))}
function mostrarApp(){loginPage.classList.add('hidden');adminLoginPage.classList.add('hidden');adminPage.classList.add('hidden');appPage.classList.remove('hidden');cargarTrabajos()}
function mostrarLogin(){appPage.classList.add('hidden');adminLoginPage.classList.add('hidden');adminPage.classList.add('hidden');loginPage.classList.remove('hidden')}
loginForm.addEventListener('submit',e=>{e.preventDefault();let c=$('correo').value.trim(),p=$('password').value.trim();if(c===usuarioCorrecto&&p===passwordCorrecto){localStorage.setItem('usuarioCampusHTML',c);mostrarApp()}else alert('Correo o contraseña incorrectos. Inténtalo nuevamente.')});
btnSalir.onclick=()=>{localStorage.removeItem('usuarioCampusHTML');mostrarLogin()};btnAdmin.onclick=()=>{appPage.classList.add('hidden');adminLoginPage.classList.remove('hidden')};btnCancelarAdmin.onclick=()=>{adminLoginPage.classList.add('hidden');appPage.classList.remove('hidden')};btnVolver.onclick=()=>{adminPage.classList.add('hidden');appPage.classList.remove('hidden');cargarTrabajos()};btnVerTareas.onclick=()=>document.querySelector('.works-section').scrollIntoView({behavior:'smooth'});btnMiPerfil.onclick=()=>document.querySelector('#perfilSection').scrollIntoView({behavior:'smooth'});
adminLoginForm.addEventListener('submit',e=>{e.preventDefault();if(adminUsuario.value.trim()===adminCorrecto&&adminPassword.value.trim()===passwordAdminCorrecto){adminLoginPage.classList.add('hidden');adminPage.classList.remove('hidden');adminUsuario.value='';adminPassword.value='';renderizarPanelAdmin()}else alert('Usuario o contraseña de admin incorrectos.')});

trabajoForm.addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=trabajoForm.querySelector('button[type="submit"]');
  const textoOriginal=btn.textContent;
  btn.disabled=true;btn.textContent='Guardando...';

  let archivo_nombre=null,archivo_url=null;
  const a=$('archivo');
  if(a.files.length){
    const file=a.files[0];
    const nombreLimpio=file.name.replace(/[^a-zA-Z0-9.\-_]/g,'_');
    const ruta=`${Date.now()}_${nombreLimpio}`;
    const {error:errorSubida}=await sb.storage.from('trabajos').upload(ruta,file);
    if(errorSubida){
      alert('Error al subir el archivo: '+errorSubida.message);
      btn.disabled=false;btn.textContent=textoOriginal;
      return;
    }
    const {data:urlData}=sb.storage.from('trabajos').getPublicUrl(ruta);
    archivo_nombre=file.name;
    archivo_url=urlData.publicUrl;
  }

  const {data:insertado,error}=await sb.from('trabajos').insert({
    titulo:$('titulo').value,
    curso:$('curso').value,
    categoria:$('categoria').value,
    unidad:Number($('unidad').value),
    semana:Number($('semana').value),
    descripcion:$('descripcion').value||'Sin descripción.',
    autor:$('autor').value||'Estudiante',
    archivo_nombre,
    archivo_url
  }).select();

  btn.disabled=false;btn.textContent=textoOriginal;

  if(error){alert('Error al guardar el trabajo: '+error.message);return;}

  if(insertado&&insertado.length){
    trabajos.unshift(insertado[0]);
    renderizarTodo();
  }

  trabajoForm.reset();
  $('autor').value='JOSE LUIS ESPINAL HUAMAN';
  alert('Trabajo guardado correctamente. Ya es visible para todos.');
});

adminForm.addEventListener('submit',e=>{e.preventDefault();let u=Number(adminUnidad.value),s=Number(adminSemana.value);textosSemanas[clave(u,s)]=adminTexto.value.trim();guardarTextos();renderizarPanelAdmin();renderizarUnidades();alert('Texto guardado correctamente.')});

function filtrados(){let tx=buscar.value.toLowerCase(),cat=filtroCategoria.value,u=filtroUnidad.value,s=filtroSemana.value;return trabajos.filter(t=>`${t.titulo} ${t.curso} ${t.descripcion} ${t.autor}`.toLowerCase().includes(tx)&&(cat==='Todos'||t.categoria===cat)&&(u==='Todas'||Number(t.unidad)===Number(u))&&(s==='Todas'||Number(t.semana)===Number(s)))}

function renderizarTrabajos(){
  let arr=filtrados();
  trabajosContainer.innerHTML='';
  if(!arr.length){emptyMessage.classList.remove('hidden');return}
  emptyMessage.classList.add('hidden');
  arr.forEach(t=>{
    let sg=semanaGlobal(t.unidad,t.semana),txt=textoSemana(t.unidad,t.semana);
    let fechaCorta=t.fecha?String(t.fecha).slice(0,10):'';
    let card=document.createElement('article');
    card.className='work-card';
    card.innerHTML=`<div class="work-top"><div class="file-icon">📄</div><span class="category">${t.categoria}</span></div><h3>${t.titulo}</h3><p>📘 ${t.curso}</p><p>📚 Unidad ${t.unidad} - Semana ${sg}</p><p>👤 ${t.autor}</p><p>🗓️ ${fechaCorta}</p>${txt?`<p class="week-content-card">📝 ${txt}</p>`:''}<p class="description">${t.descripcion}</p><div class="file-name">🏷️ ${t.archivo_nombre||'Sin archivo adjunto'}</div><div class="work-actions"><button class="btn-light" onclick="verTrabajo(${t.id})">Ver</button><button class="btn-danger" onclick="eliminarTrabajo(${t.id})">Eliminar</button></div>`;
    trabajosContainer.appendChild(card)
  })
}

function renderizarUnidades(){unidadesContainer.innerHTML='';for(let u=1;u<=4;u++){let total=trabajos.filter(t=>Number(t.unidad)===u).length,html='';for(let s=1;s<=4;s++){let sg=semanaGlobal(u,s),cant=trabajos.filter(t=>Number(t.unidad)===u&&Number(t.semana)===s).length,txt=textoSemana(u,s),res=txt?txt.substring(0,45)+(txt.length>45?'...':''):'Sin texto';html+=`<button class="week-btn" onclick="filtrarPorSemana(${u},${s})"><span class="week-title">Semana ${sg}</span><strong>${cant}</strong><small>${res}</small></button>`}let div=document.createElement('div');div.className='unit-card';div.innerHTML=`<div class="unit-head"><h3>Unidad ${u}</h3><span>${total} trabajos</span></div><div class="weeks-grid">${html}</div>`;unidadesContainer.appendChild(div)}}

function renderizarPanelAdmin(){adminContenidoLista.innerHTML='';for(let u=1;u<=4;u++){let html='';for(let s=1;s<=4;s++){html+=`<div class="admin-week-item"><div><strong>Unidad ${u} - Semana ${semanaGlobal(u,s)}</strong><p>${textoSemana(u,s)||'Sin texto agregado todavía.'}</p></div><button class="btn-secondary btn-small" onclick="editarTextoSemana(${u},${s})">Editar</button></div>`}let div=document.createElement('div');div.className='admin-unit-block';div.innerHTML=`<h3>Unidad ${u}</h3>${html}`;adminContenidoLista.appendChild(div)}}

function editarTextoSemana(u,s){adminUnidad.value=String(u);adminSemana.value=String(s);adminTexto.value=textoSemana(u,s);adminTexto.focus()}

function renderizarTodo(){totalTrabajos.textContent=trabajos.length;renderizarUnidades();renderizarTrabajos()}

async function eliminarTrabajo(id){
  if(!confirm('¿Seguro que quieres eliminar este trabajo? Esta acción no se puede deshacer.'))return;
  const {error}=await sb.from('trabajos').delete().eq('id',id);
  if(error){alert('Error al eliminar: '+error.message);return;}
  trabajos=trabajos.filter(t=>t.id!==id);
  renderizarTodo();
}

function filtrarPorSemana(u,s){filtroUnidad.value=String(u);filtroSemana.value=String(s);renderizarTrabajos();document.querySelector('.works-section').scrollIntoView({behavior:'smooth'})}

function verTrabajo(id){
  const t=trabajos.find(x=>x.id===id);
  if(!t||!t.archivo_url){alert('Este trabajo no tiene un archivo adjunto.');return}
  window.open(t.archivo_url,'_blank')
}

buscar.oninput=renderizarTrabajos;filtroCategoria.onchange=renderizarTrabajos;filtroUnidad.onchange=renderizarTrabajos;filtroSemana.onchange=renderizarTrabajos;limpiarFiltros.onclick=()=>{buscar.value='';filtroCategoria.value='Todos';filtroUnidad.value='Todas';filtroSemana.value='Todas';renderizarTrabajos()};

mostrarApp();
