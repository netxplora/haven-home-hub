export function runSchemaMapper(rawData: any) {
  // Normalize fields to the internal schema
  const mappedData = {
    title: rawData.title || '',
    price: rawData.price || 0,
    address: rawData.address || '',
    city: rawData.city || '',
    state: rawData.state || '',
    bedrooms: rawData.bedrooms || 0,
    bathrooms: rawData.bathrooms || 0,
    square_feet: rawData.square_feet || 0,
    description: rawData.description || '',
    interior_features: rawData.interior_features || [],
    exterior_features: rawData.exterior_features || [],
    gallery_images: rawData.gallery_images || [],
    cover_image_url: rawData.cover_image_url || ''
  };

  // Generate Confidence Scores based on field presence and validity
  const confidenceScores = {
    title: mappedData.title ? 100 : 0,
    price: mappedData.price > 0 ? 100 : 0,
    address: mappedData.address ? 90 : 0,
    city: mappedData.city ? 100 : 0,
    state: mappedData.state ? 100 : 0,
    features: (mappedData.interior_features.length + mappedData.exterior_features.length) > 0 ? 80 : 0,
    images: mappedData.gallery_images.length > 0 ? 90 : 0
  };

  return { data: mappedData, confidenceScores };
}
