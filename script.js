// ENTRAR NA LOJA

function entrar(tipo) {
  if (tipo === "cliente") {
    window.location.href = "./login do cliente/index.html";
  } else if (tipo === "barbearia") {
    window.location.href = "./login da barbearia/index.html";
  }
}