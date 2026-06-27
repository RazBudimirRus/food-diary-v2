import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

function readResetTokenFromHash(): string | null {
  const hash = window.location.hash;
  const queryStart = hash.indexOf("?");
  if (queryStart === -1) return null;
  return new URLSearchParams(hash.slice(queryStart + 1)).get("token");
}

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const token = useMemo(() => readResetTokenFromHash(), []);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      toast({ title: "Ссылка недействительна", variant: "destructive" });
      return;
    }
    if (password !== password2) {
      toast({ title: "Пароли не совпадают", variant: "destructive" });
      return;
    }

    setPending(true);
    try {
      const res = await apiRequest("POST", "/api/auth/reset-password", { token, password });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Не удалось сбросить пароль");
      }
      setDone(true);
      toast({ title: "Пароль обновлён", description: "Теперь можно войти с новым паролем." });
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">Новый пароль</CardTitle>
          <CardDescription>
            {token
              ? "Придумайте новый пароль для входа в дневник."
              : "Ссылка для сброса пароля отсутствует или повреждена."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">Пароль успешно изменён.</p>
              <Button asChild className="w-full">
                <a href="#/">Перейти ко входу</a>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="new-password" className="text-xs">Новый пароль</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-reset-password"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-password2" className="text-xs">Повторите пароль</Label>
                <Input
                  id="new-password2"
                  type="password"
                  autoComplete="new-password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  data-testid="input-reset-password2"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={pending || !token || !password || !password2}
                data-testid="btn-reset-password"
              >
                {pending ? "Сохраняю..." : "Сохранить пароль"}
              </Button>
              <div className="text-center">
                <a href="#/" className="text-xs text-primary underline">Вернуться ко входу</a>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
