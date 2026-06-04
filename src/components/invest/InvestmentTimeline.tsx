import { Check, Clock, CircleDot, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineEvent {
  event: string;
  description: string;
  timestamp: string;
}

interface InvestmentTimelineProps {
  investment: any;
  className?: string;
}

export function InvestmentTimeline({ investment, className }: InvestmentTimelineProps) {
  const events: TimelineEvent[] = investment.timeline_events || [];
  const status = investment.status;
  
  // We infer the expected flow:
  // 1. Created (Pending)
  // 2. Activated (Active)
  // 3. Matured
  // 4. Withdrawal Requested
  // 5. Paid/Completed

  const steps = [
    {
      id: "created",
      title: "Investment Created",
      description: "You initiated the fractional investment.",
      date: investment.created_at,
      isCompleted: true, // Always completed if it exists
      isActive: status === "pending" || status === "payment_under_review",
    },
    {
      id: "activated",
      title: "Payment Confirmed & Activated",
      description: "Payment verified. Your ROI is now accumulating.",
      date: investment.activated_at,
      isCompleted: ["active", "matured", "completed"].includes(status),
      isActive: status === "active",
    },
    {
      id: "matured",
      title: "Investment Matured",
      description: "Holding period completed. Funds available for withdrawal.",
      date: investment.maturity_date,
      isCompleted: ["matured", "completed"].includes(status),
      isActive: status === "matured" && investment.total_withdrawn === 0,
    },
    {
      id: "completed",
      title: "Withdrawal Completed",
      description: "Your funds and earnings have been transferred.",
      date: investment.updated_at,
      isCompleted: status === "completed",
      isActive: status === "completed",
    }
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="font-serif text-lg font-semibold text-foreground">Lifecycle Tracking</h3>
      
      <div className="relative border-l-2 border-border/60 ml-3 space-y-6 pb-2">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          
          return (
            <div key={step.id} className="relative pl-6">
              {/* Timeline dot */}
              <div 
                className={cn(
                  "absolute -left-[11px] top-1 h-5 w-5 rounded-full border-2 flex items-center justify-center bg-background transition-colors",
                  step.isCompleted ? "border-primary bg-primary text-white" : 
                  step.isActive ? "border-primary bg-background text-primary" : "border-muted-foreground bg-background text-muted-foreground"
                )}
              >
                {step.isCompleted ? <Check className="h-3 w-3" /> : step.isActive ? <CircleDot className="h-3 w-3 animate-pulse" /> : <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className={cn("text-sm font-semibold", step.isCompleted || step.isActive ? "text-foreground" : "text-muted-foreground")}>
                    {step.title}
                  </h4>
                  {step.date && step.isCompleted && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(step.date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className={cn("text-xs mt-1", step.isActive ? "text-primary/90 font-medium" : "text-muted-foreground")}>
                  {step.description}
                </p>

                {/* Show custom events if this is the active stage */}
                {step.isActive && events.length > 0 && (
                  <div className="mt-3 space-y-2 rounded-lg bg-accent/20 border border-border/40 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Recent Activity Logs</p>
                    {events.slice().reverse().slice(0, 3).map((ev, i) => (
                      <div key={i} className="flex gap-2 text-xs">
                        <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-foreground">{ev.event}</p>
                          <p className="text-muted-foreground text-[11px]">{ev.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
