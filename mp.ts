// mp.ts — Tavoleero multiplayer Fase 1: server state machine per Scribble Scratch.
//
// TypeScript PURO, solo sintassi erasable (niente enum/namespaces/parameter
// properties/decorators): gira su Bun e su node >= 22.18 con type-stripping.
// NESSUN import da 'bun:*' — testabile con node puro.
//
// Spec: mp-protocol.md. In caso di conflitto su rounds/free vince App.tsx
// (ScribbleGame in party-hub/client/src/App.tsx).

// ---------------------------------------------------------------------------
// Mazzo parole (copia esatta da party-hub/client/src/App.tsx — SCRIBBLE_WORDS)
// Serve per il fallback "pesca parola" quando un autore non invia in tempo.
// ---------------------------------------------------------------------------
export const SCRIBBLE_WORDS: Record<string, string[]> = {
  sorpresa: ["gatto", "astronauta", "tiramisù", "vulcano", "monopattino", "pinguino", "castello", "karaoke", "cactus", "telecomando", "temporale", "polpo"],
  animali: ["giraffa", "pinguino", "polpo", "lama", "canguro", "fenicottero", "riccio", "bradipo"],
  cibo: ["tiramisù", "pizza", "gelato", "lasagna", "cannolo", "anguria", "spaghetti", "popcorn"],
  azioni: ["ballare", "starnutire", "fare surf", "cantare", "arrampicarsi", "cucinare", "telefonare", "pattinare"],
  assurdo: ["un lama presenta il meteo", "un cactus vince Sanremo", "un alieno prepara il tiramisù", "un dinosauro lavora da casa", "un polpo gioca a ping-pong", "un unicorno va dal meccanico"],
};

// ---------------------------------------------------------------------------
// Costanti
// ---------------------------------------------------------------------------
export const BLANK_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
export const MAX_SEATS = 8;
export const MAX_ROOMS = 200;
export const ROOM_TTL_MS = 30 * 60 * 1000; // cleanup stanze vuote dopo 30 min
export const TEXT_PHASE_MS = 60_000; // cap server per fasi di scrittura / verdetti
export const MAX_TEXT_LEN = 100; // come maxLength=100 del client single-device
export const MAX_NAME_LEN = 24;
export const MAX_PAYLOAD_BYTES = 8 * 1024 * 1024; // sanity cap messaggi WS
export const MIN_TIMER = 10;
export const MAX_TIMER = 120;
export const MIN_CHAINS = 1;
export const MAX_CHAINS = 8;

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------
export type MPPhase =
  | "lobby"
  | "author" | "pass" | "verdict" | "reveal" | "results"
  | "mAuthor" | "mDraw" | "mPlayerDraw" | "mReveal";
export type ScribbleMode = "rounds" | "free" | "mute";

export interface Seat {
  id: string;
  name: string;
  connected: boolean;
  isHost: boolean;
}

export interface ChainEntry {
  player: number;
  kind: "text" | "drawing";
  value: string;
}

export interface MPChain {
  starter: number;
  entries: ChainEntry[];
}

export interface MPGame {
  mode: ScribbleMode;
  chains: number; // solo rounds: catene a testa (giri paralleli)
  timer: number; // secondi per disegno
  theme: string;
  hostPremium: boolean;
  roundIndex: number; // 1-based
  scores: number[]; // per seat
  phase: MPPhase; // mai "lobby" quando game != null
  phaseEndsAt: number | null;
  // rounds / free (paper-passing simultaneo):
  rChains: MPChain[]; // P catene, catena i aperta dal seat i
  rWords: (string | null)[]; // parole autore per seat (fase author)
  rStep: number; // 0 = author; 1..P-1 = pass steps
  rSubmitted: boolean[]; // per seat, ha già inviato in questa fase
  rVerdicts: (boolean | null)[]; // per catena (fase verdict)
  // mute (stella): describer sceglie frase + descrizione pubblica, disegna in
  // segreto; i giocatori vedono SOLO la descrizione e disegnano in parallelo.
  mDescriber: number;
  mSecret: string | null; // frase segreta (reveal)
  mDescription: string | null; // descrizione pubblica del describer
  mAuthorDone: boolean;
  mDrawing: string | null; // disegno del describer (segreto fino al reveal)
  mDrawings: Map<number, string>; // seat -> disegno (giocatori)
  mAwarded: number | null;
}

export interface Room {
  code: string; // 6 cifre
  seats: Seat[]; // indice seat = indice giocatore
  createdAt: number;
  lastActivity: number;
  game: MPGame | null; // null = lobby
  hostPremium: boolean;
}

export interface IntentError {
  code: string;
  message: string;
}

export type IntentResult = { ok: true; changed: boolean } | { ok: false; error: IntentError };
export type RoomResult =
  | { ok: true; room: Room; seat: number; view: View }
  | { ok: false; error: IntentError };

// View personalizzata (protocollo §7)
export interface View {
  phase: MPPhase;
  room: {
    code: string;
    me: number;
    seats: { name: string; connected: boolean; isHost: boolean }[];
  };
  game: null | {
    mode: ScribbleMode;
    roundIndex: number;
    totalRounds: number | null;
    timer: number;
    theme: string;
    scores: number[];
    phaseEndsAt: number | null;
    serverNow: number;
    myTurn: boolean;
    waitingFor: string[];
    prompt: { kind: "text" | "drawing"; value: string } | null;
    chainsView?: { starterName: string; entries: { playerName: string; kind: string; value: string }[] }[];
    secret?: string;
    description?: string; // mute: descrizione pubblica del describer
    judgeName?: string | null;
    awardedName?: string | null;
    canAwardList?: string[];
    standings?: { name: string; score: number }[];
    canAdvance?: boolean;
    progressLabel?: string;
  };
}

// ---------------------------------------------------------------------------
// Formule (identiche al single-device, App.tsx ScribbleGame)
// ---------------------------------------------------------------------------

// playerForStep: chi contribuisce allo step s della catena aperta da `starter`.
// App.tsx: playerForStep(step) = ((chainIndex - 1) % players + step) % players,
// con starter = (chainIndex - 1) % players.
export function playerForStep(starter: number, step: number, players: number): number {
  return ((((starter + step) % players) + players) % players);
}

// Catena in mano al seat p allo step s (1..P-1): c = (p - s) mod P.
export function chainInHand(seat: number, step: number, players: number): number {
  return ((((seat - step) % players) + players) % players);
}

// kind del passaggio allo step s. App.tsx: drawingTurn = step > 0 && step % 2 === 1.
export function passKind(step: number): "text" | "drawing" {
  return step % 2 === 1 ? "drawing" : "text";
}

// Rotazione describer/starter: (roundIndex - 1) % P. App.tsx: starter = (chainIndex-1) % players.
export function describerForRound(roundIndex: number, players: number): number {
  return (((roundIndex - 1) % players) + players) % players;
}

export function randomWord(theme: string): string {
  const pool = SCRIBBLE_WORDS[theme] ?? SCRIBBLE_WORDS.sorpresa ?? ["gatto"];
  return pool[Math.floor(Math.random() * pool.length)] ?? "gatto";
}

// ---------------------------------------------------------------------------
// Utilità
// ---------------------------------------------------------------------------
function fail(code: string, message: string): { ok: false; error: IntentError } {
  return { ok: false, error: { code, message } };
}

export function cleanName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/\s+/g, " ").slice(0, MAX_NAME_LEN);
}

function cleanText(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, MAX_TEXT_LEN);
}

function isImageValue(raw: unknown): boolean {
  return typeof raw === "string" && raw.startsWith("data:image/") && raw.length <= MAX_PAYLOAD_BYTES;
}

let seatSeq = 0;
function nextSeatId(): string {
  seatSeq += 1;
  return `seat-${seatSeq}-${Date.now().toString(36)}`;
}

// ---------------------------------------------------------------------------
// RoomManager
// ---------------------------------------------------------------------------
export class RoomManager {
  rooms: Map<string, Room>;
  private nowFn: () => number;

  constructor(nowFn?: () => number) {
    this.rooms = new Map<string, Room>();
    this.nowFn = nowFn ?? (() => Date.now());
  }

  private now(): number {
    return this.nowFn();
  }

  get(code: string): Room | undefined {
    return this.rooms.get(String(code));
  }

  private uniqueCode(): string {
    let code = "";
    do {
      code = String(100000 + Math.floor(Math.random() * 900000));
    } while (this.rooms.has(code));
    return code;
  }

  private evictLRU(): void {
    let oldestCode: string | null = null;
    let oldestActivity = Infinity;
    for (const [code, room] of this.rooms) {
      if (room.lastActivity < oldestActivity) {
        oldestActivity = room.lastActivity;
        oldestCode = code;
      }
    }
    if (oldestCode !== null) this.rooms.delete(oldestCode);
  }

  createRoom(name: string, premium: boolean): RoomResult {
    const clean = cleanName(name);
    if (!clean) return fail("INVALID", "Nome non valido");
    if (this.rooms.size >= MAX_ROOMS) this.evictLRU();
    const now = this.now();
    const room: Room = {
      code: this.uniqueCode(),
      seats: [{ id: nextSeatId(), name: clean, connected: true, isHost: true }],
      createdAt: now,
      lastActivity: now,
      game: null,
      hostPremium: premium === true,
    };
    this.rooms.set(room.code, room);
    return { ok: true, room, seat: 0, view: getView(room, 0, now) };
  }

  joinRoom(code: string, name: string): RoomResult {
    const room = this.rooms.get(String(code));
    if (!room) return fail("ROOM_NOT_FOUND", "Stanza non trovata");
    const clean = cleanName(name);
    if (!clean) return fail("INVALID", "Nome non valido");
    const now = this.now();
    const existing = room.seats.findIndex((s) => s.name === clean);
    if (existing >= 0) {
      const s = room.seats[existing];
      if (s.connected) return fail("NAME_TAKEN", "Nome già in uso in questa stanza");
      // Rejoin: riusa il seat disconnesso.
      s.connected = true;
      room.lastActivity = now;
      return { ok: true, room, seat: existing, view: getView(room, existing, now) };
    }
    if (room.game !== null) return fail("ROOM_IN_GAME", "Partita già iniziata");
    if (room.seats.length >= MAX_SEATS) return fail("ROOM_FULL", "Stanza piena (max 8)");
    room.seats.push({ id: nextSeatId(), name: clean, connected: true, isHost: false });
    room.lastActivity = now;
    return { ok: true, room, seat: room.seats.length - 1, view: getView(room, room.seats.length - 1, now) };
  }

  // Marca il seat come disconnesso (NON rimosso: serve per il rejoin).
  // Con migrazione host al seat connesso con indice minimo.
  disconnect(room: Room, seat: number): void {
    markDisconnected(room, seat, this.now());
  }

  // Rimuove le stanze senza seat connessi da più di 30 minuti.
  cleanup(now: number): void {
    for (const [code, room] of this.rooms) {
      const anyConnected = room.seats.some((s) => s.connected);
      if (!anyConnected && now - room.lastActivity > ROOM_TTL_MS) this.rooms.delete(code);
    }
  }
}

// Esportata anche standalone (usata dal wiring WS e dai test).
export function markDisconnected(room: Room, seat: number, now: number): void {
  const s = room.seats[seat];
  if (!s || !s.connected) return;
  s.connected = false;
  room.lastActivity = now;
  if (s.isHost) {
    s.isHost = false;
    const next = room.seats.findIndex((x) => x.connected);
    if (next >= 0) room.seats[next].isHost = true;
  }
}

// ---------------------------------------------------------------------------
// Transizioni di fase (chiamate da handleIntent e tickRoom)
// ---------------------------------------------------------------------------
function connectedCount(room: Room): number {
  return room.seats.filter((s) => s.connected).length;
}

function startAuthorPhase(game: MPGame, players: number, now: number): void {
  game.rChains = [];
  game.rWords = Array.from({ length: players }, () => null);
  game.rStep = 0;
  game.rSubmitted = Array.from({ length: players }, () => false);
  game.rVerdicts = [];
  game.phase = "author";
  game.phaseEndsAt = now + TEXT_PHASE_MS;
}

function startMuteRound(game: MPGame, players: number, now: number): void {
  game.mDescriber = describerForRound(game.roundIndex, players);
  game.mSecret = null;
  game.mDescription = null;
  game.mAuthorDone = false;
  game.mDrawing = null;
  game.mDrawings = new Map<number, string>();
  game.mAwarded = null;
  game.phase = "mAuthor";
  game.phaseEndsAt = now + TEXT_PHASE_MS;
}

// Tutti i seat CONNESSI hanno inviato nella fase corrente?
function allConnectedSubmitted(room: Room, submitted: boolean[]): boolean {
  return room.seats.every((s, i) => !s.connected || submitted[i] === true);
}

function closeAuthor(room: Room, now: number): void {
  const game = room.game!;
  const players = room.seats.length;
  for (let i = 0; i < players; i++) {
    const word = game.rWords[i] ?? randomWord(game.theme);
    game.rChains.push({ starter: i, entries: [{ player: i, kind: "text", value: word }] });
  }
  game.rStep = 1;
  game.rSubmitted = Array.from({ length: players }, () => false);
  game.phase = "pass";
  game.phaseEndsAt = now + (passKind(1) === "drawing" ? game.timer * 1000 : TEXT_PHASE_MS);
}

function closePassStep(room: Room, now: number): void {
  const game = room.game!;
  const players = room.seats.length;
  const s = game.rStep;
  // Placeholder per chi non ha inviato (disconnessi inclusi).
  for (let p = 0; p < players; p++) {
    if (game.rSubmitted[p]) continue;
    const kind = passKind(s);
    const value = kind === "drawing" ? BLANK_PNG : "";
    game.rChains[chainInHand(p, s, players)].entries.push({ player: p, kind, value });
  }
  const next = s + 1;
  if (next > players - 1) {
    if (game.mode === "rounds") {
      game.phase = "verdict";
      game.rVerdicts = Array.from({ length: players }, () => null);
      game.phaseEndsAt = now + TEXT_PHASE_MS;
    } else {
      game.phase = "reveal";
      game.phaseEndsAt = null;
    }
    return;
  }
  game.rStep = next;
  game.rSubmitted = Array.from({ length: players }, () => false);
  game.phase = "pass";
  game.phaseEndsAt = now + (passKind(next) === "drawing" ? game.timer * 1000 : TEXT_PHASE_MS);
}

function closeVerdict(room: Room, now: number): void {
  const game = room.game!;
  const players = room.seats.length;
  // finishChain identico ad App.tsx: se sì, +1 a starter (chain[0].player)
  // e finisher (ultima entry). App.tsx: scores.map((score, index) =>
  // index === starter || index === finisher ? score + 1 : score).
  for (let i = 0; i < players; i++) {
    const correct = game.rVerdicts[i] ?? false;
    if (!correct) continue;
    const chain = game.rChains[i];
    const starter = chain.entries[0].player;
    const finisher = chain.entries[chain.entries.length - 1].player;
    game.scores = game.scores.map((score, index) =>
      index === starter || index === finisher ? score + 1 : score,
    );
  }
  if (game.roundIndex < game.chains) {
    game.roundIndex += 1;
    startAuthorPhase(game, players, now);
  } else {
    game.phase = "results";
    game.phaseEndsAt = null;
  }
}

function currentJudge(room: Room): number {
  const game = room.game!;
  const d = room.seats[game.mDescriber];
  if (d && d.connected) return game.mDescriber;
  return room.seats.findIndex((s) => s.connected);
}

function contributors(game: MPGame): number[] {
  // mute: i seat che hanno consegnato il disegno.
  return [...game.mDrawings.keys()].sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// handleIntent — valida mittente/fase/doppioni; in caso di intent non valido
// ritorna {error} SENZA mutare lo stato.
// ---------------------------------------------------------------------------
export function handleIntent(room: Room, seat: number, msg: any, now: number): IntentResult {
  if (!msg || typeof msg.t !== "string") return fail("INVALID", "Messaggio non valido");
  if (!Number.isInteger(seat) || seat < 0 || seat >= room.seats.length)
    return fail("INVALID", "Seat non valido");
  const me = room.seats[seat];
  if (!me.connected) return fail("NOT_YOUR_TURN", "Non sei connesso alla stanza");
  room.lastActivity = now;

  const t: string = msg.t;
  switch (t) {
    case "leaveRoom": {
      markDisconnected(room, seat, now);
      return { ok: true, changed: true };
    }
    case "startGame":
      return intentStartGame(room, seat, msg, now);
    case "author":
    case "pass":
    case "verdict":
    case "mAuthor":
    case "mDraw":
    case "playerDraw":
    case "award":
    case "nextRound":
    case "toLobby":
      break;
    default:
      return fail("INVALID", `Intent sconosciuto: ${t}`);
  }

  const game = room.game;
  if (!game) return fail("BAD_PHASE", "Nessuna partita in corso");

  switch (t) {
    case "author": {
      if (game.phase !== "author") return fail("BAD_PHASE", "Non è la fase di scrittura");
      if (game.rSubmitted[seat]) return fail("ALREADY_SUBMITTED", "Hai già inviato la parola");
      const text = cleanText(msg.text);
      if (!text) return fail("INVALID", "Testo vuoto");
      game.rWords[seat] = text;
      game.rSubmitted[seat] = true;
      if (allConnectedSubmitted(room, game.rSubmitted)) closeAuthor(room, now);
      return { ok: true, changed: true };
    }
    case "pass": {
      if (game.phase !== "pass") return fail("BAD_PHASE", "Non è la fase di passaggio");
      if (game.rSubmitted[seat]) return fail("ALREADY_SUBMITTED", "Hai già inviato il passaggio");
      const players = room.seats.length;
      const kind = passKind(game.rStep);
      const value = msg.value;
      if (kind === "drawing") {
        if (!isImageValue(value)) return fail("INVALID", "Disegno non valido");
      } else {
        const text = cleanText(value);
        if (!text || text.startsWith("data:image/")) return fail("INVALID", "Testo non valido");
      }
      const clean = kind === "drawing" ? (value as string) : cleanText(value);
      game.rChains[chainInHand(seat, game.rStep, players)].entries.push({ player: seat, kind, value: clean });
      game.rSubmitted[seat] = true;
      if (allConnectedSubmitted(room, game.rSubmitted)) closePassStep(room, now);
      return { ok: true, changed: true };
    }
    case "verdict": {
      if (game.phase !== "verdict") return fail("BAD_PHASE", "Non è la fase del verdetto");
      if (game.rVerdicts[seat] !== null) return fail("ALREADY_SUBMITTED", "Hai già dato il verdetto");
      if (typeof msg.correct !== "boolean") return fail("INVALID", "Verdetto non valido");
      game.rVerdicts[seat] = msg.correct;
      const allIn = room.seats.every((s, i) => !s.connected || game.rVerdicts[i] !== null);
      if (allIn) closeVerdict(room, now);
      return { ok: true, changed: true };
    }
    case "mAuthor": {
      if (game.phase !== "mAuthor") return fail("BAD_PHASE", "Non è la fase della frase segreta");
      if (seat !== game.mDescriber) return fail("NOT_YOUR_TURN", "Solo il describer sceglie la frase");
      if (game.mAuthorDone) return fail("ALREADY_SUBMITTED", "Frase già scelta");
      const text = cleanText(msg.text);
      const description = cleanText(msg.description);
      if (!text) return fail("INVALID", "Testo vuoto");
      if (!description) return fail("INVALID", "Descrizione vuota");
      game.mSecret = text;
      game.mDescription = description;
      game.mAuthorDone = true;
      game.phase = "mDraw";
      game.phaseEndsAt = now + game.timer * 1000;
      return { ok: true, changed: true };
    }
    case "mDraw": {
      if (game.phase !== "mDraw") return fail("BAD_PHASE", "Non è la fase del disegno");
      if (seat !== game.mDescriber) return fail("NOT_YOUR_TURN", "Solo il describer disegna");
      if (game.mDrawing !== null) return fail("ALREADY_SUBMITTED", "Disegno già inviato");
      if (!isImageValue(msg.image)) return fail("INVALID", "Disegno non valido");
      game.mDrawing = msg.image;
      game.phase = "mPlayerDraw";
      game.phaseEndsAt = now + game.timer * 1000;
      return { ok: true, changed: true };
    }
    case "playerDraw": {
      // Catena muta multiplayer: i giocatori vedono SOLO la descrizione
      // testuale del describer (mai il suo disegno) e disegnano in parallelo.
      if (game.phase !== "mPlayerDraw") return fail("BAD_PHASE", "Non è la fase del disegno");
      if (seat === game.mDescriber) return fail("NOT_YOUR_TURN", "Il describer non disegna qui");
      if (game.mDrawings.has(seat)) return fail("ALREADY_SUBMITTED", "Disegno già inviato");
      if (!isImageValue(msg.image)) return fail("INVALID", "Disegno non valido");
      game.mDrawings.set(seat, msg.image);
      const done = room.seats.every(
        (s, i) => !s.connected || i === game.mDescriber || game.mDrawings.has(i),
      );
      if (done) {
        game.phase = "mReveal";
        game.phaseEndsAt = null;
      }
      return { ok: true, changed: true };
    }
    case "award": {
      if (game.phase !== "mReveal") return fail("BAD_PHASE", "Non è il momento dell'assegnazione");
      const judge = currentJudge(room);
      if (seat !== judge) return fail("NOT_YOUR_TURN", "Solo il giudice assegna il punto");
      if (game.mAwarded !== null) return fail("ALREADY_SUBMITTED", "Punto già assegnato");
      const player = msg.player;
      if (!Number.isInteger(player) || player < 0 || player >= room.seats.length)
        return fail("INVALID", "Giocatore non valido");
      // awardSilentWinner (App.tsx): mai al describer/starter, una sola volta.
      // Qui i candidabili sono i giocatori che hanno consegnato il disegno.
      if (player === game.mDescriber || !game.mDrawings.has(player))
        return fail("INVALID", "Giocatore non candidabile");
      game.scores[player] += 1;
      game.mAwarded = player;
      return { ok: true, changed: true };
    }
    case "nextRound": {
      if (!me.isHost) return fail("NOT_HOST", "Solo l'host può far avanzare il gioco");
      if (game.phase === "reveal" && game.mode === "free") {
        game.roundIndex += 1;
        startAuthorPhase(game, room.seats.length, now);
        return { ok: true, changed: true };
      }
      if (game.phase === "mReveal" && game.mode === "mute") {
        if (game.mAwarded === null && contributors(game).length > 0)
          return fail("INVALID", "Assegna prima il punto");
        game.roundIndex += 1;
        startMuteRound(game, room.seats.length, now);
        return { ok: true, changed: true };
      }
      return fail("BAD_PHASE", "Non si può avanzare da questa fase");
    }
    case "toLobby": {
      if (!me.isHost) return fail("NOT_HOST", "Solo l'host può chiudere la partita");
      if (game.phase !== "results") return fail("BAD_PHASE", "Non si può tornare alla lobby da qui");
      room.game = null;
      return { ok: true, changed: true };
    }
    default:
      return fail("INVALID", `Intent sconosciuto: ${t}`);
  }
}

function intentStartGame(room: Room, seat: number, msg: any, now: number): IntentResult {
  const me = room.seats[seat];
  if (!me.isHost) return fail("NOT_HOST", "Solo l'host può avviare la partita");
  if (room.game !== null) return fail("BAD_PHASE", "Partita già in corso");
  if (connectedCount(room) < 2) return fail("INVALID", "Servono almeno 2 giocatori connessi");

  const mode = msg.mode;
  if (mode !== "rounds" && mode !== "free" && mode !== "mute")
    return fail("INVALID", "Modalità non valida");
  const chains = msg.chains;
  if (!Number.isInteger(chains) || chains < MIN_CHAINS || chains > MAX_CHAINS)
    return fail("INVALID", "Numero di catene non valido (1-8)");
  const timer = msg.timer;
  if (!Number.isInteger(timer) || timer < MIN_TIMER || timer > MAX_TIMER)
    return fail("INVALID", "Timer non valido (10-120 s)");
  const theme = typeof msg.theme === "string" ? msg.theme : "";
  if (!(theme in SCRIBBLE_WORDS)) return fail("INVALID", "Tema non valido");
  if (theme !== "sorpresa" && !room.hostPremium)
    return fail("INVALID", "Tema Premium: solo l'host premium può sceglierlo");

  const players = room.seats.length;
  const game: MPGame = {
    mode,
    chains,
    timer,
    theme,
    hostPremium: room.hostPremium,
    roundIndex: 1,
    scores: Array.from({ length: players }, () => 0),
    phase: "author",
    phaseEndsAt: null,
    rChains: [],
    rWords: [],
    rStep: 0,
    rSubmitted: [],
    rVerdicts: [],
    mDescriber: 0,
    mSecret: null,
    mDescription: null,
    mAuthorDone: false,
    mDrawing: null,
    mDrawings: new Map<number, string>(),
    mAwarded: null,
  };
  room.game = game;
  if (mode === "mute") startMuteRound(game, players, now);
  else startAuthorPhase(game, players, now);
  return { ok: true, changed: true };
}

// ---------------------------------------------------------------------------
// tickRoom — chiude le fasi scadute applicando le auto-risoluzioni.
// Ritorna true se lo stato è cambiato.
// ---------------------------------------------------------------------------
export function tickRoom(room: Room, now: number): boolean {
  const game = room.game;
  if (!game || game.phaseEndsAt === null || now < game.phaseEndsAt) return false;
  switch (game.phase) {
    case "author":
      closeAuthor(room, now);
      return true;
    case "pass":
      closePassStep(room, now);
      return true;
    case "verdict":
      closeVerdict(room, now);
      return true;
    case "mAuthor":
      // Describer assente: parola casuale dal pack (come "Pesca una frase") e
      // descrizione generica (il disegno resta comunque segreto fino al reveal).
      game.mSecret = game.mSecret ?? randomWord(game.theme);
      game.mDescription = game.mDescription ?? "Nessuna descrizione: disegna quello che vuoi!";
      game.mAuthorDone = true;
      game.phase = "mDraw";
      game.phaseEndsAt = now + game.timer * 1000;
      return true;
    case "mDraw":
      game.mDrawing = game.mDrawing ?? BLANK_PNG;
      game.phase = "mPlayerDraw";
      game.phaseEndsAt = now + game.timer * 1000;
      return true;
    case "mPlayerDraw":
      // Chi non ha consegnato salta il resto del round.
      for (let i = 0; i < room.seats.length; i++) {
        if (i === game.mDescriber || game.mDrawings.has(i)) continue;
        game.mDrawings.set(i, BLANK_PNG);
      }
      game.phase = "mReveal";
      game.phaseEndsAt = null;
      return true;
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// getView — view personalizzata con disciplina dei segreti (§7)
// ---------------------------------------------------------------------------
function seatName(room: Room, seat: number): string {
  return room.seats[seat]?.name ?? `Giocatore ${seat + 1}`;
}

function chainViewOf(room: Room, chain: MPChain): { starterName: string; entries: { playerName: string; kind: string; value: string }[] } {
  return {
    starterName: seatName(room, chain.starter),
    entries: chain.entries.map((e) => ({
      playerName: seatName(room, e.player),
      kind: e.kind,
      value: e.value,
    })),
  };
}

function standingsOf(room: Room): { name: string; score: number }[] {
  const game = room.game!;
  // Come App.tsx: ordina per punteggio desc, a pari punti vince l'indice minore.
  return room.seats
    .map((s, index) => ({ name: s.name || `Giocatore ${index + 1}`, score: game.scores[index] ?? 0, index }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ name, score }) => ({ name, score }));
}

export function getView(room: Room, seat: number, now: number): View {
  const view: View = {
    phase: room.game ? room.game.phase : "lobby",
    room: {
      code: room.code,
      me: seat,
      seats: room.seats.map((s) => ({ name: s.name, connected: s.connected, isHost: s.isHost })),
    },
    game: null,
  };
  const game = room.game;
  if (!game) return view;
  const me = room.seats[seat];
  const players = room.seats.length;
  const connected = !!me?.connected;

  let myTurn = false;
  let pending: string[] = [];
  let prompt: { kind: "text" | "drawing"; value: string } | null = null;
  const g: NonNullable<View["game"]> = {
    mode: game.mode,
    roundIndex: game.roundIndex,
    totalRounds: game.mode === "rounds" ? game.chains : null,
    timer: game.timer,
    theme: game.theme,
    scores: [...game.scores],
    phaseEndsAt: game.phaseEndsAt,
    serverNow: now,
    myTurn: false,
    waitingFor: [],
    prompt: null,
    standings: standingsOf(room),
    canAdvance: false,
    progressLabel:
      game.mode === "rounds"
        ? `Catena ${game.roundIndex} di ${game.chains}`
        : game.mode === "mute"
          ? `Catena muta ${game.roundIndex}`
          : `Catena ${game.roundIndex}`,
  };

  const pendingNames = (indices: number[]): string[] =>
    indices.filter((i) => room.seats[i]?.connected).map((i) => seatName(room, i));

  switch (game.phase) {
    case "author": {
      myTurn = connected && !game.rSubmitted[seat];
      pending = pendingNames(room.seats.map((_, i) => i).filter((i) => !game.rSubmitted[i]));
      break;
    }
    case "pass": {
      myTurn = connected && !game.rSubmitted[seat];
      pending = pendingNames(room.seats.map((_, i) => i).filter((i) => !game.rSubmitted[i]));
      if (myTurn) {
        // Il seat vede SOLO l'ultima entry della catena in mano.
        const chain = game.rChains[chainInHand(seat, game.rStep, players)];
        const last = chain.entries[chain.entries.length - 1];
        prompt = { kind: last.kind, value: last.value };
      }
      break;
    }
    case "verdict": {
      myTurn = connected && game.rVerdicts[seat] === null;
      pending = pendingNames(room.seats.map((_, i) => i).filter((i) => game.rVerdicts[i] === null));
      // Ogni seat vede SOLO la propria catena completa.
      g.chainsView = [chainViewOf(room, game.rChains[seat])];
      break;
    }
    case "reveal": {
      // Free: tutti vedono tutte le catene. Niente punteggi (come single-device).
      g.chainsView = game.rChains.map((c) => chainViewOf(room, c));
      g.canAdvance = !!me?.isHost;
      break;
    }
    case "results": {
      g.canAdvance = !!me?.isHost;
      break;
    }
    case "mAuthor": {
      myTurn = connected && seat === game.mDescriber && !game.mAuthorDone;
      pending = game.mAuthorDone || !room.seats[game.mDescriber]?.connected ? [] : [seatName(room, game.mDescriber)];
      break;
    }
    case "mDraw": {
      myTurn = connected && seat === game.mDescriber && game.mDrawing === null;
      pending =
        game.mDrawing === null && room.seats[game.mDescriber]?.connected ? [seatName(room, game.mDescriber)] : [];
      if (seat === game.mDescriber && game.mSecret) prompt = { kind: "text", value: game.mSecret };
      break;
    }
    case "mPlayerDraw": {
      // I giocatori vedono SOLO la descrizione testuale del describer
      // (mai il suo disegno) e disegnano in parallelo col timer sincronizzato.
      const isPlayer = seat !== game.mDescriber;
      myTurn = connected && isPlayer && !game.mDrawings.has(seat);
      pending = pendingNames(
        room.seats.map((_, i) => i).filter((i) => i !== game.mDescriber && !game.mDrawings.has(i)),
      );
      if (myTurn && game.mDescription) prompt = { kind: "text", value: game.mDescription };
      break;
    }
    case "mReveal": {
      const judge = currentJudge(room);
      const contrib = contributors(game);
      myTurn = connected && seat === judge && game.mAwarded === null && contrib.length > 0;
      pending = game.mAwarded === null && contrib.length > 0 && judge >= 0 ? [seatName(room, judge)] : [];
      const descrName = seatName(room, game.mDescriber);
      // Disegno segreto del describer + un disegno per giocatore.
      const entries: { playerName: string; kind: string; value: string }[] = [
        { playerName: descrName, kind: "drawing", value: game.mDrawing ?? BLANK_PNG },
      ];
      for (const c of contrib) {
        entries.push({ playerName: seatName(room, c), kind: "drawing", value: game.mDrawings.get(c) ?? BLANK_PNG });
      }
      g.chainsView = [{ starterName: descrName, entries }];
      g.secret = game.mSecret ?? "";
      g.description = game.mDescription ?? "";
      g.judgeName = judge >= 0 ? seatName(room, judge) : null;
      g.awardedName = game.mAwarded !== null ? seatName(room, game.mAwarded) : null;
      if (seat === judge && game.mAwarded === null) {
        g.canAwardList = contrib.map((c) => seatName(room, c));
      }
      g.canAdvance =
        !!me?.isHost && (game.mAwarded !== null || contrib.length === 0);
      break;
    }
  }

  g.myTurn = myTurn;
  g.waitingFor = myTurn ? [] : pending;
  g.prompt = prompt;
  view.game = g;
  return view;
}
