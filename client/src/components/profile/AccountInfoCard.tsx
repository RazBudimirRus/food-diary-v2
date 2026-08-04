import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDt } from "./profileUtils";
import type { MeResponse } from "./types";

interface AccountInfoCardProps {
  me?: MeResponse;
  meLoading: boolean;
}

export function AccountInfoCard({ me, meLoading }: AccountInfoCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" /> Аккаунт
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 pb-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Логин</span>
          <span className="font-medium">@{me?.username ?? "..."}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Email</span>
          <span className="font-medium">{me?.email ?? "..."}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Роль</span>
          <span className="font-medium capitalize">{me?.role ?? "..."}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Регистрация</span>
          <span className="font-medium">{formatDt(me?.createdAt)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Последний вход</span>
          <span className="font-medium">{meLoading ? "..." : formatDt(me?.lastLoginAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
