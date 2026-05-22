import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { i18n } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-9 h-9">
          <Globe className="h-4 w-4" />
          <span className="sr-only">{i18n.t('nav.toggleLanguage', 'Toggle language')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem onClick={() => i18n.changeLanguage('en')} className="justify-between">
          English {i18n.language?.startsWith('en') && "✓"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => i18n.changeLanguage('es')} className="justify-between">
          Español {i18n.language?.startsWith('es') && "✓"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => i18n.changeLanguage('fr')} className="justify-between">
          Français {i18n.language?.startsWith('fr') && "✓"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
