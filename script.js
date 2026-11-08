document.addEventListener('DOMContentLoaded', () => {
    // --------------------------------------------------
    // Elementos do Chatbot
    // --------------------------------------------------
    const inputMensagem = document.getElementById('mensagem');
    const botaoEnviar = document.getElementById('enviarMensagem');
    const areaResposta = document.getElementById('resposta');

    // Histórico enviado à IA (últimas mensagens dão contexto à conversa)
    const historico = [];

    // --------------------------------------------------
    // Respostas de reserva: usadas só se a IA estiver indisponível
    // --------------------------------------------------
    const respostasBot = [
        { palavras: ['preco', 'precos', 'valor', 'valores', 'quanto custa', 'tabela'],
          resposta: 'Nossa tabela:\n• Fragrâncias Masculinas: R$ 40,00\n• Amadeirados & Notas de Fundo: R$ 30,00\n• Duo Assinatura (Perfume & Elixir de Barba): R$ 60,00\n• Pacote Premium (Kit Presença Absoluta): R$ 80,00' },
        { palavras: ['masculino', 'masculina', 'homem', 'classica'],
          resposta: 'Nossas Fragrâncias Masculinas (R$ 40,00) reúnem acordes clássicos e contemporâneos.' },
        { palavras: ['madeira', 'amadeirado', 'amadeirados', 'patchouli', 'carvalho'],
          resposta: 'Os Amadeirados & Notas de Fundo (R$ 30,00) trazem carvalho e patchouli.' },
        { palavras: ['duo', 'barba', 'elixir'],
          resposta: 'O Duo Assinatura (R$ 60,00) combina perfume e elixir de barba.' },
        { palavras: ['premium', 'pacote', 'kit'],
          resposta: 'O Pacote Premium (R$ 80,00) é o Kit Presença Absoluta: perfume de nicho, cuidados faciais e assinatura olfativa.' },
        { palavras: ['ola', 'oi', 'bom dia', 'boa tarde', 'boa noite'],
          resposta: 'Olá! Seja bem-vindo à Fragransia. Como posso ajudar na sua escolha?' }
    ];

    function respostaReserva(texto) {
        const t = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        for (const item of respostasBot) {
            if (item.palavras.some(p => t.includes(p))) return item.resposta;
        }
        return 'Estou com instabilidade agora. Você pode ver os valores nos cards acima ou falar pelo WhatsApp (86) 99865-6925.';
    }

    // --------------------------------------------------
    // Funções do Chat
    // --------------------------------------------------
    function adicionarMensagem(autor, texto) {
        const bloco = document.createElement('div');
        bloco.style.marginBottom = '14px';

        const nome = document.createElement('strong');
        nome.textContent = autor === 'voce' ? 'Você:' : 'Aurélio 🏺:';
        bloco.appendChild(nome);
        bloco.appendChild(document.createTextNode('\n' + texto));
        bloco.style.color = autor === 'voce' ? '#111' : '#2d5a0b';

        areaResposta.appendChild(bloco);
        areaResposta.scrollTop = areaResposta.scrollHeight;
        return bloco;
    }

    async function enviarMensagem() {
        const mensagem = inputMensagem.value.trim();
        if (!mensagem) return;

        adicionarMensagem('voce', mensagem);
        inputMensagem.value = '';
        historico.push({ role: 'user', content: mensagem });

        botaoEnviar.disabled = true;
        const espera = adicionarMensagem('bot', 'preparando a resposta...');

        try {
            const r = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: historico.slice(-10) })
            });
            const dados = await r.json();
            if (!r.ok) throw new Error(dados.erro || 'Falha no servidor');
            espera.remove();
            adicionarMensagem('bot', dados.resposta);
            historico.push({ role: 'assistant', content: dados.resposta });
        } catch (err) {
            console.error(err);
            espera.remove();
            historico.pop();
            adicionarMensagem('bot', respostaReserva(mensagem));
        } finally {
            botaoEnviar.disabled = false;
            inputMensagem.focus();
        }
    }

    botaoEnviar.addEventListener('click', enviarMensagem);
    inputMensagem.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            enviarMensagem();
        }
    });

    // --------------------------------------------------
    // Clicar nos cards de serviços leva a dúvida ao assistente
    // --------------------------------------------------
    document.querySelectorAll('.servico').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            const nomeServico = card.querySelector('h3')?.innerText || '';
            if (nomeServico) {
                document.getElementById('chatbot').scrollIntoView({ behavior: 'smooth' });
                inputMensagem.value = `Gostaria de saber mais sobre: ${nomeServico}`;
                inputMensagem.focus();
            }
        });
    });
});