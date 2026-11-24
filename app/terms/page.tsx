import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { PRIVACY_POLICY_PATH } from "@/lib/legal/routes";

export default function TermsOfUsePage() {
  return (
    <LegalPage title="Användarvillkor" lastUpdated="21 november 2026">
      <p>
        Sjung är ett notbibliotek för körer och andra grupper. Genom att skapa ett konto godkänner du de här villkoren.
        Hur vi hanterar personuppgifter står i vår <Link href={PRIVACY_POLICY_PATH}>integritetspolicy</Link>.
      </p>
      <ul>
        <li>
          Ladda bara upp filer du har rätt att lagra digitalt. Noter och inspelningar skyddas ofta av upphovsrätt, och
          att du har köpt ett tryckt exemplar betyder inte alltid att du får skanna in och lagra det.
        </li>
        <li>
          Lägg bara in uppgifter om andra – upphovspersoner, e-postadresser du bjuder in och anteckningar – när gruppens
          arbete behöver dem. Du ansvarar för det du lägger in.
        </li>
        <li>
          Sjung tillhandahålls i befintligt skick. Vi lovar inte att tjänsten alltid är tillgänglig eller att uppgifter
          och filer alltid finns kvar, så spara egna kopior av det som är viktigt för dig.
        </li>
        <li>Innehåll eller konton som bryter mot villkoren kan tas bort eller stängas.</li>
      </ul>
    </LegalPage>
  );
}
