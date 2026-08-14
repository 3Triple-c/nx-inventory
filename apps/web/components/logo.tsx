import { useId } from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
  variant?: "gradient" | "mono";
  glow?: boolean;
}

export function Logo({
  className,
  size = 24,
  variant = "gradient",
  glow = false,
}: LogoProps) {
  const id = useId();

  const gradientId = `${id}-gradient`;
  const glowId = `${id}-glow`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 951 1003"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="140"
          y1="120"
          x2="820"
          y2="900"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="45%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>

        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d="M757 371L742 361L722 360L698 369L678 384L657 409L638 443L626 475L617 509L589 441L576 415L555 384L538 368L518 360L503 360L494 363L477 362L458 369L441 381L430 392L436 437L436 508L429 591L421 648L407 573L390 508L371 456L344 407L316 377L290 364L263 362L236 372L220 387L212 400L206 415L201 442L200 461L205 462L210 452L222 442L238 441L246 445L245 469L241 491L218 573L205 634L202 682L204 701L211 720L229 738L244 744L258 745L281 737L293 727L302 712L305 701L305 689L293 663L289 639L289 594L298 514L300 474L313 497L324 523L342 581L363 663L374 694L389 720L406 736L427 744L467 746L482 742L506 727L527 704L546 672L557 643L565 608L602 692L613 710L628 728L649 742L666 746L687 744L700 738L715 724L727 702L735 670L737 634L731 634L727 649L719 657L706 659L696 655L684 643L669 620L634 549L644 529L657 510L683 486L694 480L713 475L727 475L750 481L762 454L769 418L766 389Z"
        fill={variant === "gradient" ? `url(#${gradientId})` : "currentColor"}
        filter={glow ? `url(#${glowId})` : undefined}
      />
    </svg>
  );
}
