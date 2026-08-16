import { useState } from 'react';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { createContactSubmission } from '@/services/api';
import PageMeta from '@/components/common/PageMeta';
import { toast } from 'sonner';

export default function Contact() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim() || !form.message.trim()) {
      toast.error('請填寫您的姓名和訊息。');
      return;
    }

    setSubmitting(true);
    const success = await createContactSubmission({
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      message: form.message.trim(),
    });
    setSubmitting(false);

    if (success) {
      toast.success('訊息發送成功，我們會盡快回覆。');
      setForm({ name: '', phone: '', email: '', message: '' });
    } else {
      toast.error('訊息發送失敗，請重試。');
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 md:py-20 md:px-8">
      <PageMeta
        title="聯絡我們 | Royalspl Flower"
        description="歡迎聯絡 Royalspl Flower，訂購花藝或查詢定制服務。"
      />

      <div className="mb-12 text-center">
        <h1 className="text-3xl font-semibold text-foreground md:text-4xl">聯絡我們</h1>
        <p className="mt-4 text-muted-foreground">期待收到您的來信。</p>
      </div>

      <div className="grid gap-12 lg:grid-cols-2">
        <section>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="您的姓名"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">電話</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="您的聯絡電話"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">電子郵件</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="您的電子郵件"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">訊息</Label>
              <Textarea
                id="message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="請告訴我們您的需求..."
                rows={5}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? '發送中...' : '發送訊息'}
            </Button>
          </form>
        </section>

        <section className="space-y-6">
          <Card className="border border-border bg-card">
            <CardContent className="p-6 flex items-start gap-4">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">地址</h3>
                <p className="mt-1 text-sm text-muted-foreground">花園區布魯姆街 123 號</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border bg-card">
            <CardContent className="p-6 flex items-start gap-4">
              <Clock className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">營業時間</h3>
                <p className="mt-1 text-sm text-muted-foreground">週一至週六：09:00 - 19:00</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border bg-card">
            <CardContent className="p-6 flex items-start gap-4">
              <Phone className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">電話</h3>
                <p className="mt-1 text-sm text-muted-foreground">+852 1234 5678</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border bg-card">
            <CardContent className="p-6 flex items-start gap-4">
              <Mail className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">電子郵件</h3>
                <p className="mt-1 text-sm text-muted-foreground">hello@royalsplflower.com</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
