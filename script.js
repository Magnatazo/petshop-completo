// ─── STATE ───────────────────────────────────────────────────────────────────
let clientes     = JSON.parse(localStorage.getItem('mp3_cli')  || '[]');
let pets         = JSON.parse(localStorage.getItem('mp3_pet')  || '[]');
let agendamentos = JSON.parse(localStorage.getItem('mp3_agend')|| '[]');
let pendingId    = null;

// ─── PERSISTÊNCIA ────────────────────────────────────────────────────────────
function save() {
  localStorage.setItem('mp3_cli',   JSON.stringify(clientes));
  localStorage.setItem('mp3_pet',   JSON.stringify(pets));
  localStorage.setItem('mp3_agend', JSON.stringify(agendamentos));
}

// ─── NAVEGAÇÃO POR ABAS ──────────────────────────────────────────────────────
function goTab(name, btn) {
  document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  document.getElementById('tab-' + name).classList.add('active');
  btn.classList.add('active');

  if (name === 'agendamento')  { fillAgendSelects(); renderAgendados(); }
  if (name === 'pets')         { fillTutorSelect();  renderTabPets(); }
  if (name === 'cancelamento') { renderTabCancelamento(); }
  if (name === 'clientes')     { renderTabClientes(); }
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function toast(msg, type = 'ok') {
  const el = document.createElement('div');
  el.className = 'toast t-' + type;
  el.textContent = msg;
  document.getElementById('toastWrap').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ─── MÁSCARA DE TELEFONE ─────────────────────────────────────────────────────
function maskPhone(el) {
  let v = el.value.replace(/\D/g, '').slice(0, 11);
  if      (v.length > 10) v = v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  else if (v.length > 6)  v = v.replace(/(\d{2})(\d{4})(\d+)/,   '($1) $2-$3');
  else if (v.length > 2)  v = v.replace(/(\d{2})(\d+)/,           '($1) $2');
  el.value = v;
}

// ─── VALIDAÇÃO ───────────────────────────────────────────────────────────────
function req(id) {
  const el = document.getElementById(id);
  return el && el.value.trim() !== '';
}

// ─── ESTATÍSTICAS ────────────────────────────────────────────────────────────
function updateStats() {
  document.getElementById('s-cli').textContent   = clientes.length;
  document.getElementById('s-pet').textContent   = pets.length;
  document.getElementById('s-agend').textContent = agendamentos.filter(a => a.status === 'Agendado').length;
  document.getElementById('s-canc').textContent  = agendamentos.filter(a => a.status === 'Cancelado').length;
}

// ─── PREENCHER SELECTS ───────────────────────────────────────────────────────
function fillTutorSelect() {
  const s = document.getElementById('p-tutor');
  const v = s.value;
  s.innerHTML = '<option value="">Selecione o tutor</option>' +
    clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
  s.value = v;
}

function fillAgendSelects() {
  const sc = document.getElementById('a-cli');
  const vc = sc.value;
  sc.innerHTML = '<option value="">Selecione o cliente</option>' +
    clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
  sc.value = vc;
  filtrarPets();
}

function filtrarPets() {
  const cid = parseInt(document.getElementById('a-cli').value);
  const sp  = document.getElementById('a-pet');
  const vp  = sp.value;
  const f   = cid ? pets.filter(p => p.tutorId === cid) : pets;
  sp.innerHTML = '<option value="">Selecione o pet</option>' +
    f.map(p => `<option value="${p.id}">${p.nome} (${p.especie || '?'})</option>`).join('');
  sp.value = vp;
}

// ─── CLIENTES ────────────────────────────────────────────────────────────────
function salvarCliente() {
  if (!req('c-nome') || !req('c-tel') || !req('c-email')) {
    toast('Preencha nome, telefone e email!', 'err');
    return;
  }

  clientes.unshift({
    id:    Date.now(),
    nome:  document.getElementById('c-nome').value.trim(),
    email: document.getElementById('c-email').value.trim(),
    tel:   document.getElementById('c-tel').value.trim(),
    end:   document.getElementById('c-end').value.trim(),
  });

  save();
  updateStats();
  renderTabClientes();
  toast('✓ Cliente cadastrado com sucesso!');
  ['c-nome', 'c-email', 'c-tel', 'c-end'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

function deleteCliente(id) {
  if (!confirm('Remover este cliente? Seus pets e agendamentos também serão removidos.')) return;
  clientes     = clientes.filter(c => c.id !== id);
  pets         = pets.filter(p => p.tutorId !== id);
  agendamentos = agendamentos.filter(a => a.cliId !== id);
  save();
  updateStats();
  renderTabClientes();
  toast('Cliente removido.', 'err');
}

function renderTabClientes() {
  const q = (document.getElementById('s-cli-q')?.value || '').toLowerCase();
  const f = clientes.filter(c =>
    c.nome.toLowerCase().includes(q) ||
    c.email.toLowerCase().includes(q) ||
    c.tel.includes(q)
  );

  document.getElementById('cli-sub').textContent = `${clientes.length} cliente(s) cadastrado(s)`;

  const tb = document.getElementById('tb-cli');
  if (!f.length) {
    tb.innerHTML = '<tr><td class="empty-td" colspan="4">Nenhum cliente encontrado.</td></tr>';
    return;
  }

  tb.innerHTML = f.map(c => `
    <tr>
      <td><strong>${c.nome}</strong></td>
      <td>${c.tel}</td>
      <td>${c.email}</td>
      <td><button class="btn-del" onclick="deleteCliente(${c.id})">🗑 Remover</button></td>
    </tr>
  `).join('');
}

// ─── PETS ────────────────────────────────────────────────────────────────────
function salvarPet() {
  if (!req('p-nome') || !req('p-esp') || !req('p-tutor')) {
    toast('Preencha nome, espécie e tutor!', 'err');
    return;
  }

  const tid   = parseInt(document.getElementById('p-tutor').value);
  const tutor = clientes.find(c => c.id === tid);
  const sexo  = document.querySelector('input[name="p-sexo"]:checked')?.value || '—';

  pets.unshift({
    id:        Date.now(),
    nome:      document.getElementById('p-nome').value.trim(),
    especie:   document.getElementById('p-esp').value,
    raca:      document.getElementById('p-raca').value.trim(),
    idade:     document.getElementById('p-idade').value.trim(),
    sexo,
    tutorId:   tid,
    tutorNome: tutor?.nome || '',
  });

  save();
  updateStats();
  renderTabPets();
  toast('✓ Pet cadastrado com sucesso!');
  ['p-nome', 'p-raca', 'p-idade'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('p-esp').value   = '';
  document.getElementById('p-tutor').value = '';
  document.querySelectorAll('input[name="p-sexo"]').forEach(r => r.checked = false);
}

function deletePet(id) {
  if (!confirm('Remover este pet?')) return;
  pets         = pets.filter(p => p.id !== id);
  agendamentos = agendamentos.filter(a => a.petId !== id);
  save();
  updateStats();
  renderTabPets();
  toast('Pet removido.', 'err');
}

function renderTabPets() {
  const q = (document.getElementById('s-pet-q')?.value || '').toLowerCase();
  const f = pets.filter(p =>
    p.nome.toLowerCase().includes(q) ||
    (p.raca || '').toLowerCase().includes(q) ||
    (p.tutorNome || '').toLowerCase().includes(q)
  );

  document.getElementById('pet-sub').textContent = `${pets.length} pet(s) cadastrado(s)`;

  const tb = document.getElementById('tb-pet');
  if (!f.length) {
    tb.innerHTML = '<tr><td class="empty-td" colspan="5">Nenhum pet encontrado.</td></tr>';
    return;
  }

  tb.innerHTML = f.map(p => `
    <tr>
      <td><strong>${p.nome}</strong></td>
      <td>${p.especie || '—'} ${p.raca ? '/ ' + p.raca : ''}</td>
      <td>${p.tutorNome || '—'}</td>
      <td>${p.sexo || '—'}</td>
      <td><button class="btn-del" onclick="deletePet(${p.id})">🗑 Remover</button></td>
    </tr>
  `).join('');
}

// ─── AGENDAMENTOS ────────────────────────────────────────────────────────────
const EMOJI = {
  'Cachorro': '🐶',
  'Gato':     '🐱',
  'Coelho':   '🐰',
  'Ave':      '🐦',
  'Peixe':    '🐠',
  'Réptil':   '🦎',
  'Outro':    '🐾',
  '':         '🐾',
};

function salvarAgendamento() {
  const cid     = document.getElementById('a-cli').value;
  const pid     = document.getElementById('a-pet').value;
  const data    = document.getElementById('a-data').value;
  const banho   = document.getElementById('svc-banho').checked;
  const tosa    = document.getElementById('svc-tosa').checked;
  const consulta= document.getElementById('svc-consulta').checked;
  const vacina  = document.getElementById('svc-vacina').checked;
  const svcs    = [banho && 'Banho', tosa && 'Tosa', consulta && 'Consulta', vacina && 'Vacinação'].filter(Boolean);

  if (!cid || !pid || !data || !svcs.length) {
    toast('Preencha cliente, pet, data e pelo menos um serviço!', 'err');
    return;
  }

  const cli  = clientes.find(c => c.id === parseInt(cid));
  const pet  = pets.find(p => p.id === parseInt(pid));
  const hora = document.getElementById('a-hora').value;
  const dFmt = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR');

  agendamentos.unshift({
    id:       Date.now(),
    cliId:    parseInt(cid),
    cliNome:  cli?.nome || '',
    petId:    parseInt(pid),
    petNome:  pet?.nome || '',
    petEsp:   pet?.especie || '',
    servicos: svcs.join(' + '),
    data,
    dataFmt:  dFmt,
    hora:     hora || '',
    obs:      document.getElementById('a-obs').value.trim(),
    status:   'Agendado',
  });

  save();
  updateStats();
  renderAgendados();
  toast('✓ Agendamento realizado!');

  document.getElementById('a-cli').value  = '';
  document.getElementById('a-pet').value  = '';
  document.getElementById('a-data').value = '';
  document.getElementById('a-hora').value = '';
  document.getElementById('a-obs').value  = '';
  ['svc-banho', 'svc-tosa', 'svc-consulta', 'svc-vacina'].forEach(id => {
    document.getElementById(id).checked = false;
  });
}

function renderAgendados() {
  const ativos = agendamentos.filter(a => a.status === 'Agendado');
  document.getElementById('agend-sub').textContent = `${ativos.length} agendamento(s) ativo(s)`;

  const list = document.getElementById('agend-list');
  if (!ativos.length) {
    list.innerHTML = '<div class="agend-empty">Nenhum agendamento ativo.</div>';
    return;
  }

  list.innerHTML = ativos.map(a => `
    <div class="agend-item">
      <span class="agend-emoji">${EMOJI[a.petEsp] || '🐾'}</span>
      <span class="agend-text">
        <strong>${a.petNome}</strong> — ${a.servicos}<br>
        ${a.dataFmt}${a.hora ? ' - ' + a.hora : ''} · 👤 ${a.cliNome}
      </span>
      <button class="btn-cancel-item" onclick="pedirCancelamento(${a.id})" title="Cancelar">✕</button>
    </div>
  `).join('');
}

// ─── CANCELAMENTO ────────────────────────────────────────────────────────────
function pedirCancelamento(id) {
  const a = agendamentos.find(x => x.id === id);
  pendingId = id;

  document.getElementById('conf-txt').textContent =
    `Cancelar "${a?.servicos}" para ${a?.petNome} (${a?.dataFmt})?`;

  document.getElementById('overlay').classList.add('open');

  document.getElementById('conf-yes').onclick = () => {
    const ag = agendamentos.find(x => x.id === pendingId);
    if (ag) {
      ag.status = 'Cancelado';
      save();
      updateStats();
      renderAgendados();
      renderTabCancelamento();
    }
    fecharModal();
    toast('Agendamento cancelado.', 'err');
  };
}

function fecharModal() {
  document.getElementById('overlay').classList.remove('open');
  pendingId = null;
}

function renderTabCancelamento() {
  const q = (document.getElementById('s-canc-q')?.value || '').toLowerCase();

  // Agendamentos ativos
  const ativos = agendamentos.filter(a =>
    a.status === 'Agendado' &&
    (
      a.petNome.toLowerCase().includes(q) ||
      a.cliNome.toLowerCase().includes(q) ||
      a.servicos.toLowerCase().includes(q)
    )
  );

  const tbA = document.getElementById('tb-ativos');
  if (!ativos.length) {
    tbA.innerHTML = '<tr><td class="empty-td" colspan="5">Nenhum agendamento ativo.</td></tr>';
  } else {
    tbA.innerHTML = ativos.map(a => `
      <tr>
        <td>${EMOJI[a.petEsp] || '🐾'} <strong>${a.petNome}</strong></td>
        <td>${a.cliNome}</td>
        <td>${a.servicos}</td>
        <td>${a.dataFmt}${a.hora ? ' ' + a.hora : ''}</td>
        <td><button class="btn-del" onclick="pedirCancelamento(${a.id})">✕ Cancelar</button></td>
      </tr>
    `).join('');
  }

  // Histórico de cancelados
  const canc = agendamentos.filter(a =>
    a.status === 'Cancelado' &&
    (
      a.petNome.toLowerCase().includes(q) ||
      a.cliNome.toLowerCase().includes(q) ||
      a.servicos.toLowerCase().includes(q)
    )
  );

  const tbC = document.getElementById('tb-canc');
  if (!canc.length) {
    tbC.innerHTML = '<tr><td class="empty-td" colspan="5">Nenhum cancelamento registrado.</td></tr>';
  } else {
    tbC.innerHTML = canc.map(a => `
      <tr>
        <td>${EMOJI[a.petEsp] || '🐾'} <strong>${a.petNome}</strong></td>
        <td>${a.cliNome}</td>
        <td>${a.servicos}</td>
        <td>${a.dataFmt}${a.hora ? ' ' + a.hora : ''}</td>
        <td><span class="badge-cancelado">✕ Cancelado</span></td>
      </tr>
    `).join('');
  }
}

// ─── FECHAR MODAL AO CLICAR FORA ────────────────────────────────────────────
document.getElementById('overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('overlay')) fecharModal();
});

// ─── INICIALIZAÇÃO ───────────────────────────────────────────────────────────
updateStats();
renderTabClientes();
