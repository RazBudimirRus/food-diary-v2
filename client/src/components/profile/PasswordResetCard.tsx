import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { profileApi } from "./profileUtils";
import type { MeResponse } from "./types";

interface PasswordResetCardProps {
  me?: MeResponse;
}

export function PasswordResetCard({ me }: PasswordResetCardProps) {
  const { toast } = useToast();
  const [resetSent, setResetSent] = useState(false);

  const sendReset = useMutation({
    mutationFn: () => profileApi("POST", "/api/auth/forgot-password", { email: me?.email }),
    onSuccess: () => {
      setResetSent(true);
      toast({ title: "Письмо отправлено", description: `Проверьте ${me?.email}` });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          <Lock className="h-4 w-4" /> Смена пароля
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        <p className="text-xs text-muted-foreground">
          На адрес <span className="font-medium text-foreground">{me?.email}</span> будет отправлена ссылка для сброса
          пароля.
        </p>
        {resetSent ? (
          <p className="text-sm text-green-600 dark:text-green-400">Письмо отправлено. Проверьте почту.</p>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={sendReset.isPending || !me?.email}
            onClick={() => sendReset.mutate()}
          >
            {sendReset.isPending ? "Отправка..." : "Отправить ссылку для сброса"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
