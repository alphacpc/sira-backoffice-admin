import Image from "next/image";

const rotation = { left: "lg:-rotate-2", right: "lg:rotate-2" } as const;

/** Photo in a rounded card. Tilt only applies from `lg` so it never overflows on mobile. */
export function PhotoCard({
  src,
  alt,
  width,
  height,
  rotate,
  sizes = "(min-width: 1024px) 40vw, 90vw",
  priority = false,
  className = "",
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  rotate?: "left" | "right";
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-3xl bg-white shadow-lift ${rotate ? rotation[rotate] : ""} ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        className="block h-auto w-full"
      />
    </div>
  );
}
