# Asistente Luzdeco 1

Demo funcional para atención a clientes con Google Sheets como base de conocimiento y OpenAI desde backend.

## Qué hace
- Muestra una interfaz simple para capturar casos de atención.
- Lee estas pestañas desde Google Sheets:
  - `reglas_generales`
  - `marcas`
  - `procesos`
  - `faq_productos`
  - `plantillas`
  - `politicas`
  - `catalogo_productos`
- Construye un prompt dinámico.
- Genera una salida con:
  - diagnóstico
  - checklist
  - advertencias
  - respuesta final

## 1) Antes de subir a Vercel
Necesitas:
- una cuenta de Vercel
- una cuenta de OpenAI con API key
- tu Google Sheet ya subido
- una service account de Google Cloud con acceso a Google Sheets API

## 2) Variables de entorno en Vercel
Crea estas variables:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` → sugerido: `gpt-4.1-mini`
- `GOOGLE_SHEETS_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`

### Nota importante del private key
Pégalo completo, incluyendo:

```text
-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
```

Si Vercel lo guarda con saltos reales o como `\n`, el código ya intenta normalizarlo.

## 3) Cómo sacar el GOOGLE_SHEETS_ID
De la URL de tu hoja:

```text
https://docs.google.com/spreadsheets/d/XXXXXXXXXXXXXXXXXXXXXXXX/edit
```

El ID es lo que está entre `/d/` y `/edit`.

## 4) Cómo compartir la hoja con la service account
1. Abre tu Google Sheet.
2. Pulsa `Compartir`.
3. Agrega el correo de la service account (`GOOGLE_SERVICE_ACCOUNT_EMAIL`).
4. Dale permiso de lector.

## 5) Cómo subir a Vercel
### Opción rápida
1. Sube esta carpeta a GitHub.
2. En Vercel, crea un nuevo proyecto importando ese repositorio.
3. Agrega las variables de entorno.
4. Deploy.

### Opción con ZIP
1. Comprime esta carpeta.
2. Súbela a un repositorio GitHub nuevo.
3. Conecta el repo a Vercel.

## 6) Cómo correr local
```bash
npm install
npm run dev
```

## 7) Prueba recomendada
Usa este caso:
- Marca: `V.com / Ventiladores`
- Canal: `Mercado Libre`
- Tipo de caso: `Garantía / defecto`
- Mensaje: `Compré el ventilador hace 3 días y ya no prende`
- Contexto: `Pedido reciente`

## 8) Qué puedes mejorar después
- historial real en Supabase
- login
- más filtros por producto
- botones “más corto” y “más formal” con endpoints extra
- caché de Google Sheets
- panel admin


## Modo gratis / fallback local
Si OpenAI no tiene saldo o no hay OPENAI_API_KEY, la app usa una respuesta local basada en Google Sheets.
