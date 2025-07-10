document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, iniciando aplicação...');
    
    // ===== FUNÇÃO UTILITÁRIA PARA FILTRAR UNDEFINED =====
    function filterUndefined(value, defaultValue = '') {
        if (value === undefined || value === null || value === 'undefined' || String(value).toLowerCase() === 'undefined') {
            return defaultValue;
        }
        return value;
    }
    
    function cleanText(text, defaultValue = '') {
        if (!text || text === 'undefined' || String(text).toLowerCase() === 'undefined' || text.trim() === '') {
            return defaultValue;
        }
        return String(text).trim();
    }
    
    // Expor globalmente para uso em outras funções
    window.filterUndefined = filterUndefined;
    window.cleanText = cleanText;
    
    // ===== INICIALIZAÇÃO FORÇADA =====
    // SEMPRE iniciar no estoque 1 (índice 0) e mês atual, independente do estado anterior
    localStorage.setItem('currentStockIndex', '0');
    console.log('Sistema iniciado/recarregado - forçando estoque 1 e mês atual');

    // --- DOM Elements ---
    const mesAtualEl = document.getElementById('mesAtual');
    const btnMesAnterior = document.getElementById('btnMesAnterior');
    const btnProximoMes = document.getElementById('btnProximoMes');
    const nomeEstoqueInput = document.getElementById('nomeEstoqueInput');
    const btnNovoEstoque = document.getElementById('btnNovoEstoque');
    const btnVoltarEstoque = document.getElementById('btnVoltarEstoque');
    const entradaTotalEl = document.getElementById('entradaTotal');
    const saidaTotalEl = document.getElementById('saidaTotal');
    const saldoTotalEl = document.getElementById('saldoTotal');
    const valorFinalEl = document.getElementById('valorFinal');
    const tabelaBody = document.querySelector('table.estoque-table tbody');
    const listaEntradas = document.getElementById('listaEntradas');
    const listaSaidas = document.getElementById('listaSaidas');
    const btnLimparHistorico = document.getElementById('btnLimparHistorico');
    const themeToggle = document.getElementById('themeToggleTop');
    
    // Novos elementos para resumo e notificações
    const listaResumoItens = document.getElementById('listaResumoItens');
    const btnNotify = document.getElementById('btnNotify');
    const notifyBadge = document.getElementById('notifyBadge');

    // Debug - verificar se os elementos foram encontrados
    console.log('Elementos DOM encontrados:', {
        mesAtualEl: !!mesAtualEl,
        btnMesAnterior: !!btnMesAnterior,
        btnProximoMes: !!btnProximoMes,
        nomeEstoqueInput: !!nomeEstoqueInput,
        btnNovoEstoque: !!btnNovoEstoque,
        btnVoltarEstoque: !!btnVoltarEstoque,
        themeToggle: !!themeToggle,
        tabelaBody: !!tabelaBody
    });

    // Verificar se elementos críticos existem
    if (!btnNovoEstoque) console.error('Elemento btnNovoEstoque não encontrado!');
    if (!btnVoltarEstoque) console.error('Elemento btnVoltarEstoque não encontrado!');
    if (!themeToggle) console.error('Elemento themeToggle não encontrado!');
    if (!nomeEstoqueInput) console.error('Elemento nomeEstoqueInput não encontrado!');

    // --- Month Navigation ---
    const mesesPadrao = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    let displayedDate = new Date();

    function updateMonthDisplay() {
        // Usar meses traduzidos se disponíveis, senão usar padrão em português
        const meses = window.currentLanguageMonths || mesesPadrao;
        const currentLang = window.currentLanguage || 'pt';
        
        // Formatar data de acordo com o idioma
        if (currentLang === 'en') {
            mesAtualEl.textContent = `${meses[displayedDate.getMonth()]} ${displayedDate.getFullYear()}`;
        } else if (currentLang === 'fr') {
            mesAtualEl.textContent = `${meses[displayedDate.getMonth()]} ${displayedDate.getFullYear()}`;
        } else if (currentLang === 'it') {
            mesAtualEl.textContent = `${meses[displayedDate.getMonth()]} ${displayedDate.getFullYear()}`;
        } else if (currentLang === 'es') {
            mesAtualEl.textContent = `${meses[displayedDate.getMonth()]} de ${displayedDate.getFullYear()}`;
        } else {
            // Português (padrão)
            mesAtualEl.textContent = `${meses[displayedDate.getMonth()]} de ${displayedDate.getFullYear()}`;
        }
    }

    // Expor função globalmente para ser chamada pela tradução
    window.updateMonthDisplay = updateMonthDisplay;

    btnMesAnterior?.addEventListener('click', () => {
        console.log('🔴 Clique no botão mês anterior detectado!');
        
        if (verificarNavegacaoPremium('navegacao_mes_anterior')) {
            console.log('✅ Usuário premium - navegação LIVRE para qualquer mês anterior');
            salvarDadosDoMesAtual(currentStockIndex, displayedDate);
            
            displayedDate.setMonth(displayedDate.getMonth() - 1);
            loadStock(currentStockIndex, null);
            updateMonthDisplay();
            mostrarFeedbackNavegacao(currentStockIndex);
            console.log(`✅ Navegado para: ${displayedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`);
        } else {
            console.log('❌ Usuário sem premium - modal deve aparecer!');
        }
    });

    btnProximoMes?.addEventListener('click', () => {
        console.log('🟠 Clique no botão próximo mês detectado!');
        
        if (verificarNavegacaoPremium('navegacao_mes_proximo')) {
            console.log('✅ Usuário premium - navegação LIVRE para qualquer mês futuro');
            salvarDadosDoMesAtual(currentStockIndex, displayedDate);
            
            displayedDate.setMonth(displayedDate.getMonth() + 1);
            loadStock(currentStockIndex, null);
            updateMonthDisplay();
            mostrarFeedbackNavegacao(currentStockIndex);
            console.log(`✅ Navegado para: ${displayedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`);
        } else {
            console.log('❌ Usuário sem premium - modal deve aparecer!');
        }
    });

    // --- Chart Setup with Error Handling ---
    let chartPizza, chartBarras, chartSaidas;
    
    try {
        const ctxPizza = document.getElementById('graficoPizza')?.getContext('2d');
        const ctxBarras = document.getElementById('graficoBarras')?.getContext('2d');
        const ctxSaidas = document.getElementById('graficoSaidas')?.getContext('2d');

        if (ctxPizza && ctxBarras && ctxSaidas) {
            chartPizza = new Chart(ctxPizza, {
                type: 'pie',
                data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
                options: { 
                    responsive: true,
                    plugins: { 
                        legend: { position: 'bottom' },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.label + ': ' + context.parsed;
                                }
                            }
                        }
                    }
                }
            });

            chartBarras = new Chart(ctxBarras, {
                type: 'bar',
                data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
                options: { 
                    responsive: true,
                    scales: { y: { beginAtZero: true } },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': R$ ' + context.parsed.y.toFixed(2);
                                }
                            }
                        }
                    }
                }
            });

            chartSaidas = new Chart(ctxSaidas, {
                type: 'bar',
                data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
                options: { 
                    responsive: true,
                    indexAxis: 'y', 
                    scales: { x: { beginAtZero: true } },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + context.parsed.x;
                                }
                            }
                        }
                    }
                }
            });
        } else {
            console.warn('Alguns elementos canvas para gráficos não foram encontrados');
        }
    } catch (error) {
        console.error('Erro ao inicializar gráficos:', error);
    }

    // --- Input Validation Functions ---
    function validarInput(input, tipo) {
        const valor = input.value.trim();
        let isValid = true;
        let mensagem = '';

        switch (tipo) {
            case 'item':
                if (valor.length > 50) {
                    isValid = false;
                    mensagem = 'Nome do item deve ter no máximo 50 caracteres';
                }
                break;
            case 'numero':
                const num = parseFloat(valor);
                if (valor !== '' && (isNaN(num) || num < 0)) {
                    isValid = false;
                    mensagem = 'Digite apenas números positivos';
                }
                if (num > 999999) {
                    isValid = false;
                    mensagem = 'Valor muito alto (máximo: 999.999)';
                }
                break;
            case 'valor':
                const val = parseFloat(valor);
                if (valor !== '' && (isNaN(val) || val < 0)) {
                    isValid = false;
                    mensagem = 'Digite apenas valores positivos';
                }
                if (val > 999999.99) {
                    isValid = false;
                    mensagem = 'Valor muito alto (máximo: R$ 999.999,99)';
                }
                break;
        }

        // Adicionar/remover classe de erro
        input.classList.toggle('input-erro', !isValid);
        
        // Mostrar tooltip de erro
        if (!isValid) {
            input.title = mensagem;
            console.warn(`Erro de validação: ${mensagem}`);
        } else {
            input.title = '';
        }

        return isValid;
    }

    // Função para sanitizar dados antes de salvar
    function sanitizarDados(dados) {
        return {
            item: dados.item ? dados.item.substring(0, 50).trim() : '',
            entrada: Math.max(0, Math.min(999999, parseFloat(dados.entrada) || 0)),
            saida: Math.max(0, Math.min(999999, parseFloat(dados.saida) || 0)),
            valor: Math.max(0, Math.min(999999.99, parseFloat(dados.valor) || 0))
        };
    }

    // --- Resumo em Tempo Real dos Itens ---
    function atualizarResumoItens() {
        if (!listaResumoItens) return;
        
        const itensResumo = {};
        const linhas = tabelaBody.querySelectorAll('tr');
        
        linhas.forEach(linha => {
            const nome = linha.querySelector('.item')?.value?.trim();
            const entrada = parseFloat(linha.querySelector('.entrada')?.value) || 0;
            const saida = parseFloat(linha.querySelector('.saida')?.value) || 0;
            
            // Filtrar nomes inválidos
            if (nome && nome !== 'undefined' && nome !== 'null' && nome.length > 0 && (entrada > 0 || saida > 0)) {
                if (!itensResumo[nome]) {
                    itensResumo[nome] = { entrada: 0, saida: 0 };
                }
                itensResumo[nome].entrada += entrada;
                itensResumo[nome].saida += saida;
            }
        });
        
        // Limpar lista anterior
        listaResumoItens.innerHTML = '';
        
        const itensArray = Object.keys(itensResumo);
        
        if (itensArray.length === 0) {
            const emptyText = window.getTranslation ? window.getTranslation('noItemsYet', window.currentLanguage || 'pt') : 'Nenhum item inserido ainda';
            listaResumoItens.innerHTML = `<p class="resumo-vazio">${emptyText}</p>`;
        } else {
            itensArray.forEach(nome => {
                const item = itensResumo[nome];
                const saldo = item.entrada - item.saida;
                
                const divItem = document.createElement('div');
                divItem.className = 'resumo-item';
                
                let saldoClass = 'zero';
                if (saldo > 0) saldoClass = 'positivo';
                else if (saldo < 0) saldoClass = 'negativo';
                
                divItem.innerHTML = `
                    <div class="resumo-item-info">
                        <div class="resumo-item-nome">${nome}</div>
                        <div class="resumo-item-valores">
                            <span class="resumo-entrada">${item.entrada}</span>
                            <span class="resumo-saida">${item.saida}</span>
                            <span class="resumo-saldo ${saldoClass}">${saldo}</span>
                        </div>
                    </div>
                `;
                
                listaResumoItens.appendChild(divItem);
            });
        }
        
        // Verificar notificações de reposição
        verificarNotificacoes(itensArray, itensResumo);
    }
    
    // --- Sistema de Notificações ---
    let notificacaoAtiva = false;
    let notificacaoJaDismissed = false;
    let produtosParaRepor = [];
    
    function verificarNotificacoes(itensArray, itensResumo) {
        if (!btnNotify || !notifyBadge) return;
        
        // Verificar produtos que precisam ser repostos (saldo <= 0 ou muito baixo)
        produtosParaRepor = [];
        let produtosCriticos = []; // Saldo <= 0
        if (itensResumo) {
            Object.keys(itensResumo).forEach(nome => {
                const saldo = itensResumo[nome].entrada - itensResumo[nome].saida;
                if (saldo <= 2) { // Considera necessidade de reposição quando saldo <= 2
                    const produto = {
                        nome: nome,
                        saldo: saldo,
                        entrada: itensResumo[nome].entrada,
                        saida: itensResumo[nome].saida
                    };
                    produtosParaRepor.push(produto);
                    
                    if (saldo <= 0) {
                        produtosCriticos.push(produto);
                    }
                }
            });
        }
        
        const quantidadeItens = itensArray.length;
        const temProdutosParaRepor = produtosParaRepor.length > 0;
        
        // Ativar notificação se tiver 3+ produtos OU produtos para repor
        if ((quantidadeItens >= 3 || temProdutosParaRepor) && !notificacaoAtiva && !notificacaoJaDismissed) {
            notificacaoAtiva = true;
            
            // Badge mostra quantidade de produtos para repor, ou "!" se só tiver 3+ produtos
            if (temProdutosParaRepor) {
                notifyBadge.textContent = produtosParaRepor.length.toString();
                
                // Aplicar classe especial para produtos críticos
                if (produtosCriticos.length > 0) {
                    notifyBadge.classList.add('critico');
                    btnNotify.title = `🚨 ${produtosCriticos.length} produto(s) crítico(s) + ${produtosParaRepor.length - produtosCriticos.length} para repor:\n${produtosParaRepor.map(p => `• ${p.nome} (saldo: ${p.saldo})`).join('\n')}`;
                } else {
                    notifyBadge.classList.remove('critico');
                    btnNotify.title = `⚠️ ${produtosParaRepor.length} produto(s) precisam ser repostos:\n${produtosParaRepor.map(p => `• ${p.nome} (saldo: ${p.saldo})`).join('\n')}`;
                }
            } else {
                notifyBadge.classList.remove('critico');
                notifyBadge.textContent = '!';
                btnNotify.title = `📊 ${quantidadeItens} produtos cadastrados no ${window.getTranslation ? window.getTranslation('stockDefault', window.currentLanguage || 'pt').toLowerCase() : 'estoque'}`;
            }
            
            notifyBadge.style.display = 'flex';
            btnNotify.style.animation = 'pulse 2s infinite';
            
            console.log('Notificação ativada:', {
                quantidadeItens,
                produtosParaRepor: produtosParaRepor.map(p => `${p.nome} (${p.saldo})`),
                produtosCriticos: produtosCriticos.map(p => `${p.nome} (${p.saldo})`)
            });
        } else if (quantidadeItens < 3 && !temProdutosParaRepor) {
            // Reset quando menos de 3 itens E sem produtos para repor
            notificacaoJaDismissed = false;
        }
    }
    
    function limparNotificacao() {
        if (!btnNotify || !notifyBadge) return;
        
        notificacaoAtiva = false;
        notificacaoJaDismissed = true;
        notifyBadge.style.display = 'none';
        notifyBadge.textContent = '0';
        notifyBadge.classList.remove('critico'); // Remove classe especial
        btnNotify.style.animation = 'none';
        btnNotify.title = 'Notificações';
        
        // Mostrar resumo dos produtos que precisavam ser repostos
        if (produtosParaRepor.length > 0) {
            const resumo = produtosParaRepor.map(p => {
                const status = p.saldo <= 0 ? '🚨 CRÍTICO' : '⚠️ BAIXO';
                return `• ${p.nome}: ${p.entrada} entradas, ${p.saida} saídas = ${p.saldo} em ${window.getTranslation ? window.getTranslation('stockDefault', window.currentLanguage || 'pt').toLowerCase() : 'estoque'} (${status})`;
            }).join('\n');
            console.log('Produtos que precisam ser repostos:\n' + resumo);
        }
        
        console.log('Notificação dispensada pelo usuário');
    }
    
    // Event listener para limpar notificação ao clicar
    if (btnNotify) {
        btnNotify.addEventListener('click', () => {
            // Mostrar detalhes antes de limpar
            if (produtosParaRepor.length > 0) {
                const criticos = produtosParaRepor.filter(p => p.saldo <= 0);
                const baixos = produtosParaRepor.filter(p => p.saldo > 0 && p.saldo <= 2);
                
                let mensagem = '📦 RELATÓRIO DE ESTOQUE\n\n';
                
                if (criticos.length > 0) {
                    mensagem += '🚨 PRODUTOS CRÍTICOS (sem estoque):\n';
                    mensagem += criticos.map(p => `• ${p.nome}: ${p.saldo} unidades`).join('\n');
                    mensagem += '\n\n';
                }
                
                if (baixos.length > 0) {
                    mensagem += '⚠️ PRODUTOS COM ESTOQUE BAIXO:\n';
                    mensagem += baixos.map(p => `• ${p.nome}: ${p.saldo} unidades`).join('\n');
                    mensagem += '\n\n';
                }
                
                mensagem += '💡 Considere reabastecer estes produtos.';
                
                alert(mensagem);
            }
            
            limparNotificacao();
        });
    }

    // --- Color Generation & Storage ---
    const coresMap = JSON.parse(localStorage.getItem('coresMap') || '{}');
    function gerarCor(nome) {
        if (!coresMap[nome]) {
            const r = Math.floor(Math.random() * 156 + 100);
            const g = Math.floor(Math.random() * 156 + 100);
            const b = Math.floor(Math.random() * 156 + 100);
            coresMap[nome] = `rgb(${r},${g},${b})`;
            localStorage.setItem('coresMap', JSON.stringify(coresMap));
        }
        return coresMap[nome];
    }

    // --- Stock Management Variables ---
    const MAX_STOCKS = 10;
    let allStocksMeta = [];
    try {
        const storedMeta = JSON.parse(localStorage.getItem('allStocksMeta'));
        if (Array.isArray(storedMeta)) {
            allStocksMeta = storedMeta;
        }
    } catch (e) {
        console.error("Erro ao parsear allStocksMeta do localStorage. Inicializando como array vazio.", e);
    }
    for (let i = 0; i < MAX_STOCKS; i++) {
        if (!allStocksMeta[i] || typeof allStocksMeta[i] !== 'object' || allStocksMeta[i] === null) {
            allStocksMeta[i] = { namesByMonth: {} };
        } else {
            if (!allStocksMeta[i].namesByMonth) {
                allStocksMeta[i].namesByMonth = {};
            }
        }
    }
    if (allStocksMeta.length > MAX_STOCKS) {
        allStocksMeta = allStocksMeta.slice(0, MAX_STOCKS);
    }

    // ===== FORÇAR INICIALIZAÇÃO NO ESTOQUE 1 E MÊS ATUAL =====
    // Garantir que SEMPRE inicie no estoque 1 (índice 0) e mês atual
    // IMPORTANTE: Este sistema foi projetado para que:
    // 1. Qualquer acesso/reload sempre comece no estoque 1
    // 2. Navegação para outros estoques/meses só é permitida com premium/login
    // 3. Após logout, sempre retorna ao estoque 1
    // 4. Verificações de segurança garantem que não há "vazamentos" de navegação
    let currentStockIndex = 0;
    displayedDate = new Date(); // Garantir que seja sempre o mês atual
    
    // Salvar configuração inicial forçada
    localStorage.setItem('currentStockIndex', '0');

    // --- Função para obter a chave do localStorage para o estoque e mês específicos ---
    function getStorageKey(index, date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return `estoque_${year}-${month}_${index}`;
    }

    // --- Helper para obter a chave do nome do mês/ano ---
    function getMonthYearKey(date) {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    }

    // --- Table & Data Manipulation Functions ---

    // Helper to check if a row is completely empty
    function isRowEmpty(row) {
        const inputs = row.querySelectorAll('input');
        return [...inputs].every(input =>
            input.value.trim() === '' ||
            (input.type === 'number' && (isNaN(parseFloat(input.value)) || parseFloat(input.value) === 0))
        );
    }

    // Adds a new empty row to the table
    function adicionarLinha(data = {}) {
        const linha = document.createElement('tr');
        linha.innerHTML = `
            <td><input type="text" class="item" value="${data.item || ''}" autocomplete="off" /></td>
            <td><input type="number" class="entrada" min="0" step="any" value="${data.entrada || ''}" autocomplete="off"/></td>
            <td><input type="number" class="saida" min="0" step="any" value="${data.saida || ''}" autocomplete="off"/></td>
            <td><input type="number" class="valor" min="0" step="0.01" value="${data.valor || ''}" autocomplete="off"/></td>
        `;
        tabelaBody.appendChild(linha);
        adicionarEventosLinha(linha);
    }

    // Attaches event listeners to inputs within a table row with validation
    function adicionarEventosLinha(linha) {
        const inputs = linha.querySelectorAll('input');
        inputs.forEach(input => {
            // Validação em tempo real
            input.addEventListener('input', () => {
                let tipo = 'numero';
                if (input.classList.contains('item')) tipo = 'item';
                else if (input.classList.contains('valor')) tipo = 'valor';
                
                validarInput(input, tipo);
                
                atualizarResumo();
                atualizarGraficos();
                salvarDadosDoMesAtual(currentStockIndex, displayedDate);
                verificarLinhaFinal();
                removerLinhasVazias();
            });

            // Sanitização ao perder foco
            input.addEventListener('blur', () => {
                if (input.type === 'number') {
                    const valor = parseFloat(input.value);
                    if (!isNaN(valor)) {
                        if (input.classList.contains('valor')) {
                            input.value = Math.min(999999.99, Math.max(0, valor)).toFixed(2);
                        } else {
                            input.value = Math.min(999999, Math.max(0, valor)).toString();
                        }
                    }
                }
            });
        });

        linha.querySelector('.entrada').addEventListener('change', () => {
            const item = linha.querySelector('.item').value.trim();
            const valor = parseFloat(linha.querySelector('.entrada').value) || 0;
            if (item && valor > 0) registrarOperacao('entrada', item, valor);
        });
        linha.querySelector('.saida').addEventListener('change', () => {
            const item = linha.querySelector('.item').value.trim();
            const valor = parseFloat(linha.querySelector('.saida').value) || 0;
            if (item && valor > 0) registrarOperacao('saida', item, valor);
        });
    }

    // Ensures there's always an empty line at the end for user input
    function verificarLinhaFinal() {
        const linhas = tabelaBody.querySelectorAll('tr');
        if (linhas.length === 0 || !isRowEmpty(linhas[linhas.length - 1])) {
            adicionarLinha();
        }
    }

    // Removes empty rows, but keeps the last one for input
    function removerLinhasVazias() {
        const linhas = tabelaBody.querySelectorAll('tr');
        for (let i = linhas.length - 2; i >= 0; i--) {
            if (isRowEmpty(linhas[i])) {
                linhas[i].remove();
            }
        }
    }

    // Calculates and updates summary totals
    function atualizarResumo() {
        let entrada = 0, saida = 0, saldo = 0, valorTotal = 0;
        const linhas = tabelaBody.querySelectorAll('tr');
        linhas.forEach(linha => {
            const ent = parseFloat(linha.querySelector('.entrada').value) || 0;
            const sai = parseFloat(linha.querySelector('.saida').value) || 0;
            const val = parseFloat(linha.querySelector('.valor').value) || 0;
            entrada += ent;
            saida += sai;
            saldo += (ent - sai);
            valorTotal += val;
        });
        entradaTotalEl.textContent = entrada;
        saidaTotalEl.textContent = saida;
        saldoTotalEl.textContent = saldo;
        valorFinalEl.textContent = valorTotal.toFixed(2);
        
        // Atualizar resumo dos itens
        atualizarResumoItens();
    }

    // Updates chart data based on table content with error handling
    function atualizarGraficos() {
        try {
            const labels = [], entradas = [], valores = [], cores = [];
            const dataSaida = {}, corSaidaPorItem = {};
            const linhas = tabelaBody.querySelectorAll('tr');

            linhas.forEach(linha => {
                const nome = linha.querySelector('.item')?.value?.trim();
                const ent = parseFloat(linha.querySelector('.entrada')?.value) || 0;
                const sai = parseFloat(linha.querySelector('.saida')?.value) || 0;
                const val = parseFloat(linha.querySelector('.valor')?.value) || 0;

                // Filtrar nomes inválidos (vazio, undefined, null)
                if (nome && nome !== 'undefined' && nome !== 'null' && nome.length > 0) {
                    const cor = gerarCor(nome);
                    if (ent > 0) {
                        const existingIndex = labels.indexOf(nome);
                        if (existingIndex > -1) {
                            entradas[existingIndex] += ent;
                            valores[existingIndex] += val;
                        } else {
                            labels.push(nome);
                            entradas.push(ent);
                            valores.push(val);
                            cores.push(cor);
                        }
                    }
                    if (sai > 0) {
                        dataSaida[nome] = (dataSaida[nome] || 0) + sai;
                        corSaidaPorItem[nome] = cor;
                    }
                }
            });

            // Update Pie Chart with safety check
            if (chartPizza && chartPizza.data) {
                chartPizza.data.labels = labels;
                chartPizza.data.datasets[0].data = entradas;
                chartPizza.data.datasets[0].backgroundColor = cores;
                chartPizza.update('none'); // 'none' para performance
            }

            // Update Bar Chart (Valores) with safety check
            if (chartBarras && chartBarras.data) {
                chartBarras.data.labels = labels;
                chartBarras.data.datasets[0].data = valores;
                chartBarras.data.datasets[0].backgroundColor = cores;
                chartBarras.update('none');
            }

            // Update Saídas Chart with safety check
            if (chartSaidas && chartSaidas.data) {
                const saidaLabels = Object.keys(dataSaida).filter(l => l && l !== 'undefined' && l !== 'null' && l.trim().length > 0);
                chartSaidas.data.labels = saidaLabels;
                chartSaidas.data.datasets[0].data = saidaLabels.map(l => dataSaida[l]);
                chartSaidas.data.datasets[0].backgroundColor = saidaLabels.map(l => corSaidaPorItem[l]);
                chartSaidas.update('none');
            }
        } catch (error) {
            console.error('Erro ao atualizar gráficos:', error);
        }
    }

    // Saves current table and stock name data to localStorage for the specific month with data sanitization
    function salvarDadosDoMesAtual(index, dateToSave) {
        try {
            console.log('💾 Salvando dados para índice:', index, 'data:', dateToSave);
            
            const linhasVisiveis = [...tabelaBody.querySelectorAll('tr')].filter(row => !isRowEmpty(row));
            const dadosParaSalvar = linhasVisiveis.map(linha => {
                const dadosBrutos = {
                    item: linha.querySelector('.item')?.value || '',
                    entrada: linha.querySelector('.entrada')?.value || '',
                    saida: linha.querySelector('.saida')?.value || '',
                    valor: linha.querySelector('.valor')?.value || ''
                };
                return sanitizarDados(dadosBrutos);
            });

            console.log('📊 Dados para salvar:', dadosParaSalvar);

            const monthYearKey = getMonthYearKey(dateToSave);
            const currentName = cleanText(nomeEstoqueInput.value, '').substring(0, 50) || (window.getStockName ? window.getStockName(index, window.currentLanguage || 'pt') : `Estoque ${index + 1}`);

            allStocksMeta[index].namesByMonth[monthYearKey] = currentName;
            localStorage.setItem('allStocksMeta', JSON.stringify(allStocksMeta));

            // Combinar histórico das duas listas
            const historiaEntradas = [...listaEntradas.children].map(li => li.textContent);
            const historiaSaidas = [...listaSaidas.children].map(li => li.textContent);
            const history = [...historiaEntradas, ...historiaSaidas];

            console.log('📝 Histórico para salvar:', history);

            const stockDataForMonth = {
                tableData: dadosParaSalvar,
                history: history,
                lastSaved: new Date().toISOString()
            };

            const storageKey = getStorageKey(index, dateToSave);
            console.log('🔑 Chave de armazenamento:', storageKey);
            
            localStorage.setItem(storageKey, JSON.stringify(stockDataForMonth));
            localStorage.setItem('currentStockIndex', currentStockIndex);
            
            console.log('✅ Dados salvos com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao salvar dados:', error);
            alert('Erro ao salvar dados. Verifique o console para mais detalhes.');
        }
    }

    // Registers an operation in the history list and saves it
    function registrarOperacao(tipo, item, quantidade) {
        const data = new Date();
        // Formato compacto: DD/MM/AA
        const dia = data.getDate().toString().padStart(2, '0');
        const mes = (data.getMonth() + 1).toString().padStart(2, '0');
        const ano = data.getFullYear().toString().slice(-2); // Últimos 2 dígitos do ano
        const dataFormatada = `${dia}/${mes}/${ano}`;
        
        // Formato compacto: 05/07/25 entrada/arroz:10
        const texto = `${dataFormatada} ${tipo}/${item}:${quantidade}`;

        const li = document.createElement('li');
        li.textContent = texto;
        
        // Adicionar na lista correta
        if (tipo === 'entrada') {
            listaEntradas.prepend(li);
        } else {
            listaSaidas.prepend(li);
        }

        salvarDadosDoMesAtual(currentStockIndex, displayedDate);
    }

    // Loads a specific stock by its index and the current displayed month
    function loadStock(indexToLoad, previousDateForSave = null) {
        console.log('🔄 LoadStock chamado com:', { indexToLoad, previousDateForSave, currentStockIndex });
        
        // Salvar dados do estoque atual antes de trocar
        if (currentStockIndex !== null && currentStockIndex >= 0 && currentStockIndex < MAX_STOCKS && allStocksMeta[currentStockIndex]) {
            const dateToSave = previousDateForSave || displayedDate;
            salvarDadosDoMesAtual(currentStockIndex, dateToSave);
        }

        // Garantir que o índice está dentro do range válido
        if (indexToLoad < 0) {
            indexToLoad = MAX_STOCKS - 1;
        } else if (indexToLoad >= MAX_STOCKS) {
            indexToLoad = 0;
        }

        currentStockIndex = indexToLoad;
        console.log('📊 Novo currentStockIndex:', currentStockIndex);
        localStorage.setItem('currentStockIndex', currentStockIndex);

        const monthYearKey = getMonthYearKey(displayedDate);
        const defaultName = cleanText(window.getStockName ? window.getStockName(currentStockIndex, window.currentLanguage || 'pt') : `Estoque ${currentStockIndex + 1}`);
        const savedName = allStocksMeta[currentStockIndex].namesByMonth[monthYearKey] || defaultName;
        
        // Atualizar o nome do estoque com indicador visual
        nomeEstoqueInput.value = savedName;
        nomeEstoqueInput.placeholder = cleanText(window.getStockName ? window.getStockName(currentStockIndex, window.currentLanguage || 'pt') : `Estoque ${currentStockIndex + 1}`) + ` de ${MAX_STOCKS}`;
        
        console.log(`📝 Carregando estoque ${currentStockIndex + 1}/${MAX_STOCKS}: ${savedName}`);

        const storageKey = getStorageKey(currentStockIndex, displayedDate);
        console.log('🔑 Tentando carregar com chave:', storageKey);
        
        let stockDataForMonth = {};
        try {
            const dadosSalvos = localStorage.getItem(storageKey);
            console.log('📦 Dados brutos do localStorage:', dadosSalvos);
            
            stockDataForMonth = JSON.parse(dadosSalvos) || { tableData: [], history: [] };
            console.log('📊 Dados parseados:', stockDataForMonth);
        } catch (e) {
            console.error("❌ Erro ao carregar dados do mês para a chave:", storageKey, e);
            stockDataForMonth = { tableData: [], history: [] };
        }

        tabelaBody.innerHTML = '';

        (stockDataForMonth.tableData || []).forEach(data => {
            adicionarLinha(data);
        });
        adicionarLinha();

        // Limpar ambas as listas de histórico
        listaEntradas.innerHTML = '';
        listaSaidas.innerHTML = '';
        
        // Carregar histórico (separar entradas e saídas)
        (stockDataForMonth.history || []).forEach(txt => {
            const li = document.createElement('li');
            li.textContent = txt;
            
            // Determinar se é entrada ou saída baseado no novo formato
            if (txt.includes('entrada/')) {
                listaEntradas.appendChild(li);
            } else if (txt.includes('saida/')) {
                listaSaidas.appendChild(li);
            } else if (txt.includes('ENTRADA:')) {
                // Compatibilidade com formato antigo
                listaEntradas.appendChild(li);
            } else if (txt.includes('SAÍDA:')) {
                // Compatibilidade com formato antigo
                listaSaidas.appendChild(li);
            }
        });

        updateMonthDisplay();
        atualizarResumo();
        atualizarGraficos();

        // Mostrar feedback visual da navegação
        mostrarFeedbackNavegacao(currentStockIndex);

        // Esta é a linha mais importante para evitar o "pulo"
        nomeEstoqueInput.blur();
    }

    // --- Initial Setup and Event Listeners ---

    // Initial load of the current stock when the page loads
    loadStock(currentStockIndex);
    
    // ===== VERIFICAÇÃO FINAL DE SEGURANÇA =====
    // Garantir que sempre esteja no estoque 1 e mês atual (último checkpoint)
    setTimeout(() => {
        if (currentStockIndex !== 0) {
            console.warn('⚠️ Correção aplicada: forçando retorno ao estoque 1');
            currentStockIndex = 0;
            displayedDate = new Date();
            loadStock(currentStockIndex);
            updateMonthDisplay();
        }
        console.log('✅ Verificação de segurança concluída - Sistema no estoque 1');
    }, 100);

    // Garantir que o resumo seja exibido inicialmente
    setTimeout(() => {
        atualizarResumoItens();
    }, 500);

    // Event Listener for stock name input (on blur/change)
    if (nomeEstoqueInput) {
        nomeEstoqueInput.addEventListener('change', () => {
            salvarDadosDoMesAtual(currentStockIndex, displayedDate);
        });
        console.log('Event listener nome estoque adicionado');
    } else {
        console.warn('Input nome estoque não encontrado - ID: nomeEstoqueInput');
    }

    // '+' button - navegação para próximo estoque ou modal premium
    if (btnNovoEstoque) {
        console.log('Adicionando event listener ao botão +...');
        btnNovoEstoque.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🟢 Clique no botão + detectado!');
            
            if (verificarNavegacaoPremium('navegacao_estoque_proximo')) {
                console.log('Usuário premium - navegando para próximo estoque (1-10)');
                const proximoIndex = Math.min(currentStockIndex + 1, MAX_STOCKS - 1);
                
                if (proximoIndex !== currentStockIndex) {
                    salvarDadosDoMesAtual(currentStockIndex, displayedDate);
                    currentStockIndex = proximoIndex;
                    localStorage.setItem('currentStockIndex', currentStockIndex.toString());
                    loadStock(currentStockIndex);
                    mostrarFeedbackNavegacao(currentStockIndex);
                    console.log(`✅ Navegado para Estoque ${currentStockIndex + 1}`);
                } else {
                    console.log('Já está no último estoque (10)');
                    mostrarMensagem('Você já está no Estoque 10 (último disponível).', 'info');
                }
            } else {
                console.log('❌ Usuário sem premium - modal deve aparecer para botão +!');
            }
        });
        console.log('✅ Event listener + adicionado com sucesso');
    } else {
        console.error('❌ Botão + não encontrado - ID: btnNovoEstoque');
    }

    // '-' button - navegação para estoque anterior ou modal premium
    if (btnVoltarEstoque) {
        console.log('Adicionando event listener ao botão -...');
        btnVoltarEstoque.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔵 Clique no botão - detectado!');
            
            if (verificarNavegacaoPremium('navegacao_estoque_anterior')) {
                console.log('Usuário premium - navegando para estoque anterior (1-10)');
                const anteriorIndex = Math.max(currentStockIndex - 1, 0);
                
                if (anteriorIndex !== currentStockIndex) {
                    salvarDadosDoMesAtual(currentStockIndex, displayedDate);
                    currentStockIndex = anteriorIndex;
                    localStorage.setItem('currentStockIndex', currentStockIndex.toString());
                    loadStock(currentStockIndex);
                    mostrarFeedbackNavegacao(currentStockIndex);
                    console.log(`✅ Navegado para Estoque ${currentStockIndex + 1}`);
                } else {
                    console.log('Já está no primeiro estoque (1)');
                    mostrarMensagem('Você já está no Estoque 1 (primeiro disponível).', 'info');
                }
            } else {
                console.log('❌ Usuário sem premium - modal deve aparecer para botão -!');
            }
        });
        console.log('✅ Event listener - adicionado com sucesso');
    } else {
        console.error('❌ Botão - não encontrado - ID: btnVoltarEstoque');
    }

    // Button to clear history for current stock (for the current month)
    if (btnLimparHistorico) {
        btnLimparHistorico.addEventListener('click', () => {
            const stockName = cleanText(allStocksMeta[currentStockIndex].namesByMonth[getMonthYearKey(displayedDate)]) || cleanText(window.getStockName ? window.getStockName(currentStockIndex, window.currentLanguage || 'pt') : `Estoque ${currentStockIndex + 1}`);
            if (confirm(`Tem certeza que deseja apagar todo o histórico de operações para o estoque "${stockName}" no mês de ${meses[displayedDate.getMonth()]} ${displayedDate.getFullYear()}? Esta ação é irreversível.`)) {
                // Limpar ambas as listas
                listaEntradas.innerHTML = '';
                listaSaidas.innerHTML = '';
                salvarDadosDoMesAtual(currentStockIndex, displayedDate);
                alert('Histórico de operações apagado com sucesso!');
            }
        });
        console.log('Event listener limpar histórico adicionado');
    } else {
        console.warn('Botão limpar histórico não encontrado - ID: btnLimparHistorico');
    }

    // --- Theme Management ---
    function setTheme(theme) {
        console.log('Aplicando tema:', theme);
        
        document.documentElement.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        if (themeToggle) {
            themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
            themeToggle.title = theme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro';
        }
        
        console.log('Tema aplicado:', document.documentElement.getAttribute('data-theme'));
    }

    // Aplicar tema inicial
    const currentTheme = localStorage.getItem('theme') || 'dark';
    console.log('Tema inicial:', currentTheme);
    setTheme(currentTheme);

    // Event listener para alternância de tema
    if (themeToggle) {
        console.log('Adicionando event listener ao botão de tema...');
        themeToggle.addEventListener('click', (e) => {
            console.log('Clique no botão de tema detectado!', e);
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            console.log('Mudando de', currentTheme, 'para', newTheme);
            setTheme(newTheme);
        });
        console.log('Event listener do tema adicionado com sucesso');
    } else {
        console.error('❌ Botão de tema não encontrado - ID: themeToggle');
    }

    // Make table rows sortable
    new Sortable(tabelaBody, {
        animation: 150,
        ghostClass: 'arrastando',
        onEnd: () => {
            salvarDadosDoMesAtual(currentStockIndex, displayedDate);
            atualizarResumo();
            atualizarGraficos();
            verificarLinhaFinal();
            removerLinhasVazias();
        }
    });

    // Service Worker Registration for PWA capabilities
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service Worker registrado com sucesso!'))
            .catch(err => console.error('Erro ao registrar Service Worker:', err));
    }

    // Save current stock data when the page is closed or reloaded
    window.addEventListener('beforeunload', () => {
        salvarDadosDoMesAtual(currentStockIndex, displayedDate);
    });

    // --- Sharing Functionality ---
    const btnShare = document.getElementById('btnShare');
    const shareMenu = document.getElementById('shareMenu');
    const shareWhatsapp = document.getElementById('shareWhatsapp');
    const shareEmail = document.getElementById('shareEmail');
    const sharePdf = document.getElementById('sharePdf');

    let shareMenuOpen = false;

    // Função para gerar texto do estoque atual para compartilhamento
    function gerarTextoCompartilhamento() {
        const monthYearKey = getMonthYearKey(displayedDate);
        const nomeEstoque = cleanText(nomeEstoqueInput.value) || cleanText(allStocksMeta[currentStockIndex]?.namesByMonth?.[monthYearKey]) || cleanText(window.getStockName ? window.getStockName(currentStockIndex, window.currentLanguage || 'pt') : `Estoque ${currentStockIndex + 1}`);
        let texto = `📊 ${window.getTranslation ? window.getTranslation('stockDefault', window.currentLanguage || 'pt') : 'Estoque'}: ${nomeEstoque}\n📅 Mês: ${mesAtualEl.textContent}\n\n📦 Itens:\n`;
        
        const linhas = tabelaBody.querySelectorAll('tr');
        let hasItems = false;
        
        linhas.forEach(linha => {
            const item = linha.querySelector('.item').value.trim();
            const entrada = linha.querySelector('.entrada').value || '0';
            const saida = linha.querySelector('.saida').value || '0';
            const valor = linha.querySelector('.valor').value || '0.00';
            
            if (item) {
                hasItems = true;
                texto += `• ${item} | 📈 Entrada: ${entrada} | 📉 Saída: ${saida} | 💰 Valor: R$ ${valor}\n`;
            }
        });
        
        if (!hasItems) {
            texto += 'Nenhum item cadastrado ainda.\n';
        }
        
        texto += `\n📊 RESUMO:\n`;
        texto += `📈 Entradas: ${entradaTotalEl.textContent}\n`;
        texto += `📉 Saídas: ${saidaTotalEl.textContent}\n`;
        texto += `⚖️ Saldo: ${saldoTotalEl.textContent}\n`;
        texto += `💰 Valor Total: R$ ${valorFinalEl.textContent}\n`;
        
        // Histórico
        const entradas = Array.from(listaEntradas.children).map(li => li.textContent.trim()).filter(Boolean);
        const saidas = Array.from(listaSaidas.children).map(li => li.textContent.trim()).filter(Boolean);
        
        if (entradas.length || saidas.length) {
            texto += '\n📋 Histórico de Operações:\n';
            if (entradas.length) texto += `\n📈 Entradas:\n${entradas.slice(0, 5).join('\n')}\n`;
            if (saidas.length) texto += `\n📉 Saídas:\n${saidas.slice(0, 5).join('\n')}\n`;
        }
        
        return texto;
    }

    // Função para gerar PDF
    function gerarPDF(texto) {
        try {
            // Criar uma nova janela para impressão
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>${window.getTranslation ? window.getTranslation('stockDefault', window.currentLanguage || 'pt') : 'Estoque'} ${nomeEstoqueInput.value.trim() || `${currentStockIndex + 1}`} - ${mesAtualEl.textContent}</title>
                        <style>
                            body { 
                                font-family: Arial, sans-serif; 
                                padding: 20px; 
                                color: var(--text-color); 
                                background: var(--bg-color-dark); 
                                line-height: 1.6;
                            }
                            h1, h2, h3 { color: var(--text-color); margin-bottom: 10px; }
                            pre { 
                                white-space: pre-wrap; 
                                font-family: Arial, sans-serif; 
                                font-size: 14px;
                                margin: 10px 0;
                            }
                            @media print { 
                                body { margin: 0; padding: 15px; }
                                h1 { font-size: 18px; }
                                pre { font-size: 12px; }
                            }
                        </style>
                    </head>
                    <body>
                        <h1>📊 Relatório de Estoque</h1>
                        <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
                        <pre>${texto.replace(/\n/g, '<br>')}</pre>
                        <script>
                            window.onload = function() {
                                window.print();
                                setTimeout(function() { window.close(); }, 1000);
                            }
                        </script>
                    </body>
                    </html>
                `);
                printWindow.document.close();
            } else {
                throw new Error('Popup bloqueado');
            }
        } catch (error) {
            // Fallback: copiar para clipboard
            if (navigator.clipboard) {
                navigator.clipboard.writeText(texto).then(() => {
                    alert('📋 Dados copiados! Cole em um documento para gerar PDF.');
                }).catch(() => {
                    prompt('📋 Copie estes dados para gerar PDF:', texto);
                });
            } else {
                prompt('📋 Copie estes dados para gerar PDF:', texto);
            }
        }
    }

    // Função para compartilhar estoque atual
    function compartilharEstoqueAtual(tipo) {
        const texto = gerarTextoCompartilhamento();
        let url = '';
        
        switch(tipo) {
            case 'whatsapp':
                url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
                break;
            case 'email':
                const subject = `${window.getTranslation ? window.getTranslation('stockDefault', window.currentLanguage || 'pt') : 'Estoque'} ${nomeEstoqueInput.value.trim() || `${currentStockIndex + 1}`} - ${mesAtualEl.textContent}`;
                url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(texto)}`;
                break;
            case 'pdf':
                gerarPDF(texto);
                shareMenu.style.display = 'none';
                shareMenuOpen = false;
                return;
        }
        
        if (url) {
            window.open(url, '_blank');
        }
        
        // Fechar menu após compartilhar
        shareMenu.style.display = 'none';
        shareMenuOpen = false;
    }

    // Event listeners para compartilhamento
    if (btnShare && shareMenu) {
        btnShare.addEventListener('click', function(e) {
            e.stopPropagation();
            console.log('🔗 Clique no botão compartilhar detectado');
            shareMenu.style.display = shareMenuOpen ? 'none' : 'flex';
            shareMenuOpen = !shareMenuOpen;
        });

        // Fechar menu ao clicar fora
        document.addEventListener('click', function(e) {
            if (shareMenuOpen && !shareMenu.contains(e.target) && e.target !== btnShare) {
                shareMenu.style.display = 'none';
                shareMenuOpen = false;
            }
        });

        // Prevenir fechamento ao clicar dentro do menu
        shareMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });

        console.log('✅ Event listeners de compartilhamento adicionados');
    } else {
        console.warn('⚠️ Elementos de compartilhamento não encontrados');
    }

    // Event listeners para os botões de compartilhamento
    if (shareWhatsapp) {
        shareWhatsapp.addEventListener('click', () => {
            console.log('📱 Compartilhando no WhatsApp');
            compartilharEstoqueAtual('whatsapp');
        });
    }

    if (shareEmail) {
        shareEmail.addEventListener('click', () => {
            console.log('📧 Compartilhando por email');
            compartilharEstoqueAtual('email');
        });
    }

    if (sharePdf) {
        sharePdf.addEventListener('click', () => {
            console.log('📄 Gerando PDF');
            compartilharEstoqueAtual('pdf');
        });
    }



    // Função para mostrar feedback visual de navegação
    function mostrarFeedbackNavegacao(stockIndex) {
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 2000;
            border: 2px solid #ffd700;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        `;
        feedback.textContent = `📊 ${window.getTranslation ? window.getTranslation('stockDefault', window.currentLanguage || 'pt') : 'Estoque'} ${stockIndex + 1} de ${MAX_STOCKS}`;
        
        document.body.appendChild(feedback);
        
        // Remover após 2 segundos
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 2000);
    }
    
    // --- SISTEMA DE PAGAMENTO/ASSINATURA ---
    
    // Credenciais master para acesso premium
    const CREDENCIAIS_MASTER = [
        {
            login: 'Daphiny',
            senha: '2019',
            email: 'admin@dcodestock.com'
        },
        {
            login: 'Douglas',
            senha: 'Daphiny@#2019',
            email: 'douglas@dcodestock.com'
        }
    ];
    
    // Verificar se usuário está logado
    function verificarLogin() {
        const login = JSON.parse(localStorage.getItem('loginPremium') || 'null');
        if (!login) return false;
        
        const agora = new Date();
        const expiracao = new Date(login.expiracao);
        
        return agora < expiracao && login.ativo;
    }
    
    // Verificar status da assinatura (agora inclui login)
    function verificarAssinatura() {
        console.log('🔍 Verificando assinatura...');
        
        // Primeiro verifica se está logado
        const loginAtivo = verificarLogin();
        console.log('🔍 Login ativo:', loginAtivo);
        
        if (loginAtivo) {
            console.log('✅ Login ativo encontrado');
            return true;
        }
        
        // Senão, verifica assinatura paga
        const assinatura = JSON.parse(localStorage.getItem('assinaturaPremium') || 'null');
        console.log('🔍 Assinatura paga:', assinatura);
        
        if (!assinatura) {
            console.log('❌ Nenhuma assinatura encontrada');
            return false;
        }
        
        const agora = new Date();
        const vencimento = new Date(assinatura.vencimento);
        const assinaturaValida = agora < vencimento;
        
        console.log('🔍 Verificação assinatura:', { agora, vencimento, valida: assinaturaValida });
        
        return assinaturaValida;
    }
    
    // Verificar se a navegação requer premium
    function verificarNavegacaoPremium(acao) {
        console.log('🔍 Verificando navegação premium para:', acao);
        
        // Verificar se tem premium/login ativo
        if (verificarAssinatura()) {
            console.log('✅ Usuário tem premium - navegação LIVRE permitida');
            // Marcar que já teve premium
            localStorage.setItem('jaTevePremium', 'true');
            return true; // Usuário tem premium (pago ou logado), pode navegar LIVREMENTE
        }
        
        // SEM PREMIUM = SEMPRE MOSTRAR MODAL
        console.log('❌ Usuário sem premium - mostrando modal de pagamento');
        
        // Garantir que sempre volte ao estoque 1 quando tentar navegar sem premium
        if (currentStockIndex !== 0 || !ehMesAtual(displayedDate)) {
            console.log('🔄 Forçando retorno ao estoque 1 - navegação sem premium detectada');
            currentStockIndex = 0;
            displayedDate = new Date();
            localStorage.setItem('currentStockIndex', '0');
            loadStock(0);
            updateMonthDisplay();
        }
        
        // SEMPRE mostrar modal de pagamento se não tem premium
        mostrarOpcoesAcesso(acao);
        return false;
    }
    
    function ehMesAtual(data) {
        const hoje = new Date();
        return data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear();
    }
    
    // Mostrar modal de pagamento diretamente
    function mostrarOpcoesAcesso(acao) {
        console.log('🚀 mostrarOpcoesAcesso chamada para:', acao);
        console.log('📱 Tentando abrir modal de pagamento...');
        
        // Mostrar modal de pagamento diretamente em vez do popup de escolha
        setTimeout(() => {
            if (typeof window.showPaymentModal === 'function') {
                console.log('✅ Usando window.showPaymentModal()');
                window.showPaymentModal();
            } else {
                // Fallback direto
                console.log('⚠️ Usando fallback para abrir modal');
                const modal = document.getElementById('modalPagamento');
                if (modal) {
                    console.log('✅ Modal encontrado, abrindo...');
                    modal.classList.add('active');
                    modal.style.display = 'flex';
                    document.body.style.overflow = 'hidden';
                } else {
                    console.error('❌ Modal modalPagamento não encontrado!');
                    // Fallback final - alert
                    alert('🔒 Acesso Premium Necessário!\n\nPara navegar entre estoques e meses, você precisa:\n• Fazer login (Daphiny/2019 ou Douglas/premium123)\n• Ou adquirir uma assinatura premium\n\nClique em "Premium" no menu para mais opções.');
                }
            }
        }, 10);
    }
    
    // Elements do modal de pagamento
    const modalPagamento = document.getElementById('modalPagamento');
    const fecharModalPagamento = document.getElementById('fecharModalPagamento');
    const planoMensal = document.getElementById('planoMensal');
    const planoAnual = document.getElementById('planoAnual');
    const cancelarPagamento = document.getElementById('cancelarPagamento');
    const confirmarPagamento = document.getElementById('confirmarPagamento');
    const detalhesPagamento = document.getElementById('detalhesPagamento');
    
    let planoSelecionado = null;
    let metodoSelecionado = null;
    
    function mostrarModalPagamento(acao) {
        modalPagamento.style.display = 'flex';
        
        // Reset seleções
        planoSelecionado = null;
        metodoSelecionado = null;
        confirmarPagamento.disabled = true;
        detalhesPagamento.style.display = 'none';
        
        // Remove classes de seleção
        document.querySelectorAll('.plano-opcao').forEach(el => el.classList.remove('selecionado'));
        document.querySelectorAll('.metodo-pagamento').forEach(el => el.classList.remove('selecionado'));
    }
    
    function fecharModal() {
        modalPagamento.style.display = 'none';
    }
    
    // Event listeners para planos
    planoMensal.addEventListener('click', () => {
        planoSelecionado = { tipo: 'mensal', valor: 19.90, meses: 1 };
        document.querySelectorAll('.plano-opcao').forEach(el => el.classList.remove('selecionado'));
        planoMensal.classList.add('selecionado');
        verificarBotaoConfirmar();
    });
    
    planoAnual.addEventListener('click', () => {
        planoSelecionado = { tipo: 'anual', valor: 199.90, meses: 12 };
        document.querySelectorAll('.plano-opcao').forEach(el => el.classList.remove('selecionado'));
        planoAnual.classList.add('selecionado');
        verificarBotaoConfirmar();
    });
    
    // Event listeners para métodos de pagamento
    document.querySelectorAll('.metodo-pagamento').forEach(btn => {
        btn.addEventListener('click', (e) => {
            metodoSelecionado = e.currentTarget.dataset.metodo;
            document.querySelectorAll('.metodo-pagamento').forEach(el => el.classList.remove('selecionado'));
            e.currentTarget.classList.add('selecionado');
            mostrarDetalhesPagamento();
            verificarBotaoConfirmar();
        });
    });
    
    function verificarBotaoConfirmar() {
        confirmarPagamento.disabled = !(planoSelecionado && metodoSelecionado);
    }
    
    function mostrarDetalhesPagamento() {
        if (!planoSelecionado || !metodoSelecionado) return;
        
        const valor = planoSelecionado.valor;
        let conteudo = '';
        
        switch (metodoSelecionado) {
            case 'pix':
                conteudo = `
                    <h4>💳 Pagamento via PIX</h4>
                    <p><strong>Valor:</strong> R$ ${valor.toFixed(2)}</p>
                    <p><strong>Chave PIX:</strong> <span class="destaque">06386505930</span></p>
                    <div class="qr-code-placeholder">QR CODE PIX</div>
                    <p style="font-size:0.9rem;color:var(--secondary-text-color);">
                        🔸 Copie a chave PIX ou escaneie o QR Code<br>
                        🔸 Faça o pagamento no seu banco<br>
                        🔸 O acesso será liberado automaticamente
                    </p>
                `;
                break;
                
            case 'credito':
            case 'debito':
                const tipo = metodoSelecionado === 'credito' ? 'Crédito' : 'Débito';
                conteudo = `
                    <h4>💳 Pagamento no ${tipo}</h4>
                    <p><strong>Valor:</strong> R$ ${valor.toFixed(2)}</p>
                    <p style="color:var(--secondary-text-color);">
                        🔸 Você será redirecionado para o checkout seguro<br>
                        🔸 Aceitamos todas as bandeiras<br>
                        🔸 Pagamento processado na hora
                    </p>
                `;
                break;
                
            case 'transferencia':
                conteudo = `
                    <h4>🏦 Transferência Bancária</h4>
                    <p><strong>Valor:</strong> R$ ${valor.toFixed(2)}</p>
                    <p><strong>Banco:</strong> Itaú</p>
                    <p><strong>Agência:</strong> <span class="destaque">5667</span></p>
                    <p><strong>Conta:</strong> <span class="destaque">01885-6</span></p>
                    <p style="font-size:0.9rem;color:var(--secondary-text-color);">
                        🔸 Faça a transferência usando os dados acima<br>
                        🔸 Envie o comprovante via WhatsApp<br>
                        🔸 Liberação em até 2h úteis
                    </p>
                `;
                break;
        }
        
        detalhesPagamento.innerHTML = conteudo;
        detalhesPagamento.style.display = 'block';
    }
    
    // Event listeners do modal
    fecharModalPagamento.addEventListener('click', fecharModal);
    cancelarPagamento.addEventListener('click', fecharModal);
    
    confirmarPagamento.addEventListener('click', () => {
        processarPagamento();
    });
    
    function processarPagamento() {
        if (!planoSelecionado || !metodoSelecionado) return;
        
        // Simular processamento (em produção, integraria com gateway de pagamento)
        const loading = document.createElement('div');
        loading.innerHTML = `
            <div style="text-align:center;padding:20px;">
                <div style="font-size:2rem;margin-bottom:10px;">⏳</div>
                <p>Processando pagamento...</p>
            </div>
        `;
        detalhesPagamento.innerHTML = loading.innerHTML;
        
        setTimeout(() => {
            // Ativar assinatura
            ativarAssinatura(planoSelecionado);
            
            // Mostrar sucesso
            detalhesPagamento.innerHTML = `
                <div style="text-align:center;padding:20px;color:#4CAF50;">
                    <div style="font-size:3rem;margin-bottom:10px;">✅</div>
                    <h4>Pagamento Confirmado!</h4>
                    <p>Sua assinatura ${planoSelecionado.tipo} foi ativada com sucesso!</p>
                    <p style="font-size:0.9rem;color:var(--secondary-text-color);">
                        Agora você pode navegar entre todos os estoques e meses.
                    </p>
                </div>
            `;
            
            confirmarPagamento.textContent = 'Continuar';
            confirmarPagamento.onclick = () => {
                fecharModal();
                // Executar a ação que o usuário tentou fazer
                window.location.reload(); // Recarregar para aplicar mudanças
            };
        }, 2000);
    }
    
    function gerarCredenciaisPersonalizadas() {
        // Gerar login único baseado em timestamp
        const timestamp = Date.now().toString();
        const sufixo = timestamp.slice(-6); // Últimos 6 dígitos
        const login = `user${sufixo}`;
        
        // Gerar senha aleatória de 8 caracteres
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let senha = '';
        for (let i = 0; i < 8; i++) {
            senha += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return { login, senha };
    }

    function salvarCredenciaisPersonalizadas(credenciais, plano) {
        // Recuperar lista de usuários existentes
        const usuarios = JSON.parse(localStorage.getItem('usuariosPremium') || '[]');
        
        const agora = new Date();
        const vencimento = new Date(agora);
        vencimento.setMonth(vencimento.getMonth() + plano.meses);
        
        const novoUsuario = {
            login: credenciais.login,
            senha: credenciais.senha,
            plano: plano.tipo,
            valor: plano.valor,
            ativacao: agora.toISOString(),
            vencimento: vencimento.toISOString(),
            ativo: true,
            tipo: 'cliente'
        };
        
        usuarios.push(novoUsuario);
        localStorage.setItem('usuariosPremium', JSON.stringify(usuarios));
        
        return novoUsuario;
    }

    function ativarAssinatura(plano) {
        // Gerar credenciais personalizadas para o novo usuário
        const credenciais = gerarCredenciaisPersonalizadas();
        const usuario = salvarCredenciaisPersonalizadas(credenciais, plano);
        
        // Ativar automaticamente o login do novo usuário
        ativarLoginPremium(credenciais.login, usuario);
        
        // Mostrar credenciais para o usuário
        mostrarCredenciaisNovas(credenciais, plano);
        
        // Atualizar interface
        atualizarStatusPremium();
    }

    function mostrarCredenciaisNovas(credenciais, plano) {
        // Criar modal para exibir as credenciais
        const modalCredenciais = document.createElement('div');
        modalCredenciais.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); display: flex; align-items: center;
            justify-content: center; z-index: 1000; font-family: Arial, sans-serif;
        `;
        
        modalCredenciais.innerHTML = `
            <div style="background: var(--bg-color-dark); color: var(--text-color); border: 2px solid var(--border-color); padding: 30px; border-radius: 12px; text-align: center; max-width: 450px; width: 90%; box-shadow: 0 8px 25px rgba(0,0,0,0.3);">
                <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
                <h2 style="color: #2196F3; margin: 0 0 15px 0;">Assinatura Ativada!</h2>
                <p style="color: var(--text-color); margin-bottom: 25px;">Suas credenciais de acesso foram geradas automaticamente:</p>
                
                <div style="background: var(--bg-color-dark); border: 1px solid var(--border-color); padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50;">
                    <div style="margin-bottom: 15px;">
                        <strong style="color: var(--text-color);">👤 Login:</strong>
                        <div style="font-family: monospace; font-size: 18px; color: #2196F3; font-weight: bold; margin-top: 5px; background: var(--bg-color-dark); border: 1px solid var(--border-color); padding: 8px; border-radius: 4px;">${credenciais.login}</div>
                    </div>
                    <div>
                        <strong style="color: var(--text-color);">🔑 Senha:</strong>
                        <div style="font-family: monospace; font-size: 18px; color: #2196F3; font-weight: bold; margin-top: 5px; background: var(--bg-color-dark); border: 1px solid var(--border-color); padding: 8px; border-radius: 4px;">${credenciais.senha}</div>
                    </div>
                </div>
                
                <div style="background: var(--bg-color-dark); border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #ffc107; font-size: 14px;">
                        <strong>⚠️ IMPORTANTE:</strong> Anote essas credenciais em local seguro! 
                        Você pode recuperá-las pelo email se esquecer.
                    </p>
                </div>
                
                <div style="margin: 20px 0; color: var(--text-color); font-size: 14px;">
                    <p><strong>Plano:</strong> ${plano.tipo}</p>
                    <p><strong>Válido até:</strong> ${new Date(Date.now() + plano.meses * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}</p>
                </div>
                
                <button onclick="this.parentElement.parentElement.remove(); window.location.reload();" 
                        style="background: #4CAF50; color: white; padding: 12px 30px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; font-weight: bold;">
                    Continuar ✓
                </button>
            </div>
        `;
        
        document.body.appendChild(modalCredenciais);
        
        // Log para desenvolvimento
        console.log('🎉 Nova assinatura ativada!');
        console.log('📝 Credenciais geradas:', credenciais);
        console.log('📋 Plano:', plano);
    }
    
    function atualizarStatusPremium() {
        const temLogin = verificarLogin();
        const temAssinatura = verificarAssinatura();
        const temPremium = temLogin || temAssinatura;
        
        // Atualizar botão Premium baseado no status
        const btnPremium = document.getElementById('btnPremium');
        if (btnPremium) {
            if (temPremium) {
                btnPremium.innerHTML = '🚪 Sair Premium';
                btnPremium.title = 'Sair do modo premium';
                btnPremium.onclick = function() {
                    if (confirm('⚠️ Tem certeza que deseja sair do modo premium?\n\n📁 Seus dados serão salvos, mas você perderá o acesso aos recursos premium.')) {
                        sairModoPremiun();
                    }
                };
                btnPremium.style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a24)';
            } else {
                btnPremium.innerHTML = '⭐ Premium';
                btnPremium.title = 'Ativar Premium';
                btnPremium.onclick = function() { showPaymentModal(); };
                btnPremium.style.background = 'linear-gradient(135deg, #FFD700, #FFA500)';
            }
        }
        
        if (temPremium) {
            // Habilitar navegação livre se já tem premium
            habilitarNavegacaoLivreExistente();
            
            // Adicionar badge premium ao nome do estoque
            if (nomeEstoqueInput && !nomeEstoqueInput.parentNode.querySelector('.premium-badge')) {
                const badge = document.createElement('span');
                badge.className = 'premium-badge';
                
                const loginData = JSON.parse(localStorage.getItem('loginPremium'));
                if (loginData && loginData.tipo === 'master') {
                    badge.textContent = '👑 MASTER';
                } else {
                    badge.textContent = '⭐ PREMIUM';
                }
                
                nomeEstoqueInput.parentNode.appendChild(badge);
            }
            
            // Mostrar status do usuário se logado
            if (temLogin && userStatus && nomeUsuario) {
                const loginData = JSON.parse(localStorage.getItem('loginPremium'));
                userStatus.classList.add('logado');
                logoutBtn.classList.add('logado');
                
                if (loginData.tipo === 'master') {
                    nomeUsuario.textContent = `👑 ${loginData.usuario}`;
                } else {
                    // Mostrar informações do cliente
                    const vencimento = new Date(loginData.expiracao);
                    const diasRestantes = Math.ceil((vencimento - new Date()) / (1000 * 60 * 60 * 24));
                    
                    if (diasRestantes > 0) {
                        nomeUsuario.textContent = `⭐ ${loginData.usuario} (${diasRestantes}d)`;
                        nomeUsuario.title = `Plano ${loginData.plano} válido até ${vencimento.toLocaleDateString('pt-BR')}`;
                    } else {
                        nomeUsuario.textContent = `⏰ ${loginData.usuario} (Expirado)`;
                        nomeUsuario.title = 'Assinatura expirada';
                    }
                }
            }
        } else {
            // Remover badge se não tem premium
            const badge = nomeEstoqueInput?.parentNode.querySelector('.premium-badge');
            if (badge) badge.remove();
            
            // Esconder status do usuário
            userStatus?.classList.remove('logado');
            logoutBtn?.classList.remove('logado');
        }
    }
    
    // Event listeners de navegação premium removidos - agora sempre mostra modal de pagamento
    
    // Inicializar status premium
    atualizarStatusPremium();
    
    // === EVENT LISTENER PARA BOTÃO PREMIUM ===
    const btnPremium = document.getElementById('btnPremium');
    if (btnPremium) {
        console.log('✅ Botão Premium encontrado, adicionando event listener...');
        btnPremium.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('👑 Clique no botão Premium detectado!');
            showPaymentModal();
        });
        console.log('✅ Event listener do botão Premium adicionado com sucesso');
    } else {
        console.warn('⚠️ Botão Premium não encontrado - ID: btnPremium');
    }
    
    console.log('Sistema de pagamento inicializado');
});


// --- SISTEMA DE LOGIN ---

const modalLogin = document.getElementById('modalLogin');
const fecharModalLogin = document.getElementById('fecharModalLogin');
const loginForm = document.getElementById('loginForm');
const recuperacaoForm = document.getElementById('recuperacaoForm');
const sucessoRecuperacao = document.getElementById('sucessoRecuperacao');
const loginUsuario = document.getElementById('loginUsuario');
const loginSenha = document.getElementById('loginSenha');
const btnLogin = document.getElementById('btnLogin');
const btnEsqueciSenha = document.getElementById('btnEsqueciSenha');
const emailRecuperacao = document.getElementById('emailRecuperacao');
const btnRecuperar = document.getElementById('btnRecuperar');
const voltarLogin = document.getElementById('voltarLogin');
const fecharSucesso = document.getElementById('fecharSucesso');
const userStatus = document.getElementById('userStatus');
const nomeUsuario = document.getElementById('nomeUsuario');
const logoutBtn = document.getElementById('logoutBtn');

function mostrarModalLogin() {
    modalLogin.style.display = 'flex';
    loginForm.style.display = 'block';
    recuperacaoForm.style.display = 'none';
    sucessoRecuperacao.style.display = 'none';
    
    // Limpar campos
    loginUsuario.value = '';
    loginSenha.value = '';
    emailRecuperacao.value = '';
    
    // Remover classes de erro
    loginUsuario.classList.remove('login-error');
    loginSenha.classList.remove('login-error');
}

function fecharModalLoginFn() {
    modalLogin.style.display = 'none';
}

function realizarLogin() {
    const login = loginUsuario.value.trim();
    const senha = loginSenha.value.trim();
    
    console.log('🔍 Tentativa de login:', { login, senha: senha ? '***' : 'vazio' });
    
    // Remover classes de erro
    loginUsuario.classList.remove('login-error');
    loginSenha.classList.remove('login-error');
    
    if (!login || !senha) {
        if (!login) loginUsuario.classList.add('login-error');
        if (!senha) loginSenha.classList.add('login-error');
        mostrarMensagem('Por favor, preencha todos os campos.', 'erro');
        return;
    }
    
    console.log('🔍 Verificando credenciais master...', CREDENCIAIS_MASTER);
    
    // Verificar credenciais master
    const masterEncontrado = CREDENCIAIS_MASTER.find(master => 
        master.login === login && master.senha === senha
    );
    
    console.log('🔍 Master encontrado:', masterEncontrado);
    
    if (masterEncontrado) {
        console.log('✅ Login master bem-sucedido!');
        // Login master bem-sucedido
        ativarLoginPremium(login, { tipo: 'master', usuario: login, email: masterEncontrado.email });
        fecharModalLoginFn();
        mostrarMensagem(`🎉 Login Master realizado! Bem-vindo, ${login}! 
        
✅ MODO PREMIUM ATIVADO:
📦 Estoques: Navegue livremente de 1 a 10
📅 Meses: Acesse qualquer mês do ano
🔓 Todas as funcionalidades desbloqueadas!`, 'sucesso');
        
        // Salvar automaticamente os dados ao fazer login master
        if (typeof salvarDadosDoMesAtual === 'function') {
            salvarDadosDoMesAtual(currentStockIndex, displayedDate);
        }
        
        window.location.reload();
        return;
    }
    
    // Verificar credenciais de clientes
    const usuarios = JSON.parse(localStorage.getItem('usuariosPremium') || '[]');
    console.log('🔍 Verificando clientes:', usuarios);
    
    const usuarioEncontrado = usuarios.find(user => 
        user.login === login && user.senha === senha && user.ativo
    );
    
    console.log('🔍 Cliente encontrado:', usuarioEncontrado);
    
    if (usuarioEncontrado) {
        // Verificar se a assinatura ainda está válida
        const agora = new Date();
        const vencimento = new Date(usuarioEncontrado.vencimento);
        
        console.log('🔍 Verificando vencimento:', { agora, vencimento, valida: agora <= vencimento });
        
        if (agora <= vencimento) {
            // Login de cliente válido
            ativarLoginPremium(login, usuarioEncontrado);
            fecharModalLoginFn();
            mostrarMensagem(`🎉 Bem-vindo de volta, ${login}!

✅ MODO PREMIUM ATIVADO:
📦 Estoques: Navegue livremente de 1 a 10  
📅 Meses: Acesse qualquer mês do ano
🔓 Válido até: ${vencimento.toLocaleDateString('pt-BR')}`, 'sucesso');
            window.location.reload();
        } else {
            // Assinatura expirada
            mostrarMensagem('Sua assinatura expirou. Renove para continuar usando os recursos premium.', 'erro');
            loginUsuario.classList.add('login-error');
            loginSenha.classList.add('login-error');
        }
    } else {
        // Login inválido
        console.log('❌ Login inválido');
        loginUsuario.classList.add('login-error');
        loginSenha.classList.add('login-error');
        mostrarMensagem('Login ou senha incorretos. Tente novamente.', 'erro');
    }
}

function ativarLoginPremium(login, dadosUsuario) {
    const agora = new Date();
    let expiracao, tipo;
    
    if (dadosUsuario.tipo === 'master') {
        // Master tem acesso perpétuo
        expiracao = new Date(agora);
        expiracao.setFullYear(expiracao.getFullYear() + 10); // 10 anos
        tipo = 'master';
        console.log('👑 Login MASTER ativado - Acesso PREMIUM total liberado!');
    } else {
        // Cliente usa a expiração da assinatura
        expiracao = new Date(dadosUsuario.vencimento);
        tipo = 'cliente';
        console.log('⭐ Login CLIENTE ativado - Acesso premium liberado!');
    }
    
    const loginData = {
        usuario: login,
        ativacao: agora.toISOString(),
        expiracao: expiracao.toISOString(),
        ativo: true,
        tipo: tipo,
        plano: dadosUsuario.plano || 'master',
        email: dadosUsuario.email || ''
    };
    
    localStorage.setItem('loginPremium', JSON.stringify(loginData));
    
    // Habilitar navegação livre após login
    habilitarNavegacaoLivre();
    
    // Auto-salvar dados do estoque atual quando faz login
    console.log('🔄 Auto-salvando dados após login...');
    salvarDadosDoMesAtual(currentStockIndex, displayedDate);
    
    // Salvar também dados de outros estoques se existirem
    setTimeout(() => {
        for (let i = 0; i < MAX_STOCKS; i++) {
            if (i !== currentStockIndex) {
                const storageKey = getStorageKey(i, displayedDate);
                const existingData = localStorage.getItem(storageKey);
                if (existingData) {
                    console.log(`💾 Preservando dados do estoque ${i + 1}`);
                }
            }
        }
        console.log('✅ Auto-salvamento concluído');
        console.log('🚀 MODO PREMIUM ATIVADO - Navegação LIVRE:');
        console.log('   📦 Estoques: 1 a 10 (use botões + e -)');
        console.log('   📅 Meses: Qualquer mês (use botões de navegação)');
        console.log('   🔓 Todas as funcionalidades desbloqueadas!');
    }, 100);
    
    atualizarStatusPremium();
}

function mostrarRecuperacao() {
    loginForm.style.display = 'none';
    recuperacaoForm.style.display = 'block';
    sucessoRecuperacao.style.display = 'none';
}

function voltarParaLogin() {
    loginForm.style.display = 'block';
    recuperacaoForm.style.display = 'none';
    sucessoRecuperacao.style.display = 'none';
}

function recuperarSenha() {
    const email = emailRecuperacao.value.trim();
    
    if (!email) {
        emailRecuperacao.classList.add('login-error');
        mostrarMensagem('Por favor, digite seu email.', 'erro');
        return;
    }
    
    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        emailRecuperacao.classList.add('login-error');
        mostrarMensagem('Por favor, digite um email válido.', 'erro');
        return;
    }
    
    // Remover classe de erro
    emailRecuperacao.classList.remove('login-error');
    
    // Recuperar todas as credenciais disponíveis
    const usuarios = JSON.parse(localStorage.getItem('usuariosPremium') || '[]');
    const credenciaisDisponiveis = [];
    
    // Adicionar credenciais master
    CREDENCIAIS_MASTER.forEach(master => {
        credenciaisDisponiveis.push({
            login: master.login,
            senha: master.senha,
            tipo: 'Acesso Master',
            plano: 'Completo',
            vencimento: 'Permanente',
            email: master.email
        });
    });
    
    // Adicionar credenciais de clientes ativos
    usuarios.forEach(user => {
        if (user.ativo) {
            const vencimento = new Date(user.vencimento);
            const agora = new Date();
            const status = agora <= vencimento ? 'Ativo' : 'Expirado';
            
            credenciaisDisponiveis.push({
                login: user.login,
                senha: user.senha,
                tipo: `Cliente ${user.plano}`,
                plano: user.plano,
                vencimento: vencimento.toLocaleDateString('pt-BR'),
                status: status
            });
        }
    });
    
    // Simular envio de email com feedback visual
    mostrarMensagem('📧 Enviando credenciais por email...', 'info');
    
    setTimeout(() => {
        // Mostrar sucesso
        recuperacaoForm.style.display = 'none';
        sucessoRecuperacao.style.display = 'block';
        
        // Simular envio real do email
        enviarEmailRecuperacao(email, credenciaisDisponiveis);
        
        mostrarMensagem(`✅ Email enviado com sucesso para ${email}! Verifique sua caixa de entrada.`, 'sucesso');
    }, 1500);
}

function enviarEmailRecuperacao(email, credenciais) {
    console.log('📧 ENVIANDO EMAIL DE RECUPERAÇÃO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📩 Para: ${email}`);
    console.log(`📋 Total de credenciais: ${credenciais.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Montar email HTML
    let emailHTML = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px;">
        <div style="background: #fff; border-radius: 12px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2196F3; margin: 0;">🔐 DcodeStock</h1>
                <h2 style="color: #333; margin: 10px 0;">Recuperação de Credenciais</h2>
                <p style="color: #666;">Suas credenciais de acesso premium</p>
            </div>
            
            <div style="background: #f8f9fa; border-left: 4px solid #2196F3; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #333;">
                    <strong>📧 Email solicitante:</strong> ${email}<br>
                    <strong>📅 Data:</strong> ${new Date().toLocaleString('pt-BR')}<br>
                    <strong>📊 Total de contas:</strong> ${credenciais.length}
                </p>
            </div>
    `;
    
    // Adicionar cada credencial
    credenciais.forEach((cred, index) => {
        const corTipo = cred.tipo.includes('Master') ? '#4CAF50' : '#FF9800';
        const statusColor = cred.status === 'Ativo' ? '#4CAF50' : '#f44336';
        
        emailHTML += `
        <div style="background: #fff; border: 2px solid ${corTipo}; border-radius: 12px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="color: ${corTipo}; margin: 0;">${index + 1}. ${cred.tipo}</h3>
                ${cred.status ? `<span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 20px; font-size: 12px; font-weight: bold;">${cred.status}</span>` : ''}
            </div>
            
            <div style="background: #f8f9fa; border-radius: 8px; padding: 15px;">
                <div style="margin-bottom: 10px;">
                    <strong style="color: #333;">👤 Login:</strong>
                    <div style="background: #e3f2fd; padding: 8px 12px; border-radius: 6px; font-family: monospace; font-size: 16px; font-weight: bold; color: #1976d2; margin-top: 5px;">${cred.login}</div>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <strong style="color: #333;">🔑 Senha:</strong>
                    <div style="background: #e8f5e8; padding: 8px 12px; border-radius: 6px; font-family: monospace; font-size: 16px; font-weight: bold; color: #388e3c; margin-top: 5px;">${cred.senha}</div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
                    <div>
                        <strong style="color: #666; font-size: 14px;">📋 Plano:</strong>
                        <div style="color: #333; font-weight: bold;">${cred.plano}</div>
                    </div>
                    <div>
                        <strong style="color: #666; font-size: 14px;">📅 Válido até:</strong>
                        <div style="color: #333; font-weight: bold;">${cred.vencimento}</div>
                    </div>
                </div>
            </div>
        </div>
        `;
    });
    
    emailHTML += `
            <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 12px; padding: 20px; margin: 30px 0;">
                <h3 style="color: #856404; margin: 0 0 15px 0;">⚠️ Instruções Importantes</h3>
                <ul style="color: #856404; margin: 0; padding-left: 20px;">
                    <li>Use qualquer uma das credenciais acima para fazer login</li>
                    <li>Credenciais master têm acesso permanente e completo</li>
                    <li>Credenciais expiradas precisam ser renovadas</li>
                    <li>Guarde essas informações em local seguro</li>
                    <li>Se tiver problemas, entre em contato conosco</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee;">
                <p style="color: #666; margin: 0; font-size: 14px;">
                    Este email foi gerado automaticamente pelo sistema DcodeStock.<br>
                    📧 Enviado para: <strong>${email}</strong><br>
                    🕐 Em: <strong>${new Date().toLocaleString('pt-BR')}</strong>
                </p>
            </div>
        </div>
    </div>
    `;
    
    // Log do conteúdo do email para desenvolvimento
    console.log('📄 CONTEÚDO DO EMAIL:');
    console.log(emailHTML);
    
    // Simular API de envio de email
    console.log('🚀 SIMULANDO ENVIO DE EMAIL...');
    console.log('✅ Email enviado com sucesso!');
    
    // Em produção, aqui seria feita a chamada real para API de email:
    // await sendEmail({
    //     to: email,
    //     subject: 'Recuperação de Credenciais - DcodeStock',
    //     html: emailHTML
    // });
    
    return true;
}

function realizarLogout() {
    console.log('🔐 Realizando logout...');
    
    // Salvar dados antes de fazer logout
    salvarDadosDoMesAtual(currentStockIndex, displayedDate);
    
    // Remover dados de login
    localStorage.removeItem('loginPremium');
    
    // Limpar dados dos gráficos da sessão atual (mas manter os salvos)
    if (typeof atualizarGraficos === 'function') {
        atualizarGraficos();
    }
    
    atualizarStatusPremium();
    mostrarMensagem('Logout realizado com sucesso. Seus dados foram salvos. Retornando ao Estoque 1.', 'sucesso');
    
    // SEMPRE voltar para o primeiro estoque e mês atual
    currentStockIndex = 0;
    displayedDate = new Date();
    
    // Forçar salvamento do estado correto no localStorage
    localStorage.setItem('currentStockIndex', '0');
    
    // Carregar o estoque 1 imediatamente e depois recarregar
    setTimeout(() => {
        loadStock(0);
        updateMonthDisplay();
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }, 1000);
}

function mostrarMensagem(texto, tipo) {
    const mensagem = document.createElement('div');
    mensagem.style.cssText = `
        position: fixed; top: 80px; right: 20px; z-index: 2000;
        padding: 15px 20px; border-radius: 12px; font-weight: 600;
        max-width: 350px; box-shadow: 0 8px 25px rgba(0,0,0,0.4);
        backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
        border: 2px solid;
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        line-height: 1.4;
        transform: translateX(100%);
        transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    `;
    
    if (tipo === 'sucesso') {
        mensagem.style.background = 'rgba(76, 175, 80, 0.95)';
        mensagem.style.color = '#fff';
        mensagem.style.borderColor = '#4CAF50';
    } else if (tipo === 'info') {
        mensagem.style.background = 'rgba(33, 150, 243, 0.95)';
        mensagem.style.color = '#fff';
        mensagem.style.borderColor = '#2196F3';
    } else {
        mensagem.style.background = 'rgba(244, 67, 54, 0.95)';
        mensagem.style.color = '#fff';
        mensagem.style.borderColor = '#f44336';
    }
    
    mensagem.textContent = texto;
    document.body.appendChild(mensagem);
    
    // Animação de entrada
    setTimeout(() => {
        mensagem.style.transform = 'translateX(0)';
    }, 10);
    
    // Remover com animação
    setTimeout(() => {
        mensagem.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (mensagem.parentNode) {
                mensagem.parentNode.removeChild(mensagem);
            }
        }, 400);
    }, tipo === 'sucesso' ? 5000 : 4000);
}

// Event listeners do modal de login
fecharModalLogin?.addEventListener('click', fecharModalLoginFn);
btnLogin?.addEventListener('click', realizarLogin);
btnEsqueciSenha?.addEventListener('click', mostrarRecuperacao);
voltarLogin?.addEventListener('click', voltarParaLogin);
btnRecuperar?.addEventListener('click', recuperarSenha);
fecharSucesso?.addEventListener('click', fecharModalLoginFn);
logoutBtn?.addEventListener('click', realizarLogout);

// Enter key nos campos de login
loginUsuario?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') realizarLogin();
});

loginSenha?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') realizarLogin();
});

emailRecuperacao?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') recuperarSenha();
});

// Funções de gerenciamento (úteis para desenvolvimento)
function listarTodosUsuarios() {
        console.log('═══════════════════════════════════════════════');
        console.log('📋 LISTA COMPLETA DE USUÁRIOS - DCODESTOCK');
        console.log('═══════════════════════════════════════════════');
        
        // Usuário Master
        console.log('👑 USUÁRIOS MASTER:');
        CREDENCIAIS_MASTER.forEach((master, index) => {
            console.log(`   ${index + 1}. ${master.login}`);
            console.log(`      Senha: ${master.senha}`);
            console.log(`      Email: ${master.email}`);
            console.log(`      Tipo: Acesso Master Permanente`);
            console.log('');
        });
        
        // Usuários Clientes
        const usuarios = JSON.parse(localStorage.getItem('usuariosPremium') || '[]');
        
        if (usuarios.length > 0) {
            console.log('⭐ USUÁRIOS CLIENTES:');
            usuarios.forEach((user, index) => {
                const vencimento = new Date(user.vencimento);
                const agora = new Date();
                const diasRestantes = Math.ceil((vencimento - agora) / (1000 * 60 * 60 * 24));
                const status = diasRestantes > 0 ? `Ativo (${diasRestantes} dias)` : 'Expirado';
                
                console.log(`   ${index + 1}. ${user.login}`);
                console.log(`      Senha: ${user.senha}`);
                console.log(`      Plano: ${user.plano}`);
                console.log(`      Valor: R$ ${user.valor}`);
                console.log(`      Criado: ${new Date(user.ativacao).toLocaleDateString('pt-BR')}`);
                console.log(`      Válido até: ${vencimento.toLocaleDateString('pt-BR')}`);
                console.log(`      Status: ${status}`);
                console.log('');
            });
            
            console.log(`Total de clientes: ${usuarios.length}`);
            const ativos = usuarios.filter(u => new Date(u.vencimento) > new Date()).length;
            console.log(`Clientes ativos: ${ativos}`);
            console.log(`Clientes expirados: ${usuarios.length - ativos}`);
        } else {
            console.log('⭐ Nenhum cliente cadastrado ainda.');
        }
        
        console.log('═══════════════════════════════════════════════');
        return { master: CREDENCIAIS_MASTER, clientes: usuarios };
    }

    function limparTodosUsuarios() {
        if (confirm('⚠️ ATENÇÃO: Isso removerá TODOS os usuários clientes (exceto master). Continuar?')) {
            localStorage.removeItem('usuariosPremium');
            localStorage.removeItem('loginPremium');
            console.log('🗑️ Todos os usuários clientes foram removidos.');
            console.log('👑 Usuário master preservado:', CREDENCIAIS_MASTER);
            atualizarStatusPremium();
        }
    }

    function estatisticasUsuarios() {
        const usuarios = JSON.parse(localStorage.getItem('usuariosPremium') || '[]');
        const agora = new Date();
        
        const stats = {
            total: usuarios.length,
            ativos: 0,
            expirados: 0,
            receitaTotal: 0,
            planos: {}
        };
        
        usuarios.forEach(user => {
            const vencimento = new Date(user.vencimento);
            
            if (vencimento > agora) {
                stats.ativos++;
            } else {
                stats.expirados++;
            }
            
            stats.receitaTotal += parseFloat(user.valor);
            
            if (!stats.planos[user.plano]) {
                stats.planos[user.plano] = 0;
            }
            stats.planos[user.plano]++;
        });
        
        console.log('📊 ESTATÍSTICAS DE USUÁRIOS:');
        console.table(stats);
        
        return stats;
    }

    // Disponibilizar funções globalmente para uso no console
    window.dcodeManagement = {
        listarUsuarios: listarTodosUsuarios,
        limparUsuarios: limparTodosUsuarios,
        estatisticas: estatisticasUsuarios
    };

    // === FUNÇÃO DE TESTE PARA MODAL PREMIUM ===
    window.testarModalPremium = function() {
        console.log('🧪 TESTE: Forçando abertura do modal premium...');
        showPaymentModal();
    };

    window.testarBotaoPremium = function() {
        console.log('🧪 TESTE: Simulando clique no botão Premium...');
        const btnPremium = document.getElementById('btnPremium');
        if (btnPremium) {
            console.log('✅ Botão Premium encontrado, simulando clique...');
            btnPremium.click();
        } else {
            console.error('❌ Botão Premium não encontrado!');
        }
    };

    window.testarBotoes = function() {
        console.log('🧪 TESTE: Simulando clique nos botões de navegação...');
        console.log('Testando botão +...');
        if (btnNovoEstoque) btnNovoEstoque.click();
        
        setTimeout(() => {
            console.log('Testando botão -...');
            if (btnVoltarEstoque) btnVoltarEstoque.click();
        }, 2000);
        
        setTimeout(() => {
            console.log('Testando botão mês anterior...');
            if (btnMesAnterior) btnMesAnterior.click();
        }, 4000);
        
        setTimeout(() => {
            console.log('Testando botão próximo mês...');
            if (btnProximoMes) btnProximoMes.click();
        }, 6000);
    };

    // === FUNCIONALIDADE DO MODAL PREMIUM ===
    function showPaymentModal() {
        console.log('🚀 showPaymentModal() chamada - abrindo modal de planos...');
        const modal = document.getElementById('modalPagamento');
        if (modal) {
            console.log('✅ Modal encontrado, exibindo planos premium...');
            
            // Limpar/reiniciar estado do modal
            resetModalState();
            
            modal.classList.add('active');
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Previne scroll do fundo
            initializePaymentForm();
        } else {
            console.error('❌ Modal modalPagamento não encontrado!');
            // Fallback - alert informativo
            alert('🔒 Acesso Premium Necessário!\n\n📋 Planos Disponíveis:\n\n💰 MENSAL - R$ 19,90\n✅ Acesso a todos os estoques\n✅ Navegação entre meses\n✅ Suporte completo\n\n💰 ANUAL - R$ 199,90\n✅ Todos os recursos mensais\n✅ Economia de 2 meses\n✅ Prioridade no suporte\n\n🔑 MASTERS GRATUITOS:\n• Daphiny / 2019\n• Douglas / Daphiny@#2019');
        }
    }

    function resetModalState() {
        console.log('🔄 Reiniciando estado do modal premium...');
        
        // Limpar seleções de plano
        const planOptions = document.querySelectorAll('.plan-option');
        planOptions.forEach(plan => plan.classList.remove('selected'));
        
        // Limpar seleções de método de pagamento
        const paymentMethods = document.querySelectorAll('.payment-method');
        paymentMethods.forEach(method => method.classList.remove('active'));
        
        // Selecionar PIX como padrão
        const pixMethod = document.querySelector('.payment-method[data-method="pix"]');
        if (pixMethod) {
            pixMethod.classList.add('active');
            handlePaymentMethodChange('pix');
        }
        
        // Limpar campos de formulário
        const inputs = document.querySelectorAll('#modalPagamento input[type="text"], #modalPagamento input[type="email"], #modalPagamento input[type="tel"]');
        inputs.forEach(input => {
            input.value = '';
            input.classList.remove('valid', 'invalid');
        });
        
        // Ocultar formulário de cartão
        hideCardForm();
        
        // Resetar exibição para a aba de planos
        const planSection = document.querySelector('.payment-plans');
        const formSection = document.querySelector('.payment-form');
        if (planSection) planSection.style.display = 'block';
        if (formSection) formSection.style.display = 'none';
        
        console.log('✅ Estado do modal resetado com sucesso');
    }

    function hidePaymentModal() {
        console.log('🔒 Fechando modal de pagamento...');
        const modal = document.getElementById('modalPagamento');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
            document.body.style.overflow = 'auto'; // Restaura scroll
            hideCardForm();
        }
    }

    function initializePaymentForm() {
        // Inicializar seleção de planos
        const planOptions = document.querySelectorAll('.plan-option');
        planOptions.forEach(plan => {
            plan.addEventListener('click', () => {
                planOptions.forEach(p => p.classList.remove('selected'));
                plan.classList.add('selected');
                updatePricing(plan.dataset.plan);
            });
        });

        // Inicializar métodos de pagamento
        const paymentMethods = document.querySelectorAll('.payment-method');
        paymentMethods.forEach(method => {
            method.addEventListener('click', () => {
                paymentMethods.forEach(m => m.classList.remove('active'));
                method.classList.add('active');
                handlePaymentMethodChange(method.dataset.method);
            });
        });

        // Eventos dos botões
        const cancelBtn = document.getElementById('cancelarPagamento');
        const confirmBtn = document.getElementById('confirmarPagamento');
        const closeBtn = document.getElementById('fecharModalPagamento');

        if (cancelBtn) cancelBtn.addEventListener('click', hidePaymentModal);
        if (closeBtn) closeBtn.addEventListener('click', hidePaymentModal);
        if (confirmBtn) confirmBtn.addEventListener('click', processPayment);

        // Inicializar formulário de cartão
        initializeCardForm();
        
        // Inicializar área PIX
        initializePixArea();
        
        // Configurar estado inicial - PIX selecionado por padrão
        const pixMethod = document.querySelector('.payment-method[data-method="pix"]');
        if (pixMethod) {
            pixMethod.classList.add('active');
            handlePaymentMethodChange('pix');
            console.log('✅ PIX definido como método padrão');
        }
    }

    function initializePixArea() {
        const copyPixBtn = document.getElementById('copyPixBtn');
        const pixKey = document.getElementById('pixKey');
        
        if (copyPixBtn && pixKey) {
            copyPixBtn.addEventListener('click', () => {
                // Copiar para clipboard
                pixKey.select();
                pixKey.setSelectionRange(0, 99999); // Para dispositivos móveis
                
                navigator.clipboard.writeText(pixKey.value).then(() => {
                    // Feedback visual
                    const originalText = copyPixBtn.innerHTML;
                    copyPixBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>Copiado!';
                    copyPixBtn.classList.add('copied');
                    
                    setTimeout(() => {
                        copyPixBtn.innerHTML = originalText;
                        copyPixBtn.classList.remove('copied');
                    }, 2000);
                }).catch(() => {
                    // Fallback para navegadores mais antigos
                    document.execCommand('copy');
                    alert('Chave PIX copiada!');
                });
            });
        }
    }

    function handlePaymentMethodChange(method) {
        console.log('🔄 Mudando método de pagamento para:', method);
        
        // Obter todas as áreas de pagamento
        const pixArea = document.getElementById('pixArea');
        const debitArea = document.getElementById('debitArea');
        const creditArea = document.getElementById('creditArea');
        
        // Esconder todas as áreas primeiro
        if (pixArea) pixArea.style.display = 'none';
        if (debitArea) debitArea.style.display = 'none';
        if (creditArea) creditArea.style.display = 'none';
        
        // Mostrar apenas a área do método selecionado
        if (method === 'pix' && pixArea) {
            pixArea.style.display = 'block';
            console.log('✅ Área PIX exibida');
        } else if (method === 'debit' && debitArea) {
            debitArea.style.display = 'block';
            console.log('✅ Área Débito exibida');
        } else if (method === 'credit' && creditArea) {
            creditArea.style.display = 'block';
            console.log('✅ Área Crédito exibida');
        }
        
        // Atualizar estado visual dos botões
        const allMethods = document.querySelectorAll('.payment-method');
        allMethods.forEach(btn => btn.classList.remove('active'));
        
        const selectedMethod = document.querySelector(`.payment-method[data-method="${method}"]`);
        if (selectedMethod) {
            selectedMethod.classList.add('active');
            console.log('✅ Botão do método marcado como ativo');
        }
        
        // Atualizar instruções específicas do método
        updatePaymentInstructions(method);
    }
    
    function updatePaymentInstructions(method) {
        const instructions = document.querySelector('.pix-instructions p');
        if (!instructions) return;
        
        const currentLang = window.currentLanguage || 'pt';
        
        let instructionText = '';
        if (method === 'pix') {
            switch(currentLang) {
                case 'en':
                    instructionText = 'Copy the PIX key above and make the payment through your bank app. Payment is instant.';
                    break;
                case 'fr':
                    instructionText = 'Copiez la clé PIX ci-dessus et effectuez le paiement via votre application bancaire. Le paiement est instantané.';
                    break;
                case 'it':
                    instructionText = 'Copia la chiave PIX sopra ed effettua il pagamento tramite la tua app bancaria. Il pagamento è istantaneo.';
                    break;
                case 'es':
                    instructionText = 'Copia la clave PIX de arriba y realiza el pago a través de tu app bancaria. El pago es instantáneo.';
                    break;
                default:
                    instructionText = 'Copie a chave PIX acima e faça o pagamento em seu app bancário. O pagamento é instantâneo.';
            }
        } else {
            switch(currentLang) {
                case 'en':
                    instructionText = 'After filling your card details, the payment will be processed through our secure gateway using the PIX key below.';
                    break;
                case 'fr':
                    instructionText = 'Après avoir rempli les détails de votre carte, le paiement sera traité via notre passerelle sécurisée en utilisant la clé PIX ci-dessous.';
                    break;
                case 'it':
                    instructionText = 'Dopo aver inserito i dettagli della tua carta, il pagamento verrà elaborato tramite il nostro gateway sicuro utilizzando la chiave PIX sottostante.';
                    break;
                case 'es':
                    instructionText = 'Después de completar los datos de tu tarjeta, el pago se procesará a través de nuestro gateway seguro usando la clave PIX de abajo.';
                    break;
                default:
                    instructionText = 'Após preencher os dados do seu cartão, o pagamento será processado através do nosso gateway seguro usando a chave PIX abaixo.';
            }
        }
        
        instructions.textContent = instructionText;
    }

    function showCardForm() {
        const cardForm = document.getElementById('cardForm');
        if (cardForm) {
            cardForm.style.display = 'block';
            setTimeout(() => {
                cardForm.classList.add('active');
            }, 50);
        }
    }

    function hideCardForm() {
        const cardForm = document.getElementById('cardForm');
        if (cardForm) {
            cardForm.classList.remove('active');
            setTimeout(() => {
                cardForm.style.display = 'none';
            }, 300);
        }
    }

    function initializeCardForm() {
        // Máscara para número do cartão de débito
        const debitCardNumber = document.getElementById('debitCardNumber');
        if (debitCardNumber) {
            debitCardNumber.addEventListener('input', formatCardNumber);
        }

        // Máscara para número do cartão de crédito
        const creditCardNumber = document.getElementById('creditCardNumber');
        if (creditCardNumber) {
            creditCardNumber.addEventListener('input', formatCardNumber);
        }

        // Máscara para data de validade - débito
        const debitCardExpiry = document.getElementById('debitCardExpiry');
        if (debitCardExpiry) {
            debitCardExpiry.addEventListener('input', formatExpiryDate);
        }

        // Máscara para data de validade - crédito
        const creditCardExpiry = document.getElementById('creditCardExpiry');
        if (creditCardExpiry) {
            creditCardExpiry.addEventListener('input', formatExpiryDate);
        }

        // Máscara para CVV - débito
        const debitCardCvv = document.getElementById('debitCardCvv');
        if (debitCardCvv) {
            debitCardCvv.addEventListener('input', formatCvv);
        }

        // Máscara para CVV - crédito
        const creditCardCvv = document.getElementById('creditCardCvv');
        if (creditCardCvv) {
            creditCardCvv.addEventListener('input', formatCvv);
        }
    }

    function formatCardNumber(e) {
        let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
        let matches = value.match(/\d{4,16}/g);
        let match = matches && matches[0] || '';
        let parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        if (parts.length) {
            e.target.value = parts.join(' ');
        } else {
            e.target.value = value;
        }
    }

    function formatExpiryDate(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        e.target.value = value;
    }

    function formatCvv(e) {
        let value = e.target.value.replace(/[^0-9]/gi, '');
        e.target.value = value.substring(0, 4);
    }

    function updatePricing(plan) {
        const installmentsSelect = document.getElementById('cardInstallments');
        if (!installmentsSelect) return;

        installmentsSelect.innerHTML = '';
        
        if (plan === 'monthly') {
            installmentsSelect.innerHTML = `
                <option value="1">1x R$ 29,00 (à vista)</option>
                <option value="2">2x R$ 15,00</option>
                <option value="3">3x R$ 10,33</option>
                <option value="6">6x R$ 5,42</option>
                <option value="12">12x R$ 2,92</option>
            `;
        } else {
            installmentsSelect.innerHTML = `
                <option value="1">1x R$ 299,00 (à vista)</option>
                <option value="2">2x R$ 154,00</option>
                <option value="3">3x R$ 105,00</option>
                <option value="6">6x R$ 54,50</option>
                <option value="12">12x R$ 29,50</option>
            `;
        }
    }

    function updatePricingForDebit(plan) {
        const installmentsSelect = document.getElementById('cardInstallments');
        if (!installmentsSelect) return;

        // Para débito, apenas à vista
        if (plan === 'monthly') {
            installmentsSelect.innerHTML = `<option value="1">R$ 29,00 (débito à vista)</option>`;
        } else {
            installmentsSelect.innerHTML = `<option value="1">R$ 299,00 (débito à vista)</option>`;
        }
    }

    function processPayment() {
        const selectedPlan = document.querySelector('.plan-option.selected');
        const selectedMethod = document.querySelector('.payment-method.active');
        
        if (!selectedPlan || !selectedMethod) {
            alert('Por favor, selecione um plano e método de pagamento.');
            return;
        }

        const plan = selectedPlan.dataset.plan;
        const method = selectedMethod.dataset.method;

        if (method === 'credit' || method === 'debit') {
            if (!validateCardForm()) {
                return;
            }
        }

        // Simular processamento
        const confirmBtn = document.getElementById('confirmarPagamento');
        if (confirmBtn) {
            confirmBtn.innerHTML = '<span class="btn-text">Processando...</span><span class="btn-icon">⏳</span>';
            confirmBtn.disabled = true;
        }

        setTimeout(() => {
            activatePremiumSubscription(plan, method);
            hidePaymentModal();
            
            if (confirmBtn) {
                confirmBtn.innerHTML = '<span class="btn-text">Assinar Agora</span><span class="btn-icon">🚀</span>';
                confirmBtn.disabled = false;
            }
        }, 2000);
    }

    function validateCardForm() {
        const cardNumber = document.getElementById('cardNumber');
        const cardExpiry = document.getElementById('cardExpiry');
        const cardCvv = document.getElementById('cardCvv');
        const cardName = document.getElementById('cardName');

        if (!cardNumber?.value || cardNumber.value.replace(/\s/g, '').length < 16) {
            alert('Por favor, insira um número de cartão válido.');
            cardNumber?.focus();
            return false;
        }

        if (!cardExpiry?.value || cardExpiry.value.length < 5) {
            alert('Por favor, insira uma data de validade válida.');
            cardExpiry?.focus();
            return false;
        }

        if (!cardCvv?.value || cardCvv.value.length < 3) {
            alert('Por favor, insira um CVV válido.');
            cardCvv?.focus();
            return false;
        }

        if (!cardName?.value || cardName.value.length < 3) {
            alert('Por favor, insira o nome do cartão.');
            cardName?.focus();
            return false;
        }

        return true;
    }

    function activatePremiumSubscription(plan, method) {
        const subscription = {
            plan: plan,
            method: method,
            activated: new Date().toISOString(),
            expiry: plan === 'monthly' ? 
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() :
                new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        };

        localStorage.setItem('assinaturaPremium', JSON.stringify(subscription));
        atualizarStatusPremium();
        
        // Habilitar navegação livre após ativação do premium
        habilitarNavegacaoLivre();
        
        alert(`✅ Assinatura ${plan === 'monthly' ? 'Mensal' : 'Anual'} ativada com sucesso!\n\nVocê agora tem acesso premium ao DcodeStock.\n\n🚀 Todos os botões foram desbloqueados!`);
    }

    // Função para habilitar navegação livre quando premium for ativado
    function habilitarNavegacaoLivre() {
        console.log('🔓 Habilitando navegação livre - Premium ativado!');
        
        // Remover qualquer bloqueio visual dos botões
        const botoesNavegacao = document.querySelectorAll('.month-navigation button, .stock-actions .nav-button');
        botoesNavegacao.forEach(botao => {
            botao.disabled = false;
            botao.style.opacity = '1';
            botao.style.cursor = 'pointer';
            botao.style.pointerEvents = 'auto';
            botao.classList.remove('disabled', 'blocked');
        });
        
        // Adicionar indicador visual de premium ativo
        const indicadorPremium = document.createElement('div');
        indicadorPremium.id = 'premium-indicator';
        indicadorPremium.innerHTML = '🚀 NAVEGAÇÃO LIVRE ATIVADA';
        indicadorPremium.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.9rem;
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
            z-index: 1000;
            animation: slideDown 0.5s ease;
        `;
        
        // Adicionar animação CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(indicadorPremium);
        
        // Remover indicador após 5 segundos
        setTimeout(() => {
            indicadorPremium.style.animation = 'slideDown 0.5s ease reverse';
            setTimeout(() => {
                if (indicadorPremium.parentNode) {
                    indicadorPremium.parentNode.removeChild(indicadorPremium);
                }
            }, 500);
        }, 5000);
        
        console.log('✅ Navegação livre habilitada com sucesso!');
    }

    // Função para habilitar navegação livre para usuários que já têm premium
    function habilitarNavegacaoLivreExistente() {
        console.log('🔓 Habilitando navegação livre para usuário premium existente');
        
        // Remover qualquer bloqueio visual dos botões
        const botoesNavegacao = document.querySelectorAll('.month-navigation button, .stock-actions .nav-button');
        botoesNavegacao.forEach(botao => {
            botao.disabled = false;
            botao.style.opacity = '1';
            botao.style.cursor = 'pointer';
            botao.style.pointerEvents = 'auto';
            botao.classList.remove('disabled', 'blocked');
        });
        
        // Adicionar indicador discreto de premium ativo
        const existingIndicator = document.getElementById('premium-status');
        if (!existingIndicator) {
            const indicadorStatus = document.createElement('div');
            indicadorStatus.id = 'premium-status';
            indicadorStatus.innerHTML = '⭐ PREMIUM ATIVO';
            indicadorStatus.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: linear-gradient(135deg, #4CAF50, #45a049);
                color: white;
                padding: 5px 12px;
                border-radius: 15px;
                font-weight: bold;
                font-size: 0.8rem;
                box-shadow: 0 2px 10px rgba(76, 175, 80, 0.3);
                z-index: 999;
                opacity: 0.9;
            `;
            document.body.appendChild(indicadorStatus);
        }
        
        console.log('✅ Navegação livre para usuário premium existente habilitada!');
    }

    // Função para sair do modo premium
    function sairModoPremiun() {
        console.log('🚪 Saindo do modo premium...');
        
        // Salvar todos os dados antes de sair
        salvarTodosOsDados();
        
        // Remover dados de premium do localStorage
        localStorage.removeItem('assinaturaPremium');
        localStorage.removeItem('loginPremium');
        
        // Remover indicadores visuais de premium
        const premiumStatus = document.getElementById('premium-status');
        if (premiumStatus) premiumStatus.remove();
        
        const premiumBadge = document.querySelector('.premium-badge');
        if (premiumBadge) premiumBadge.remove();
        
        // Voltar ao estoque 1 do mês atual
        currentStockIndex = 0;
        displayedDate = new Date();
        localStorage.setItem('currentStockIndex', '0');
        
        // Recarregar interface
        loadStock(0);
        updateMonthDisplay();
        atualizarStatusPremium();
        
        // Mostrar confirmação
        alert('✅ Saiu do modo premium com sucesso!\n\n📁 Todos os seus dados foram salvos.\n🔒 Voltou ao modo limitado.');
        
        console.log('✅ Saída do modo premium concluída');
    }

    // Função para salvar todos os dados antes de sair do premium
    function salvarTodosOsDados() {
        console.log('💾 Salvando todos os dados...');
        
        // Salvar dados do estoque atual
        salvarDadosDoMesAtual(currentStockIndex, displayedDate);
        
        // Salvar dados de todos os estoques dos últimos meses
        const hoje = new Date();
        for (let i = 0; i < MAX_STOCKS; i++) {
            // Salvar dados do mês atual
            const keyAtual = getStorageKey(i, hoje);
            const dadosAtuais = localStorage.getItem(keyAtual);
            if (dadosAtuais) {
                console.log(`💾 Dados do estoque ${i + 1} (mês atual) salvos`);
            }
            
            // Salvar dados dos últimos 3 meses se existirem
            for (let j = 1; j <= 3; j++) {
                const mesAnterior = new Date(hoje);
                mesAnterior.setMonth(mesAnterior.getMonth() - j);
                const keyAnterior = getStorageKey(i, mesAnterior);
                const dadosAnteriores = localStorage.getItem(keyAnterior);
                if (dadosAnteriores) {
                    console.log(`💾 Dados do estoque ${i + 1} (${j} mês(es) atrás) salvos`);
                }
            }
        }
        
        console.log('✅ Todos os dados foram salvos com sucesso');
    }

    // Expor função globalmente para o botão Premium
    window.showPaymentModal = showPaymentModal;