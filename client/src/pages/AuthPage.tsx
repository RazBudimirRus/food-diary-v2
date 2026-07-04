import { useState, useMemo } from "react";
import { z } from "zod";

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "Мин. 3 символа")
      .max(32, "Макс. 32 символа")
      .regex(/^[\w]+$/, "Только буквы, цифры, _"),
    email: z.string().email("Некорректный email"),
    password: z.string().min(8, "Мин. 8 символов"),
    password2: z.string(),
  })
  .refine((d) => d.password === d.password2, {
    message: "Пароли не совпадают",
    path: ["password2"],
  });
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Eye, EyeOff } from "lucide-react";

// Phase 26.6: reusable password input with show/hide toggle
function PasswordInput({
  id,
  value,
  onChange,
  onBlur,
  autoComplete,
  placeholder,
  className,
  "data-testid": testId,
}: {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  autoComplete: string;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        data-testid={testId}
        className={`pr-10${className ? ` ${className}` : ""}`}
      />
      <button
        type="button"
        aria-label={show ? "Скрыть пароль" : "Показать пароль"}
        onClick={() => setShow((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export default function AuthPage() {
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  // Login form
  const [lUsername, setLUsername] = useState("");
  const [lPassword, setLPassword] = useState("");

  // MFA step (after 202 mfaRequired)
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaTotp, setMfaTotp] = useState("");

  // Register form
  const [rUsername, setRUsername] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPassword, setRPassword] = useState("");
  const [rPassword2, setRPassword2] = useState("");
  const [rDisplayName, setRDisplayName] = useState("");
  const [rPdConsent, setRPdConsent] = useState(false);
  const [rTouched, setRTouched] = useState<Record<string, boolean>>({});

  const rErrors = useMemo(() => {
    const result = registerSchema.safeParse({
      username: rUsername,
      email: rEmail,
      password: rPassword,
      password2: rPassword2,
    });
    if (result.success) return {} as Record<string, string>;
    return Object.fromEntries(result.error.errors.map((e) => [e.path[0] as string, e.message]));
  }, [rUsername, rEmail, rPassword, rPassword2]);

  function rBlur(field: string) {
    setRTouched((t) => ({ ...t, [field]: true }));
  }

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [fEmail, setFEmail] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const result = await login(lUsername, lPassword, mfaRequired ? mfaTotp : undefined);
      if (result.mfaRequired) {
        setMfaRequired(true);
        setMfaTotp("");
      }
    } catch (err: any) {
      if (mfaRequired) {
        toast({ title: "Неверный код", description: err.message, variant: "destructive" });
        setMfaTotp("");
      } else {
        toast({ title: "Ошибка входа", description: err.message, variant: "destructive" });
      }
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
                      placeholder="вы@пример.рф"
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
                    {/* Phase 26.4: name + autoComplete для менеджеров паролей */}
                    <Input
                      id="l-username"
                      name="username"
                      autoComplete="username"
                      placeholder="ваш_логин"
                      value={lUsername}
                      onChange={(e) => setLUsername(e.target.value)}
                      data-testid="input-login-username"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="l-password" className="text-xs">
                      Пароль
                    </Label>
                    {/* Phase 26.6: toggle показать/скрыть пароль */}
                    <PasswordInput
                      id="l-password"
                      autoComplete="current-password"
                      value={lPassword}
                      onChange={(e) => setLPassword(e.target.value)}
                      data-testid="input-login-password"
                    />
                  </div>
                  {/* Phase 28.2: MFA TOTP step */}
                  {mfaRequired && (
                    <div className="space-y-1">
                      <Label htmlFor="l-totp" className="text-xs">
                        Код из приложения (TOTP)
                      </Label>
                      <Input
                        id="l-totp"
                        name="totp"
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        placeholder="123456"
                        maxLength={6}
                        value={mfaTotp}
                        onChange={(e) => setMfaTotp(e.target.value.replace(/\D/g, ""))}
                        autoFocus
                        data-testid="input-login-totp"
                      />
                      <p className="text-xs text-muted-foreground">
                        Введите 6-значный код из вашего приложения-аутентификатора.
                      </p>
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={pending || !lUsername || !lPassword || (mfaRequired && mfaTotp.length !== 6)}
                    data-testid="btn-login"
                  >
                    {pending ? "Вхожу..." : mfaRequired ? "Подтвердить" : "Войти"}
                  </Button>
                  {mfaRequired && (
                    <button
                      type="button"
                      className="w-full text-xs text-muted-foreground underline"
                      onClick={() => {
                        setMfaRequired(false);
                        setMfaTotp("");
                      }}
                    >
                      Назад ко входу
                    </button>
                  )}
                  {!mfaRequired && (
                    <button
                      type="button"
                      className="w-full text-xs text-primary underline"
                      onClick={() => setShowForgotPassword(true)}
                      data-testid="btn-show-forgot-password"
                    >
                      Забыли пароль?
                    </button>
                  )}
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
                    name="username"
                    autoComplete="username"
                    placeholder="ваш_логин"
                    value={rUsername}
                    onChange={(e) => setRUsername(e.target.value)}
                    onBlur={() => rBlur("username")}
                    className={rTouched.username && rErrors.username ? "border-destructive" : ""}
                    data-testid="input-reg-username"
                  />
                  {rTouched.username && rErrors.username && (
                    <p className="text-xs text-destructive">{rErrors.username}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="r-displayname" className="text-xs">
                    Имя <span className="text-muted-foreground">(необязательно)</span>
                  </Label>
                  <Input
                    id="r-displayname"
                    name="displayname"
                    autoComplete="name"
                    placeholder="Иван Иванов"
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
                    name="email"
                    autoComplete="email"
                    placeholder="вы@пример.рф"
                    value={rEmail}
                    onChange={(e) => setREmail(e.target.value)}
                    onBlur={() => rBlur("email")}
                    className={rTouched.email && rErrors.email ? "border-destructive" : ""}
                    data-testid="input-reg-email"
                  />
                  {rTouched.email && rErrors.email && <p className="text-xs text-destructive">{rErrors.email}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="r-password" className="text-xs">
                    Пароль <span className="text-muted-foreground">(мин. 8 символов)</span>
                  </Label>
                  <PasswordInput
                    id="r-password"
                    autoComplete="new-password"
                    value={rPassword}
                    onChange={(e) => setRPassword(e.target.value)}
                    onBlur={() => rBlur("password")}
                    className={rTouched.password && rErrors.password ? "border-destructive" : ""}
                    data-testid="input-reg-password"
                  />
                  {rTouched.password && rErrors.password && (
                    <p className="text-xs text-destructive">{rErrors.password}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="r-password2" className="text-xs">
                    Повторите пароль
                  </Label>
                  <PasswordInput
                    id="r-password2"
                    autoComplete="new-password"
                    value={rPassword2}
                    onChange={(e) => setRPassword2(e.target.value)}
                    onBlur={() => rBlur("password2")}
                    className={rTouched.password2 && rErrors.password2 ? "border-destructive" : ""}
                    data-testid="input-reg-password2"
                  />
                  {rTouched.password2 && rErrors.password2 && (
                    <p className="text-xs text-destructive">{rErrors.password2}</p>
                  )}
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
                    Я даю согласие на обработку персональных данных в соответствии с{" "}
                    <a href="#/privacy" className="text-primary underline">
                      Политикой конфиденциальности
                    </a>{" "}
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
        Данные хранятся на вашем сервере. Пароль хэшируется bcrypt (cost 12). Секреты шифруются AES-256-GCM.
      </p>
    </div>
  );
}
