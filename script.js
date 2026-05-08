/* ================================================================
   CONFIGURAÇÃO DA API
   ----------------------------------------------------------------
   Centralizamos a base URL aqui. Caso a versão da API mude (de v1
   para v2, por exemplo), basta alterar este valor único.
   ================================================================ */
const API_BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades';

/* ================================================================
   REFERÊNCIAS AOS ELEMENTOS DO DOM
   ================================================================ */
const btnLoadEstados     = document.getElementById('btn-load-estados');
const btnLoadMunicipios  = document.getElementById('btn-load-municipios');
const selectEstado       = document.getElementById('select-estado');
const statusEstados      = document.getElementById('status-estados');
const statusMunicipios   = document.getElementById('status-municipios');
const resultsSection     = document.getElementById('results');
const resultsUF          = document.getElementById('results-uf');
const resultsCount       = document.getElementById('results-count-num');
const municipalityGrid   = document.getElementById('municipality-grid');
const searchInput        = document.getElementById('search');

/* ================================================================
   UTILITÁRIOS DE INTERFACE
   ----------------------------------------------------------------
   Funções pequenas para alterar o estado visual sem repetir código.
   ================================================================ */

/** Atualiza o texto e a cor da linha de status de cada cartão. */
function setStatus(element, message, type = 'idle') {
  element.classList.remove('success', 'error');
  if (type === 'success') element.classList.add('success');
  if (type === 'error')   element.classList.add('error');
  element.querySelector('.status-text').textContent = message;
}

/** Coloca/retira o estado de carregamento de um botão. */
function setLoading(button, isLoading, labelWhileLoading = 'Carregando...') {
  const labelEl = button.querySelector('.btn-label');
  if (isLoading) {
    button.classList.add('loading');
    button.dataset.originalLabel = labelEl.textContent;
    labelEl.textContent = labelWhileLoading;
    button.disabled = true;
  } else {
    button.classList.remove('loading');
    if (button.dataset.originalLabel) {
      labelEl.textContent = button.dataset.originalLabel;
    }
    button.disabled = false;
  }
}

/* ================================================================
   ETAPA 01 — CARREGAR ESTADOS
   ----------------------------------------------------------------
   Ao clicar no botão, fazemos um GET em /estados. A API devolve
   um array de objetos com { id, sigla, nome, regiao, ... }.
   Ordenamos por nome e populamos o <select>.
   ================================================================ */
async function carregarEstados() {
  setLoading(btnLoadEstados, true, 'Conectando ao IBGE...');
  setStatus(statusEstados, 'Realizando requisição GET → /estados');

  try {
    const resposta = await fetch(`${API_BASE}/estados`);

    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status} — ${resposta.statusText}`);
    }

    const estados = await resposta.json();

    // Ordena alfabeticamente pelo nome
    estados.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    // Reseta o select e adiciona o placeholder
    selectEstado.innerHTML = '<option value="">— Selecione um estado —</option>';

    // Para cada estado, cria uma <option>. O value guarda a SIGLA,
    // que será usada na próxima requisição. data-nome guarda o nome
    // completo, útil para mostrar no cabeçalho dos resultados.
    estados.forEach(estado => {
      const option = document.createElement('option');
      option.value = estado.sigla;
      option.dataset.nome = estado.nome;
      option.textContent = `${estado.nome} (${estado.sigla})`;
      selectEstado.appendChild(option);
    });

    selectEstado.disabled = false;
    setStatus(
      statusEstados,
      `${estados.length} estados carregados com sucesso`,
      'success'
    );
    setLoading(btnLoadEstados, false);

    // Restaura o texto original do botão
    btnLoadEstados.querySelector('.btn-label').textContent = 'Recarregar lista';

  } catch (erro) {
    console.error('Falha ao carregar estados:', erro);
    setStatus(
      statusEstados,
      `Erro: ${erro.message}`,
      'error'
    );
    setLoading(btnLoadEstados, false);
  }
}

/* ================================================================
   AO TROCAR DE ESTADO NO SELECT
   ----------------------------------------------------------------
   Quando o usuário escolhe um estado, habilitamos o botão da
   etapa 02 e atualizamos as mensagens.
   ================================================================ */
function aoSelecionarEstado() {
  const sigla = selectEstado.value;
  const labelBtn = btnLoadMunicipios.querySelector('.btn-label');

  if (sigla) {
    btnLoadMunicipios.disabled = false;
    labelBtn.textContent = `Buscar municípios de ${sigla}`;
    setStatus(
      statusMunicipios,
      `Estado selecionado: ${sigla} — pronto para a próxima requisição`
    );
  } else {
    btnLoadMunicipios.disabled = true;
    labelBtn.textContent = 'Selecione um estado primeiro';
    setStatus(statusMunicipios, 'Aguardando seleção de estado');
  }
}

/* ================================================================
   ETAPA 02 — CARREGAR MUNICÍPIOS DO ESTADO ESCOLHIDO
   ----------------------------------------------------------------
   A sigla escolhida entra na URL como parâmetro de caminho:
   /estados/SC/municipios, por exemplo.
   ================================================================ */
async function carregarMunicipios() {
  const sigla = selectEstado.value;
  if (!sigla) return;

  const optionSelecionada = selectEstado.options[selectEstado.selectedIndex];
  const nomeEstado = optionSelecionada.dataset.nome || sigla;

  setLoading(btnLoadMunicipios, true, `Buscando municípios de ${sigla}...`);
  setStatus(
    statusMunicipios,
    `GET → /estados/${sigla}/municipios`
  );

  try {
    const url = `${API_BASE}/estados/${sigla}/municipios`;
    const resposta = await fetch(url);

    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status} — ${resposta.statusText}`);
    }

    const municipios = await resposta.json();

    // Ordena alfabeticamente
    municipios.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    // Renderiza o cabeçalho da seção de resultados
    resultsUF.textContent = `${nomeEstado} (${sigla})`;
    resultsCount.textContent = municipios.length.toLocaleString('pt-BR');

    // Limpa o grid e popula com os municípios.
    // Cada cartãozinho mostra o nome e o ID oficial do IBGE.
    municipalityGrid.innerHTML = '';
    municipios.forEach((mun, index) => {
      const div = document.createElement('div');
      div.className = 'municipality';
      // Pequeno delay escalonado na animação para um efeito mais agradável
      div.style.animationDelay = `${Math.min(index * 4, 400)}ms`;
      div.dataset.nome = mun.nome.toLowerCase();
      div.innerHTML = `
        <span class="municipality-name">${mun.nome}</span>
        <span class="municipality-id">${mun.id}</span>
      `;
      municipalityGrid.appendChild(div);
    });

    // Mostra a seção de resultados e limpa o filtro
    resultsSection.classList.add('visible');
    searchInput.value = '';

    // Rola suavemente até os resultados
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    setStatus(
      statusMunicipios,
      `${municipios.length} municípios carregados`,
      'success'
    );
    setLoading(btnLoadMunicipios, false);
    btnLoadMunicipios.querySelector('.btn-label').textContent =
      `Recarregar municípios de ${sigla}`;

  } catch (erro) {
    console.error('Falha ao carregar municípios:', erro);
    setStatus(
      statusMunicipios,
      `Erro: ${erro.message}`,
      'error'
    );
    setLoading(btnLoadMunicipios, false);
  }
}

/* ================================================================
   FILTRO LOCAL — Filtra os municípios já carregados conforme o usuário digita.
   Esta busca acontece somente no cliente, sem nova requisição.
   ================================================================ */
function filtrarMunicipios() {
  const termo = searchInput.value.trim().toLowerCase();
  const itens = municipalityGrid.querySelectorAll('.municipality');
  let visiveis = 0;

  itens.forEach(item => {
    const ocorre = item.dataset.nome.includes(termo);
    item.classList.toggle('hidden', !ocorre);
    if (ocorre) visiveis++;
  });

  // Atualiza o contador visualmente
  resultsCount.textContent = visiveis.toLocaleString('pt-BR');
}

/* ================================================================
   REGISTRO DOS EVENTOS
   ================================================================ */
btnLoadEstados.addEventListener('click', carregarEstados);
selectEstado.addEventListener('change', aoSelecionarEstado);
btnLoadMunicipios.addEventListener('click', carregarMunicipios);
searchInput.addEventListener('input', filtrarMunicipios);
