import { CompanySignUpForm } from "@/components/CompanySignUpForm";
import { LegalPagePlaceholder } from "@/components/LegalPagePlaceholder";
import { isCompanySignUpEnabled } from "@/utils/featureFlags";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Registra la tua azienda | Alètheia4Job",
  description: "Crea il tuo spazio dedicato su Alètheia4Job per pubblicare annunci e gestire le candidature della tua azienda.",
  alternates: { canonical: '/aziende/registrati' },
  robots: isCompanySignUpEnabled() ? undefined : { index: false, follow: false },
};

export default function CompanySignUpPage() {
  if (!isCompanySignUpEnabled()) {
    return <LegalPagePlaceholder title="Registrazione aziendale in arrivo" />;
  }
  return <CompanySignUpForm />;
}
