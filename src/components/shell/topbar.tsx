import { LogOut } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "./breadcrumb";
import { CommandPalette } from "./command-palette";
import { ThemeToggle } from "./theme-toggle";

export function Topbar({ companies }: { companies: { id: string; name: string }[] }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6">
      <Breadcrumb />
      <div className="flex items-center gap-2">
        <CommandPalette companies={companies} />
        <ThemeToggle />
        <form action={logout}>
          <Button variant="ghost" size="sm" type="submit" aria-label="Se déconnecter">
            <LogOut size={16} />
          </Button>
        </form>
      </div>
    </header>
  );
}
