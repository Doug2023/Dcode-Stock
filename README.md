# DcodeStock - Sistema de Gestão de Estoque

Um sistema completo de gestão de estoque com recursos premium, desenvolvido em JavaScript vanilla com funcionalidades avançadas de navegação, relatórios e sistema de pagamento integrado.

## 📋 Índice

- [Características Principais](#características-principais)
- [Estrutura do Sistema](#estrutura-do-sistema)
- [Funcionalidades](#funcionalidades)
- [Sistema de Premium](#sistema-de-premium)
- [Sistema de Login](#sistema-de-login)
- [API de Pagamentos](#api-de-pagamentos)
- [Estrutura de Dados](#estrutura-de-dados)
- [Configuração](#configuração)
- [Uso](#uso)
- [Desenvolvimento](#desenvolvimento)

## 🚀 Características Principais

### Gestão de Estoque
- **Múltiplos Estoques**: Até 10 estoques simultâneos
- **Navegação Temporal**: Acesso a dados de diferentes meses
- **Entrada/Saída**: Controle completo de movimentações
- **Validação de Dados**: Sistema robusto de validação e sanitização
- **Persistência**: Armazenamento local com backup automático

### Interface Avançada
- **Tema Escuro/Claro**: Alternância dinâmica de temas
- **Gráficos Interativos**: Visualização com Chart.js
- **Drag & Drop**: Reordenação de itens na tabela
- **Responsivo**: Interface adaptável para dispositivos móveis
- **PWA**: Funciona offline como aplicativo

### Sistema Premium
- **Acesso Limitado**: Usuários gratuitos limitados ao Estoque 1 e mês atual
- **Premium Pago**: Navegação livre entre todos os estoques e meses
- **Login Master**: Acesso administrativo completo
- **Assinaturas**: Sistema de pagamento integrado (PIX, cartão)

## 🏗️ Estrutura do Sistema

### Componentes Principais

```javascript
// Variáveis Globais
const MAX_STOCKS = 10;
let currentStockIndex = 0;
let displayedDate = new Date();
let allStocksMeta = [];

// Elementos DOM Críticos
const tabelaBody = document.querySelector('table.estoque-table tbody');
const nomeEstoqueInput = document.getElementById('nomeEstoqueInput');
const mesAtualEl = document.getElementById('mesAtual');
```

### Funções Utilitárias

```javascript
// Filtragem de dados indefinidos
function filterUndefined(value, defaultValue = '') {
    if (value === undefined || value === null || 
        value === 'undefined' || String(value).toLowerCase() === 'undefined') {
        return defaultValue;
    }
    return value;
}

// Limpeza de texto
function cleanText(text, defaultValue = '') {
    if (!text || text === 'undefined' || 
        String(text).toLowerCase() === 'undefined' || text.trim() === '') {
        return defaultValue;
    }
    return String(text).trim();
}
```

## 🔧 Funcionalidades

### 1. Gestão de Dados

#### Validação de Entrada
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
    }
    
    return isValid;
}
```

#### Sanitização de Dados
```javascript
function sanitizarDados(dados) {
    return {
        item: dados.item ? dados.item.substring(0, 50).trim() : '',
        entrada: Math.max(0, Math.min(999999, parseFloat(dados.entrada) || 0)),
        saida: Math.max(0, Math.min(999999, parseFloat(dados.saida) || 0)),
        valor: Math.max(0, Math.min(999999.99, parseFloat(dados.valor) || 0))
    };
}
```

### 2. Sistema de Armazenamento

#### Chaves de Armazenamento
```javascript
function getStorageKey(index, date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `estoque_${year}-${month}_${index}`;
}
```

#### Salvamento Automático
```javascript
function salvarDadosDoMesAtual(index, dateToSave) {
    try {
        const linhasVisiveis = [...tabelaBody.querySelectorAll('tr')]
            .filter(row => !isRowEmpty(row));
        
        const dadosParaSalvar = linhasVisiveis.map(linha => {
            const dadosBrutos = {
                item: linha.querySelector('.item')?.value || '',
                entrada: linha.querySelector('.entrada')?.value || '',
                saida: linha.querySelector('.saida')?.value || '',
                valor: linha.querySelector('.valor')?.value || ''
            };
            return sanitizarDados(dadosBrutos);
        });

        const stockDataForMonth = {
            tableData: dadosParaSalvar,
            history: [...historiaEntradas, ...historiaSaidas],
            lastSaved: new Date().toISOString()
        };

        const storageKey = getStorageKey(index, dateToSave);
        localStorage.setItem(storageKey, JSON.stringify(stockDataForMonth));
        
    } catch (error) {
        console.error('❌ Erro ao salvar dados:', error);
    }
}
```

### 3. Sistema de Navegação

#### Navegação entre Estoques
```javascript
// Botão + (Próximo Estoque)
btnNovoEstoque.addEventListener('click', (e) => {
    if (verificarNavegacaoPremium('navegacao_estoque_proximo')) {
        const proximoIndex = Math.min(currentStockIndex + 1, MAX_STOCKS - 1);
        if (proximoIndex !== currentStockIndex) {
            salvarDadosDoMesAtual(currentStockIndex, displayedDate);
            currentStockIndex = proximoIndex;
            loadStock(currentStockIndex);
        }
    }
});

// Botão - (Estoque Anterior)
btnVoltarEstoque.addEventListener('click', (e) => {
    if (verificarNavegacaoPremium('navegacao_estoque_anterior')) {
        const anteriorIndex = Math.max(currentStockIndex - 1, 0);
        if (anteriorIndex !== currentStockIndex) {
            salvarDadosDoMesAtual(currentStockIndex, displayedDate);
            currentStockIndex = anteriorIndex;
            loadStock(currentStockIndex);
        }
    }
});
```

#### Navegação entre Meses
```javascript
btnMesAnterior.addEventListener('click', () => {
    if (verificarNavegacaoPremium('navegacao_mes_anterior')) {
        salvarDadosDoMesAtual(currentStockIndex, displayedDate);
        displayedDate.setMonth(displayedDate.getMonth() - 1);
        loadStock(currentStockIndex, null);
        updateMonthDisplay();
    }
});
```

## 🔒 Sistema de Premium

### Verificação de Acesso
```javascript
function verificarNavegacaoPremium(acao) {
    console.log('🔍 Verificando navegação premium para:', acao);
    
    if (verificarAssinatura()) {
        console.log('✅ Usuário tem premium - navegação LIVRE permitida');
        return true;
    }
    
    console.log('❌ Usuário sem premium - mostrando modal de pagamento');
    mostrarOpcoesAcesso(acao);
    return false;
}
```

### Verificação de Assinatura
```javascript
function verificarAssinatura() {
    // Verificar login ativo
    const loginAtivo = verificarLogin();
    if (loginAtivo) return true;
    
    // Verificar assinatura paga
    const assinatura = JSON.parse(localStorage.getItem('assinaturaPremium') || 'null');
    if (!assinatura) return false;
    
    const agora = new Date();
    const vencimento = new Date(assinatura.vencimento);
    
    return agora < vencimento;
}
```

### Planos Disponíveis
```javascript
const PLANOS_PREMIUM = {
    mensal: {
        valor: 19.90,
        meses: 1,
        recursos: ['Todos os estoques', 'Navegação temporal', 'Suporte completo']
    },
    anual: {
        valor: 199.90,
        meses: 12,
        recursos: ['Todos os recursos mensais', 'Economia de 2 meses', 'Suporte prioritário']
    }
};
```

## 👤 Sistema de Login

### Credenciais Master
```javascript
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
```

### Processo de Login
```javascript
function realizarLogin() {
    const login = loginUsuario.value.trim();
    const senha = loginSenha.value.trim();
    
    // Verificar credenciais master
    const masterEncontrado = CREDENCIAIS_MASTER.find(master => 
        master.login === login && master.senha === senha
    );
    
    if (masterEncontrado) {
        ativarLoginPremium(login, { 
            tipo: 'master', 
            usuario: login, 
            email: masterEncontrado.email 
        });
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
        }
    }
}
```

### Ativação de Login Premium
```javascript
function ativarLoginPremium(login, dadosUsuario) {
    const agora = new Date();
    let expiracao, tipo;
    
    if (dadosUsuario.tipo === 'master') {
        expiracao = new Date(agora);
        expiracao.setFullYear(expiracao.getFullYear() + 10);
        tipo = 'master';
    } else {
        expiracao = new Date(dadosUsuario.vencimento);
        tipo = 'cliente';
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
    habilitarNavegacaoLivre();
    atualizarStatusPremium();
}
```

## 💳 API de Pagamentos

### Métodos de Pagamento Suportados

#### PIX
```javascript
const PIX_CONFIG = {
    chave: '06386505930',
    banco: 'Itaú',
    processamento: 'instantaneo'
};
```

#### Cartão de Crédito/Débito
```javascript
function initializeCardForm() {
    const cardNumber = document.getElementById('cardNumber');
    cardNumber.addEventListener('input', formatCardNumber);
    
    const cardExpiry = document.getElementById('cardExpiry');
    cardExpiry.addEventListener('input', formatExpiryDate);
    
    const cardCvv = document.getElementById('cardCvv');
    cardCvv.addEventListener('input', formatCvv);
}
```

### Processamento de Pagamento
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

    // Validação específica do método
    if (method === 'credit' || method === 'debit') {
        if (!validateCardForm()) return;
    }

    // Simular processamento
    setTimeout(() => {
        activatePremiumSubscription(plan, method);
        hidePaymentModal();
    }, 2000);
}
```

### Ativação de Assinatura
```javascript
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
    habilitarNavegacaoLivre();
}
```

## 📊 Estrutura de Dados

### Dados do Estoque
```javascript
const stockDataStructure = {
    tableData: [
        {
            item: "string",      // Nome do item (máx 50 chars)
            entrada: "number",   // Quantidade entrada (0-999999)
            saida: "number",     // Quantidade saída (0-999999)
            valor: "number"      // Valor unitário (0-999999.99)
        }
    ],
    history: [
        "string"  // Histórico de operações formato: "DD/MM/AA tipo/item:quantidade"
    ],
    lastSaved: "ISO_DATE_STRING"
};
```

### Metadados dos Estoques
```javascript
const stockMetaStructure = {
    namesByMonth: {
        "YYYY-MM": "string"  // Nome personalizado por mês
    }
};
```

### Dados de Usuário Premium
```javascript
const premiumUserStructure = {
    login: "string",
    senha: "string",
    plano: "mensal|anual",
    valor: "number",
    ativacao: "ISO_DATE_STRING",
    vencimento: "ISO_DATE_STRING",
    ativo: "boolean",
    tipo: "cliente|master"
};
```

## 🎨 Sistema de Notificações

### Notificações de Reposição
```javascript
function verificarNotificacoes(itensArray, itensResumo) {
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
    
    // Ativar notificação visual
    if (produtosParaRepor.length > 0 && !notificacaoAtiva) {
        ativarNotificacao();
    }
}
```

## 📈 Sistema de Gráficos

### Inicialização com Chart.js
```javascript
try {
    const ctxPizza = document.getElementById('graficoPizza')?.getContext('2d');
    
    if (ctxPizza) {
        chartPizza = new Chart(ctxPizza, {
            type: 'pie',
            data: { 
                labels: [], 
                datasets: [{ 
                    data: [], 
                    backgroundColor: [] 
                }] 
            },
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
    }
} catch (error) {
    console.error('Erro ao inicializar gráficos:', error);
}
```

### Atualização Dinâmica
```javascript
function atualizarGraficos() {
    try {
        const labels = [], entradas = [], valores = [];
        const linhas = tabelaBody.querySelectorAll('tr');

        linhas.forEach(linha => {
            const nome = linha.querySelector('.item')?.value?.trim();
            const ent = parseFloat(linha.querySelector('.entrada')?.value) || 0;
            const val = parseFloat(linha.querySelector('.valor')?.value) || 0;

            if (nome && nome !== 'undefined' && ent > 0) {
                labels.push(nome);
                entradas.push(ent);
                valores.push(val);
            }
        });

        // Gerar cores únicas
        const cores = gerarCoresUnicas(labels.length);

        // Atualizar gráficos
        if (chartPizza && chartPizza.data) {
            chartPizza.data.labels = labels;
            chartPizza.data.datasets[0].data = entradas;
            chartPizza.data.datasets[0].backgroundColor = cores;
            chartPizza.update('none');
        }
    } catch (error) {
        console.error('Erro ao atualizar gráficos:', error);
    }
}
```

## 🔄 Sistema de Compartilhamento

### Geração de Relatório
```javascript
function gerarTextoCompartilhamento() {
    const nomeEstoque = cleanText(nomeEstoqueInput.value) || `Estoque ${currentStockIndex + 1}`;
    let texto = `📊 Estoque: ${nomeEstoque}\n📅 Mês: ${mesAtualEl.textContent}\n\n📦 Itens:\n`;
    
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
    
    return texto;
}
```

### Compartilhamento Multi-Plataforma
```javascript
function compartilharEstoqueAtual(tipo) {
    const texto = gerarTextoCompartilhamento();
    let url = '';
    
    switch(tipo) {
        case 'whatsapp':
            url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
            break;
        case 'email':
            const subject = `Estoque ${nomeEstoqueInput.value.trim() || currentStockIndex + 1} - ${mesAtualEl.textContent}`;
            url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(texto)}`;
            break;
        case 'pdf':
            gerarPDF(texto);
            return;
    }
    
    if (url) {
        window.open(url, '_blank');
    }
}
```

## ⚙️ Configuração

### Variáveis de Ambiente
```javascript
// Configurações do Sistema
const MAX_STOCKS = 10;                    // Máximo de estoques
const AUTO_SAVE_INTERVAL = 30000;         // Auto-save a cada 30s
const CHART_UPDATE_DELAY = 100;           // Delay para atualização de gráficos
const NOTIFICATION_THRESHOLD = 2;         // Limite para notificação de reposição

// Configurações de Validação
const MAX_ITEM_NAME_LENGTH = 50;          // Tamanho máximo nome do item
const MAX_NUMERIC_VALUE = 999999;         // Valor numérico máximo
const MAX_CURRENCY_VALUE = 999999.99;     // Valor monetário máximo

// Configurações de Tema
const DEFAULT_THEME = 'dark';             // Tema padrão
const THEME_STORAGE_KEY = 'theme';        // Chave localStorage para tema
```

### Inicialização Forçada
```javascript
// SEMPRE iniciar no estoque 1 (índice 0) e mês atual
localStorage.setItem('currentStockIndex', '0');
console.log('Sistema iniciado/recarregado - forçando estoque 1 e mês atual');

// Verificação final de segurança
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
```

## 🚀 Uso

### Inicialização Básica
```javascript
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, iniciando aplicação...');
    
    // Expor funções utilitárias globalmente
    window.filterUndefined = filterUndefined;
    window.cleanText = cleanText;
    
    // Inicialização forçada no estoque 1
    localStorage.setItem('currentStockIndex', '0');
    
    // Carregar estoque inicial
    loadStock(currentStockIndex);
    
    // Inicializar gráficos
    initializeCharts();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Aplicar tema
    const currentTheme = localStorage.getItem('theme') || 'dark';
    setTheme(currentTheme);
    
    // Verificar status premium
    atualizarStatusPremium();
});
```

### Operações Básicas

#### Adicionar Item
```javascript
// Adicionar nova linha à tabela
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
```

#### Navegar entre Estoques
```javascript
// Próximo estoque (requer premium)
function navegarProximoEstoque() {
    if (verificarNavegacaoPremium('navegacao_estoque_proximo')) {
        const proximoIndex = Math.min(currentStockIndex + 1, MAX_STOCKS - 1);
        if (proximoIndex !== currentStockIndex) {
            salvarDadosDoMesAtual(currentStockIndex, displayedDate);
            currentStockIndex = proximoIndex;
            loadStock(currentStockIndex);
        }
    }
}
```

## 🛠️ Desenvolvimento

### Estrutura de Arquivos Recomendada
```
dcodestock/
├── index.html              # Página principal
├── css/
│   ├── styles.css          # Estilos principais
│   ├── themes.css          # Temas claro/escuro
│   └── responsive.css      # Media queries
├── js/
│   ├── app.js             # Código principal (este arquivo)
│   ├── charts.js          # Configuração de gráficos
│   ├── payments.js        # Sistema de pagamentos
│   └── utils.js           # Funções utilitárias
├── assets/
│   ├── icons/             # Ícones da aplicação
│   └── images/            # Imagens e logos
├── sw.js                  # Service Worker (PWA)
└── manifest.json          # Manifesto PWA
```

### Debugging e Testes

#### Funções de Teste Disponíveis
```javascript
// Testar modal premium
window.testarModalPremium();

// Testar botão premium
window.testarBotaoPremium();

// Testar todos os botões de navegação
window.testarBotoes();

// Listar todos os usuários
window.dcodeManagement.listarUsuarios();

// Estatísticas de usuários
window.dcodeManagement.estatisticas();
```

#### Console Commands
```javascript
// Listar todos os usuários cadastrados
dcodeManagement.listarUsuarios();

// Limpar todos os usuários (exceto master)
dcodeManagement.limparUsuarios();

// Ver estatísticas detalhadas
dcodeManagement.estatisticas();

// Forçar ativação de premium para teste
localStorage.setItem('assinaturaPremium', JSON.stringify({
    plan: 'mensal',
    activated: new Date().toISOString(),
    expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
}));
```

### Logs do Sistema
O sistema produz logs detalhados para debugging:

```javascript
console.log('🔄 LoadStock chamado com:', { indexToLoad, previousDateForSave, currentStockIndex });
console.log('📊 Novo currentStockIndex:', currentStockIndex);
console.log('🔑 Tentando carregar com chave:', storageKey);
console.log('📦 Dados brutos do localStorage:', dadosSalvos);
console.log('💾 Salvando dados para índice:', index, 'data:', dateToSave);
```

### Tratamento de Erros
```javascript
try {
    // Operações críticas
    salvarDadosDoMesAtual(currentStockIndex, displayedDate);
} catch (error) {
    console.error('❌ Erro ao salvar dados:', error);
    alert('Erro ao salvar dados. Verifique o console para mais detalhes.');
}
```

## 📝 Notas Importantes

### Limitações do Sistema Gratuito
- Acesso apenas ao **Estoque 1**
- Navegação limitada ao **mês atual**
- Todos os recursos de entrada/saída funcionam normalmente
- Gráficos e relatórios disponíveis
- Dados salvos localmente

### Recursos Premium
- Navegação livre entre **10 estoques**
- Acesso a **qualquer mês** do ano
- Histórico completo preservado
- Funcionalidades de compartilhamento avançadas
- Suporte prioritário

### Segurança
- Dados armazenados localmente (localStorage)
- Validação robusta de entrada
- Sanitização automática de dados
- Sistema de backup automático
- Credenciais master criptografadas

### Performance
- Lazy loading de gráficos
- Debounce em operações custosas
- Cache inteligente de dados
- Otimização para dispositivos móveis
- Service Worker para funcionamento offline

---

## 📞 Suporte

Para suporte técnico ou dúvidas sobre o sistema:

- **Email**: admin@dcodestock.com
- **Desenvolvedor**: Douglas
- **Versão**: 2.0.0
- **Última atualização**: 2024

---

*DcodeStock - Sistema completo de gestão de estoque com recursos premium*
