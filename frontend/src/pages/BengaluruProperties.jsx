import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import PropertiesList from '@/pages/PropertiesList';
import { Helmet } from 'react-helmet-async';

const BengaluruProperties = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Ensure city filter includes Bengaluru variants on first render
  // eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
    const city = searchParams.get('city');
    if (!city) {
      // Regex matching Bengaluru and Bangalore (case‑insensitive)
      searchParams.set('city', 'Bengaluru|Bangalore');
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  return (
    <>
      <Helmet>
        <title>Properties in Bengaluru | Visit Sarva</title>
        <meta
          name="description"
          content="Explore residential and commercial properties available across Bengaluru with Visit Sarva."
        />
        <link rel="canonical" href="https://www.visitsarva.com/bengaluru-properties" />
        <meta property="og:title" content="Properties in Bengaluru | Visit Sarva" />
        <meta
          property="og:description"
          content="Explore residential and commercial properties available across Bengaluru with Visit Sarva."
        />
        <meta property="og:url" content="https://www.visitsarva.com/bengaluru-properties" />
        <meta property="og:type" content="website" />
      </Helmet>
      <PropertiesList />
    </>
  );
};

export default BengaluruProperties;
