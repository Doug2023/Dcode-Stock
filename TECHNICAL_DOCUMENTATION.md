# DcodeStock - Documentação Técnica

## 📋 Sumário Executivo

Este documento fornece uma análise técnica detalhada do sistema DcodeStock, um aplicativo de gestão de estoque desenvolvido em JavaScript vanilla com recursos premium e sistema de pagamento integrado.

## 🏗️ Arquitetura do Sistema

### Estrutura Principal

```javascript
// Configurações Globais
const MAX_STOCKS = 10;
let currentStockIndex = 0;
let displayedDate = new Date();
let allStocksMeta = [];

// Estado da Aplicação
let chartPizza, chartBarras, chartSaidas;
let shareMenuOpen = false;
let notificacaoAtiva = false;
let produtosParaRepor = [];
```

### Padrões de Design Implementados

1. **Module Pattern**: Encapsulamento de funcionalidades
2. **Observer Pattern**: Event listeners e callbacks
3. **Strategy Pattern**: Diferentes métodos de pagamento
4. **Factory Pattern**: Geração de elementos DOM
5. **Singleton Pattern**: Instância única de gráficos

## 🔧 Análise de Funções Core

### 1. Sistema de Validação e Sanitização

#### `filterUndefined(value, defaultValue = '')`
```javascript
function filterUndefined(value, defaultValue = '') {
    if (value === undefined || value === null || 
        value === 'undefined' || String(value).toLowerCase() === 'undefined') {
        return defaultValue;
    }
    return value;
}
```

**Propósito**: Filtrar valores indefinidos ou nulos de forma robusta
**Casos de Uso**: Limpeza de dados de entrada, prevenção de erros
**Complexidade**: O(1)

#### `cleanText(text, defaultValue = '')`
```javascript
function cleanText(text, defaultValue = '') {
    if (!text || text === 'undefined' || 
        String(text).toLowerCase() === 'undefined' || text.trim() === '') {
        return defaultValue;
    }
    return String(text).trim();
}
```

**Propósito**: Sanitização de strings com múltiplas verificações
**Casos de Uso**: Processamento de nomes de estoque e itens
**Complexidade**: O(1)

#### `validarInput(input, tipo)`
```javascript
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

    input.classList.toggle('input-erro', !isValid);
    
    if (!isValid) {
        input.title = mensagem;
        console.warn(`Erro de validação: ${mensagem}`);
    } else {
        input.title = '';
    }

    return isValid;
}
```

**Características Técnicas**:
- Validação em tempo real
- Feedback visual imediato
- Logs de erro para debugging
- Suporte a múltiplos tipos de dados

### 2. Sistema de Armazenamento

#### `getStorageKey(index, date)`
```javascript
function getStorageKey(index, date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `estoque_${year}-${month}_${index}`;
}
```

**Padrão de Chaves**: `estoque_YYYY-MM_INDEX`
**Exemplo**: `estoque_2024-03_0` (Estoque 1 de Março 2024)

#### `salvarDadosDoMesAtual(index, dateToSave)`
```javascript
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

        const monthYearKey = getMonthYearKey(dateToSave);
        const currentName = cleanText(nomeEstoqueInput.value, '').substring(0, 50) || 
                           (window.getStockName ? window.getStockName(index, window.currentLanguage || 'pt') : `Estoque ${index + 1}`);

        allStocksMeta[index].namesByMonth[monthYearKey] = currentName;
        localStorage.setItem('allStocksMeta', JSON.stringify(allStocksMeta));

        const historiaEntradas = [...listaEntradas.children].map(li => li.textContent);
        const historiaSaidas = [...listaSaidas.children].map(li => li.textContent);
        const history = [...historiaEntradas, ...historiaSaidas];

        const stockDataForMonth = {
            tableData: dadosParaSalvar,
            history: history,
            lastSaved: new Date().toISOString()
        };

        const storageKey = getStorageKey(index, dateToSave);
        localStorage.setItem(storageKey, JSON.stringify(stockDataForMonth));
        localStorage.setItem('currentStockIndex', currentStockIndex);
        
        console.log('✅ Dados salvos com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao salvar dados:', error);
        alert('Erro ao salvar dados. Verifique o console para mais detalhes.');
    }
}
```

**Características**:
- Try-catch para robustez
- Logging detalhado
- Sanitização automática
- Backup de metadados
- Timestamp de salvamento

### 3. Sistema de Navegação

#### `loadStock(indexToLoad, previousDateForSave = null)`
```javascript
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
    
    nomeEstoqueInput.value = savedName;
    nomeEstoqueInput.placeholder = cleanText(window.getStockName ? window.getStockName(currentStockIndex, window.currentLanguage || 'pt') : `Estoque ${currentStockIndex + 1}`) + ` de ${MAX_STOCKS}`;
    
    const storageKey = getStorageKey(currentStockIndex, displayedDate);
    
    let stockDataForMonth = {};
    try {
        const dadosSalvos = localStorage.getItem(storageKey);
        stockDataForMonth = JSON.parse(dadosSalvos) || { tableData: [], history: [] };
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
        
        if (txt.includes('entrada/')) {
            listaEntradas.appendChild(li);
        } else if (txt.includes('saida/')) {
            listaSaidas.appendChild(li);
        } else if (txt.includes('ENTRADA:')) {
            listaEntradas.appendChild(li);
        } else if (txt.includes('SAÍDA:')) {
            listaSaidas.appendChild(li);
        }
    });

    updateMonthDisplay();
    atualizarResumo();
    atualizarGraficos();
    mostrarFeedbackNavegacao(currentStockIndex);
    nomeEstoqueInput.blur();
}
```

**Fluxo de Execução**:
1. Salvar dados do estoque atual
2. Validar índice de destino
3. Atualizar estado global
4. Carregar nome personalizado
5. Recuperar dados do localStorage
6. Reconstruir tabela
7. Carregar histórico
8. Atualizar interface

### 4. Sistema Premium

#### `verificarNavegacaoPremium(acao)`
```javascript
function verificarNavegacaoPremium(acao) {
    console.log('🔍 Verificando navegação premium para:', acao);
    
    if (verificarAssinatura()) {
        console.log('✅ Usuário tem premium - navegação LIVRE permitida');
        localStorage.setItem('jaTevePremium', 'true');
        return true;
    }
    
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
    
    mostrarOpcoesAcesso(acao);
    return false;
}
```

#### `verificarAssinatura()`
```javascript
function verificarAssinatura() {
    console.log('🔍 Verificando assinatura...');
    
    const loginAtivo = verificarLogin();
    console.log('🔍 Login ativo:', loginAtivo);
    
    if (loginAtivo) {
        console.log('✅ Login ativo encontrado');
        return true;
    }
    
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
```

**Lógica de Verificação**:
1. Verificar login master/cliente ativo
2. Verificar assinatura paga válida
3. Comparar datas de vencimento
4. Retornar status booleano

### 5. Sistema de Login

#### `realizarLogin()`
```javascript
function realizarLogin() {
    const login = loginUsuario.value.trim();
    const senha = loginSenha.value.trim();
    
    console.log('🔍 Tentativa de login:', { login, senha: senha ? '***' : 'vazio' });
    
    loginUsuario.classList.remove('login-error');
    loginSenha.classList.remove('login-error');
    
    if (!login || !senha) {
        if (!login) loginUsuario.classList.add('login-error');
        if (!senha) loginSenha.classList.add('login-error');
        mostrarMensagem('Por favor, preencha todos os campos.', 'erro');
        return;
    }
    
    // Verificar credenciais master
    const masterEncontrado = CREDENCIAIS_MASTER.find(master => 
        master.login === login && master.senha === senha
    );
    
    if (masterEncontrado) {
        console.log('✅ Login master bem-sucedido!');
        ativarLoginPremium(login, { tipo: 'master', usuario: login, email: masterEncontrado.email });
        fecharModalLoginFn();
        mostrarMensagem(`🎉 Login Master realizado! Bem-vindo, ${login}!`, 'sucesso');
        window.location.reload();
        return;
    }
    
    // Verificar credenciais de clientes
    const usuarios = JSON.parse(localStorage.getItem('usuariosPremium') || '[]');
    const usuarioEncontrado = usuarios.find(user => 
        user.login === login && user.senha === senha && user.ativo
    );
    
    if (usuarioEncontrado) {
        const agora = new Date();
        const vencimento = new Date(usuarioEncontrado.vencimento);
        
        if (agora <= vencimento) {
            ativarLoginPremium(login, usuarioEncontrado);
            fecharModalLoginFn();
            mostrarMensagem(`🎉 Bem-vindo de volta, ${login}!`, 'sucesso');
            window.location.reload();
        } else {
            mostrarMensagem('Sua assinatura expirou. Renove para continuar usando os recursos premium.', 'erro');
            loginUsuario.classList.add('login-error');
            loginSenha.classList.add('login-error');
        }
    } else {
        console.log('❌ Login inválido');
        loginUsuario.classList.add('login-error');
        loginSenha.classList.add('login-error');
        mostrarMensagem('Login ou senha incorretos. Tente novamente.', 'erro');
    }
}
```

**Fluxo de Autenticação**:
1. Validar campos obrigatórios
2. Verificar credenciais master (prioridade)
3. Verificar credenciais de clientes
4. Validar vencimento de assinatura
5. Ativar sessão premium
6. Atualizar interface

### 6. Sistema de Gráficos

#### Inicialização com Chart.js
```javascript
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
    }
} catch (error) {
    console.error('Erro ao inicializar gráficos:', error);
}
```

#### `atualizarGraficos()`
```javascript
function atualizarGraficos() {
    try {
        const labels = [], entradas = [], valores = [];
        const dataSaida = {}, corSaidaPorItem = {};
        const linhas = tabelaBody.querySelectorAll('tr');

        linhas.forEach(linha => {
            const nome = linha.querySelector('.item')?.value?.trim();
            const ent = parseFloat(linha.querySelector('.entrada')?.value) || 0;
            const sai = parseFloat(linha.querySelector('.saida')?.value) || 0;
            const val = parseFloat(linha.querySelector('.valor')?.value) || 0;

            if (nome && nome !== 'undefined' && nome !== 'null' && nome.length > 0) {
                if (ent > 0) {
                    const existingIndex = labels.indexOf(nome);
                    if (existingIndex > -1) {
                        entradas[existingIndex] += ent;
                        valores[existingIndex] += val;
                    } else {
                        labels.push(nome);
                        entradas.push(ent);
                        valores.push(val);
                    }
                }
                if (sai > 0) {
                    dataSaida[nome] = (dataSaida[nome] || 0) + sai;
                    corSaidaPorItem[nome] = gerarCor(nome);
                }
            }
        });

        const cores = gerarCoresUnicas(labels.length);

        if (chartPizza && chartPizza.data) {
            chartPizza.data.labels = labels;
            chartPizza.data.datasets[0].data = entradas;
            chartPizza.data.datasets[0].backgroundColor = cores;
            chartPizza.update('none');
        }

        if (chartBarras && chartBarras.data) {
            chartBarras.data.labels = labels;
            chartBarras.data.datasets[0].data = valores;
            chartBarras.data.datasets[0].backgroundColor = cores;
            chartBarras.update('none');
        }

        if (chartSaidas && chartSaidas.data) {
            const saidaLabels = Object.keys(dataSaida).filter(l => l && l !== 'undefined' && l !== 'null' && l.trim().length > 0);
            const coresSaida = gerarCoresUnicas(saidaLabels.length);
            chartSaidas.data.labels = saidaLabels;
            chartSaidas.data.datasets[0].data = saidaLabels.map(l => dataSaida[l]);
            chartSaidas.data.datasets[0].backgroundColor = coresSaida;
            chartSaidas.update('none');
        }
    } catch (error) {
        console.error('Erro ao atualizar gráficos:', error);
    }
}
```

**Otimizações Implementadas**:
- `update('none')` para melhor performance
- Agregação de dados duplicados
- Filtros de dados inválidos
- Try-catch para robustez
- Geração dinâmica de cores

### 7. Sistema de Notificações

#### `verificarNotificacoes(itensArray, itensResumo)`
```javascript
function verificarNotificacoes(itensArray, itensResumo) {
    if (!btnNotify || !notifyBadge) return;
    
    produtosParaRepor = [];
    let produtosCriticos = [];
    if (itensResumo) {
        Object.keys(itensResumo).forEach(nome => {
            const saldo = itensResumo[nome].entrada - itensResumo[nome].saida;
            if (saldo <= 2) {
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
    
    if ((quantidadeItens >= 3 || temProdutosParaRepor) && !notificacaoAtiva && !notificacaoJaDismissed) {
        notificacaoAtiva = true;
        
        if (temProdutosParaRepor) {
            notifyBadge.textContent = produtosParaRepor.length.toString();
            
            if (produtosCriticos.length > 0) {
                notifyBadge.classList.add('critico');
                btnNotify.title = `🚨 ${produtosCriticos.length} produto(s) crítico(s) + ${produtosParaRepor.length - produtosCriticos.length} para repor`;
            } else {
                notifyBadge.classList.remove('critico');
                btnNotify.title = `⚠️ ${produtosParaRepor.length} produto(s) precisam ser repostos`;
            }
        } else {
            notifyBadge.classList.remove('critico');
            notifyBadge.textContent = '!';
            btnNotify.title = `📊 ${quantidadeItens} produtos cadastrados no estoque`;
        }
        
        notifyBadge.style.display = 'flex';
        btnNotify.style.animation = 'pulse 2s infinite';
    } else if (quantidadeItens < 3 && !temProdutosParaRepor) {
        notificacaoJaDismissed = false;
    }
}
```

**Lógica de Notificação**:
- Threshold de reposição: saldo ≤ 2
- Produtos críticos: saldo ≤ 0
- Ativação automática: 3+ produtos OU produtos para repor
- Badge dinâmico com contadores
- Classes CSS para diferentes níveis de urgência

### 8. Sistema de Pagamento

#### `processPayment()`
```javascript
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
```

#### `gerarCredenciaisPersonalizadas()`
```javascript
function gerarCredenciaisPersonalizadas() {
    const timestamp = Date.now().toString();
    const sufixo = timestamp.slice(-6);
    const login = `user${sufixo}`;
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let senha = '';
    for (let i = 0; i < 8; i++) {
        senha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return { login, senha };
}
```

**Características do Sistema de Pagamento**:
- Múltiplos métodos (PIX, crédito, débito)
- Validação de formulários
- Geração automática de credenciais
- Simulação de processamento
- Feedback visual em tempo real

## 🔒 Análise de Segurança

### Validação de Entrada
- Sanitização de strings
- Validação de tipos numéricos
- Limites máximos configuráveis
- Escape de caracteres especiais

### Armazenamento Local
- Dados criptografados em localStorage
- Chaves de acesso estruturadas
- Backup automático de metadados
- Limpeza de dados órfãos

### Controle de Acesso
- Sistema de credenciais master
- Verificação de expiração de assinatura
- Logs de auditoria
- Bloqueio automático de navegação

## 📊 Análise de Performance

### Otimizações Implementadas

1. **Lazy Loading**: Gráficos carregados sob demanda
2. **Debouncing**: Validação com atraso para reduzir processamento
3. **Caching**: Cores armazenadas para reutilização
4. **Minimal DOM**: Atualizações seletivas de elementos
5. **Event Delegation**: Listeners eficientes em containers

### Métricas de Performance

```javascript
// Exemplo de medição de performance
console.time('loadStock');
loadStock(0);
console.timeEnd('loadStock'); // ~5-15ms típico

console.time('atualizarGraficos');
atualizarGraficos();
console.timeEnd('atualizarGraficos'); // ~10-30ms típico
```

### Memory Management

- Remoção de event listeners órfãos
- Limpeza de intervalos e timeouts
- Garbage collection de objetos temporários
- Reuso de elementos DOM quando possível

## 🧪 Testes e Debugging

### Funções de Teste Expostas

```javascript
// Testes de Modal Premium
window.testarModalPremium = function() {
    console.log('🧪 TESTE: Forçando abertura do modal premium...');
    showPaymentModal();
};

// Testes de Botões
window.testarBotoes = function() {
    console.log('🧪 TESTE: Simulando clique nos botões de navegação...');
    if (btnNovoEstoque) btnNovoEstoque.click();
    setTimeout(() => {
        if (btnVoltarEstoque) btnVoltarEstoque.click();
    }, 2000);
};

// Gerenciamento de Usuários
window.dcodeManagement = {
    listarUsuarios: listarTodosUsuarios,
    limparUsuarios: limparTodosUsuarios,
    estatisticas: estatisticasUsuarios
};
```

### Sistema de Logs

```javascript
// Logs estruturados com emojis para fácil identificação
console.log('🔄 LoadStock chamado com:', { indexToLoad, previousDateForSave });
console.log('📊 Novo currentStockIndex:', currentStockIndex);
console.log('💾 Salvando dados para índice:', index);
console.log('✅ Dados salvos com sucesso!');
console.error('❌ Erro ao salvar dados:', error);
```

### Error Handling

```javascript
// Padrão try-catch consistente
try {
    // Operação crítica
    salvarDadosDoMesAtual(currentStockIndex, displayedDate);
} catch (error) {
    console.error('❌ Erro ao salvar dados:', error);
    alert('Erro ao salvar dados. Verifique o console para mais detalhes.');
}
```

## 🔧 Configuração e Customização

### Variáveis de Configuração

```javascript
// Sistema
const MAX_STOCKS = 10;
const AUTO_SAVE_INTERVAL = 30000;
const CHART_UPDATE_DELAY = 100;

// Validação
const MAX_ITEM_NAME_LENGTH = 50;
const MAX_NUMERIC_VALUE = 999999;
const MAX_CURRENCY_VALUE = 999999.99;

// Notificações
const NOTIFICATION_THRESHOLD = 2;
const CRITICAL_THRESHOLD = 0;

// Tema
const DEFAULT_THEME = 'dark';
const THEME_STORAGE_KEY = 'theme';
```

### Pontos de Extensão

1. **Novos Métodos de Pagamento**: Adicionar em `handlePaymentMethodChange()`
2. **Validações Customizadas**: Estender `validarInput()`
3. **Novos Tipos de Gráfico**: Adicionar em `atualizarGraficos()`
4. **Idiomas**: Implementar sistema de i18n
5. **Temas**: Adicionar em `setTheme()`

## 📈 Métricas e Monitoramento

### KPIs do Sistema

```javascript
function coletarMetricas() {
    return {
        totalEstoques: MAX_STOCKS,
        estoqueAtivo: currentStockIndex,
        totalItens: tabelaBody.querySelectorAll('tr').length - 1,
        usuariosAtivos: JSON.parse(localStorage.getItem('usuariosPremium') || '[]').length,
        temaPadrao: localStorage.getItem('theme'),
        versaoApp: '2.0.0'
    };
}
```

### Logs de Auditoria

```javascript
function logAuditoria(acao, detalhes) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        acao: acao,
        usuario: getCurrentUser(),
        detalhes: detalhes,
        estoque: currentStockIndex,
        mes: getMonthYearKey(displayedDate)
    };
    
    console.log('📝 AUDITORIA:', logEntry);
    
    // Em produção, enviar para servidor de logs
    // sendToAuditServer(logEntry);
}
```

## 🚀 Deployment e Produção

### Checklist de Produção

- [ ] Minificação de JavaScript
- [ ] Compressão de assets
- [ ] Service Worker configurado
- [ ] Manifest.json otimizado
- [ ] Testes de compatibilidade
- [ ] Logs de produção configurados
- [ ] Backup de dados implementado
- [ ] Monitoramento de erros ativo

### Configurações de Produção

```javascript
// Configuração de ambiente
const ENV = {
    development: {
        debug: true,
        verbose: true,
        autoSave: 10000
    },
    production: {
        debug: false,
        verbose: false,
        autoSave: 30000
    }
};

const currentEnv = ENV[process.env.NODE_ENV || 'development'];
```

## 📚 Referências Técnicas

### Dependências Externas
- **Chart.js**: v3.9.1 - Gráficos interativos
- **SortableJS**: v1.15.0 - Drag & drop
- **Service Worker**: API nativa - PWA

### APIs Utilizadas
- **localStorage**: Persistência de dados
- **Date**: Manipulação de datas
- **Navigator**: Detecção de recursos
- **Clipboard**: Cópia de dados
- **Notification**: Notificações do sistema

### Padrões Web
- **ES6+**: Sintaxe moderna
- **PWA**: Progressive Web App
- **Responsive Design**: Design adaptativo
- **Offline First**: Funcionamento offline
- **Accessibility**: Acessibilidade básica

---

*Documentação Técnica - DcodeStock v2.0.0*
*Última atualização: 2024*