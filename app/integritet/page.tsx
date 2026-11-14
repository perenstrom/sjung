import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { TERMS_OF_USE_PATH } from "@/lib/legal/routes";

const PRIVACY_CONTACT_EMAIL = "integritet@sjung.app";

function ContactLink() {
  return <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a>;
}

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Integritetspolicy" lastUpdated="14 november 2026">
      <p>
        Här beskriver vi vilka personuppgifter Sjung sparar, varför, vilka som hjälper oss att hantera dem och hur du
        får dem raderade. Reglerna för att använda tjänsten står i{" "}
        <Link href={TERMS_OF_USE_PATH}>användarvillkoren</Link>.
      </p>

      <h2>Vem som ansvarar</h2>
      <p>
        Sjung drivs av Per Enström som privatperson, och han är personuppgiftsansvarig. Frågor om dina personuppgifter
        skickar du till <ContactLink />.
      </p>

      <h2>Vilka uppgifter vi sparar</h2>
      <ul>
        <li>
          <strong>Ditt konto:</strong> namn, e-postadress, lösenord och om du har bekräftat e-postadressen. Lösenordet
          sparas bara som en hash, så ingen kan läsa det.
        </li>
        <li>
          <strong>Inbjudningar:</strong> e-postadressen som bjuds in till en grupp, även om personen inte har något
          konto, och vem som skickade inbjudan.
        </li>
        <li>
          <strong>Gruppens innehåll:</strong> det gruppens medlemmar lägger in – noter, repertoarer, länkar,
          anteckningar och uppladdade filer, och vem som skapade eller senast ändrade dem. Personer i medverkande
          sparas bara med namn och roll, aldrig med kontaktuppgifter.
        </li>
        <li>
          <strong>Feedback:</strong> när du skickar feedback mejlas meddelandet till oss tillsammans med ditt namn, din
          e-postadress, sidan och gruppen du var på och vilken webbläsare du använder.
        </li>
        <li>
          <strong>Cookies:</strong> cookies som behövs för att du ska kunna logga in och hållas inloggad, och en som
          kommer ihåg vilken grupp du senast valde. Alla behövs för att tjänsten ska fungera. Sjung använder ingen statistik, spårning eller annonser.
        </li>
      </ul>

      <h2>Varför vi får spara dem</h2>
      <p>
        Uppgifterna om dig som har ett konto behövs för att ge dig tjänsten du har registrerat dig för (avtal).
        E-postadresser till inbjudna som inte har något konto, och namn på personer i medverkande, sparas för att gruppen har
        ett berättigat intresse av att kunna bjuda in nya medlemmar och hålla ordning på sina noter.
      </p>

      <h2>Vilka som hjälper oss</h2>
      <p>Alla personuppgifter lagras och behandlas inom EU, hos de här personuppgiftsbiträdena:</p>
      <ul>
        <li>
          <strong>Hetzner</strong> – server och databas, i Helsingfors, Finland.
        </li>
        <li>
          <strong>Cloudflare R2</strong> – uppladdade filer, i en lagringsplats som hålls inom EU.
        </li>
        <li>
          <strong>Resend</strong> – utskick av e-post, från Irland.
        </li>
      </ul>
      <p>
        Cloudflare och Resend är amerikanska företag. Båda är certifierade enligt EU–US Data Privacy Framework.
      </p>
      <p>
        Medlemmarna i en grupp ser varandras namn och e-postadresser. Utöver det och biträdena ovan lämnar vi inte ut
        personuppgifter till någon, och vi säljer dem aldrig.
      </p>

      <h2>Hur länge vi sparar dem och hur du får dem raderade</h2>
      <p>
        Vi sparar dina uppgifter så länge du har ett konto. Du tar själv bort ditt konto under <em>Ta bort konto</em>{" "}
        på din kontosida och bekräftar med ditt lösenord. Då händer det här:
      </p>
      <ul>
        <li>Ditt namn, din e-postadress och ditt lösenord raderas direkt, och du loggas ut överallt.</li>
        <li>
          Det du har lagt in i en grupp tillhör gruppen och finns kvar, men visas inte längre som ditt – där ditt namn
          stod står det <em>Borttagen användare</em>.
        </li>
        <li>Grupper där du har skapat gruppen och är den enda medlemmen raderas, med allt innehåll och alla filer.</li>
        <li>
          Har du skapat en grupp som har andra medlemmar kan du inte ta bort kontot förrän du har tagit bort den
          gruppen.
        </li>
        <li>Inbjudningar som har skickats till din e-postadress finns kvar hos gruppen som skickade dem.</li>
        <li>Du får ett kvitto på e-post precis innan adressen raderas.</li>
      </ul>
      <p>
        En inbjudan som inte har tagits emot finns kvar tills gruppen tar tillbaka den, och en mottagen inbjudan finns
        kvar så länge gruppen finns. Innehåll och filer raderas när någon i gruppen tar bort dem.
      </p>
      <p>
        Vissa uppgifter finns utanför Sjungs databas och raderas inte när du tar bort kontot. Dem tar vi bort för hand
        om du hör av dig till <ContactLink />:
      </p>
      <ul>
        <li>feedback du har skickat, som finns kvar i vår inkorg med din e-postadress</li>
        <li>e-postleverantörens loggar över mejl som har skickats till dig</li>
      </ul>

      <h2>Dina rättigheter</h2>
      <p>
        Du har rätt att få veta vilka uppgifter vi har om dig, att få fel rättade, att få uppgifterna raderade och att
        invända mot att vi behandlar dem. Mejla <ContactLink /> så hjälper vi dig. Om du
        tycker att vi hanterar dina uppgifter fel kan du klaga hos Integritetsskyddsmyndigheten (IMY).
      </p>

      <h2>Ändringar</h2>
      <p>
        Ändras policyn uppdaterar vi den här sidan och datumet högst upp. Vi meddelar inte ändringar på något annat
        sätt.
      </p>
    </LegalPage>
  );
}
