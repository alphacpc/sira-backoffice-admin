import { Breadcrumb } from "./breadcrumb";

export function Topbar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card px-6">
      <Breadcrumb />
    </header>
  );
}
