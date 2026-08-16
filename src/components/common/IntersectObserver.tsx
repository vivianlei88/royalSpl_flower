import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Observer } from 'tailwindcss-intersect';

const IntersectObserver = () => {
  const location = useLocation();

  useEffect(() => {
    // Remove tailwindcss-intersect observer code entirely for now since it's failing
    const timer = setTimeout(() => {
        Observer.start();
    }, 100);

    return () => clearTimeout(timer);
  }, [location]);

  return null;
};

export default IntersectObserver;
