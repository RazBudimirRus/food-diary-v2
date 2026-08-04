import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { profileApi } from "./profileUtils";
import type { MfaStatus } from "./types";

interface MfaCardProps {
  mfaStatus?: MfaStatus;
  refetchMfa: () => void;
}

export function MfaCard({ mfaStatus, refetchMfa }: MfaCardProps) {
  const { toast } = useToast();
  const [mfaQr, setMfaQr] = useState<string | null>(null);
  const [mfaTokenInput, setMfaTokenInput] = useState("");
  const [mfaSetupStep, setMfaSetupStep] = useState<"idle" | "scan" | "disable">("idle");

  const startMfaSetup = useMutation({
    mutationFn: () => profileApi("POST", "/api/auth/mfa/setup"),
    onSuccess: (data: { qrDataUrl: string }) => {
      setMfaQr(data.qrDataUrl);
      setMfaSetupStep("scan");
      setMfaTokenInput("");
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const confirmMfaSetup = useMutation({
    mutationFn: () => profileApi("POST", "/api/auth/mfa/verify-setup", { token: mfaTokenInput }),
    onSuccess: () => {
      setMfaSetupStep("idle");
      setMfaQr(null);
      refetchMfa();
      toast({ title: "MFA включена" });
    },
    onError: (e: Error) => toast({ title: "Неверный код", description: e.message, variant: "destructive" }),
  });

  const disableMfa = useMutation({
    mutationFn: () => profileApi("POST", "/api/auth/mfa/disable", { token: mfaTokenInput }),
    onSuccess: () => {
      setMfaSetupStep("idle");
      refetchMfa();
      toast({ title: "MFA отключена" });
    },
    onError: (e: Error) => toast({ title: "Неверный код", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          <ShieldCheck className="h-4 w-4" /> Двухфакторная аутентификация (MFA)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Статус</span>
          <span
            className={
              mfaStatus?.mfaEnabled ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"
            }
          >
            {mfaStatus?.mfaEnabled ? "Включена" : "Отключена"}
          </span>
        </div>

        {mfaSetupStep === "idle" && !mfaStatus?.mfaEnabled && (
          <Button
            size="sm"
            className="w-full"
            onClick={() => startMfaSetup.mutate()}
            disabled={startMfaSetup.isPending}
          >
            <ShieldCheck className="h-4 w-4 mr-2" />
            {startMfaSetup.isPending ? "Генерация QR..." : "Включить MFA"}
          </Button>
        )}

        {mfaSetupStep === "scan" && mfaQr && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Отсканируйте QR-код в Google Authenticator или Authy, затем введите код для подтверждения.
            </p>
            <img src={mfaQr} alt="MFA QR-код" className="rounded-lg border mx-auto w-48 h-48" />
            <div className="space-y-1">
              <Label className="text-xs">Код из приложения</Label>
              <Input
                value={mfaTokenInput}
                onChange={(e) => setMfaTokenInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="h-9 text-sm font-mono tracking-widest"
                maxLength={6}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setMfaSetupStep("idle")}>
                Отмена
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={() => confirmMfaSetup.mutate()}
                disabled={mfaTokenInput.length !== 6 || confirmMfaSetup.isPending}
              >
                {confirmMfaSetup.isPending ? "Проверка..." : "Подтвердить"}
              </Button>
            </div>
          </div>
        )}

        {mfaSetupStep === "idle" && mfaStatus?.mfaEnabled && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Для отключения введите текущий код MFA.</p>
            {mfaSetupStep === "idle" && (
              <Button
                size="sm"
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => {
                  setMfaSetupStep("disable");
                  setMfaTokenInput("");
                }}
              >
                <ShieldOff className="h-4 w-4 mr-2" /> Отключить MFA
              </Button>
            )}
          </div>
        )}

        {mfaSetupStep === "disable" && (
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs">Код MFA для подтверждения</Label>
              <Input
                value={mfaTokenInput}
                onChange={(e) => setMfaTokenInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="h-9 text-sm font-mono tracking-widest"
                maxLength={6}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setMfaSetupStep("idle")}>
                Отмена
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={() => disableMfa.mutate()}
                disabled={mfaTokenInput.length !== 6 || disableMfa.isPending}
              >
                {disableMfa.isPending ? "Отключение..." : "Отключить"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
