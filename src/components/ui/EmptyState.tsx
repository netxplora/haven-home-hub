import { LucideIcon, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`rounded-2xl border-2 border-dashed border-border bg-accent/30 py-16 px-8 text-center ${className}`}>
      <Icon className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
      <h3 className="font-serif text-lg font-medium text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{description}</p>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
