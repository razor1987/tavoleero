// mp.ts — Tavoleero multiplayer Fase 1: server state machine per Scribble Scratch.
//
// TypeScript PURO, solo sintassi erasable (niente enum/namespaces/parameter
// properties/decorators): gira su Bun e su node >= 22.18 con type-stripping.
// NESSUN import da 'bun:*' — testabile con node puro.
//
// Spec: mp-protocol.md. In caso di conflitto su rounds/free vince App.tsx
// (ScribbleGame in party-hub/client/src/App.tsx).

// ---------------------------------------------------------------------------
// Mazzo parole (generato da words/build-wordlists.py (CSV ufficiali))
// Serve per il fallback "pesca parola" quando un autore non invia in tempo.
// ---------------------------------------------------------------------------
export const SCRIBBLE_WORDS: Record<string, string[]> = {
  sorpresa: ["gatto", "astronauta", "tiramisù", "vulcano", "monopattino", "pinguino", "castello", "karaoke", "cactus", "telecomando", "temporale", "polpo", "ombrello", "lampadina", "frigorifero", "lavatrice", "divano", "poltrona", "specchio", "quadro", "orologio", "sveglia", "calendario", "libro", "matita", "penna stilografica", "pennello", "forbici", "regalo", "palloncino", "candela", "torcia", "lanterna", "valigia", "zaino", "baule", "lucchetto", "chiavi", "cuscino", "coperta", "tappeto", "scala", "ascensore", "camino", "comignolo", "finestra", "porta", "campanello", "zerbino", "vaso", "annaffiatoio", "rastrello", "chitarra", "pianoforte", "violino", "tromba", "tamburo", "flauto", "sassofono", "fisarmonica", "arpa", "microfono", "cuffie", "giradischi", "jukebox", "palcoscenico", "sipario", "maschera", "pagliaccio", "giocoliere", "trapezista", "domatore", "pallone", "racchetta", "mazza da baseball", "guantone da boxe", "casco", "skateboard", "pattini a rotelle", "sci", "canestro", "porta da calcio", "cronometro", "fischietto", "medaglia", "trofeo", "podio", "bandierina", "striscione", "salvagente", "boccaglio", "pinne", "automobile", "camion", "autobus", "trattore", "ruspa", "ambulanza", "taxi", "aeroplano", "elicottero", "mongolfiera", "deltaplano", "paracadute", "nave", "barca a vela", "motoscafo", "sottomarino", "traghetto", "gondola", "treno", "tram", "sidecar", "roulotte", "carro attrezzi", "spazzaneve", "carrozza", "spiaggia", "montagna", "deserto", "oasi", "foresta", "cascata", "lago", "ponte", "faro", "mulino a vento", "fontana", "piramide", "igloo", "baita", "grattacielo", "torre", "campanile", "stazione", "aeroporto", "porto", "mercato", "luna park", "circo", "teatro", "museo", "biblioteca", "stadio", "zoo", "fattoria", "diga", "pompiere", "dottore", "cuoco", "fornaio", "postino", "poliziotto", "muratore", "elettricista", "giardiniere", "pescatore", "pilota", "scienziato", "professore", "arbitro", "pugile", "Babbo Natale", "Befana", "sposa", "neonato", "pirata", "cowboy", "vichingo", "samurai", "cavaliere", "mago", "supereroe", "principessa", "fantasma", "robot", "spaventapasseri", "castello di sabbia", "pupazzo di neve", "albero di Natale", "aquilone", "nave in bottiglia", "casa sull’albero", "arcobaleno", "stella cadente", "torta in faccia", "uovo di Pasqua", "pentola d’oro", "bandiera dei pirati", "tesoro", "mappa del tesoro", "clessidra", "bussola", "cannocchiale", "trottola", "marionetta", "burattino", "girandola", "secchiello", "trenino"],
  animali: ["giraffa", "lama", "canguro", "fenicottero", "riccio", "bradipo", "leone", "tigre", "leopardo", "ghepardo", "elefante", "rinoceronte", "ippopotamo", "zebra", "bisonte", "bufalo", "iena", "facocero", "antilope", "gazzella", "gnu", "okapi", "orso", "orso polare", "panda", "koala", "volpe", "lupo", "coyote", "sciacallo", "lince", "puma", "giaguaro", "procione", "tasso", "donnola", "furetto", "lontra", "castoro", "marmotta", "scoiattolo", "ghiro", "istrice", "talpa", "pipistrello", "formichiere", "armadillo", "pangolino", "cammello", "dromedario", "renna", "alce", "cervo", "daino", "capriolo", "stambecco", "camoscio", "muflone", "yak", "cane", "cavallo", "pony", "mucca", "toro", "vitello", "maiale", "cinghiale", "pecora", "agnello", "capra", "capretto", "asino", "mulo", "coniglio", "lepre", "criceto", "porcellino d’India", "aquila", "falco", "poiana", "avvoltoio", "gufo", "civetta", "barbagianni", "allocco", "condor", "corvo", "cornacchia", "gazza", "ghiandaia", "passero", "pettirosso", "cardellino", "rondine", "piccione", "tortora", "merlo", "usignolo", "picchio", "upupa", "gruccione", "martin pescatore", "pappagallo", "cacatua", "tucano", "cigno", "anatra", "pellicano", "gabbiano", "albatro", "cormorano", "airone", "cicogna", "gru", "pavone", "struzzo", "coccodrillo", "alligatore", "caimano", "varano", "drago di Komodo", "iguana", "camaleonte", "geco", "lucertola", "tartaruga", "testuggine", "boa", "pitone", "cobra", "vipera", "rana", "rospo", "salamandra", "squalo", "squalo martello", "razza", "pesce pagliaccio", "pesce rosso", "anguilla", "murena", "cavalluccio marino", "luccio", "carpa"],
  cibo: ["pizza", "gelato", "lasagna", "cannolo", "anguria", "spaghetti", "popcorn", "pesce spada", "trota", "salmone", "tonno", "arancino", "supplì", "bruschetta", "crostini", "panzerotto", "focaccia", "piadina", "taralli", "grissini", "bresaola", "speck", "prosciutto crudo", "mortadella", "salame", "pancetta", "guanciale", "salsiccia", "wurstel", "hamburger", "hot dog", "toast", "tramezzino", "kebab", "tacos", "burrito", "sushi", "poke", "involtini primavera", "samosa", "falafel", "hummus", "nachos", "patatine fritte", "anelli di cipolla", "mozzarella in carrozza", "carbonara", "amatriciana", "pesto", "cacio e pepe", "gricia", "puttanesca", "arrabbiata", "aglio e olio", "pasta allo scoglio", "pasta alla norma", "cannelloni", "agnolotti", "orecchiette", "trofie", "pici", "strozzapreti", "farfalle", "penne", "fusilli", "rigatoni", "bucatini", "linguine", "tagliatelle", "pappardelle", "risotto", "paella", "couscous", "polenta", "gnocchi", "fiorentina", "tagliata", "brasato", "ossobuco", "porchetta", "pollo arrosto", "cotoletta", "scaloppina", "polpette", "arrosticini", "shawarma", "costine", "filetto", "carpaccio", "tartare", "vitello tonnato", "orata", "branzino", "rombo", "sogliola", "baccalà", "acciughe", "gamberi", "scampi", "aragosta", "granchio", "cozze", "vongole", "ostriche", "capesante", "seppie", "calamari", "insalata russa", "caponata", "peperonata", "carciofi", "asparagi", "broccoli", "spinaci", "radicchio", "melanzane", "peperoni", "purè", "porcini", "tartufo", "panna cotta", "budino", "zuppa inglese", "millefoglie", "cassata", "pastiera", "sfogliatella", "babà", "panettone", "pandoro", "torrone", "marzapane", "amaretti", "cantucci", "baci di dama", "meringa", "macaron", "éclair", "cheesecake", "brownie", "muffin", "donut", "churros", "crêpe", "pancake", "waffle", "strudel", "Sachertorte", "semifreddo"],
  azioni: ["ballare", "starnutire", "fare surf", "cantare", "arrampicarsi", "cucinare", "telefonare", "pattinare", "nuotare", "tuffarsi", "fare immersioni", "sciare", "fare snowboard", "andare in bicicletta", "fare jogging", "correre", "saltare", "fare parkour", "scalare", "fare yoga", "sollevare pesi", "fare flessioni", "boxare", "tirare di scherma", "giocare a tennis", "giocare a calcio", "fare goal", "parare un rigore", "palleggiare", "fare canestro", "tirare con l'arco", "cavalcare", "guidare", "parcheggiare", "fare benzina", "lavare la macchina", "cambiare una gomma", "andare in moto", "pedalare", "fare la spesa", "spingere il carrello", "fare la fila", "pagare alla cassa", "imbucare una lettera", "leggere il giornale", "guardare la tv", "giocare ai videogiochi", "lavare i piatti", "stirare", "passare l'aspirapolvere", "rifare il letto", "annaffiare le piante", "rastrellare le foglie", "tagliare l'erba", "spalare la neve", "appendere un quadro", "imbiancare", "martellare un chiodo", "avvitare", "fare le smorfie", "fare l’occhiolino", "tossire", "sbadigliare", "russare", "dormire", "stiracchiarsi", "lavarsi i denti", "farsi la doccia", "pettinarsi", "truccarsi", "radersi", "mettersi il cappello", "allacciarsi le scarpe", "fare la valigia", "brindare", "fare il trenino", "suonare la chitarra", "suonare il pianoforte", "suonare la batteria", "dirigere un’orchestra", "fare il dj", "applaudire", "fischiare", "ridere a crepapelle", "abbracciare", "darsi il cinque", "fare un selfie", "scattare una foto", "fare un picnic", "accendere un falò", "montare una tenda", "fare trekking", "fare rafting", "andare in canoa", "remare", "pescare", "tuffo dal trampolino", "fare windsurf", "fare kitesurf", "fare un pupazzo", "fare slittino", "giocare a bocce", "giocare a bowling", "fare strike", "giocare a biliardo", "giocare a freccette", "scrivere al computer", "timbrare il cartellino", "fare una riunione", "consegnare un pacco", "fare il cameriere", "shakerare un cocktail", "fare il giocoliere", "camminare sul filo", "fare il mago", "sputare fuoco", "andare sui trampoli", "fare la verticale", "fare la ruota", "fare la spaccata", "fare il mimo", "suonare la tromba", "suonare il sassofono", "fare il tifo", "sventolare una bandiera", "tagliare il traguardo", "alzare la coppa", "lanciare il disco", "lanciare il peso", "saltare in alto", "saltare con l’asta", "fare uno scatto", "marciare", "stare sull’attenti", "andare a vela", "galleggiare", "sbracciarsi", "fare bungee jumping", "lanciarsi col paracadute", "volare in deltaplano", "pilotare un aereo", "decollare", "atterrare", "controllare i biglietti", "guidare un treno", "suonare il clacson", "fare retromarcia", "domare i leoni", "fare l’acrobata", "camminare sulle mani"],
  assurdo: ["un lama presenta il meteo", "un cactus vince Sanremo", "un alieno prepara il tiramisù", "un dinosauro lavora da casa", "un polpo gioca a ping-pong", "un unicorno va dal meccanico", "una foca fa il bagnino in piscina", "un’antilope gioca a nascondino nel deserto", "un armadillo vince una gara di velocità", "un procione fa il postino in bicicletta", "un airone fa yoga al tramonto", "un tasso apre un negozio di palloncini", "un elefante va in bicicletta al circo", "una scimmia fa la parrucchiera alle banane", "un leone fa il dentista ai topolini", "un coccodrillo vende occhiali da sole", "un orso fa il gelataio al Polo Nord", "un tricheco consegna sushi in moto", "una zebra dirige il traffico in centro", "un ippopotamo fa danza classica sul palco", "un rinoceronte fa il fioraio in centro", "un cammello fa il tassista nel deserto", "un koala fa il buttafuori in discoteca", "un panda prepara sushi per i clienti", "una tigre fa la maestra d’asilo", "un lupo fa il veterinario degli agnelli", "una volpe fa la babysitter ai pulcini", "un gufo insegna matematica a mezzanotte", "un pappagallo fa l’interprete all’ONU di notte", "un piccione recapita lettere d’amore in bici", "un gabbiano ruba il pranzo in spiaggia", "un pellicano trasporta turisti nel becco", "un’aquila fotografa i matrimoni volando dall’alto", "un pavone sfila in passerella a Milano", "uno struzzo partecipa a una sfilata elegante", "un tucano fa il barman ai tropici", "un delfino gioca a pallavolo in spiaggia", "una balena dirige l’opera in mare aperto", "uno squalo apre una scuola di nuoto", "una medusa fa da lampada in salotto", "una stella marina arbitra una partita", "un granchio suona le nacchere flamenche", "un totano fa il giocoliere con dieci palle", "una tartaruga consegna telegrammi sempre in ritardo", "una lumaca partecipa alle olimpiadi dei cento metri", "una farfalla solleva pesi in palestra", "un’ape guida il trattore nei campi", "una formica trasloca un divano da sola", "una coccinella posa per un pittore", "un ragno tesse una sciarpa di lana", "una zanzara fa la donatrice di sangue", "una mosca dà lezioni di volo", "un bruco apre una sartoria su misura", "una libellula fa la vigile urbana", "un grillo suona il violino nell’orchestra", "una cicala suona rock allo stadio", "una focaccia scappa dal forno inseguita dal pizzaiolo", "un ghiacciolo prende il sole in spiaggia", "un fusillo fa bungee jumping dal piatto", "una carbonara va in vacanza ai Caraibi", "un panettone fa il bagno a Ferragosto", "una mozzarella rotola via dal piatto", "un pupazzo di neve vende ghiaccioli d’estate", "un ombrello fa skateboard sulle pozzanghere", "una lavatrice partecipa alle olimpiadi di centrifuga", "un frigorifero vende granite in spiaggia", "un aspirapolvere risucchia i calzini spaiati", "una lampadina posa per un faro", "un divano corre la maratona di New York", "una sedia partecipa a un musical famoso", "un tavolo apparecchia la cena da solo", "un orologio arriva in ritardo al lavoro", "un telefono si rifiuta di squillare", "un computer va in vacanza alle Maldive", "una stampante sputa banconote da cento euro", "un semaforo lampeggia a tempo di musica", "un idrante spegne un drago sputafuoco", "un drago accende il barbecue in giardino", "un robot stira le camicie della nonna", "un robot porta a spasso il cane", "un fantasma fa il turno di notte in fabbrica", "un vampiro apre un bar di succhi", "una mummia sfila con bende elastiche", "uno zombie fa footing al parco", "un pirata guida un taxi a Londra", "un cowboy munge una mucca robot", "un pompiere spegne una candelina soffiando", "un muratore costruisce una torre di carte", "un portalettere consegna pacchi sulla Luna", "un cuoco assaggia una torta gigante", "un barbiere pettina un porcospino nervoso", "un giardiniere pota una siepe a forma di drago", "un nonno fa skateboard allo skatepark", "una nonna vince un torneo di videogiochi", "un bambino fa il vigile con la paletta", "Babbo Natale consegna regali in costume da bagno", "la Befana corre in Formula 1", "uno yeti apre un chiosco di granite", "un satellite fa un selfie con la Terra", "la Luna cerca coinquilini per l’estate"],
};

// ---------------------------------------------------------------------------
// Sintonia — generato da words/build-wordlists.py (CSV ufficiali).
// ---------------------------------------------------------------------------
export const SYNC_PACKS: Record<string, string[]> = {
  base: ["caffè ___", "___ di casa", "pausa ___", "giornata ___", "scarpe da ___", "serata ___", "pizza ___", "pasta alla ___", "___ fritto", "torta di ___", "gelato al ___", "film ___", "serie ___", "scena ___", "finale ___", "canzone ___", "musica ___", "viaggio ___", "valigia ___", "mare ___", "partita ___", "squadra ___", "campione ___", "pioggia ___", "colazione ___", "___ caldo", "panino ___", "___ della nonna", "cena ___", "dolce ___", "___ al forno", "spuntino ___", "___ piccante", "birra ___", "___ della domenica", "merenda ___", "antipasto ___", "___ al cioccolato", "___ e patatine", "insalata ___", "sagra ___", "___ street food", "___ in salotto", "divano ___", "___ sul balcone", "camera ___", "___ in cucina", "bagno ___", "___ del vicino", "porta ___", "___ in garage", "finestra ___", "___ sotto il letto", "terrazzo ___", "___ in cantina", "corridoio ___", "lavori ___", "___ in soffitta", "___ in aereo", "vacanza ___", "___ in treno", "hotel ___", "gita ___", "passaporto ___", "___ in campeggio", "souvenir ___", "___ last minute", "volo ___", "___ in ostello", "cartolina ___", "___ on the road", "zaino ___", "___ in nave", "___ low cost", "___ in palestra", "corsa ___", "___ allo stadio", "gol ___", "___ in piscina", "allenamento ___", "tifoso ___", "medaglia ___", "___ in bicicletta", "derby ___", "___ olimpico", "arbitro ___", "concerto ___", "___ dal vivo", "ritornello ___", "playlist ___", "___ in cuffia", "chitarra ___", "___ anni 90", "karaoke ___", "___ stonato", "batterista ___", "___ in radio", "dj ___", "___ al cinema", "maratona ___", "___ in TV", "spoiler ___", "___ horror", "protagonista ___", "___ commedia", "divano e ___", "___ da Oscar", "puntata ___", "___ doppiato", "colpo di scena ___", "___ in ufficio", "riunione ___", "___ il lunedì", "capo ___", "___ straordinario", "scadenza ___", "collega ___", "___ da remoto", "ferie ___", "___ il venerdì", "mail ___", "___ di lavoro", "badge ___", "buono ___", "colloquio ___", "___ part-time", "___ tra amici", "amico ___", "___ di gruppo", "uscita ___", "abbraccio ___", "compleanno ___", "___ a sorpresa", "rimpatriata ___", "___ di vecchia data", "brindisi ___", "___ inseparabili", "litigata ___", "___ sul telefono", "batteria ___", "wifi ___", "selfie ___", "___ in carica", "schermo ___", "___ touch", "app ___", "___ senza segnale", "auricolari ___", "___ in 4K", "notifica ___", "___ al parco", "temporale ___", "___ in montagna", "tramonto ___", "___ nel bosco", "arcobaleno ___", "___ in giardino", "neve ___", "___ al lago", "farfalla ___", "___ sotto le stelle", "pic-nic ___", "___ di compleanno", "candeline ___", "___ a tema", "invito ___", "___ in maschera", "regalo ___", "___ di laurea", "discoteca ___", "capodanno ___", "coriandoli ___", "___ travestito", "afterparty ___", "___ da bambino", "cartone ___", "___ alle elementari", "gioco ___", "___ in cortile", "figurina ___", "favola ___", "monopattino ___", "___ con i cugini", "paghetta ___", "___ al parco giochi", "nascondino ___", "___ in centro", "traffico ___", "___ in metro", "spritz ___", "___ al mercato", "coda ___", "___ in motorino", "semaforo ___", "___ di quartiere", "panchina ___", "___ sotto casa", "edicola ___", "___ in tangenziale", "parcheggio ___"],
  premium: ["___ galattico", "super ___", "___ misterioso", "mega ___", "___ invisibile", "missione ___", "aperitivo ___", "nonna ___", "festa di ___", "___ del cuore", "primo ___", "appuntamento ___", "password ___", "chat ___", "modalità ___", "robot ___", "___ alle 3 di notte", "allarme ___", "___ nel frigo", "calzino ___", "telecomando ___", "___ in pigiama", "sveglia ___", "___ della buonanotte", "pigiama ___", "___ sotto la doccia", "spazzolino ___", "___ al risveglio", "incubo ___", "pantofole ___", "se fossi ___", "superpotere ___", "___ per un giorno", "se vincessi ___", "___ milionario", "macchina del ___", "___ nel tempo", "se abitassi ___", "___ parallelo", "desiderio ___", "___ impossibile", "mantello ___", "animale ___", "pappagallo ___", "___ a quattro zampe", "bradipo ___", "___ da salotto", "criceto ___", "___ tropicale", "pesce ___", "___ peloso", "zoo ___", "___ magico", "pozione ___", "___ stregato", "drago ___", "___ incantato", "bacchetta ___", "___ leggendario", "unicorno ___", "___ fatato", "elfo ___", "___ mitologico", "castello ___", "___ da sogno", "vacanza da ___", "___ ideale", "weekend ___", "___ perfetto", "fuga ___", "___ romantico", "notte ___", "___ indimenticabile", "progetto ___", "___ da favola", "isola ___", "___ compulsivo", "collezione di ___", "___ raro", "portafortuna ___", "___ introvabile", "mania di ___", "___ da collezione", "fissazione ___", "___ vintage", "oggetto ___", "___ smarrito", "cassetto ___", "___ 2.0", "cyborg ___", "ologramma ___", "___ del futuro", "smartphone ___", "___ virtuale", "drone ___", "videogioco ___", "console ___", "___ retrò", "flipper ___", "___ high-tech"],
};

// Parole iniziali "riempitive" ignorate nella normalizzazione (copia esatta).
const FILLERS = new Set(["il","lo","la","i","gli","le","un","uno","una","l","di","del","dello","della","dei","degli","delle","a","al","allo","alla","ai","agli","alle","da","dal","dallo","dalla","in","nel","nello","nella","su","sul","sulla","con","per","tra","fra"]);

// COPIA ESATTA da App.tsx (SyncGame)
export function normalized(value: string): string {
  const words = value.trim().toLocaleLowerCase("it-IT").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, " ").replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  while (words.length > 1 && FILLERS.has(words[0] ?? "")) words.shift();
  return words.join(" ");
}

// COPIA ESATTA da App.tsx (SyncGame): tolleranza a un piccolo refuso.
export function tinyTypo(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) {
    const diff: number[] = [];
    for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) diff.push(i);
    if (diff.length === 1) return true;
    const first = diff[0];
    const second = diff[1];
    return diff.length === 2 && first !== undefined && second === first + 1 && a[first] === b[second] && a[second] === b[first];
  }
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  let left = 0, right = 0, skipped = false;
  while (left < shorter.length && right < longer.length) {
    if (shorter[left] === longer[right]) { left += 1; right += 1; }
    else if (skipped) return false;
    else { skipped = true; right += 1; }
  }
  return true;
}

export interface SyncAnswerGroup {
  label: string;
  members: number[];
  points: number;
}

// COPIA ESATTA da App.tsx (SyncGame): gruppi con punteggio 3/1/0.
export function groupSyncAnswers(values: string[]): SyncAnswerGroup[] {
  const groups: SyncAnswerGroup[] = [];
  values.forEach((answer, index) => {
    const key = normalized(answer);
    if (!key) {
      groups.push({ label: answer, members: [index], points: 0 });
      return;
    }
    const found = groups.find((group) => {
      const groupKey = normalized(group.label);
      return Boolean(groupKey) && tinyTypo(groupKey, key);
    });
    if (found) found.members.push(index);
    else groups.push({ label: answer, members: [index], points: 0 });
  });
  return groups.map((group) => ({
    ...group,
    points: group.members.length === 2 ? 3 : group.members.length >= 3 ? 1 : 0,
  }));
}

// Punteggio automatico del confirm (copia esatta da App.tsx SyncGame).
export function syncGroupPoints(memberCount: number): number {
  return memberCount === 2 ? 3 : memberCount >= 3 ? 1 : 0;
}

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
  | "mAuthor" | "mDraw" | "mPlayerDraw" | "mReveal"
  | "sAnswer" | "sReview" | "sReveal" | "sWinner";
export type GameKind = "scribble" | "sintonia";
export type SintoniaResponseMode = "pass" | "paper";
export type SintoniaPack = "base" | "premium";
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
  kind: GameKind; // "scribble" | "sintonia"
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
  // sintonia (kind === "sintonia"): le risposte sono scritte in segreto su ogni
  // device e raccolte in simultanea; punteggio e gruppi identici al
  // single-device (SyncGame: normalized/tinyTypo/groupAnswers).
  sMode: SintoniaResponseMode; // "pass" | "paper" (raccolta simultanea per entrambi)
  sTarget: number; // traguardo punti
  sPack: SintoniaPack;
  sPrompt: string; // frase del round (pubblica)
  sAnswers: (string | null)[]; // per seat, null = non inviata (SEGRETTE fino a sReview)
  sGroups: SyncAnswerGroup[]; // gruppi proposti / finali
}

export interface ChatMessage {
  from: string; // nome del seat al momento dell'invio
  text: string; // 1-200 caratteri
  at: number; // timestamp server
}

export interface Room {
  code: string; // 6 cifre
  seats: Seat[]; // indice seat = indice giocatore
  createdAt: number;
  lastActivity: number;
  game: MPGame | null; // null = lobby
  hostPremium: boolean;
  chat: ChatMessage[]; // effimera: vive e muore con la stanza (max 50)
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
    chat: ChatMessage[];
  };
  game: null | {
    kind: GameKind;
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
    // sintonia (kind === "sintonia")
    sPrompt?: string;
    sTarget?: number;
    sMode?: SintoniaResponseMode;
    sSubmitted?: boolean; // io ho già inviato la risposta in sAnswer
    sCanReview?: boolean; // host in sReview: può dividere/unire/confermare
    sGroups?: { label: string; members: string[]; points: number }[];
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

// Sintonia: maxLength 40 come l'input del single-device (App.tsx SyncGame).
const MAX_SYNC_ANSWER_LEN = 40;
function cleanSyncAnswer(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, MAX_SYNC_ANSWER_LEN);
}

// true se tutti i seat CONNESSI hanno inviato la risposta.
function allConnectedAnswered(room: Room): boolean {
  const game = room.game;
  if (!game) return false;
  return room.seats.every((s, i) => !s.connected || game.sAnswers[i] !== null);
}

// Avvia il round Sintonia: nuova frase dal mazzo, risposte azzerate.
function startSintoniaRound(game: MPGame, players: number): void {
  const pool =
    game.sPack === "premium"
      ? [...SYNC_PACKS.base, ...SYNC_PACKS.premium]
      : SYNC_PACKS.base;
  game.sPrompt = pool[Math.floor(Math.random() * pool.length)] ?? "serata ___";
  game.sAnswers = Array.from({ length: players }, () => null);
  game.sGroups = [];
  game.phase = "sAnswer";
  game.phaseEndsAt = null;
}

// Chiude la raccolta: chi manca resta senza risposta ("" -> gruppo da 0
// punti, come il single-device) e si passa al controllo dei gruppi.
function sintoniaToReview(game: MPGame): void {
  const answers = game.sAnswers.map((a) => a ?? "");
  game.sGroups = groupSyncAnswers(answers);
  game.phase = "sReview";
  game.phaseEndsAt = null;
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
      chat: [],
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
    case "chat": {
      // Chat di stanza: funziona in lobby e durante la partita.
      const text = String(msg.text ?? "").trim().slice(0, 200);
      if (!text) return fail("INVALID", "Messaggio vuoto");
      room.chat.push({ from: me.name, text, at: now });
      if (room.chat.length > 50) room.chat.splice(0, room.chat.length - 50);
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
    case "sAnswer":
    case "sSplit":
    case "sMerge":
    case "sConfirm":
    case "sForce":
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
      // Sintonia: reveal -> nuovo round; winner -> nuova partita (score azzerati).
      if (game.phase === "sReveal" && game.kind === "sintonia") {
        game.roundIndex += 1;
        startSintoniaRound(game, room.seats.length);
        return { ok: true, changed: true };
      }
      if (game.phase === "sWinner" && game.kind === "sintonia") {
        game.scores = Array.from({ length: room.seats.length }, () => 0);
        game.roundIndex = 1;
        startSintoniaRound(game, room.seats.length);
        return { ok: true, changed: true };
      }
      return fail("BAD_PHASE", "Non si può avanzare da questa fase");
    }
    case "toLobby": {
      if (!me.isHost) return fail("NOT_HOST", "Solo l'host può chiudere la partita");
      const sintoniaExit = game.kind === "sintonia" && (game.phase === "sReveal" || game.phase === "sWinner");
      if (game.phase !== "results" && !sintoniaExit)
        return fail("BAD_PHASE", "Non si può tornare alla lobby da qui");
      room.game = null;
      return { ok: true, changed: true };
    }
    case "sAnswer": {
      if (game.kind !== "sintonia" || game.phase !== "sAnswer")
        return fail("BAD_PHASE", "Non è la fase di scrittura");
      if (game.sAnswers[seat] !== null)
        return fail("ALREADY_SUBMITTED", "Hai già inviato la tua parola");
      const text = cleanSyncAnswer(msg.text);
      if (!text) return fail("INVALID", "Scrivi una parola prima di inviare");
      game.sAnswers[seat] = text;
      if (allConnectedAnswered(room)) {
        sintoniaToReview(game);
      }
      return { ok: true, changed: true };
    }
    case "sForce": {
      if (!me.isHost) return fail("NOT_HOST", "Solo l'host può forzare l'avanzamento");
      if (game.kind !== "sintonia" || game.phase !== "sAnswer")
        return fail("BAD_PHASE", "Non è la fase di scrittura");
      // Chi non ha inviato resta senza risposta (gruppo da 0 punti come il single-device).
      sintoniaToReview(game);
      return { ok: true, changed: true };
    }
    case "sSplit": {
      if (!me.isHost) return fail("NOT_HOST", "Solo l'host può modificare i gruppi");
      if (game.kind !== "sintonia" || game.phase !== "sReview")
        return fail("BAD_PHASE", "Non è la fase di controllo");
      const index = msg.index;
      if (!Number.isInteger(index) || index < 0 || index >= game.sGroups.length)
        return fail("INVALID", "Gruppo non valido");
      const group = game.sGroups[index]!;
      if (group.members.length < 2)
        return fail("INVALID", "Si può dividere solo un gruppo con più risposte");
      // COPIA ESATTA della logica split di App.tsx SyncGame: il gruppo viene
      // rimosso e le risposte singole sono accodate in fondo.
      const singles = group.members.map((member) => ({
        label: game.sAnswers[member] ?? "",
        members: [member],
        points: 0,
      }));
      game.sGroups = game.sGroups.filter((_, i) => i !== index).concat(singles);
      return { ok: true, changed: true };
    }
    case "sMerge": {
      if (!me.isHost) return fail("NOT_HOST", "Solo l'host può modificare i gruppi");
      if (game.kind !== "sintonia" || game.phase !== "sReview")
        return fail("BAD_PHASE", "Non è la fase di controllo");
      // COPIA ESATTA della logica mergeSelected di App.tsx SyncGame.
      const indices: number[] = Array.isArray(msg.indices) ? msg.indices : [];
      const valid = [...new Set(indices)]
        .filter((i) => Number.isInteger(i) && i >= 0 && i < game.sGroups.length)
        .sort((a, b) => a - b);
      if (valid.length < 2) return fail("INVALID", "Seleziona almeno 2 gruppi da unire");
      const selected = valid.map((i) => game.sGroups[i]!);
      // Solo gruppi con label non vuota (dopo normalizzazione) possono essere uniti.
      if (selected.some((g) => !normalized(g.label)))
        return fail("INVALID", "Non si possono unire gruppi con risposte vuote");
      const firstIndex = valid[0] ?? 0;
      const first = selected[0];
      if (!first) return fail("INVALID", "Gruppi non validi");
      const merged = { label: first.label, members: selected.flatMap((g) => g.members), points: 0 };
      const next: typeof game.sGroups = [];
      game.sGroups.forEach((g, i) => {
        if (i === firstIndex) next.push(merged);
        else if (!valid.includes(i)) next.push(g);
      });
      game.sGroups = next;
      return { ok: true, changed: true };
    }
    case "sConfirm": {
      if (!me.isHost) return fail("NOT_HOST", "Solo l'host può confermare i punteggi");
      if (game.kind !== "sintonia" || game.phase !== "sReview")
        return fail("BAD_PHASE", "Non è la fase di controllo");
      // COPIA ESATTA del confirm di App.tsx SyncGame: ricalcola i punti
      // (2 membri -> 3, 3+ -> 1, altrimenti 0), li somma, vince chi raggiunge
      // il traguardo.
      const awarded = game.sGroups.map((group) => ({
        ...group,
        points: syncGroupPoints(group.members.length),
      }));
      game.sGroups = awarded;
      for (const group of awarded) {
        for (const member of group.members) {
          game.scores[member] = (game.scores[member] ?? 0) + group.points;
        }
      }
      const finished = game.scores.some((score) => score >= game.sTarget);
      game.phase = finished ? "sWinner" : "sReveal";
      game.phaseEndsAt = null;
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

  if (msg.kind === "sintonia") return intentStartSintonia(room, seat, msg, now);

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
    kind: "scribble",
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
    sMode: "pass",
    sTarget: 25,
    sPack: "base",
    sPrompt: "",
    sAnswers: [],
    sGroups: [],
  };
  room.game = game;
  if (mode === "mute") startMuteRound(game, players, now);
  else startAuthorPhase(game, players, now);
  return { ok: true, changed: true };
}

// ---------------------------------------------------------------------------
// Sintonia: avvio partita (kind === "sintonia").
// ---------------------------------------------------------------------------
function intentStartSintonia(room: Room, seat: number, msg: any, now: number): IntentResult {
  const sMode: SintoniaResponseMode = msg.sMode === "paper" ? "paper" : "pass";
  const target = Number.isInteger(msg.target) ? msg.target : 25;
  if (target < 10 || target > 50) return fail("INVALID", "Traguardo non valido (10-50)");
  const sPack: SintoniaPack = msg.pack === "premium" ? "premium" : "base";
  if (sPack === "premium" && !room.hostPremium)
    return fail("INVALID", "Mazzo Premium: solo l'host premium può sceglierlo");

  const players = room.seats.length;
  const game: MPGame = {
    kind: "sintonia",
    mode: "rounds", // placeholder, non usato (il client usa `kind`)
    chains: 1,
    timer: 0,
    theme: "",
    hostPremium: room.hostPremium,
    roundIndex: 1,
    scores: Array.from({ length: players }, () => 0),
    phase: "sAnswer",
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
    sMode,
    sTarget: target,
    sPack,
    sPrompt: "",
    sAnswers: [],
    sGroups: [],
  };
  room.game = game;
  startSintoniaRound(game, players);
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
      chat: room.chat.map((m) => ({ ...m })),
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
    kind: game.kind,
    mode: game.mode,
    roundIndex: game.roundIndex,
    totalRounds: game.kind === "sintonia" ? null : game.mode === "rounds" ? game.chains : null,
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
      game.kind === "sintonia"
        ? `Round ${game.roundIndex}`
        : game.mode === "rounds"
          ? `Catena ${game.roundIndex} di ${game.chains}`
          : game.mode === "mute"
            ? `Catena muta ${game.roundIndex}`
            : `Catena ${game.roundIndex}`,
  };

  const pendingNames = (indices: number[]): string[] =>
    indices.filter((i) => room.seats[i]?.connected).map((i) => seatName(room, i));

  // View dei gruppi Sintonia con nomi dei membri (niente risposte nascoste qui).
  const sintoniaGroupsView = () =>
    game.sGroups.map((gr) => ({
      label: gr.label,
      members: gr.members.map((m) => seatName(room, m)),
      points: gr.points,
    }));

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
    case "sAnswer": {
      // DISCIPLINA DEI SEGRETI: ognuno vede solo se HA inviato la risposta,
      // mai le parole altrui (rivelate solo da sReview in poi).
      const submitted = game.sAnswers[seat] !== null;
      myTurn = connected && !submitted;
      pending = pendingNames(room.seats.map((_, i) => i).filter((i) => game.sAnswers[i] === null));
      prompt = { kind: "text", value: game.sPrompt };
      g.sPrompt = game.sPrompt;
      g.sTarget = game.sTarget;
      g.sMode = game.sMode;
      g.sSubmitted = submitted;
      break;
    }
    case "sReview": {
      myTurn = false;
      pending = [];
      g.sPrompt = game.sPrompt;
      g.sTarget = game.sTarget;
      g.sMode = game.sMode;
      g.sGroups = sintoniaGroupsView();
      g.sCanReview = !!me?.isHost;
      break;
    }
    case "sReveal": {
      myTurn = false;
      pending = [];
      g.sPrompt = game.sPrompt;
      g.sTarget = game.sTarget;
      g.sMode = game.sMode;
      g.sGroups = sintoniaGroupsView();
      g.canAdvance = !!me?.isHost;
      break;
    }
    case "sWinner": {
      myTurn = false;
      pending = [];
      g.sPrompt = game.sPrompt;
      g.sTarget = game.sTarget;
      g.sMode = game.sMode;
      g.sGroups = sintoniaGroupsView();
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
