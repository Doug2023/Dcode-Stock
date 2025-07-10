// payment.js - Sistema de pagamento do DcodeStock

// === VARIÁVEIS GLOBAIS ===
let selectedPlan = 'annual';
let selectedPaymentMethod = 'pix';

// === INICIALIZAÇÃO ===
document.addEventListener('DOMContentLoaded', function() {
    console.log('Sistema de pagamento inicializado');
    
    // Configura eventos do modal de pagamento
    configurarModalPagamento();
    
    // Configura PIX
    configurarPIX();
    
    // Configura cartão
    configurarCartao();
});

// === CONFIGURAÇÃO DO MODAL ===
function configurarModalPagamento() {
    // Seleção de planos
    const planOptions = document.querySelectorAll('.plan-option');
    planOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove seleção anterior
            planOptions.forEach(p => p.classList.remove('selected'));
            
            // Adiciona seleção atual
            this.classList.add('selected');
            selectedPlan = this.dataset.plan;
            
            console.log('Plano selecionado:', selectedPlan);
            
            // Atualiza preços no formulário de cartão se necessário
            atualizarPrecosCartao();
        });
    });
    
    // Seleção de métodos de pagamento
    const paymentMethods = document.querySelectorAll('.payment-method');
    paymentMethods.forEach(method => {
        method.addEventListener('click', function() {
            // Remove seleção anterior
            paymentMethods.forEach(m => m.classList.remove('active'));
            
            // Adiciona seleção atual
            this.classList.add('active');
            selectedPaymentMethod = this.dataset.method;
            
            console.log('Método selecionado:', selectedPaymentMethod);
            
            // Mostra/esconde formulário de cartão
            toggleCartaoForm();
        });
    });
    
    // Botão confirmar pagamento
    const confirmarBtn = document.getElementById('confirmarPagamento');
    if (confirmarBtn) {
        confirmarBtn.addEventListener('click', processarPagamento);
    }
    
    // Botão cancelar
    const cancelarBtn = document.getElementById('cancelarPagamento');
    if (cancelarBtn) {
        cancelarBtn.addEventListener('click', function() {
            fecharModalPagamento();
        });
    }
    
    // Botão X para fechar
    const closeBtn = document.getElementById('fecharModalPagamento');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            fecharModalPagamento();
        });
    }
}

// === FUNÇÃO PARA FECHAR MODAL ===
function fecharModalPagamento() {
    const modal = document.getElementById('modalPagamento');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 500);
    }
}

// === PIX ===
function configurarPIX() {
    const copyBtn = document.getElementById('copyPixBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            const pixKey = document.getElementById('pixKey').value;
            
            // Tenta copiar para a área de transferência
            if (navigator.clipboard) {
                navigator.clipboard.writeText(pixKey).then(() => {
                    mostrarSucessoCopia();
                }).catch(() => {
                    copiarManualmente(pixKey);
                });
            } else {
                copiarManualmente(pixKey);
            }
        });
    }
}

function mostrarSucessoCopia() {
    const btn = document.getElementById('copyPixBtn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        Copiado!
    `;
    btn.classList.add('copied');
    
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.remove('copied');
    }, 2000);
}

function copiarManualmente(text) {
    // Método fallback para navegadores mais antigos
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        mostrarSucessoCopia();
    } catch (err) {
        console.error('Erro ao copiar:', err);
        alert('Chave PIX: ' + text);
    }
    
    document.body.removeChild(textArea);
}

// === CARTÃO DE CRÉDITO ===
function configurarCartao() {
    // Formatação do número do cartão
    const cardNumberInput = document.getElementById('cardNumber');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function() {
            let value = this.value.replace(/\D/g, '');
            value = value.substring(0, 16);
            value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
            this.value = value;
        });
    }
    
    // Formatação da data de validade
    const cardExpiryInput = document.getElementById('cardExpiry');
    if (cardExpiryInput) {
        cardExpiryInput.addEventListener('input', function() {
            let value = this.value.replace(/\D/g, '');
            value = value.substring(0, 4);
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2);
            }
            this.value = value;
        });
    }
    
    // Formatação do CVV
    const cardCvvInput = document.getElementById('cardCvv');
    if (cardCvvInput) {
        cardCvvInput.addEventListener('input', function() {
            let value = this.value.replace(/\D/g, '');
            value = value.substring(0, 4);
            this.value = value;
        });
    }
    
    // Formatação do nome (apenas letras e espaços)
    const cardNameInput = document.getElementById('cardName');
    if (cardNameInput) {
        cardNameInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').toUpperCase();
        });
    }
}

function toggleCartaoForm() {
    const cardForm = document.getElementById('cardForm');
    
    if (selectedPaymentMethod === 'credit' || selectedPaymentMethod === 'debit') {
        cardForm.style.display = 'block';
        cardForm.classList.add('active');
    } else {
        cardForm.style.display = 'none';
        cardForm.classList.remove('active');
    }
}

function atualizarPrecosCartao() {
    const installmentsSelect = document.getElementById('cardInstallments');
    if (!installmentsSelect) return;
    
    let preco = 29; // Preço mensal
    
    if (selectedPlan === 'annual') {
        preco = 299; // Preço anual
    }
    
    // Atualiza opções de parcelamento
    installmentsSelect.innerHTML = '';
    
    if (selectedPaymentMethod === 'credit') {
        // Cartão de crédito - permite parcelamento
        const parcelas = [1, 2, 3, 6, 12];
        
        parcelas.forEach(parcela => {
            const valorParcela = (preco / parcela).toFixed(2);
            const option = document.createElement('option');
            option.value = parcela;
            
            if (parcela === 1) {
                option.textContent = `1x R$ ${preco.toFixed(2)} (à vista)`;
            } else {
                option.textContent = `${parcela}x R$ ${valorParcela}`;
            }
            
            installmentsSelect.appendChild(option);
        });
    } else {
        // Cartão de débito - apenas à vista
        const option = document.createElement('option');
        option.value = 1;
        option.textContent = `1x R$ ${preco.toFixed(2)} (à vista)`;
        installmentsSelect.appendChild(option);
    }
}

// === PROCESSAMENTO DE PAGAMENTO ===
function processarPagamento() {
    console.log('Processando pagamento...');
    
    if (selectedPaymentMethod === 'pix') {
        processarPagamentoPIX();
    } else if (selectedPaymentMethod === 'credit' || selectedPaymentMethod === 'debit') {
        processarPagamentoCartao();
    }
}

function processarPagamentoPIX() {
    console.log('Processando pagamento PIX...');
    
    // Simula processamento
    mostrarCarregamento();
    
    setTimeout(() => {
        esconderCarregamento();
        mostrarSucessoPagamento('PIX');
        fecharModalPagamento();
        ativarPremium();
    }, 2000);
}

function processarPagamentoCartao() {
    console.log('Processando pagamento no cartão...');
    
    // Validação básica
    const numeroCartao = document.getElementById('cardNumber').value.replace(/\s/g, '');
    const validade = document.getElementById('cardExpiry').value;
    const cvv = document.getElementById('cardCvv').value;
    const nome = document.getElementById('cardName').value;
    
    if (!numeroCartao || numeroCartao.length < 16) {
        alert('Número do cartão inválido!');
        return;
    }
    
    if (!validade || validade.length < 5) {
        alert('Data de validade inválida!');
        return;
    }
    
    if (!cvv || cvv.length < 3) {
        alert('CVV inválido!');
        return;
    }
    
    if (!nome || nome.length < 3) {
        alert('Nome do portador inválido!');
        return;
    }
    
    // Simula processamento
    mostrarCarregamento();
    
    setTimeout(() => {
        esconderCarregamento();
        mostrarSucessoPagamento('Cartão');
        fecharModalPagamento();
        ativarPremium();
    }, 3000);
}

// === FEEDBACK VISUAL ===
function mostrarCarregamento() {
    const btn = document.getElementById('confirmarPagamento');
    if (btn) {
        btn.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 16px; height: 16px; border: 2px solid transparent; border-top: 2px solid currentColor; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                Processando...
            </div>
        `;
        btn.disabled = true;
    }
    
    // Adiciona CSS da animação se não existir
    if (!document.getElementById('spin-animation')) {
        const style = document.createElement('style');
        style.id = 'spin-animation';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

function esconderCarregamento() {
    const btn = document.getElementById('confirmarPagamento');
    if (btn) {
        btn.innerHTML = `
            <span class="btn-text">Assinar Agora</span>
            <span class="btn-icon">🚀</span>
        `;
        btn.disabled = false;
    }
}

function mostrarSucessoPagamento(metodo) {
    console.log(`Pagamento ${metodo} processado com sucesso!`);
    
    // Aqui você pode adicionar uma notificação visual mais elaborada
    // Por enquanto, apenas log no console
}

// === ATIVAÇÃO PREMIUM ===
function ativarPremium() {
    // Salva status premium
    localStorage.setItem('premiumActive', 'true');
    localStorage.setItem('premiumPlan', selectedPlan);
    localStorage.setItem('premiumStartDate', new Date().toISOString());
    
    // Atualiza interface
    const premiumBtn = document.getElementById('btnPremium');
    if (premiumBtn) {
        premiumBtn.innerHTML = '✨ Premium Ativo';
        premiumBtn.style.background = 'linear-gradient(135deg, #FFD700, #FFA500)';
        premiumBtn.style.color = '#000';
        premiumBtn.onclick = null; // Remove a função de abrir modal
    }
    
    console.log('Premium ativado com sucesso!');
}

// === VERIFICAÇÃO DE STATUS PREMIUM ===
function verificarStatusPremium() {
    const premiumActive = localStorage.getItem('premiumActive');
    const premiumPlan = localStorage.getItem('premiumPlan');
    
    if (premiumActive === 'true') {
        const premiumBtn = document.getElementById('btnPremium');
        if (premiumBtn) {
            premiumBtn.innerHTML = '✨ Premium Ativo';
            premiumBtn.style.background = 'linear-gradient(135deg, #FFD700, #FFA500)';
            premiumBtn.style.color = '#000';
            premiumBtn.onclick = null;
        }
        return true;
    }
    
    return false;
}

// === INICIALIZAÇÃO PREMIUM ===
document.addEventListener('DOMContentLoaded', function() {
    verificarStatusPremium();
});

// === FUNÇÕES GLOBAIS ===
window.processarPagamento = processarPagamento;
window.fecharModalPagamento = fecharModalPagamento;
window.verificarStatusPremium = verificarStatusPremium;
