import { useEffect, useState } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { getSiteContent } from '@/services/api';
import { ChatWidget } from '@/components/common/ChatWidget';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [siteContent, setSiteContent] = useState<Record<string, string>>({});

  useEffect(() => {
    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      console.log("Global Promise Error:", event.reason);
    };
    window.addEventListener("unhandledrejection", unhandledRejectionHandler);

    async function loadContent() {
      const data = await getSiteContent();
      setSiteContent(data);
    }
    loadContent();
    const errorHandler = (event: ErrorEvent) => {
      console.log("Global Error:", event.error?.message || event.message, event.error?.stack);
    };
    window.addEventListener("error", errorHandler);
    return () => {
        window.removeEventListener("error", errorHandler);
        window.removeEventListener("unhandledrejection", unhandledRejectionHandler);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer siteContent={siteContent} />
      <ChatWidget />
    </div>
  );
}
