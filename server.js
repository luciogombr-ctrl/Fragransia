import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import { PERSONA, CONHECIMENTO, REGRAS } from "./persona.js";

dotenv.config({ quiet: true });

const PORTA = process.env.PORT || 3000;
let modeloAtivo = "llama-3.1-8b-instant";

if (!process.env.GROQ_API_KEY) {
  console.warn(
    "\n⚠️  GROQ_API_KEY não encontrada!\n" +
      "   Adicione no arquivo .env (fora da pasta public) a linha:\n" +
      "   GROQ_API_KEY=sua_chave_aqui\n"
  );
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Conexão com o banco de dados Supabase
const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
    : null;

const app = express();

app.use(express.json());
app.use(express.static("public"));

async function detectarMelhorModelo() {
  try {
    const lista = await groq.models.list();
    const ids = (lista.data || []).map((m) => m.id);
    console.log("📋 Modelos disponíveis na sua conta Groq:", ids.join(", "));

    const compativeisComTools = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "meta-llama/llama-4-scout-17b-16e-instruct",
      "meta-llama/llama-4-maverick-17b-128e-instruct",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "qwen/qwen3-32b",
      "moonshotai/kimi-k2-instruct",
    ];

    const encontrado =
      compativeisComTools.find((id) => ids.includes(id)) ||
      ids.find(
        (id) =>
          !id.includes("whisper") &&
          !id.includes("guard") &&
          !id.includes("tts") &&
          !id.includes("compound") &&
          !id.includes("orpheus")
      );

    if (encontrado) {
      modeloAtivo = encontrado;
    }
    console.log(`🧠 Modelo Groq selecionado: ${modeloAtivo}`);
  } catch (err) {
    console.warn("⚠️ Não foi possível listar modelos da Groq, usando padrão:", modeloAtivo);
  }
}

const INSTRUCAO_DE_SISTEMA = `
Você é ${PERSONA.nome}, atendente virtual da ${PERSONA.empresa} (${PERSONA.ramo}).
Seu objetivo: ${PERSONA.objetivo}.
Seu tom: ${PERSONA.tom}

=== CONHECIMENTO DA EMPRESA ===
${CONHECIMENTO}

=== REGRAS ===
${REGRAS.map((regra, i) => `${i + 1}. ${regra}`).join("\n")}

Escreva em texto simples, sem markdown (não use **, # ou tabelas).
`;

const historicos = new Map();

function pegarHistorico(sessionId) {
  if (!historicos.has(sessionId)) {
    historicos.set(sessionId, [{ role: "system", content: INSTRUCAO_DE_SISTEMA }]);
  }
  return historicos.get(sessionId);
}

const FERRAMENTAS = [
  {
    type: "function",
    function: {
      name: "registrar_pedido",
      description:
        "Registra um pedido de compra ou consultoria na Fragransia quando o cliente já informou nome, telefone e o perfume desejado.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome do cliente." },
          telefone: { type: "string", description: "Telefone ou WhatsApp do cliente." },
          pedido: { type: "string", description: "Perfume(s) escolhido(s) e observações do pedido." },
        },
        required: ["nome", "telefone", "pedido"],
      },
    },
  },
];

const ARQUIVO_PEDIDOS = "pedidos.json";

function executarFerramenta(nomeFuncao, args) {
  if (nomeFuncao === "registrar_pedido") {
    let pedidos = [];
    try {
      pedidos = JSON.parse(fs.readFileSync(ARQUIVO_PEDIDOS, "utf-8"));
    } catch (e) {
      pedidos = [];
    }

    const novo = { ...args, data: new Date().toLocaleString("pt-BR") };
    pedidos.push(novo);

    fs.writeFileSync(ARQUIVO_PEDIDOS, JSON.stringify(pedidos, null, 2));
    console.log("📥 NOVO PEDIDO FRAGRANSIA:", novo);

    return { sucesso: true, numero_do_pedido: pedidos.length };
  }

  return { sucesso: false, aviso: `Ferramenta inexistente: ${nomeFuncao}` };
}

app.post("/api/chat", async (req, res) => {
  const { mensagem, sessionId } = req.body;

  if (!mensagem?.trim()) {
    return res.status(400).json({ erro: "Mensagem vazia." });
  }
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ erro: "A chave da Groq não está configurada no .env." });
  }

  const historico = pegarHistorico(sessionId || "anonimo");
  const tamanhoAntes = historico.length;
  historico.push({ role: "user", content: mensagem });

  try {
    let textoFinal = "";

    for (let volta = 1; volta <= 3; volta++) {
      let resposta;
      try {
        resposta = await groq.chat.completions.create({
          model: modeloAtivo,
          messages: historico,
          tools: FERRAMENTAS,
          tool_choice: "auto",
        });
      } catch (err) {
        if (String(err?.message).includes("tool calling")) {
          resposta = await groq.chat.completions.create({
            model: modeloAtivo,
            messages: historico,
          });
        } else {
          throw err;
        }
      }

      const mensagemIA = resposta.choices?.[0]?.message;
      if (!mensagemIA) break;

      historico.push(mensagemIA);

      const chamadas = mensagemIA.tool_calls;
      if (!chamadas || chamadas.length === 0) {
        textoFinal = mensagemIA.content ?? "";
        break;
      }

      for (const chamada of chamadas) {
        const args = JSON.parse(chamada.function.arguments || "{}");
        const resultado = executarFerramenta(chamada.function.name, args);

        historico.push({
          role: "tool",
          tool_call_id: chamada.id,
          content: JSON.stringify(resultado),
        });
      }
    }

    const respostaFinal =
      textoFinal || "Desculpe, não consegui responder agora. Pode repetir?";

    // Salva a conversa na nuvem (Supabase)
    if (supabase) {
      const { error } = await supabase.from("conversas").insert([
        {
          mensagem_cliente: mensagem,
          resposta_bot: respostaFinal,
        },
      ]);
      if (error) {
        console.error("⚠️ Erro ao salvar no Supabase:", error.message);
      }
    }

    return res.json({
      resposta: respostaFinal,
    });
  } catch (erro) {
    console.error("❌ Erro ao falar com a Groq:", erro);
    historico.length = tamanhoAntes;
    return res.status(500).json({ erro: erro?.message || "Falha ao falar com a Groq." });
  }
});

app.listen(PORTA, async () => {
  console.log(`✅ ${PERSONA.empresa} no ar: http://localhost:${PORTA}`);
  console.log(`🤖 Atendente virtual: ${PERSONA.nome} (via Groq)`);
  if (process.env.GROQ_API_KEY) {
    await detectarMelhorModelo();
  }
});
