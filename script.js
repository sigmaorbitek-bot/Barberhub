// ENTRAR NA LOJA

function entrar(tipo) {
  if (tipo === "cliente") {
    window.location.href = "./clientes/index.html";
  } else if (tipo === "barbearia") {
    window.location.href = "./login/index.html";
  }
}