import { Helmet } from "react-helmet-async";
import { useBrand } from "@/hooks/useBrand";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  canonicalUrl?: string;
  children?: React.ReactNode;
}

export function SEO({ title, description, image, url, type = "website", canonicalUrl, children }: SEOProps) {
  const { brand } = useBrand();
  const SITE_NAME = brand.platform_name;
  const DEFAULT_DESCRIPTION = `Find verified property listings across the United States — buy, rent, or invest with trusted agents on ${SITE_NAME}.`;
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Find Your Next Property in the US`;
  const desc = description || DEFAULT_DESCRIPTION;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {image && <meta property="og:image" content={image} />}
      {url && <meta property="og:url" content={url} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {image && <meta name="twitter:image" content={image} />}
      {children}
    </Helmet>
  );
}
