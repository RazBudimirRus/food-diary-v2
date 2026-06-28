import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function AuthPage() {
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  // Login form
  const [lUsername, setLUsername] = useState("");
  const [lPassword, setLPassword] = useState("");

  // Register form
  const [rUsername, setRUsername] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPassword, setRPassword] = useState("");
  const [rPassword2, setRPassword2] = useState("");
  const [rDisplayName, setRDisplayName] = useState("");
  const [rPdConsent, setRPdConsent] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [fEmail, setFEmail] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await login(lUsername, lPassword);
    } catch (err: any) {
      toast({ title: "Ошибка входа", description: err.message, variant: "destructive" });
    } finally {
      setPending(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (rPassword !== rPassword2) {
      toast({ title: "Пароли не совпадают", variant: "destructive" });
      return;
    }
    if (!rPdConsent) {
      toast({
        title: "Необходимо согласие",
        description: "Примите политику обработки персональных данных",
        variant: "destructive",
      });
      return;
    }
    setPending(true);
    try {
      await register(rUsername, rEmail, rPassword, rDisplayName || undefined);
    } catch (err: any) {
      toast({ title: "Ошибка регистрации", description: err.message, variant: "destructive" });
    } finally {
      setPending(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await apiRequest("POST", "/api/auth/forgot-password", { email: fEmail });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Не удалось отправить запрос");
      toast({
        title: "Проверьте почту",
        description: body.message || "Если email зарегистрирован, мы отправили ссылку для сброса.",
      });
      setShowForgotPassword(false);
      setFEmail("");
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Logo + title */}
      <div className="flex items-center gap-3 mb-8">
        <svg viewBox="0 0 32 32" width="36" height="36" fill="none" aria-label="Food Diary">
          <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
          <path
            d="M10 10 Q10 7 13 7 Q16 7 16 10 L16 22"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="text-primary"
          />
          <path
            d="M19 7 L19 13 Q19 16 22 16 L22 7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="text-primary"
          />
          <path
            d="M20.5 13 Q19 13 19 14.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="text-primary"
          />
        </svg>
        <div>
          <h1 className="text-xl font-bold leading-none">Дневник питания</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Ведение записей и отчёт для врача</p>
        </div>
      </div>

      <Card className="w-full max-w-sm">
        <Tabs defaultValue="login">
          <CardHeader className="pb-0">
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1" data-testid="tab-login">
                Войти
              </TabsTrigger>
              <TabsTrigger value="register" className="flex-1" data-testid="tab-register">
                Регистрация
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          {/* LOGIN */}
          <TabsContent value="login">
            {showForgotPassword ? (
              <form onSubmit={handleForgotPassword}>
                <CardContent className="space-y-3 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Введите email, указанный при регистрации. Мы отправим ссылку для сброса пароля.
                  </p>
                  <div className="space-y-1">
                    <Label htmlFor="f-email" className="text-xs">
                      Email
                    </Label>
                    <Input
                      id="f-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={fEmail}
                      onChange={(e) => setFEmail(e.target.value)}
                      data-testid="input-forgot-email"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={pending || !fEmail}
                    data-testid="btn-forgot-password"
                  >
                    {pending ? "Отправляю..." : "Отправить ссылку"}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-xs text-primary underline"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Вернуться ко входу
                  </button>
                </CardContent>
              </form>
            ) : (
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-3 pt-4">
                  <div className="space-y-1">
                    <Label htmlFor="l-username" className="text-xs">
                      Логин
                    </Label>
                    <Input
                      id="l-username"
                      autoComplete="username"
                      placeholder="your_username"
                      value={lUsername}
                      onChange={(e) => setLUsername(e.target.value)}
                      data-testid="input-login-username"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="l-password" className="text-xs">
                      Пароль
                    </Label>
                    <Input
                      id="l-password"
                      type="password"
                      autoComplete="current-password"
                      value={lPassword}
                      onChange={(e) => setLPassword(e.target.value)}
                      data-testid="input-login-password"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={pending || !lUsername || !lPassword}
                    data-testid="btn-login"
                  >
                    {pending ? "Вхожу..." : "Войти"}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-xs text-primary underline"
                    onClick={() => setShowForgotPassword(true)}
                    data-testid="btn-show-forgot-password"
                  >
                    Забыли пароль?
                  </button>
                </CardContent>
              </form>
            )}
          </TabsContent>

          {/* REGISTER */}
          <TabsContent value="register">
            <form onSubmit={handleRegister}>
              <CardContent className="space-y-3 pt-4">
                <div className="space-y-1">
                  <Label htmlFor="r-username" className="text-xs">
                    Логин <span className="text-muted-foreground">(буквы, цифры, _)</span>
                  </Label>
                  <Input
                    id="r-username"
                    autoComplete="username"
                    placeholder="your_username"
                    value={rUsername}
                    onChange={(e) => setRUsername(e.target.value)}
                    data-testid="input-reg-username"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="r-displayname" className="text-xs">
                    Имя <span className="text-muted-foreground">(необязательно)</span>
                  </Label>
                  <Input
                    id="r-displayname"
                    placeholder="Глеб"
                    value={rDisplayName}
                    onChange={(e) => setRDisplayName(e.target.value)}
                    data-testid="input-reg-displayname"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="r-email" className="text-xs">
                    Email
                  </Label>
                  <Input
                    id="r-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={rEmail}
                    onChange={(e) => setREmail(e.target.value)}
                    data-testid="input-reg-email"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="r-password" className="text-xs">
                    Пароль <span className="text-muted-foreground">(мин. 8 символов)</span>
                  </Label>
                  <Input
                    id="r-password"
                    type="password"
                    autoComplete="new-password"
                    value={rPassword}
                    onChange={(e) => setRPassword(e.target.value)}
                    data-testid="input-reg-password"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="r-password2" className="text-xs">
                    Повторите пароль
                  </Label>
                  <Input
                    id="r-password2"
                    type="password"
                    autoComplete="new-password"
                    value={rPassword2}
                    onChange={(e) => setRPassword2(e.target.value)}
                    data-testid="input-reg-password2"
                  />
                </div>
                {/* 152-ФЗ consent */}
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="r-pdconsent"
                    checked={rPdConsent}
                    onCheckedChange={(v) => setRPdConsent(!!v)}
                    data-testid="input-reg-pdconsent"
                  />
                  <label htmlFor="r-pdconsent" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                    Я даю согласие на обработку персональных данных в соответствии с
                    <a href="#/privacy" className="text-primary underline">
                      Политикой конфиденциальности
                    </a>
                    (152-ФЗ)
                  </label>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={pending || !rUsername || !rEmail || !rPassword || !rPassword2 || !rPdConsent}
                  data-testid="btn-register"
                >
                  {pending ? "Регистрирую..." : "Создать аккаунт"}
                </Button>
              </CardContent>
            </form>
          </TabsContent>
        </Tabs>
      </Card>

      <p className="text-xs text-muted-foreground mt-6 text-center max-w-xs">
        Данные хранятся локально на вашем сервере. Пароль хэшируется bcrypt (cost 12). Секреты шифруются AES-256-GCM.
      </p>
    </div>
  );
}
