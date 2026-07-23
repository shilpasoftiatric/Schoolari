import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { ChevronDown, Check, Search } from "lucide-react"
import { parsePhoneNumberFromString, getCountries, getCountryCallingCode, CountryCode } from "libphonenumber-js"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }

// --- Phone Input Implementation ---

const regionNames = typeof Intl !== 'undefined' ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;

const COUNTRIES = getCountries().map((code) => ({
  code,
  name: regionNames ? regionNames.of(code) || code : code,
  dialCode: `+${getCountryCallingCode(code)}`,
})).sort((a, b) => a.name.localeCompare(b.name));

export interface PhoneInputProps extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "name"> {
  value: string;
  onChange: (value: string) => void;
  defaultCountry?: CountryCode;
  name?: string;
}

export function PhoneInput({ value, onChange, defaultCountry = "US", className, name, ...props }: PhoneInputProps) {
  const [countryCode, setCountryCode] = React.useState<CountryCode>(defaultCountry);
  const [localNumber, setLocalNumber] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const prevValueRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      if (value) {
        const parsed = parsePhoneNumberFromString(value);
        if (parsed) {
          setCountryCode(parsed.country || defaultCountry);
          setLocalNumber(parsed.nationalNumber.replace(/\D/g, "").slice(0, 10));
        } else {
          setLocalNumber(value.replace(/\D/g, "").slice(0, 10));
        }
      } else {
        setLocalNumber("");
      }
    }
  }, [value, defaultCountry]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const emitChange = (code: CountryCode, num: string) => {
    const dialCode = `+${getCountryCallingCode(code)}`;
    const digitsOnly = num.replace(/\D/g, "");
    const finalValue = digitsOnly ? `${dialCode}${digitsOnly}` : "";
    prevValueRef.current = finalValue;
    onChange(finalValue);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, "");
    const limitedDigits = rawDigits.slice(0, 10);
    setLocalNumber(limitedDigits);
    emitChange(countryCode, limitedDigits);
  };

  const handleCountrySelect = (code: CountryCode) => {
    setCountryCode(code);
    setIsOpen(false);
    setSearch("");
    emitChange(code, localNumber);
  };

  const selectedCountry = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];
  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dialCode.includes(search)
  );

  return (
    <div className={cn("flex items-center gap-2 relative", className)}>
      {/* Country Selector */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 h-11 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 focus-visible:ring-primary focus-visible:ring-2 transition-all outline-none"
        >
          <img src={`https://flagcdn.com/${selectedCountry.code.toLowerCase()}.svg`} alt={selectedCountry.name} className="w-5 object-cover" />
          <span className="text-sm font-medium text-slate-700">{selectedCountry.dialCode}</span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-[280px] bg-white border border-slate-200 shadow-xl rounded-xl z-50 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search country or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-sm outline-none bg-transparent placeholder:text-slate-400"
                autoFocus
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto p-1">
              {filteredCountries.length === 0 ? (
                <div className="p-3 text-sm text-center text-slate-500">No country found</div>
              ) : (
                filteredCountries.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleCountrySelect(c.code as CountryCode)}
                    className={cn(
                      "flex items-center justify-between w-full p-2 rounded-lg text-sm transition-colors text-left",
                      countryCode === c.code ? "bg-primary/10 text-primary font-medium" : "hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <img src={`https://flagcdn.com/${c.code.toLowerCase()}.svg`} alt={c.name} className="w-5 object-cover" />
                      <span className="truncate">{c.name}</span>
                      <span className="text-slate-400 text-xs ml-1">{c.dialCode}</span>
                    </span>
                    {countryCode === c.code && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <Input
        type="tel"
        maxLength={10}
        value={localNumber}
        onChange={handlePhoneChange}
        className="flex-1 h-11 rounded-xl border-slate-200 bg-white focus-visible:ring-primary"
        placeholder="(555) 123-4567"
        {...props}
      />
      {name && <input type="hidden" name={name} value={prevValueRef.current || ""} />}
    </div>
  )
}
