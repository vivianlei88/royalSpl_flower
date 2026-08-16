import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PageMeta from '@/components/common/PageMeta';

export default function NotFound() {
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center md:px-8">
      <PageMeta title="頁面不存在 | Royalspl Flower" description="您尋找的頁面不存在。" />
      <h1 className="text-6xl font-semibold text-foreground">404</h1>
      <p className="mt-4 text-xl text-muted-foreground">頁面不存在</p>
      <p className="mt-2 text-muted-foreground">您尋找的頁面不存在。</p>
      <Button asChild className="mt-8">
        <Link to="/">返回首頁</Link>
      </Button>
    </div>
  );
}
