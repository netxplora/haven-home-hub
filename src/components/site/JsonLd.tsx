import { Helmet } from "react-helmet-async";

const SITE_NAME = "Haven Home Hub";
const SITE_URL = typeof window !== "undefined" ? window.location.origin : "https://verdantestate.com";

/** Generate JSON-LD for a property listing (RealEstateListing schema) */
export function PropertyJsonLd({ property }: { property: any }) {
  if (!property) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    description: property.description?.slice(0, 300),
    url: `${SITE_URL}/properties/${property.slug}`,
    image: property.cover_image_url || undefined,
    datePosted: property.created_at,
    offers: {
      "@type": "Offer",
      price: property.price,
      priceCurrency: property.currency || "USD",
      availability: property.status === "available"
        ? "https://schema.org/InStock"
        : "https://schema.org/SoldOut",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: property.address || undefined,
      addressLocality: property.city || undefined,
      addressRegion: property.state || undefined,
      addressCountry: property.country || undefined,
    },
    ...(property.latitude && property.longitude
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: property.latitude,
            longitude: property.longitude,
          },
        }
      : {}),
    numberOfRooms: property.bedrooms || undefined,
    floorSize: property.size_sqm
      ? {
          "@type": "QuantitativeValue",
          value: property.size_sqm,
          unitCode: "MTK",
        }
      : undefined,
    ...(property.year_built
      ? { yearBuilt: property.year_built }
      : {}),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

/** Generate JSON-LD for a blog post (Article schema) */
export function BlogPostJsonLd({ post }: { post: any }) {
  if (!post) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || post.content?.slice(0, 160),
    image: post.cover_image_url || undefined,
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at || post.created_at,
    url: `${SITE_URL}/blog/${post.slug}`,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${post.slug}`,
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

/** Generate JSON-LD for the organization (homepage) */
export function OrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: SITE_NAME,
    url: SITE_URL,
    description: "A trusted, agency-led real estate platform. Browse verified properties for sale, rent, and land.",
    sameAs: [],
    address: {
      "@type": "PostalAddress",
      addressCountry: "NG",
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
