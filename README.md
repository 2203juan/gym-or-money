# Ejercicio o Money — app de multas semanales

Reemplaza el script de Splitwise. Recibe el mensaje de resumen semanal (por Telegram o
pegado en la web), calcula las multas según las tablas fijas, las registra y lleva el
saldo acumulado de cada uno.

- **Bot de Telegram** — canal principal. Se le reenvía el resumen y responde en el mismo
  grupo con el detalle de lo que acaba de registrar y los saldos al día.
- **Web** — saldos, historial, abonos, correcciones y bitácora. Pensada para el celular.
- Stack: Next.js 16 (App Router) + Postgres (Supabase). Todo cabe en los planes gratuitos.

## Reglas implementadas

Las tablas de multas están copiadas **literalmente** en `src/lib/multas.ts` como constantes
congeladas. No se derivan con ninguna fórmula. Una meta fuera de 1–7 no genera multa: genera
un error explícito que bloquea el registro de la semana.

> **Nota sobre el documento original:** el criterio de aceptación #1 decía que Yummy (4/6)
> paga $52.500, pero la fila de meta 6 de la tabla da **$42.000** para 4 días. Se confirmó
> que manda la tabla. Los tests usan $42.000.

El check (✅ ✔ ☑, con o sin selector de variación) significa solo "cumplió". Cualquier otro
emoji marca la multa como **exenta por excusa**: $0 cobrado, pero registrada y visible en el
historial.

## Puesta en marcha

### 1. Base de datos

En el SQL Editor de Supabase, ejecuta `db/schema.sql` y luego `db/seed.sql`.
El seed crea las 9 personas más el receptor ("Bote del grupo"). Ajusta nombres y alias ahí
o después desde **Ajustes** en la web.

### 2. Variables de entorno

Copia `.env.example` a `.env.local` (local) o cárgalas en Vercel:

| Variable | De dónde sale |
|---|---|
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string → **Transaction pooler** |
| `CLAVE_GRUPO` | La inventas tú. Es la clave que comparten los 9. |
| `TELEGRAM_BOT_TOKEN` | BotFather |
| `TELEGRAM_CHAT_ID` | El id del grupo (negativo, ej. `-1001234567890`) |
| `TELEGRAM_WEBHOOK_SECRET` | Cadena aleatoria que inventas tú |
| `APP_URL` | La URL pública de la app |

Ningún secreto va en el código.

### 3. Deploy

```bash
npm install
npm run build
vercel --prod     # o el servicio que prefieras
```

### 4. Registrar el webhook de Telegram

```bash
curl -F "url=https://TU-APP.vercel.app/api/telegram" \
     -F "secret_token=TU_TELEGRAM_WEBHOOK_SECRET" \
     -F "drop_pending_updates=true" \
     "https://api.telegram.org/botTU_TOKEN/setWebhook"
```

Añade el bot al grupo. Si quieres que lea todos los mensajes (no solo los que lo mencionan),
desactiva el *privacy mode* en BotFather: `/setprivacy` → Disable.

### 5. Saldos iniciales

En **Ajustes**, escribe lo que cada uno ya debía. Se guarda como un movimiento explícito
"Saldo inicial migrado de Splitwise", no como un número suelto, y aparece en el detalle
de cada persona.

## Cómo se usa

**Por Telegram:** reenvía el mensaje de resumen al grupo donde está el bot. El bot registra
y contesta con el detalle. Comandos: `/saldos` o `/bote`.

**Por la web:** pestaña *Procesar* → pega el mensaje → *Ver detalle* → revisa la vista previa
→ *Registrar*. Al confirmar, el bot publica el resumen en el grupo.

Los mensajes que no tienen ninguna línea `Nombre: hechos/meta` se ignoran en silencio.

## Garantías

- **Idempotencia** — un índice único parcial `(numero) where estado='procesada'` impide que
  una semana se registre dos veces, incluso con dos mensajes simultáneos. El reenvío avisa
  y no crea multas duplicadas.
- **Reentrega de Telegram** — los `update_id` vistos se guardan; los repetidos se descartan.
  Los mensajes del propio bot se ignoran (sin loops). El webhook siempre responde 200.
- **Nada se borra** — anular marca como anulado y conserva el histórico. Toda acción queda
  en la bitácora con autor y fecha.
- **El saldo nunca se almacena** — la vista `multas.saldos` lo reconstruye siempre desde los
  movimientos: saldo inicial + multas cobradas − abonos.
- **Si Telegram falla**, la semana ya quedó registrada: no se revierte nada.

## Seguridad de dependencias

Next.js está en 16.3.5, por encima de los parches de
[CVE-2025-66478](https://nextjs.org/blog/CVE-2025-66478) (el RCE de React Server Components,
CVSS 10.0). Vercel bloquea el despliegue de cualquier versión anterior al parche, así que **no
bajes la versión de `next`**. `npm audit --omit=dev` sale limpio.

## Tests

```bash
npm test                                   # solo el dominio (parser + tablas)
DATABASE_URL=postgresql://... npm test     # + los 7 criterios de aceptación contra Postgres
```

24 tests, incluidos los 7 criterios de aceptación del documento y un caso de concurrencia.

## Estructura

```
src/lib/multas.ts    tablas de multas (fuente de verdad) y cálculo
src/lib/parser.ts    parseo del mensaje, emojis, normalización de nombres
src/lib/dominio.ts   registrar / anular / editar / abonar / saldos
src/lib/telegram.ts  envío y formato del mensaje del bot
src/app/             web (server actions, sin API pública)
src/app/api/telegram webhook
db/                  schema.sql y seed.sql
```
