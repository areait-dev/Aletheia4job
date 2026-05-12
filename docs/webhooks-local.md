# Test Webhook in locale (ngrok)

## Prerequisiti

- Avvia l’app in locale su `http://localhost:3000`.
- Assicurati di avere un URL pubblico HTTPS (ngrok consigliato).

## 1) Esporre il server con ngrok

Esempio:

```bash
ngrok http 3000
```

Prendi l’URL `https://xxxxx.ngrok-free.app` e impostalo in `.env.local`:

```env
NEXT_PUBLIC_SITE_URL=https://xxxxx.ngrok-free.app
```

Riavvia l’app.

## 2) Cronofy (push notifications)

- Assicurati che `CRONOFY_REDIRECT_URI` punti a:
  - `https://xxxxx.ngrok-free.app/api/integrations/cronofy/callback`
- Riconnetti Cronofy dal flusso:
  - `GET /api/integrations/cronofy/connect`

Webhook endpoint:

- `POST https://xxxxx.ngrok-free.app/api/webhooks/cronofy`

Per verificare:
- Dal dashboard Cronofy puoi inviare notifiche di test sul canale (Channels → Trigger Push Notifications).

## 3) Dropbox Sign (event callbacks)

Webhook endpoint:

- `POST https://xxxxx.ngrok-free.app/api/webhooks/dropbox-sign`

Nel dashboard Dropbox Sign:
- Imposta la callback URL (Account o API App) all’endpoint sopra
- Usa il pulsante “test” per inviare un evento di prova

Nota: Dropbox Sign considera “successo” una risposta `200` con body testuale `Hello API Event Received`.

