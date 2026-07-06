import { publicBrandName } from "@/lib/brand";

type BrandWordmarkProps = {
  className?: string;
  foilClassName?: string;
};

export function BrandWordmark({ className = "", foilClassName = "" }: BrandWordmarkProps) {
  return (
    <span className={`brand-wordmark inline-flex items-baseline whitespace-nowrap ${className}`} aria-label={publicBrandName}>
      <span className="text-white">Capitol</span>
      <span className={`brand-wordmark-foil ${foilClassName}`}>Wonk CE</span>
    </span>
  );
}
