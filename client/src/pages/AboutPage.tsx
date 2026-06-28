/**
 * AboutPage — мобильный раздел «О нас» / юридическая информация (UX-9).
 * Доступен через нижнее меню на мобильных.
 */
import { Send, ExternalLink, Mail, ShieldCheck, Info, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

export default function AboutPage() {
  const year = new Date().getFullYear();
  const { user } = useAuth();
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 border-b bg-card/90 backdrop-blur">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-2">
          <a
            href="#/"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm hidden sm:inline">Дневник</span>
          </a>
          <span className="text-muted-foreground/40 hidden sm:inline">|</span>
          <Info className="h-4 w-4 text-primary" />
          <h1 className="font-semibold text-base">О приложении</h1>
        </div>
      </header>
      <div className="px-4 pt-4 max-w-lg mx-auto space-y-4">
        {/* Правообладатель */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Правообладатель
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>ИП Сердитых Глеб Будимирович</p>
            <p>ИНН 502716046892</p>
            <p className="text-xs mt-2 leading-relaxed">
              © {year}. Все права защищены. Создано с использованием генеративного ИИ и самописного кода.
            </p>
          </CardContent>
        </Card>

        {/* Соцсети */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Соцсети</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="https://t.me/razbudimircraft"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors"
            >
              <Send className="h-4 w-4 text-primary" />
              <span>Telegram — @razbudimircraft</span>
            </a>
            <Separator />
            <a
              href="https://vk.com/boudimir"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-primary" />
              <span>ВКонтакте — vk.com/boudimir</span>
            </a>
          </CardContent>
        </Card>

        {/* Обратная связь */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Обратная связь
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="italic">Email находится на реконструкции.</p>
            <p className="text-xs mt-1">Будет доступен позднее. Пока пишите в Telegram.</p>
          </CardContent>
        </Card>

        {/* Правовая информация */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Правовая информация</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <a href="#/privacy" className="block text-primary underline underline-offset-2">
              Политика конфиденциальности (152-ФЗ)
            </a>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Персональные данные хранятся исключительно на серверах, расположенных на территории Российской Федерации.
            </p>
          </CardContent>
        </Card>
      </div>

      <BottomNav
        isAdmin={user?.role === "admin"}
        isDoctor={user?.role === "doctor" || user?.role === "admin"}
        currentPath={location}
      />
    </div>
  );
}
