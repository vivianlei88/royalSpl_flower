import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Flower2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import PageMeta from '@/components/common/PageMeta';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // 優先讀 URL query ?redirect=/xxx，其次讀 router state（RouteGuard 使用），最後預設到會員中心
  const redirectTo =
    searchParams.get('redirect') ||
    (location.state as { from?: string })?.from ||
    '/member';

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error('請輸入電子郵件和密碼。');
      return;
    }

    if (!agreed) {
      toast.error('請同意用戶協議及隱私政策。');
      return;
    }

    setLoading(true);
    const { error } = await signInWithEmail(email.trim(), password.trim());
    setLoading(false);

    if (error) {
      toast.error('電子郵件或密碼錯誤。');
      return;
    }

    toast.success('登入成功。');
    navigate(redirectTo, { replace: true });
  }

  async function handleGoogleLogin() {
    if (!agreed) {
      toast.error('請同意用戶協議及隱私政策。');
      return;
    }
    // Google OAuth 登入後由 AuthContext onAuthStateChange 處理，跳轉已在 signInWithGoogle 的 redirectTo 設定
    await signInWithGoogle(redirectTo);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-muted/30">
      <PageMeta title="登入 | Royalspl Flower" description="Royalspl Flower 登入或註冊會員。" />
      <Link to="/" className="mb-8 flex items-center gap-2">
        <Flower2 className="h-6 w-6 text-primary" />
        <span className="text-xl font-semibold text-foreground">Royalspl Flower</span>
      </Link>
      <Card className="w-full max-w-[calc(100%-2rem)] md:max-w-md shadow-sm border-border">
        <CardHeader className="space-y-2 text-center pb-6">
          <CardTitle className="text-2xl tracking-tight">登入或註冊</CardTitle>
          <CardDescription>登入以管理您的訂單與積分優惠</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">電子郵件</Label>
              <Input
                id="email"
                type="email"
                placeholder="輸入您的電子郵件"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="px-3 bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                type="password"
                placeholder="輸入密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="px-3 bg-background"
              />
            </div>

            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
              />
              <Label htmlFor="agree" className="text-sm font-normal leading-tight">
                我已閱讀並同意
                <Link to="/" className="text-primary hover:underline mx-1">用戶協議</Link>
                及
                <Link to="/" className="text-primary hover:underline ml-1">隱私政策</Link>
                。
              </Label>
            </div>

            <Button type="submit" className="w-full h-11 text-base font-medium" disabled={loading}>
              {loading ? '處理中...' : '使用電子郵件繼續'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                或使用其他方式
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full h-11 border-border" 
              onClick={handleGoogleLogin}
            >
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
              使用 Google 帳號繼續
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full h-11 border-border" 
              onClick={() => {
                if(!agreed) { toast.error('請同意用戶協議及隱私政策。'); return; }
                toast.info('Apple 登入即將開放');
              }}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" fill="currentColor"/>
                <path d="M15.426 14.856C15.426 12.33 17.518 11.233 17.625 11.177C16.48 9.516 14.815 9.294 14.225 9.222C12.738 9.074 11.312 10.088 10.551 10.088C9.771 10.088 8.618 9.24 7.375 9.262C5.772 9.284 4.305 10.183 3.486 11.587C1.815 14.444 3.057 18.665 4.685 21C5.485 22.146 6.425 23.433 7.688 23.385C8.905 23.337 9.378 22.616 10.822 22.616C12.266 22.616 12.7 23.385 13.963 23.385C15.275 23.385 16.088 22.122 16.867 20.976C17.817 19.544 18.205 18.156 18.226 18.08C18.196 18.069 15.426 17.025 15.426 14.856ZM11.171 7.279C11.838 6.482 12.28 5.395 12.16 4.305C11.218 4.343 10.063 4.933 9.374 5.727C8.756 6.438 8.225 7.55 8.368 8.618C9.421 8.699 10.505 8.077 11.171 7.279Z" fill="white"/>
              </svg>
              使用 Apple 繼續
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
