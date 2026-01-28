import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description }) {
  return (
    <Helmet>
      <title>{title} | SI Delivery</title>
      <meta name="description" content={description} />
      <meta name="geo.region" content="BR-SP" />
      <meta name="geo.placename" content="Santa Isabel" />
    </Helmet>
  );
}