import type { ServiceDomain } from "@/content/services";
import { Icon } from "@/components/icons";

export default function ServiceCard({ service }: { service: ServiceDomain }) {
  return (
    <article className="card-hover rounded-2xl border border-primary/10 bg-white p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/5">
        <Icon name={service.icon} className="h-5 w-5 text-accent" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-primary">
        {service.name}
      </h3>
      <p className="mt-2 text-sm text-primary/70">{service.summary}</p>
    </article>
  );
}
