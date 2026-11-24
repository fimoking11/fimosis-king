// Las 17 cartas de Fimosis King. Para cambiar nombre, rareza o texto, edita aquí.
// Si añades cartas nuevas, añade también su id en firestore.rules.
export const RARITY = {
  comun:      { name: "Común",      weight: 10 },
  rara:       { name: "Rara",       weight: 6 },
  epica:      { name: "Épica",      weight: 3 },
  legendaria: { name: "Legendaria", weight: 1 }
};
export const CARDS = [
  { id: "fichaje",      name: "Bienvenido, Fimo King", r: "legendaria", t: "El fichaje que lo cambió todo." },
  { id: "poster",       name: "Fichado por el Betis",  r: "legendaria", t: "Regate, grada y corona." },
  { id: "tiburon",      name: "Jinete del tiburón",    r: "legendaria", t: "Domar el mar es lo suyo." },
  { id: "espaldas",     name: "El dorsal del rey",     r: "epica", t: "Se señala a sí mismo. Con razón." },
  { id: "rodillas",     name: "De rodillas, gol",      r: "epica", t: "Cuando marca, la grada tiembla." },
  { id: "silencio",     name: "Silencio, por favor",   r: "epica", t: "Celebra sin hacer ruido." },
  { id: "montana-rusa", name: "Sin frenos",            r: "epica", t: "Manos arriba y a disfrutar." },
  { id: "tortuga",      name: "Amigo de las tortugas", r: "rara", t: "Cuida de los que van despacio." },
  { id: "abuela",       name: "Cruzando con la abuela",r: "rara", t: "Su lado humano, paso a paso." },
  { id: "vagabundo",    name: "Manos que ayudan",      r: "rara", t: "Ayuda sin hacer ruido." },
  { id: "arespro",      name: "Con Ares Pro",          r: "rara", t: "Siempre hay sitio en el banco." },
  { id: "patatas",      name: "Modo grada",            r: "comun", t: "Partido y bolsa de patatas." },
  { id: "bluelock",     name: "Lector de Blue Lock",   r: "comun", t: "Estudia al rival en el sofá." },
  { id: "cafelito",     name: "Cafelito de la mañana", r: "comun", t: "Primero café, luego fútbol." },
  { id: "cocinando",    name: "Chef Fimo",             r: "comun", t: "Se concentra como en un penalti." },
  { id: "consola",      name: "Noche de consola",      r: "comun", t: "Descanso del guerrero." },
  { id: "supermercado", name: "La compra semanal",     r: "comun", t: "Hasta los reyes hacen la compra." }
];
