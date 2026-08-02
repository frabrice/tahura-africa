export const LOGO_URL = "https://res.cloudinary.com/dbhyrnypc/image/upload/v1773397705/Favicon_msgzop.png";

interface LogoProps {
  height?: number | string;
  className?: string;
  alt?: string;
}

export function Logo({ height = 32, className = "", alt = "Tahura" }: LogoProps) {
  const h = typeof height === "number" ? `${height}px` : height;
  return (
    <img
      src={LOGO_URL}
      alt={alt}
      className={`w-auto object-contain ${className}`}
      style={{ height: h }}
      loading="eager"
    />
  );
}
