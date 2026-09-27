# Tavoleero — tanti giochi, un solo telefono

Deploy pubblico di Tavoleero (party game hub: Scribble Scratch, Parole in fuga,
Sintonia) su Render.

## Come funziona

- `Dockerfile` — immagine Bun che serve il client precompilato (`public/`) ed
  espone le action del backend su `POST /actions`.
- `standalone.ts` — server HTTP standalone: file statici + protocollo
  `{action, args}` → `{data}` / `{error}`; applica le migrazioni SQLite in
  `migrations/` al primo avvio.
- `vendor/actions.js` — bundle delle action del backend (built).
- `vendor/drizzle-orm` — driver drizzle per bun:sqlite.
- `migrations/` — migrazioni SQL del database.
- `public/` — client web precompilato.

## Aggiornare il deploy

`sync.sh` ricopia i sorgenti aggiornati e ricostruisce i bundle; poi commit +
push su `main` e Render ridistribuisce in automatico.

## Nota piano gratuito

Su Render free il filesystem è effimero: a ogni riavvio il database SQLite si
azzera (account e sessioni persi) e il servizio va in sleep dopo 15 minuti di
inattività. Per la persistenza serve un piano a pagamento con disco.
