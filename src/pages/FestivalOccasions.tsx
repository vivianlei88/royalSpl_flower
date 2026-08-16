import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Helmet } from 'react-helmet-async';
import { getSiteContent } from '@/services/api';

const festivalCategories = [
  {
    id: 'birthday',
    title: '生日專屬花束 Birthday Bouquet',
    image: 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?q=80&w=800&auto=format&fit=crop',
    link: '/products?category=birthday'
  },
  {
    id: 'elders',
    title: '送長輩溫柔花束 For Elders',
    image: 'https://images.unsplash.com/photo-1526045612212-70caf35c14df?q=80&w=800&auto=format&fit=crop',
    link: '/products?category=elders'
  },
  {
    id: 'friendship',
    title: '閨蜜友誼小花束 Friendship',
    image: 'https://images.unsplash.com/photo-1562690868-60bbe7293e94?q=80&w=800&auto=format&fit=crop',
    link: '/products?category=friendship'
  },
  {
    id: 'christmas-newyear',
    title: '圣诞新年花礼',
    image: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?q=80&w=800&auto=format&fit=crop',
    link: '/products?category=christmas'
  }
];

export default function FestivalOccasions() {
  const [template, setTemplate] = useState('minimal');

  useEffect(() => {
    async function loadConfig() {
      const content = await getSiteContent();
      setTemplate(content.active_template || 'minimal');
    }
    loadConfig();
  }, []);

  return (
    <>
      <Helmet>
        <title>節慶場合 | RoyalSpl Flower</title>
        <meta name="description" content="為您的每一個特別時刻準備的專屬花禮，包含生日、送長輩、友誼及聖誕新年花束。" />
      </Helmet>
      
      {/* Header Banner */}
      <div className={`w-full py-16 md:py-24 flex items-center justify-center relative ${
        template === 'dark' ? 'bg-slate-900 text-white' : 
        template === 'elegant' ? 'bg-rose-50 text-rose-900' : 
        template === 'vibrant' ? 'bg-amber-100 text-amber-900' : 
        template === 'nature' ? 'bg-emerald-50 text-emerald-900' : 
        'bg-slate-50 text-slate-900'
      }`}>
        <div className="container mx-auto px-4 text-center z-10">
          <h1 className={`text-3xl md:text-5xl mb-4 ${template === 'elegant' ? 'font-serif' : 'font-bold'}`}>
            節慶場合
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-80">
            讓每一束花為您的特殊時刻增添動人色彩
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {festivalCategories.map((category) => (
            <Link key={category.id} to={category.link} className="group block h-full">
              <Card className={`overflow-hidden h-full transition-all duration-300 ${
                template === 'dark' ? 'bg-slate-800 border-slate-700 hover:border-slate-500' : 
                'hover:shadow-lg'
              }`}>
                <div className="aspect-[4/3] w-full overflow-hidden relative">
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300 z-10" />
                  <img 
                    src={category.image} 
                    alt={category.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-6 z-20 bg-gradient-to-t from-black/80 to-transparent">
                    <h3 className="text-white text-xl md:text-2xl font-semibold tracking-wide">
                      {category.title}
                    </h3>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
