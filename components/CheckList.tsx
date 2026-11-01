import { Icon } from "@/components/icons";

export default function CheckList({
  items,
  columns = true,
}: {
  items: string[];
  columns?: boolean;
}) {
  return (
    <ul className={columns ? "grid gap-3 sm:grid-cols-2" : "space-y-3"}>
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2.5 text-sm text-primary/80"
        >
          <Icon
            name="check"
            className="mt-0.5 h-4 w-4 shrink-0 text-accent-dark"
          />
          {item}
        </li>
      ))}
    </ul>
  );
}
