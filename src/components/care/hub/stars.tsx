import { Star } from "@phosphor-icons/react/dist/ssr";

export function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Note ${rating} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} weight={i <= Math.round(rating) ? "fill" : "regular"} aria-hidden className={i <= Math.round(rating) ? "text-amber-400" : "text-muted-foreground/40"} />)}
    </span>
  );
}
