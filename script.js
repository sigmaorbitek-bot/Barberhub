// ENTRAR NA LOJA

function entrar(tipo) {
  if (tipo === "barbearia") {
    window.location.href = "./login/index.html";
  } else if (tipo === "cliente") {
    window.location.href = "./login/cliente.html";
  }
}