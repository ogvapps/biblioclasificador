# 📱 Guía de Uso en Móvil — BiblioClasificador

## Requisitos

- Ordenador y móvil en la **misma red WiFi**
- Node.js instalado en el ordenador
- Clave API de Groq (gratuita en [console.groq.com](https://console.groq.com))

---

## 1 · Configura las claves API

En la carpeta del proyecto, crea el fichero **`.env`** (si no existe):

```
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> Obtén tu clave gratis en https://console.groq.com → API Keys → Create API Key

---

## 2 · Arranca el servidor de desarrollo

```powershell
npm run dev
```

Verás algo así en la terminal:

```
  VITE v5.x ready in 400ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.45:5173/   ← esta dirección
```

---

## 3 · Abre la app en el móvil

1. Conecta el móvil a la **misma WiFi** que el ordenador
2. Abre el navegador del móvil (Chrome recomendado)
3. Escribe la URL de **Network** que aparece en la terminal, p. ej.:
   ```
   http://192.168.1.45:5173
   ```

---

## 4 · Flujo de catalogación con el móvil

### A. Clasificar un libro con IA (cámara)

1. Entra con PIN de administrador
2. Ve a **Añadir libro** → pulsa **📷 Hacer Foto (Móvil)**
3. La cámara trasera se activa — enfoca la **portada** del libro
4. La IA (Groq Llama-4-Scout) analiza la imagen y devuelve:
   - Título, Autor, Sinopsis, Etapa educativa, Género
5. Revisa los datos, asigna **columna/balda** y guarda
6. Repite para cada libro de la biblioteca

### B. Clasificar por código de barras ISBN

1. En **Añadir libro** → pulsa el icono de código de barras
2. Enfoca el código de barras del libro
3. La app consulta **Google Books API** y rellena los datos automáticamente

### C. Importar desde Excel

Si tienes un catálogo en Excel (.xlsx):
1. Ve a **Biblioteca** → botón **Excel** (importar)
2. Selecciona el fichero — columnas esperadas:
   - `Título`, `Autor`, `Etapa`, `Género`, `Edad Recomendada`, `Columna`, `Balda`
3. Descarga la **Plantilla** para ver el formato exacto

---

## 5 · Sincronización entre dispositivos (opcional)

Para que el catálogo sea compartido entre ordenador y móvil en tiempo real:

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com)
2. Habilita **Firestore** (modo producción)
3. En BiblioClasificador → ⚙️ Configuración → **Conexión Nube (Firebase)**
4. Pega las credenciales del proyecto Firebase
5. Guarda → la app mostrará ✅ **Conectado**

A partir de ese momento, cualquier libro añadido desde el móvil aparecerá automáticamente en el PC de la biblioteca (y viceversa).

---

## 6 · Exportar backup

Ve a **Biblioteca** → botón **↑ Excel** para exportar:
- **Inventario** completo
- **Préstamos** activos e histórico
- **Lectores** registrados

También puedes usar **Exportar JSON** para un backup completo de la base de datos.

---

## Solución de problemas

| Problema | Solución |
|---|---|
| El móvil no carga la app | Confirma que ambos dispositivos están en la misma WiFi. Prueba con la IP exacta que muestra la terminal. |
| La cámara no se activa | Chrome en iOS requiere HTTPS. Para desarrollo local usa Chrome en Android o Safari en iOS. |
| La IA no clasifica el libro | Verifica que `GROQ_API_KEY` está en el fichero `.env` y reinicia `npm run dev`. |
| La imagen está borrosa | Asegúrate de que hay buena luz y sostén el móvil estable. La app comprime automáticamente la imagen. |
| Error de Firestore | Verifica que las reglas de Firestore permiten lectura/escritura. Para empezar, reglas de prueba: `allow read, write: if true;` (cambiar en producción). |
