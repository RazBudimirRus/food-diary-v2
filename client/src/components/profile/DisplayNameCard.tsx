import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { User, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient as qc } from "@/lib/queryClient";
import { profileApi } from "./profileUtils";
import type { MeResponse } from "./types";

interface DisplayNameCardProps {
  me?: MeResponse;
}

export function DisplayNameCard({ me }: DisplayNameCardProps) {
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (me?.displayName) setDisplayName(me.displayName);
  }, [me?.displayName]);

  const saveName = useMutation({
    mutationFn: () => profileApi("PUT", "/api/profile", { displayName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Имя обновлено" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          <User className="h-4 w-4" /> Отображаемое имя
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        <p className="text-xs text-muted-foreground">Отображается в дневнике и у врача. Можно указать полное имя.</p>
        <div className="flex gap-2">
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Иванов Иван Иванович"
            className="h-9 text-sm"
            maxLength={64}
          />
          <Button
            size="sm"
            className="shrink-0"
            disabled={saveName.isPending || !displayName.trim()}
            onClick={() => saveName.mutate()}
          >
            <Save className="h-4 w-4 mr-1" />
            {saveName.isPending ? "..." : "Сохранить"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
