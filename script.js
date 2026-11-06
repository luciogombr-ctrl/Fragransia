document.addEventListener('DOMContentLoaded', () => {
    // --------------------------------------------------
    // Elementos do Chatbot
    // --------------------------------------------------
    const inputMensagem = document.getElementById('mensagem');
    const botaoEnviar = document.getElementById('enviarMensagem');
    const areaResposta = document.getElementById('resposta');

    // --------------------------------------------------
    // Base de Conhecimento do Chatbot (Fragransia)
    // --------------------------------------------------
    const respostasBot = [
        {
            palavras: ['preco', 'precos', 'valor', 'valores', 'quanto custa', 'tabela'],
            resposta: 'Nossa tabela de criações exclusivas:\n' +
                      '• Fragrâncias Masculinas: R$ 40,00\n' +
                      '• Amadeirados & Notas de Fundo: R$ 30,00\n' +
                      '• Duo Assinatura (Perfume & Elixir): R$ 60,00\n' +
                      '• Kit Presença Absoluta (Premium): R$ 80,00'
        },
        {
            palavras: ['masculino', 'masculina', 'homem', 'classica'],
            resposta: 'Nossa linha de Fragrâncias Masculinas (R$ 40,00) reúne acordes clássicos e modernos, lapidados para destacar presença e identidade única.'
        },
        {
            palavras: ['madeira', 'amadeirado', 'amadeirados', 'patchouli', 'carvalho'],
            resposta: 'Os Amadeirados & Notas de Fundo (R$ 30,00) trazem a nobreza do carvalho e do patchouli, garantindo alta fixação e sobriedade.'
        },
        {
            palavras: ['duo', 'barba', 'elixir', 'combinacao'],
            resposta: 'O Duo Assinatura (R$ 60,00) inclui nosso perfume exclusivo combinado ao elixir de tratamento e perfume para barba.'
        },
        {
            palavras: ['premium', 'pacote', 'completo', 'kit'],
            resposta: 'O Pacote Premium (R$ 80,00) é o Kit Presença Absoluta: reúne perfume de nicho, cuidados faciais e assinatura olfativa de longa duração.'
        },
        {
            palavras: ['sobre', 'historia', 'origem', '1994', 'tradicao'],
            resposta: 'A Fragransia marca presenças desde 1994, combinando o rigor da perfumaria artesanal à elegância atemporal.'
        },
        {
            palavras: ['comprar', 'pedido', 'encomenda', 'atendimento', 'contato'],
            resposta: 'Você pode escolher um dos nossos serviços acima ou nos dizer qual perfil de fragrância você procura para montarmos sua assinatura olfativa personalizada!'
        },
        {
            palavras: ['ola', 'olá', 'oi', 'bom dia', 'boa tarde', 'boa noite'],
            resposta: 'Olá! Seja muito bem-vindo à Fragransia. Como posso guiar sua escolha aromática hoje?'
        }
    ];

    // --------------------------------------------------
    // Funções do Chat
    // --------------------------------------------------

    function adicionarMensagem(autor, texto) {
        const bloco = document.createElement('div');
        bloco.style.marginBottom = '14px';

        if (autor === 'voce') {
            bloco.innerHTML = `<strong>Você:</strong>\n${texto}`;
            bloco.style.color = '#111';
        } else {
            bloco.innerHTML = `<strong>Assistente Fragransia 🏺:</strong>\n${texto}`;
            bloco.style.color = '#2d5a0b';
        }

        areaResposta.appendChild(bloco);
        areaResposta.scrollTop = areaResposta.scrollHeight;
    }

    function processarPergunta(textoUsuario) {
        const textoNormalizado = textoUsuario
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        for (const item of respostasBot) {
            const encontrou = item.palavras.some(termo => textoNormalizado.includes(termo));
            if (encontrou) {
                return item.resposta;
            }
        }

        return 'Compreendo perfeitamente. Trabalhamos com essências sob medida, masculinas, amadeiradas e kits completos. Deseja conhecer os valores ou os detalhes de algum serviço específico?';
    }

    function enviarMensagem() {
        const mensagem = inputMensagem.value.trim();
        if (!mensagem) return;

        // Renderiza mensagem do cliente
        adicionarMensagem('voce', mensagem);
        inputMensagem.value = '';

        // Simula tempo de resposta elegante do bot
        setTimeout(() => {
            const resposta = processarPergunta(mensagem);
            adicionarMensagem('bot', resposta);
        }, 450);
    }

    // Eventos de clique e teclado
    botaoEnviar.addEventListener('click', enviarMensagem);

    inputMensagem.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            enviarMensagem();
        }
    });

    // --------------------------------------------------
    // Integração: Clicar nos cards de serviços envia pergunta ao bot
    // --------------------------------------------------
    const cardsServicos = document.querySelectorAll('.servico');
    cardsServicos.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            const nomeServico = card.querySelector('h3')?.innerText || '';
            const secaoChat = document.getElementById('chatbot');
            
            if (nomeServico) {
                secaoChat.scrollIntoView({ behavior: 'smooth' });
                inputMensagem.value = `Gostaria de saber mais sobre: ${nomeServico}`;
                inputMensagem.focus();
            }
        });
    });
});
