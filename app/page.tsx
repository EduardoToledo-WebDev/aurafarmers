import AuraFarmersApp from "@/components/AuraFarmersApp";
import { I18nProvider } from "@/lib/i18n";

export default function Home() {
  return (
    <I18nProvider>
      <AuraFarmersApp />
    </I18nProvider>
  );
}
