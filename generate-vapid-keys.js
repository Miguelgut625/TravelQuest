const webpush = require('web-push');

// Generar las claves VAPID
const vapidKeys = webpush.generateVAPIDKeys();

console.log('Clave pública VAPID:', vapidKeys.publicKey);
console.log('Clave privada VAPID:', vapidKeys.privateKey); 