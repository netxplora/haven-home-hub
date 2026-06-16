import { useState } from "react";
import { MessageSquare, Send, Bot, RefreshCw, Landmark, ShieldCheck, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBrand } from "@/hooks/useBrand";

interface Message {
  sender: "user" | "advisor";
  text: string;
  options?: string[];
  recommendation?: {
    title: string;
    advice: string;
    actionLabel: string;
    actionLink: string;
  };
}

export function AIPropertyAdvisor() {
  const { brand } = useBrand();
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "advisor",
      text: `Welcome to ${brand.platform_name}. I am your property transaction advisor. To help guide your property decisions in the United States, what is your primary goal today?`,
      options: ["Buy a Family Home", "Rent a Premium Apartment", "Co-invest Fractionally", "Check Market Trends"]
    }
  ]);
  const [customInput, setCustomInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [selections, setSelections] = useState({
    goal: "",
    budget: "",
    location: ""
  });

  const handleOptionClick = (option: string) => {
    // Add user message
    const userMsg: Message = { sender: "user", text: option };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);

      // Handle "Restart" option from anywhere
      if (option === "Restart Consultation" || option === "Restart") {
        resetAdvisor();
        return;
      }

      // Branch: Market Trends
      if (option === "Check Market Trends") {
        setStep(5);
        setMessages([
          ...updated,
          {
            sender: "advisor",
            text: "Market trends are constantly shifting. Which data points are most critical to your strategy right now?",
            options: ["Rental Yields & ROI", "Appreciation Rates", "Regulatory & Tax Changes", "Restart Consultation"]
          }
        ]);
        return;
      }

      // Handle Step 5: Market Trends follow up
      if (step === 5) {
        let advice = "";
        let title = "Market Intelligence";
        if (option.includes("Yields")) {
          advice = "Currently, Sunbelt cities like Miami and Austin are seeing sustained rental demand, pushing gross yields to 6-8% on premium properties.";
          title = "Yield Analysis";
        } else if (option.includes("Appreciation")) {
          advice = "While pandemic-era spikes have cooled, emerging tech hubs are showing a steady 4-5% annualized appreciation.";
          title = "Growth Forecast";
        } else if (option.includes("Tax")) {
          advice = "Texas and Florida remain highly favorable due to zero state income tax, though local property taxes require careful calculation.";
          title = "Taxation Overview";
        }
        
        setMessages([
          ...updated,
          {
            sender: "advisor",
            text: advice,
            recommendation: {
              title,
              advice: "Review our full market data dashboard for deep-dive analytics on these metrics.",
              actionLabel: "View Insights",
              actionLink: "/blog"
            }
          }
        ]);
        return;
      }

      // Branch: Fractional Co-investing (Custom Budget Options)
      if (option === "Co-invest Fractionally") {
        setStep(2);
        setSelections({ ...selections, goal: option });
        setMessages([
          ...updated,
          {
            sender: "advisor",
            text: "Fractional co-investing is a smart way to diversify. What total capital are you looking to deploy?",
            options: ["Under $10k", "$10k - $50k", "$50k - $250k", "Above $250k"]
          }
        ]);
        return;
      }

      // Standard Flow
      if (step === 1) {
        setSelections({ ...selections, goal: option });
        setStep(2);
        setMessages([
          ...updated,
          {
            sender: "advisor",
            text: `Understood, you are looking to: "${option}". What budget range fits your plans?`,
            options: [
              "Under $500k",
              "$500k - $1 Million",
              "$1 Million - $2.5 Million",
              "Above $2.5 Million"
            ]
          }
        ]);
      } else if (step === 2) {
        setSelections({ ...selections, budget: option });
        setStep(3);
        setMessages([
          ...updated,
          {
            sender: "advisor",
            text: `Perfect. What preferred region are you targeting in the US?`,
            options: ["Austin, TX", "Miami, FL", "Brooklyn, NY", "Seattle, WA", "Open to Suggestions"]
          }
        ]);
      } else if (step === 3) {
        setSelections({ ...selections, location: option });
        setStep(4); // Final standard step
        
        let title = "High-Yield Investment Route";
        let advice = "Based on your criteria, Austin and Miami offer the most secure rental yield profiles. We recommend exploring verified fractional investments in these areas to build capital before committing to outright purchases.";
        let actionLabel = "View Co-Investments";
        let actionLink = "/invest/opportunities";

        if (selections.goal.includes("Buy")) {
          title = "Premium Residential Ownership Path";
          const locText = option === "Open to Suggestions" ? "emerging US markets" : option;
          advice = `For a budget in the ${selections.budget} range in ${locText}, outright ownership is highly viable. We advise reviewing listings certified with clear Title Insurance and HOA disclosures.`;
          actionLabel = "Browse Checked Properties";
          actionLink = option === "Open to Suggestions" ? "/properties?type=buy" : `/properties?type=buy&city=${encodeURIComponent(option.split(',')[0])}`;
        } else if (selections.goal.includes("Rent")) {
          title = "Vetted Lease Advisory";
          const locText = option === "Open to Suggestions" ? "target regions" : option;
          advice = `Leasing in ${locText} requires reviewing FEMA flood zones and Walk Scores. Check our pre-audited apartments with clear terms and transparent management.`;
          actionLabel = "View Available Rentals";
          actionLink = option === "Open to Suggestions" ? "/properties?type=rent" : `/properties?type=rent&city=${encodeURIComponent(option.split(',')[0])}`;
        } else if (selections.goal.includes("Co-invest")) {
          title = "Fractional Portfolio Allocation";
          advice = `Deploying ${selections.budget} across multiple properties mitigates risk. We suggest building a diversified portfolio across residential and commercial assets in high-growth zones.`;
          actionLabel = "Start Investing";
          actionLink = "/invest";
        }

        setMessages([
          ...updated,
          {
            sender: "advisor",
            text: "Thank you for sharing your parameters. I have compiled a structured advisory summary for you:",
            recommendation: {
              title,
              advice,
              actionLabel,
              actionLink
            }
          }
        ]);
      }
    }, 600);
  };

  const handleCustomSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    const userInput = customInput;
    const lowerInput = userInput.toLowerCase();
    setCustomInput("");
    const userMsg: Message = { sender: "user", text: userInput };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      
      // Smart Keyword Matching
      if (lowerInput.includes("tax")) {
        setMessages([
          ...updated,
          {
            sender: "advisor",
            text: "Property taxes vary significantly by state. Texas has higher property taxes but no state income tax, making Austin attractive. Florida offers a balanced tax profile. Would you like to see properties in these tax-advantaged states?",
            options: ["Explore Texas Properties", "Explore Florida Properties", "Restart Consultation"]
          }
        ]);
        setStep(6); // Custom response state
      } else if (lowerInput.includes("yield") || lowerInput.includes("roi") || lowerInput.includes("return")) {
        setMessages([
          ...updated,
          {
            sender: "advisor",
            text: "For the highest yields, fractional co-investing in commercial or premium residential properties often outperforms single-family rentals. Our current target ROIs average 10-12%.",
            recommendation: {
              title: "High-Yield Fractional Portfolios",
              advice: "Browse our vetted fractional opportunities designed for consistent monthly returns.",
              actionLabel: "View Opportunities",
              actionLink: "/invest/opportunities"
            }
          }
        ]);
        setStep(6);
      } else if (lowerInput.includes("inspect") || lowerInput.includes("audit") || lowerInput.includes("verify")) {
        setMessages([
          ...updated,
          {
            sender: "advisor",
            text: "Every property on our platform undergoes a strict 100-point physical inspection and title audit. We ensure there are no structural defects or hidden liens before listing.",
            options: ["Browse Verified Homes", "Restart Consultation"]
          }
        ]);
        setStep(6);
      } else if (lowerInput.includes("texas") || lowerInput.includes("florida")) {
         // Catching custom state option responses
         const link = lowerInput.includes("texas") ? "/properties?city=Austin" : "/properties?city=Miami";
         setMessages([
           ...updated,
           {
             sender: "advisor",
             text: `Excellent choice. We have a robust catalog of vetted properties in that region.`,
             recommendation: {
               title: "Regional Property Search",
               advice: "Review the latest listings matching your regional preference.",
               actionLabel: "Browse Properties",
               actionLink: link
             }
           }
         ]);
      } else {
        // Fallback
        setMessages([
          ...updated,
          {
            sender: "advisor",
            text: `I appreciate your inquiry regarding: "${userInput}". Let's narrow down your requirements. What is your primary focus?`,
            options: ["Outright Purchasing", "Fractional Yields", "Rental Accommodations", "Speak to a Human Advisor"]
          }
        ]);
        setStep(1);
      }
    }, 650);
  };

  const resetAdvisor = () => {
    setStep(1);
    setSelections({ goal: "", budget: "", location: "" });
    setMessages([
      {
        sender: "advisor",
        text: "Let's restart your consultation. What is your primary property goal today?",
        options: ["Buy a Family Home", "Rent a Premium Apartment", "Co-invest Fractionally", "Check Market Trends"]
      }
    ]);
  };

  return (
    <div className="w-full border border-border/50 bg-card rounded-2xl flex flex-col h-[520px] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-secondary p-4 border-b border-border/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-serif text-sm font-semibold text-white">Property Transaction Advisor</h4>
            <p className="text-[10px] text-white/60 font-medium">Secured & Vetted Decisions</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={resetAdvisor} className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-secondary/5">
        {messages.map((msg, index) => (
          <div key={index} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
            <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
              msg.sender === "user"
                ? "bg-primary text-white rounded-tr-none font-medium"
                : "bg-card border border-border/50 text-foreground rounded-tl-none"
            }`}>
              {msg.text}
            </div>

            {/* Render options if present */}
            {msg.options && (
              <div className="flex flex-col gap-2 mt-3 w-full max-w-[85%]">
                {msg.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleOptionClick(opt)}
                    className="text-left text-xs bg-card hover:bg-primary/5 hover:border-primary/45 hover:text-primary transition-all p-3 border border-border/60 rounded-xl font-medium focus:outline-none"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Render recommendation report if present */}
            {msg.recommendation && (
              <div className="mt-3 bg-secondary/10 border border-primary/20 rounded-xl p-4 w-full max-w-[85%] space-y-3">
                <h5 className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Landmark className="h-4 w-4" /> {msg.recommendation.title}
                </h5>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{msg.recommendation.advice}</p>
                <div className="flex items-center gap-2 pt-1.5">
                  <Button asChild size="sm" className="h-8 text-[10px] font-semibold bg-primary text-white hover:bg-primary/90">
                    <a href={msg.recommendation.actionLink}>{msg.recommendation.actionLabel}</a>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="h-8 text-[10px] font-semibold border-border bg-card">
                    <a href="/agents" className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-green-500" /> Speak with Advisor</a>
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground italic animate-pulse">
            <Bot className="h-4 w-4 animate-spin text-primary" /> Analysing transaction metrics...
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleCustomSend} className="p-3 border-t border-border/50 bg-card flex gap-2 items-center">
        <Input
          placeholder="Ask about Austin tax rates, yields, or inspections..."
          className="flex-1 h-10 text-xs bg-secondary/5"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          disabled={loading}
        />
        <Button type="submit" size="sm" className="h-10 w-10 p-0 shrink-0 bg-primary hover:bg-primary/95" disabled={loading || !customInput.trim()}>
          <Send className="h-4 w-4 text-white" />
        </Button>
      </form>
    </div>
  );
}
