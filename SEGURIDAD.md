# Seguridad y puesta en marcha de la nube

BiblioClasificador funciona sin conexión: los datos viven en cada dispositivo
(IndexedDB) y Firestore solo sirve para sincronizarlos.

## Dos llaves distintas

| | Qué abre | Dónde se configura |
|---|---|---|
| **PIN** (admin / ayudante) | La interfaz de gestión en ese dispositivo | Al primer acceso se obliga a cambiar los PIN de fábrica (1234 / 0000) |
| **Cuenta de la nube** (Firebase Auth) | Sincronizar con Firestore y usar la clave de IA del centro | Ajustes ⚙️ → Conexión Nube → Cuenta de la nube |

Sin cuenta de la nube, el dispositivo solo descarga el catálogo. Los préstamos y
los alumnos, que son datos de menores, nunca salen de Firestore hacia un
dispositivo sin sesión de bibliotecario.

## Pasos en Firebase (proyecto `bibliotecamm-89a30`)

1. **Authentication**: proveedor *Correo electrónico/contraseña* activado y, en
   *Configuración → Acciones del usuario*, registro y eliminación desactivados.
2. **Cuentas**: créalas en *Authentication → Usuarios → Agregar usuario*.
3. **Roles**: en Firestore, crea el documento `users/{UID}` con el campo
   `role` = `"ADMIN"` o `"ASSISTANT"`.
   - `ADMIN`: crea, edita y borra libros y alumnos; sube la base local a la nube.
   - `ASSISTANT`: préstamos, devoluciones y reservas.
4. **Reglas**: publica [`firestore.rules`](firestore.rules).

## Vercel

- `GROQ_API_KEY`: clave de IA del centro. Solo pueden usarla los administradores
  con sesión en la nube; quien ponga su propia clave en Ajustes usa la suya.
- `FIREBASE_PROJECT_ID=bibliotecamm-89a30`: proyecto cuyas cuentas se aceptan.

## Límites conocidos

- Los datos guardados en cada dispositivo no se cifran. Cualquiera que tenga el
  dispositivo y el PIN puede verlos.
- La sincronización funciona por «última escritura gana»: si dos dispositivos
  sin conexión prestan el mismo libro, prevalece el último que sincronice.
