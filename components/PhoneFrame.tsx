import Image from "next/image";
import { Icon } from "@/components/icons";

export default function PhoneFrame({
  src,
  alt,
  badge,
  className = "",
}: {
  src: string;
  alt: string;
  badge?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="relative">
        <div className="rounded-[2.6rem] border border-primary/10 bg-primary-deep p-2.5 shadow-[0_32px_80px_-32px_rgb(13_18_38/0.45)]">
          <div className="overflow-hidden rounded-[2.1rem]">
            <Image
              src={src}
              alt={alt}
              width={820}
              height={1576}
              className="h-auto w-full"
            />
          </div>
        </div>
        {badge && (
          <div className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-primary shadow-[var(--shadow-soft)]">
            <Icon name="check" className="h-3.5 w-3.5 text-accent-dark" />
            {badge}
          </div>
        )}
      </div>
    </div>
  );
}
