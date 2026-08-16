import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw, BarChart3 } from 'lucide-react';
import { 
  getWixSeoData, 
  getWixGoogleAdsData, 
  getWixSocialAdsData, 
  getWixEmailData, 
  getWixSocialData, 
  getWixReferralData, 
  getWixGoogleBusinessData 
} from '@/services/wixApi';

interface Props {
  module: string;
}

export default function AdminWixMarketing({ module }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const moduleTitles: Record<string, string> = {
    'seo': 'SEO與GEO',
    'google-ads': 'Google廣告',
    'social-ads': 'Facebook與Instagram廣告',
    'email': '電子郵件行銷',
    'social': '社交媒體行銷',
    'referral': '推薦計劃',
    'google-business': 'Google商家檔案'
  };

  useEffect(() => {
    fetchData();
  }, [module]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let result;
      switch (module) {
        case 'seo': result = await getWixSeoData(); break;
        case 'google-ads': result = await getWixGoogleAdsData(); break;
        case 'social-ads': result = await getWixSocialAdsData(); break;
        case 'email': result = await getWixEmailData(); break;
        case 'social': result = await getWixSocialData(); break;
        case 'referral': result = await getWixReferralData(); break;
        case 'google-business': result = await getWixGoogleBusinessData(); break;
        default: throw new Error('Unknown module');
      }
      setData(result);
    } catch (err: any) {
      setError('無法連線至 Wix API。請檢查後端連線狀態。');
    } finally {
      setLoading(false);
    }
  };

  const renderModuleContent = () => {
    if (loading) return <div className="p-12 flex justify-center"><RefreshCw className="h-8 w-8 animate-spin text-primary" /></div>;
    if (error) return <div className="p-8 text-center text-red-500 flex flex-col items-center"><AlertCircle className="h-8 w-8 mb-2" />{error}</div>;
    if (!data) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {Object.entries(data).map(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            return (
              <Card key={key} className="col-span-full lg:col-span-2 shadow-sm border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base capitalize text-foreground">{key}</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded-md text-xs overflow-auto text-foreground border border-border">
                    {JSON.stringify(value, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            );
          }
          return (
            <Card key={key} className="shadow-sm border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{value?.toString()}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between items-start gap-2 border-b border-border pb-4">
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-500" />
          {moduleTitles[module]}
        </h1>
        <p className="text-muted-foreground text-sm">數據由後端安全連線即時同步，無須手動設定</p>
      </div>

      {renderModuleContent()}
    </div>
  );
}
