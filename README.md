# Träningsloggen

Kontinuitet idag – starkare imorgon. Personlig träningsapp byggd kring Thomas 4-dagars styrkeprogram.

## Version 1 innehåller

- Inloggning med e-post via Netlify Identity (bara inbjudna användare, var och en får egen data)
- Dag 1–4 med bilder, mål, vila och teknik för alla 24 övningar
- Set-logg per övning (vikt och reps), förifyllt från förra passet
- Automatisk höjning 2,5–5 % när du klarat övre rep-antalet i alla set
- Utveckling per pass, vecka, månad och år samt kurva och historik
- Passtimer, vilotimer som vibrerar och skärmen hålls tänd under passet
- Uppvärmning med typ, minuter och kalorier
- Startsida med veckostatus, veckoschema, nästa pass, träningstid och rekord
- Profil med namn, längd, vägningar, veckoschema och säkerhetskopia
- Fungerar offline på gymmet och synkar när nätet är tillbaka

Kalorier räknas som MET × kroppsvikt × timmar (styrka MET 5). Räkna med ±20–30 %.

## Mappar

```
public/                 själva appen (publiceras)
  index.html, app.js, program.js, styles.css, sw.js, manifest.webmanifest
  img/                  övningsbilder d1-1.jpg … d4-6.jpg
  icons/                appikoner
netlify/functions/data.mjs   sparar data per användare i Netlify Blobs
netlify.toml, package.json
```

Programmet (övningar, set, vila, tips) ligger i `public/program.js`.
Byt en bild genom att ersätta filen i `public/img/` med samma namn.

## Publicera

1. Skapa repot `thomasloow/traningsloggen` på GitHub och ladda upp allt innehåll i den här mappen.
2. Netlify: Add new project → Import from GitHub → välj repot. Inga byggkommandon behövs, `netlify.toml` sköter inställningarna.
3. Döp sajten, till exempel `loow-traningsloggen`.
4. Project configuration → Identity → Enable Identity.
5. Registration preferences → Invite only.
6. Invite users → thomas@helpbyus.com. Öppna länken i mejlet och välj lösenord.
7. Samsung: öppna sajten i Chrome → meny ⋮ → Lägg till på startskärmen / Installera app.
   Inställningar → Appar → Chrome → Batteri → Obegränsad, så att framtida notiser kommer i tid.

Netlify Blobs behöver ingen egen inställning.
