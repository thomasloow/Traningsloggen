// Thomas 4-dagars styrkeprogram. reps = [min, max]. perSide = reps per ben/sida.
export const PROGRAM = [
  {
    id: 'd1', name: 'Dag 1 – Överkropp press', short: 'Överkropp press', focus: 'Bröst, axlar, triceps',
    warmup: '5–7 min lätt kondition + rörlighet för axlar och bröstrygg.',
    exercises: [
      { id: 'd1e1', name: 'Bröstpress med skivstång', muscles: 'Bröst, framaxel, triceps', sets: 4, reps: [6, 8], rest: 90, tip: 'Skulderblad bak, fötter i golvet, kontrollerad sänkning.', img: 'img/d1-1.jpg' },
      { id: 'd1e2', name: 'Bröstpress i maskin', muscles: 'Bröst, framsida axel, triceps', sets: 4, reps: [8, 10], rest: 75, tip: 'Sänk kontrollerat, pressa upp kraftfullt, håll skuldrorna stabila mot ryggstödet.', img: 'img/d1-2.jpg' },
      { id: 'd1e3', name: 'Sittande axelpress', muscles: 'Axlar, triceps', sets: 3, reps: [8, 10], rest: 75, tip: 'Spänn bålen, pressa rakt upp utan att svanka.', img: 'img/d1-3.jpg' },
      { id: 'd1e4', name: 'Pec deck / chest fly', muscles: 'Bröst', sets: 3, reps: [10, 12], rest: 60, tip: 'Mjuk armbåge, samla armarna framför kroppen.', img: 'img/d1-4.jpg' },
      { id: 'd1e5', name: 'Hantellyft åt sidan', muscles: 'Sida axlar', sets: 3, reps: [12, 15], rest: 60, tip: 'Lyft till axelhöjd, kontrollerat tempo.', img: 'img/d1-5.jpg' },
      { id: 'd1e6', name: 'Triceps pushdown med rep', muscles: 'Triceps', sets: 3, reps: [10, 12], rest: 60, tip: 'Armbågar nära kroppen, full sträckning i botten.', img: 'img/d1-6.jpg' }
    ]
  },
  {
    id: 'd2', name: 'Dag 2 – Underkropp styrka', short: 'Underkropp styrka', focus: 'Ben, säte, bål',
    warmup: '5–7 min lätt cykel/gång + rörlighet för höft, fotled och bål.',
    exercises: [
      { id: 'd2e1', name: 'Benpress', muscles: 'Framsida lår, säte', sets: 4, reps: [6, 8], rest: 90, tip: 'Pressa genom hela foten, kontrollerad bottenposition.', img: 'img/d2-1.jpg' },
      { id: 'd2e2', name: 'Rumänska marklyft med stång', muscles: 'Baksida lår, säte, rygg', sets: 4, reps: [6, 8], rest: 90, tip: 'Höft bak, rak rygg, stången nära kroppen.', img: 'img/d2-2.jpg' },
      { id: 'd2e3', name: 'Bulgariska utfall', muscles: 'Ben, säte', sets: 3, reps: [8, 8], perSide: 'ben', rest: 75, tip: 'Långsam sänkning, tryck upp genom främre hälen.', img: 'img/d2-3.jpg' },
      { id: 'd2e4', name: 'Liggande lårcurl (maskin)', muscles: 'Baksida lår', sets: 3, reps: [10, 12], rest: 60, tip: 'Håll höften stilla, full kontakt i toppläget.', img: 'img/d2-4.jpg' },
      { id: 'd2e5', name: 'Stående vadpress', muscles: 'Vader', sets: 3, reps: [12, 15], rest: 60, tip: 'Full stretch i botten, paus i toppläget.', img: 'img/d2-5.jpg' },
      { id: 'd2e6', name: 'Pallof press i kabel', muscles: 'Bål', sets: 3, reps: [10, 12], perSide: 'sida', rest: 45, tip: 'Spänn bålen och håll kroppen helt stilla.', img: 'img/d2-6.jpg' }
    ]
  },
  {
    id: 'd3', name: 'Dag 3 – Överkropp drag', short: 'Överkropp drag', focus: 'Rygg, baksida axlar, biceps',
    warmup: '5–7 min lätt kondition + rörlighet för skuldror och bröstrygg.',
    exercises: [
      { id: 'd3e1', name: 'Latsdrag', muscles: 'Lats, övre rygg, biceps', sets: 4, reps: [6, 8], rest: 90, tip: 'Dra armbågarna nedåt, lyft bröstet mot stången.', img: 'img/d3-1.jpg' },
      { id: 'd3e2', name: 'Sittande kabelrodd', muscles: 'Rygg, lats, biceps', sets: 4, reps: [8, 10], rest: 75, tip: 'Dra in handtaget mot magen, skulderblad bak.', img: 'img/d3-2.jpg' },
      { id: 'd3e3', name: 'Bröststödd rodd med hantlar', muscles: 'Mitt rygg, baksida axlar', sets: 3, reps: [8, 10], rest: 75, tip: 'Bröstet kvar mot bänken, dra armbågarna bakåt.', img: 'img/d3-3.jpg' },
      { id: 'd3e4', name: 'Face pull i kabel', muscles: 'Baksida axlar, övre rygg', sets: 3, reps: [12, 15], rest: 60, tip: 'Dra repet mot ansiktet, armbågar högt.', img: 'img/d3-4.jpg' },
      { id: 'd3e5', name: 'EZ-curl stående', muscles: 'Biceps', sets: 3, reps: [8, 10], rest: 60, tip: 'Överarmarna stilla, full kontroll hela vägen.', img: 'img/d3-5.jpg' },
      { id: 'd3e6', name: 'Hammercurl', muscles: 'Biceps, underarm', sets: 3, reps: [10, 12], rest: 60, tip: 'Neutral handled, lyft utan att gunga kroppen.', img: 'img/d3-6.jpg' }
    ]
  },
  {
    id: 'd4', name: 'Dag 4 – Underkropp + extra volym', short: 'Underkropp + extra volym', focus: 'Ben, säte, baksida lår',
    warmup: '5–7 min lätt cykel/gång + rörlighet för höft, knä och bål.',
    exercises: [
      { id: 'd4e1', name: '45° ryggresning med sätesfokus', muscles: 'Säte, baksida lår', sets: 4, reps: [10, 12], rest: 75, tip: 'Runda lätt i toppen, driv höften fram och spänn sätet.', img: 'img/d4-1.jpg' },
      { id: 'd4e2', name: 'Hack squat / smith squat', muscles: 'Framsida lår, säte', sets: 4, reps: [8, 10], rest: 90, tip: 'Djupt så långt du kontrollerar, knän följer tårna.', img: 'img/d4-2.jpg' },
      { id: 'd4e3', name: 'Step-up med hantlar', muscles: 'Ben, säte', sets: 3, reps: [10, 10], perSide: 'ben', rest: 75, tip: 'Tryck genom hälen, undvik att skjuta ifrån med bakre benet.', img: 'img/d4-3.jpg' },
      { id: 'd4e4', name: 'Benspark (maskin)', muscles: 'Framsida lår', sets: 3, reps: [12, 15], rest: 60, tip: 'Kontrollerad topp, sänk långsamt.', img: 'img/d4-4.jpg' },
      { id: 'd4e5', name: 'Sittande lårcurl (maskin)', muscles: 'Baksida lår', sets: 3, reps: [12, 15], rest: 60, tip: 'Håll överkroppen stilla, full stretch i botten.', img: 'img/d4-5.jpg' },
      { id: 'd4e6', name: 'Kabelcrunch', muscles: 'Bål', sets: 3, reps: [12, 15], rest: 45, tip: 'Runda överkroppen kontrollerat och andas ut i botten.', img: 'img/d4-6.jpg' }
    ]
  }
];

// MET-värden (Compendium of Physical Activities, avrundade). kcal = MET × kg × timmar.
export const STRENGTH_MET = 5.0;
export const WARMUPS = [
  { id: 'walk', name: 'Löpband, gång 5 km/h', met: 3.5 },
  { id: 'jog', name: 'Löpband, jogg 8 km/h', met: 8.3 },
  { id: 'bike', name: 'Cykel, lätt', met: 4.0 },
  { id: 'spin', name: 'Spinning', met: 7.5 },
  { id: 'cross', name: 'Crosstrainer', met: 5.0 },
  { id: 'row', name: 'Roddmaskin', met: 7.0 },
  { id: 'circuit', name: 'Cirkelträning', met: 8.0 },
  { id: 'mobility', name: 'Rörlighet / stretch', met: 2.5 }
];

export const GOAL_DATE = '2026-12-01';
