// PROTOTYPE (PER-430), throwaway. Fake Announcements, newest first. Bodies are
// Markdown as an Operator would write it.

export type PrototypeAnnouncement = {
  id: string;
  title: string;
  publishedAt: Date;
  body: string;
};

export const ANNOUNCEMENTS: PrototypeAnnouncement[] = [
  {
    id: "a1",
    title: "Nu kan du ladda upp flera filer på en gång",
    publishedAt: new Date("2026-11-14"),
    body: `Det har varit en av de mest efterfrågade sakerna i feedbacken: nu kan du dra in flera filer samtidigt på ett stycke.

## Så här gör du

1. Öppna stycket och slå på **Redigera**.
2. Dra in filerna, eller välj dem i filväljaren.
3. Varje fil laddas upp för sig, så du kan fortsätta arbeta medan de laddas.

Filer som redan finns med samma namn **ersätts inte** automatiskt. Du får frågan för varje fil.

## Annat smått och gott

- Filnamn som är för långa kortas nu av i mitten, så att filändelsen syns.
- Nedladdningar av PDF:er öppnas i en ny flik på mobilen.
- Ett fel där sorteringen i *Alla noter* ibland hoppade är åtgärdat.

Tack till alla som har skickat feedback. Fortsätt gärna med det via *Skicka feedback* längst ner i menyn.`,
  },
  {
    id: "a2",
    title: "Planerat underhåll söndag 23 november",
    publishedAt: new Date("2026-11-10"),
    body: `Söndag 23 november mellan **06:00 och 07:00** uppgraderar vi databasen. Sjung kan vara otillgängligt i upp till en timme.

Inget du har sparat försvinner. Har du en fil som laddas upp just då kan du behöva ladda upp den igen.`,
  },
  {
    id: "a3",
    title: "Behörigheter ersätter administratörer",
    publishedAt: new Date("2026-10-28"),
    body: `Tidigare kunde bara gruppens administratör bjuda in folk och ändra repertoaren. Nu kan administratören ge andra medlemmar **behörigheter**:

| Behörighet | Vad den ger |
| --- | --- |
| Hantera medlemmar | Bjuda in, ta bort medlemmar och ge behörigheter |
| Hantera innehåll | Skapa, ändra och ta bort stycken, repertoarer och upphovspersoner |

Du hittar det under **Medlemmar** i menyn. [Läs mer om hur behörigheter fungerar](#).`,
  },
  {
    id: "a4",
    title: "Anteckningar på stycken",
    publishedAt: new Date("2026-09-30"),
    body: `Nu kan du skriva anteckningar direkt på ett stycke, till exempel "börja piano, inte a cappella". De syns överallt där stycket finns med.`,
  },
  {
    id: "a5",
    title: "Sjung finns nu på mobilen",
    publishedAt: new Date("2026-09-12"),
    body: `Hela Sjung fungerar nu på mobilen. Menyn öppnar du med knappen uppe till vänster.`,
  },
  {
    id: "a6",
    title: "Välkommen till Sjung",
    publishedAt: new Date("2026-08-20"),
    body: `Sjung är ett verktyg för körer och ensembler att hålla ordning på noter, upphovspersoner och repertoarer. Här under *Nyheter* berättar vi när något nytt händer.`,
  },
];

/** First paragraph of the body, stripped of Markdown markers, for list excerpts. */
export function excerpt(body: string): string {
  const first = body.split("\n\n")[0] ?? "";
  return first.replace(/[*_#`[\]]/g, "").replace(/\(#\)/g, "");
}

export function formatPublished(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "long", year: "numeric" }).format(date);
}
