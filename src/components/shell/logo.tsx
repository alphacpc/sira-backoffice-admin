import Image from "next/image";

type LogoProps = { variant?: "horizontal" | "icon"; onDark?: boolean; className?: string; height?: number };

/** Sira logo. `onDark` picks the artwork meant for dark backgrounds. */
export function Logo({ variant = "horizontal", onDark = false, className, height = 32 }: LogoProps) {
  const src =
    variant === "icon"
      ? onDark ? "/images/sira-icon-dark.svg" : "/images/sira-icon.svg"
      : onDark ? "/images/sira-horizontal-dark.svg" : "/images/sira-horizontal.svg";
  const width = variant === "icon" ? height : Math.round((height * 420) / 120);
  return <Image src={src} alt="Sira" width={width} height={height} className={className} priority unoptimized />;
}

/** Light-theme and dark-theme artwork, swapped by the `dark` class on <html>. */
export function ThemedLogo({ height = 40, className }: { height?: number; className?: string }) {
  return (
    <>
      <Logo height={height} className={`dark:hidden ${className ?? ""}`} />
      <Logo height={height} onDark className={`hidden dark:block ${className ?? ""}`} />
    </>
  );
}
