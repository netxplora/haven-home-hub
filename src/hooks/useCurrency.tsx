import { createContext, useContext, useEffect, useState } from "react";

// For demo/free usage, we can mock or use a free public API
const EXCHANGE_RATE_API = "https://open.er-api.com/v6/latest/USD";

type CurrencyContextType = {
  currency: string;
  setCurrency: (c: string) => void;
  rates: Record<string, number>;
  convert: (amount: number, from: string, to?: string) => number;
};

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "USD",
  setCurrency: () => {},
  rates: { USD: 1 },
  convert: (amount) => amount,
});

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const [currency, setCurrency] = useState("USD");
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });

  useEffect(() => {
    // Load saved currency preference
    const saved = localStorage.getItem("haven_currency");
    if (saved) setCurrency(saved);

    // Fetch live rates
    fetch(EXCHANGE_RATE_API)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.rates) {
          setRates(data.rates);
        }
      })
      .catch((err) => console.error("Failed to fetch exchange rates:", err));
  }, []);

  const handleSetCurrency = (c: string) => {
    setCurrency(c);
    localStorage.setItem("haven_currency", c);
  };

  const convert = (amount: number, from: string, to: string = currency) => {
    if (from === to) return amount;
    
    // Convert from origin to USD, then USD to target
    const rateFrom = rates[from] || 1;
    const rateTo = rates[to] || 1;
    
    const amountInUSD = amount / rateFrom;
    return amountInUSD * rateTo;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency: handleSetCurrency, rates, convert }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
