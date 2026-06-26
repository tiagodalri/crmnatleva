import { Check, CheckCheck, Clock, AlertTriangle } from "lucide-react";
import type { MsgStatus } from "@/components/inbox/types";

export function getStatusIcon(status: MsgStatus) {
  if (status === "queued") return <Clock className="h-3 w-3 text-muted-foreground animate-pulse" />;
  if (status === "sending") return <Clock className="h-3 w-3 text-muted-foreground" />;
  if (status === "failed") return <AlertTriangle className="h-3 w-3 text-destructive" />;
  if (status === "read")
    return (
      <CheckCheck
        className="h-3.5 w-3.5 text-[#53bdeb]"
        style={{ filter: "drop-shadow(0 0 1px rgba(83,189,235,0.5))" }}
      />
    );
  if (status === "delivered") return <CheckCheck className="h-3 w-3 text-white" />;
  return <Check className="h-3 w-3 text-white" />;
}
