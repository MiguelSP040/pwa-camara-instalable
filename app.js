const video = document.getElementById('video');
const visorVacio = document.getElementById('visor-vacio');
const estado = document.getElementById('estado');
const mensaje = document.getElementById('mensaje');
const consentimiento = document.getElementById('consentimiento');
const abrir = document.getElementById('btn-abrir');
const confirmar = document.getElementById('btn-confirmar');
const cambiar = document.getElementById('btn-cambiar');
const detener = document.getElementById('btn-detener');
const instalar = document.getElementById('btn-instalar');
let flujo = null;
let lente = 'environment';
let solicitud = 0;
let instalacionPendiente = null;

function liberarCamara() {
  if (flujo) flujo.getTracks().forEach((pista) => pista.stop());
  flujo = null;
  video.srcObject = null;
  visorVacio.hidden = false;
  estado.textContent = 'Apagada';
  estado.classList.remove('activa');
  abrir.hidden = false;
  cambiar.hidden = true;
  detener.hidden = true;
}

function encenderCamara(lenteSolicitada) {
  const id = ++solicitud;
  liberarCamara();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    mensaje.textContent = 'La cámara no está disponible. Abre la aplicación en HTTPS o localhost y usa un navegador compatible.';
    return;
  }
  abrir.disabled = true;
  mensaje.textContent = 'Solicitando acceso a la cámara…';
  navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { exact: lenteSolicitada } } }).then((nuevoFlujo) => {
    if (id !== solicitud || document.hidden) {
      nuevoFlujo.getTracks().forEach((pista) => pista.stop());
      return;
    }
    flujo = nuevoFlujo;
    lente = lenteSolicitada;
    video.srcObject = flujo;
    visorVacio.hidden = true;
    estado.textContent = lente === 'environment' ? 'Trasera activa' : 'Frontal activa';
    estado.classList.add('activa');
    abrir.hidden = true;
    cambiar.hidden = false;
    detener.hidden = false;
    mensaje.textContent = 'La imagen se muestra únicamente en este dispositivo.';
  }).catch((error) => {
    if (id !== solicitud) return;
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') mensaje.textContent = 'No se concedió acceso. Revisa los permisos de cámara en la configuración del navegador.';
    else if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') mensaje.textContent = 'No se encontró esa cámara en este dispositivo. Puedes intentar con la otra cámara.';
    else mensaje.textContent = 'No se pudo iniciar la cámara. Comprueba que no esté en uso por otra aplicación.';
    cambiar.hidden = false;
    cambiar.textContent = lenteSolicitada === 'environment' ? 'Intentar cámara frontal' : 'Intentar cámara trasera';
    lente = lenteSolicitada;
  }).finally(() => { if (id === solicitud) abrir.disabled = false; });
}

abrir.addEventListener('click', () => consentimiento.showModal());
confirmar.addEventListener('click', () => {
  consentimiento.close();
  cambiar.textContent = 'Cambiar cámara';
  encenderCamara('environment');
});
cambiar.addEventListener('click', () => {
  cambiar.textContent = 'Cambiar cámara';
  encenderCamara(lente === 'environment' ? 'user' : 'environment');
});
detener.addEventListener('click', () => {
  solicitud++;
  liberarCamara();
  mensaje.textContent = 'La cámara está apagada.';
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    solicitud++;
    liberarCamara();
    abrir.disabled = false;
    mensaje.textContent = 'La cámara se apagó al salir de la aplicación.';
  }
});
window.addEventListener('pagehide', () => { solicitud++; liberarCamara(); });

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  instalacionPendiente = event;
  instalar.hidden = false;
});
instalar.addEventListener('click', () => {
  if (!instalacionPendiente) return;
  const evento = instalacionPendiente;
  instalacionPendiente = null;
  instalar.hidden = true;
  evento.prompt().catch(() => { mensaje.textContent = 'No fue posible abrir la instalación desde este navegador.'; });
});
window.addEventListener('appinstalled', () => { instalacionPendiente = null; instalar.hidden = true; document.getElementById('aviso-ios').hidden = true; });
const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
if (esIOS && !navigator.standalone && !window.matchMedia('(display-mode: standalone)').matches) document.getElementById('aviso-ios').hidden = false;
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => { mensaje.textContent = 'No se pudo activar el modo sin conexión. Usa HTTPS o localhost.'; });
