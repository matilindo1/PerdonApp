// ====== CONFIGURACIÓN ======
// La API Key gratuita (Groq, console.groq.com/keys) se escribe en la página y se guarda en localStorage,
// así no queda dentro del código que subes a GitHub.
const LLAVE_CLAVE = "claveApiGroq";
const MODELO = "openai/gpt-oss-20b";
const URL_API = "https://api.groq.com/openai/v1/chat/completions";
const LLAVE_HISTORIAL = "historialMensajes";

// ====== ELEMENTOS DEL DOM ======
const formulario = document.getElementById("formulario");
const campoClaveApi = document.getElementById("claveApi");
const campoSituacion = document.getElementById("situacion");
const campoDestinatarioTema = document.getElementById("destinatarioTema");
const campoTono = document.getElementById("tono");
const botonGenerar = document.getElementById("botonGenerar");
const botonCopiar = document.getElementById("botonCopiar");
const cajaError = document.getElementById("error");
const cajaCargando = document.getElementById("cargando");
const seccionResultado = document.getElementById("resultado");
const textoResultado = document.getElementById("textoResultado");
const seccionHistorial = document.getElementById("seccionHistorial");
const listaHistorial = document.getElementById("listaHistorial");

campoClaveApi.value = localStorage.getItem(LLAVE_CLAVE) || "";

// Al elegir una situación típica, se rellena el campo de texto
campoSituacion.addEventListener("change", () => {
  if (campoSituacion.value) campoDestinatarioTema.value = campoSituacion.value;
});

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mostrarError("");

  const destinatarioTema = campoDestinatarioTema.value.trim();
  const tono = campoTono.value;

  // Validación: campo vacío
  if (!destinatarioTema) {
    mostrarError("Escribe a quién te disculpas y por qué.");
    return;
  }
  const claveApi = campoClaveApi.value.trim();
  if (!claveApi) {
    mostrarError("Pega tu API Key de Google AI Studio.");
    return;
  }
  localStorage.setItem(LLAVE_CLAVE, claveApi);

  // Prompt dinámico con los datos del usuario
  const prompt = `Redacta un mensaje de disculpa en español, listo para enviar por chat o correo.
A quién y por qué me disculpo: ${destinatarioTema}
Tono: ${tono}
Reconoce el error, pide perdón de forma genuina y ofrece reparar o no repetirlo. No uses excusas. Entrega solo el mensaje, sin explicaciones ni comillas.`;

  establecerCargando(true);
  try {
    const mensaje = await pedirMensajeALaIA(prompt, claveApi);
    textoResultado.textContent = mensaje;
    seccionResultado.hidden = false;
    guardarEnHistorial(mensaje);
  } catch (error) {
    console.error(error);
    mostrarError(`No se pudo generar el mensaje. ${error.message}`);
  } finally {
    establecerCargando(false);
  }
});

// ====== PETICIÓN A LA API DE IA (GROQ) ======
async function pedirMensajeALaIA(prompt, claveApi) {
  // POST con fetch: la clave va en el encabezado Authorization
  const respuesta = await fetch(URL_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${claveApi}`,
    },
    body: JSON.stringify({
      model: MODELO,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!respuesta.ok) {
    // Leemos el detalle del error para saber qué pasó (clave inválida, cuota, modelo, etc.)
    const detalle = await respuesta.json().catch(() => ({}));
    throw new Error(`Error ${respuesta.status}: ${detalle.error?.message || "sin detalle"}`);
  }

  const datos = await respuesta.json();
  // El texto generado está en choices[0].message.content
  const texto = datos.choices?.[0]?.message?.content;
  if (!texto) throw new Error("Respuesta vacía de la API");
  return texto.trim();
}

// ====== COPIAR AL PORTAPAPELES ======
botonCopiar.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(textoResultado.textContent);
    botonCopiar.textContent = "¡Copiado!";
  } catch (error) {
    mostrarError("No se pudo copiar. Selecciona el texto manualmente.");
  }
  setTimeout(() => (botonCopiar.textContent = "Copiar texto"), 1500);
});

// ====== HISTORIAL (últimos 3 en localStorage) ======
function guardarEnHistorial(mensaje) {
  const historial = leerHistorial();
  historial.unshift(mensaje);
  localStorage.setItem(LLAVE_HISTORIAL, JSON.stringify(historial.slice(0, 3)));
  pintarHistorial();
}

function leerHistorial() {
  try {
    return JSON.parse(localStorage.getItem(LLAVE_HISTORIAL)) || [];
  } catch {
    return [];
  }
}

function pintarHistorial() {
  const historial = leerHistorial();
  listaHistorial.innerHTML = "";
  historial.forEach((mensaje) => {
    const elemento = document.createElement("li");
    elemento.textContent = mensaje; // textContent evita inyectar HTML
    listaHistorial.appendChild(elemento);
  });
  seccionHistorial.hidden = historial.length === 0;
}

// ====== UTILIDADES DE INTERFAZ ======
function establecerCargando(activo) {
  cajaCargando.hidden = !activo;
  botonGenerar.disabled = activo;
}

function mostrarError(texto) {
  cajaError.textContent = texto;
  cajaError.hidden = !texto;
}

pintarHistorial();
