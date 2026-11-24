# Fimosis King

Web estática (HTML + JS) con Firebase Auth (correo y contraseña) y Firestore.

## 1. Firebase
1. Crea un proyecto en https://console.firebase.google.com
2. **Authentication > Método de acceso**: activa *Correo electrónico/contraseña*.
3. **Firestore Database**: crea la base de datos (modo producción).
4. **Firestore > Reglas**: pega el contenido de `firestore.rules` (cambia el correo del admin) y publica.
5. **Configuración del proyecto > Tus apps > Web (</>)**: registra la app y copia el objeto `firebaseConfig` a `firebase-config.js`. Pon también tu correo en `ADMIN_EMAIL`.
6. **Authentication > Configuración > Dominios autorizados**: añade tu dominio de Vercel (`xxx.vercel.app`) cuando lo tengas.

## 2. GitHub
```
git init
git add .
git commit -m "Fimosis King"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/fimosis-king.git
git push -u origin main
```

## 3. Vercel
En https://vercel.com: *Add New > Project*, importa el repo y pulsa *Deploy*. No hace falta configurar nada (sitio estático).

## Cómo funciona
- Cada mes tiene su propio documento `months/AAAA-MM` con el contador y su subcolección `votes/{uid}`. Al empezar un mes nuevo, el contador empieza en 0 solo, sin tareas programadas.
- Un voto por cuenta y mes: el ID del voto es el uid, y las reglas impiden repetirlo.
- Sorteo: el admin (tu correo) ve un botón que elige al azar entre los votantes del mes.

## Límites a tener en cuenta
- La `apiKey` de Firebase web es pública por diseño; la seguridad la dan las reglas.
- Las reglas no comprueban que el mes del voto sea el real; para blindarlo del todo habría que usar una Cloud Function.
- Cuentas con correos falsos podrían votar varias veces. Si te preocupa, se puede exigir verificación del correo.

## Sobres y cartas
- Las cartas están en `cards.js` (nombre, rareza y frase) y sus imágenes en `img/cards/`.
- Un sobre por cuenta y día (el día cambia a las 00:00 UTC, las 01:00 o 02:00 en España). Cada sobre da 5 cartas distintas; las raras salen menos.
- Las cartas de cada usuario se guardan en Firestore, en `users/{uid}`. Si cambias las cartas, actualiza también la lista `cardIds()` de `firestore.rules`.
- Las reglas impiden abrir más de un sobre al día y escribir cartas que no existan. Pero las cartas se sortean en el navegador, así que alguien con conocimientos podría elegir qué cartas le tocan. Para blindarlo hace falta una Cloud Function.
- Las imágenes de las cartas están en la carpeta pública, así que quien sepa buscar las URLs puede verlas sin abrir sobres.

## Perfil
- Al iniciar sesión aparece arriba tu foto y tu nombre; al pulsarlos se abre el perfil. Se puede cambiar el nombre (hasta 20 caracteres), la foto (solo entre las cartas que tengas) y la frase.
- Las frases están en `profile-data.js`. Si las cambias, actualiza `phraseIds()` en `firestore.rules`.
- El perfil se guarda en `profiles/{uid}`. Las reglas comprueban que la foto sea una carta que la persona tiene de verdad.
- Si ya habías publicado las reglas, vuelve a pegar `firestore.rules` completo en la consola de Firebase.
