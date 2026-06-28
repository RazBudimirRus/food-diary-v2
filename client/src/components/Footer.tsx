/**
 * Footer — десктопный юридический подвал (UX-9).
 * Скрыт на мобильных (sm:flex), т.к. на мобильных есть AboutPage.
 */
import { Send, ExternalLink, Mail, ShieldCheck } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="hidden sm:block border-t bg-card/80 backdrop-blur-sm mt-auto" aria-label="Подвал сайта">
      <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
        {/* Правообладатель */}
        <div className="space-y-1">
          <p className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Правообладатель
          </p>
          <p className="text-muted-foreground leading-relaxed">
            ИП Сердитых Глеб Будимирович
            <br />
            ИНН 502716046892
          </p>
        </div>

        {/* Соцсети */}
        <div className="space-y-1">
          <p className="font-semibold text-foreground mb-2">Соцсети</p>
          <ul className="space-y-1.5">
            <li>
              <a
                href="https://t.me/razbudimircraft"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
                Telegram
              </a>
            </li>
            <li>
              <a
                href="https://vk.com/boudimir"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                ВКонтакте
              </a>
            </li>
          </ul>
        </div>

        {/* Обратная связь */}
        <div className="space-y-1">
          <p className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Mail className="h-4 w-4 text-primary" />
            Обратная связь
          </p>
          <p className="text-muted-foreground text-xs italic">
            Email — на реконструкции,
            <br />
            будет доступен позднее.
          </p>
        </div>

        {/* Правовая информация */}
        <div className="space-y-1">
          <p className="font-semibold text-foreground mb-2">Правовая информация</p>
          <ul className="space-y-1.5 text-muted-foreground text-xs leading-relaxed">
            <li>
              <a href="#/privacy" className="hover:text-primary transition-colors underline underline-offset-2">
                Политика конфиденциальности
              </a>
            </li>
            <li>Данные хранятся на серверах РФ (152-ФЗ)</li>
          </ul>
        </div>
      </div>

      {/* Copyright strip */}
      <div className="border-t px-6 py-3 text-center text-xs text-muted-foreground">
        © {year} ИП Сердитых Глеб Будимирович. Все права защищены. Создано с использованием генеративного ИИ и
        самописного кода.
      </div>
    </footer>
  );
}
