const ASSET_BASE = "/assets";

export const ASSETS = {
  ucadma: `${ASSET_BASE}/logos/logo-ucadma.png`,
  ad: `${ASSET_BASE}/logos/logo-ad.png`,
  cartaz: `${ASSET_BASE}/banners/cartaz-tema.png`,
  ebf: `${ASSET_BASE}/banners/ebf-splash.png`,
};

export function LogoUCADMA({ className = "h-16 w-16" }: { className?: string }) {
  return <img src={ASSETS.ucadma} alt="UCADMA Marupaúba" className={className} loading="lazy" />;
}

export function LogoAD({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <img
      src={ASSETS.ad}
      alt="Assembleia de Deus Campo Marupaúba"
      className={className}
      loading="lazy"
    />
  );
}
