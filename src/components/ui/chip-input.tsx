import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ChipInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export function ChipInput({
  value = [],
  onChange,
  placeholder = "Type and press enter...",
  className,
  disabled,
  ...props
}: ChipInputProps) {
  const [inputValue, setInputValue] = React.useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = inputValue.trim();
      if (val && !value.includes(val)) {
        onChange([...value, val]);
        setInputValue("");
      }
    } else if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const handleRemove = (itemToRemove: string) => {
    if (disabled) return;
    onChange(value.filter((item) => item !== itemToRemove));
  };

  return (
    <div
      className={cn(
        "flex min-h-[80px] w-full flex-wrap gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {value.map((item, index) => (
        <Badge key={index} variant="secondary" className="flex items-center gap-1 text-sm py-1 px-2 font-medium">
          {item}
          {!disabled && (
            <button
              type="button"
              className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-destructive hover:text-destructive-foreground transition-colors p-0.5"
              onClick={() => handleRemove(item)}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Remove {item}</span>
            </button>
          )}
        </Badge>
      ))}
      <input
        type="text"
        className="flex-1 bg-transparent outline-none min-w-[120px] placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        placeholder={value.length === 0 ? placeholder : ""}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          const val = inputValue.trim();
          if (val && !value.includes(val)) {
            onChange([...value, val]);
            setInputValue("");
          }
        }}
        disabled={disabled}
        {...props}
      />
    </div>
  );
}
