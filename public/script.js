let botao = document.getElementById("chat-toggle");
let chat = document.getElementById("chat");
let fechar = document.getElementById("fechar");
let enviarBtn = document.getElementById("enviar");
let input = document.getElementById("input");
let chatBox = document.getElementById("chat-box");

let formulario = document.getElementById("form-contato");

const sessionId = crypto.randomUUID();

botao.addEventListener("click", function () {
  chat.classList.toggle("hidden");
  input.focus();
});

fechar.addEventListener("click", function () {
  chat.classList.add("hidden");
});

enviarBtn.addEventListener("click", enviar);

input.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    enviar();
  }
});

formulario.addEventListener("submit", function (e) {
  e.preventDefault();

  let nome = document.getElementById("nome");
  let email = document.getElementById("email");
  let assunto = document.getElementById("assunto");
  let mensagem = document.getElementById("mensagem");

  if (
    nome.value.trim() === "" ||
    email.value.trim() === "" ||
    assunto.value.trim() === "" ||
    mensagem.value.trim() === ""
  ) {
    alert("Preencha todos os campos.");
    return;
  }

  alert("Solicitação enviada com sucesso! Em breve a equipe da Fragransia entrará em contato.");
  formulario.reset();
});

function adicionarMensagem(tipo, texto) {
  let div = document.createElement("div");
  div.className = tipo;
  div.textContent = texto;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  return div;
}

async function enviar() {
  let texto = input.value.trim();
  if (texto === "") return;

  adicionarMensagem("usuario", texto);
  input.value = "";

  input.disabled = true;
  enviarBtn.disabled = true;
  let digitando = adicionarMensagem("bot", "Claire está digitando...");

  try {
    let respostaHTTP = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensagem: texto, sessionId: sessionId }),
    });

    let dados = await respostaHTTP.json();

    if (!respostaHTTP.ok) {
      throw new Error(dados.erro || "Erro " + respostaHTTP.status);
    }

    digitando.remove();
    adicionarMensagem("bot", dados.resposta);
  } catch (erro) {
    digitando.remove();
    adicionarMensagem("erro", "Ops! Não consegui responder agora. (" + erro.message + ")");
    console.error(erro);
  } finally {
    input.disabled = false;
    enviarBtn.disabled = false;
    input.focus();
  }
}

// Interação dos cards do catálogo com o chat da Claire
let cardsPerfumes = document.querySelectorAll(".servico");

cardsPerfumes.forEach(function (card) {
  card.style.cursor = "pointer";
  card.title = "Clique para perguntar à Claire sobre esta fragrância";

  card.addEventListener("click", function () {
    // Evita disparar uma nova pergunta se a Claire ainda estiver respondendo
    if (input.disabled) return;

    let nomePerfume = card.querySelector("h3").textContent;
    chat.classList.remove("hidden");
    input.value = "Me fale mais sobre o perfume " + nomePerfume + " e para qual ocasião ele combina.";
    enviar();
  });
});
