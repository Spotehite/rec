"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Globe, ChevronDown, ChevronUp, Search, Check } from "lucide-react";

export interface TimezoneItem {
  zone: string;
  label: string;
}

export interface TimezoneGroup {
  group: string;
  items: TimezoneItem[];
}

export const TIMEZONE_GROUPS: TimezoneGroup[] = [
  {
    group: "US/CANADA",
    items: [
      { zone: "America/Los_Angeles", label: "Pacific Time - US & Canada" },
      { zone: "America/Vancouver", label: "Vancouver Time" },
      { zone: "America/Denver", label: "Mountain Time - US & Canada" },
      { zone: "America/Chicago", label: "Central Time - US & Canada" },
      { zone: "America/New_York", label: "Eastern Time - US & Canada" },
      { zone: "America/Anchorage", label: "Alaska Time" },
      { zone: "America/Phoenix", label: "Arizona, Yukon Time" },
      { zone: "America/St_Johns", label: "Newfoundland Time" },
      { zone: "Pacific/Honolulu", label: "Hawaii Time" },
    ],
  },
  {
    group: "AMERICA",
    items: [
      { zone: "America/Adak", label: "America/Adak" },
      { zone: "America/Argentina/Buenos_Aires", label: "Buenos Aires Time" },
      { zone: "America/Asuncion", label: "Asuncion Time" },
      { zone: "America/Bogota", label: "Bogota, Jamaica, Lima Time" },
      { zone: "America/Campo_Grande", label: "America/Campo Grande" },
      { zone: "America/Caracas", label: "Caracas Time" },
      { zone: "America/Godthab", label: "America/Godthab" },
      { zone: "America/Halifax", label: "Atlantic Time" },
      { zone: "America/Costa_Rica", label: "Saskatchewan, Guatemala, Costa Rica Time" },
      { zone: "America/Havana", label: "America/Havana" },
      { zone: "America/Mazatlan", label: "America/Mazatlan" },
      { zone: "America/Mexico_City", label: "Mexico City Time" },
      { zone: "America/Montevideo", label: "Montevideo Time" },
      { zone: "America/Miquelon", label: "America/Miquelon" },
      { zone: "America/Noronha", label: "America/Noronha" },
      { zone: "America/Santiago", label: "Santiago Time" },
      { zone: "America/Santa_Isabel", label: "America/Santa Isabel" },
      { zone: "America/Santo_Domingo", label: "Atlantic Standard Time" },
      { zone: "America/Sao_Paulo", label: "Brasilia Time" },
    ],
  },
  {
    group: "AFRICA",
    items: [
      { zone: "Africa/Cairo", label: "Africa/Cairo" },
      { zone: "Africa/Maputo", label: "Central Africa Time" },
      { zone: "Africa/Lagos", label: "West Africa Time" },
      { zone: "Africa/Windhoek", label: "Africa/Windhoek" },
    ],
  },
  {
    group: "ASIA",
    items: [
      { zone: "Asia/Amman", label: "Jordan Time" },
      { zone: "Asia/Baghdad", label: "Baghdad, East Africa Time" },
      { zone: "Asia/Baku", label: "Asia/Baku" },
      { zone: "Asia/Beirut", label: "Lebanon Time" },
      { zone: "Asia/Damascus", label: "Syria Time" },
      { zone: "Asia/Dhaka", label: "Asia/Dhaka" },
      { zone: "Asia/Dubai", label: "Dubai Time" },
      { zone: "Asia/Gaza", label: "Asia/Gaza" },
      { zone: "Asia/Irkutsk", label: "Asia/Irkutsk" },
      { zone: "Asia/Bangkok", label: "Indochina Time" },
      { zone: "Asia/Jerusalem", label: "Israel Time" },
      { zone: "Asia/Kabul", label: "Kabul Time" },
      { zone: "Pacific/Majuro", label: "Pacific/Majuro" },
      { zone: "Asia/Karachi", label: "Pakistan, Maldives Time" },
      { zone: "Asia/Kathmandu", label: "Kathmandu Time" },
      { zone: "Asia/Kolkata", label: "India, Sri Lanka Time" },
      { zone: "Asia/Krasnoyarsk", label: "Krasnoyarsk Time" },
      { zone: "Asia/Omsk", label: "Asia/Omsk" },
      { zone: "Asia/Yangon", label: "Asia/Rangoon" },
      { zone: "Asia/Singapore", label: "China, Singapore, Perth" },
      { zone: "Asia/Tehran", label: "Tehran Time" },
      { zone: "Asia/Tokyo", label: "Japan, Korea Time" },
      { zone: "Asia/Vladivostok", label: "Asia/Vladivostok" },
      { zone: "Asia/Yakutsk", label: "Asia/Yakutsk" },
      { zone: "Asia/Yekaterinburg", label: "Yekaterinburg Time" },
      { zone: "Asia/Yerevan", label: "Asia/Yerevan" },
    ],
  },
  {
    group: "ATLANTIC",
    items: [
      { zone: "Atlantic/Azores", label: "Azores Time" },
      { zone: "Atlantic/Cape_Verde", label: "Cape Verde Time" },
    ],
  },
  {
    group: "AUSTRALIA",
    items: [
      { zone: "Australia/Adelaide", label: "Adelaide Time" },
      { zone: "Australia/Brisbane", label: "Brisbane Time" },
      { zone: "Australia/Darwin", label: "Australia/Darwin" },
      { zone: "Australia/Eucla", label: "Australia/Eucla" },
      { zone: "Australia/Lord_Howe", label: "Australia/Lord Howe" },
      { zone: "Australia/Perth", label: "Australia/Perth" },
      { zone: "Australia/Sydney", label: "Sydney, Melbourne Time" },
    ],
  },
  {
    group: "UTC",
    items: [{ zone: "UTC", label: "UTC Time" }],
  },
  {
    group: "EUROPE",
    items: [
      { zone: "Europe/Belgrade", label: "Central European Time" },
      { zone: "Europe/Bucharest", label: "Eastern European Time" },
      { zone: "Europe/London", label: "UK, Ireland, Lisbon Time" },
      { zone: "Europe/Minsk", label: "Minsk Time" },
      { zone: "Europe/Moscow", label: "Moscow Time" },
      { zone: "Europe/Istanbul", label: "Turkey Time" },
    ],
  },
  {
    group: "PACIFIC",
    items: [
      { zone: "Pacific/Apia", label: "Pacific/Apia" },
      { zone: "Pacific/Auckland", label: "Auckland Time" },
      { zone: "Pacific/Chatham", label: "Pacific/Chatham" },
      { zone: "Pacific/Easter", label: "Pacific/Easter" },
      { zone: "Pacific/Fiji", label: "Pacific/Fiji" },
      { zone: "Pacific/Gambier", label: "Pacific/Gambier" },
      { zone: "Pacific/Kiritimati", label: "Pacific/Kiritimati" },
      { zone: "Pacific/Majuro", label: "Pacific/Majuro" },
      { zone: "Pacific/Marquesas", label: "Pacific/Marquesas" },
      { zone: "Pacific/Norfolk", label: "Pacific/Norfolk" },
      { zone: "Pacific/Noumea", label: "Pacific/Noumea" },
      { zone: "Pacific/Pago_Pago", label: "Pacific/Pago Pago" },
      { zone: "Pacific/Pitcairn", label: "Pacific/Pitcairn" },
      { zone: "Pacific/Tarawa", label: "Pacific/Tarawa" },
      { zone: "Pacific/Tongatapu", label: "Pacific/Tongatapu" },
    ],
  },
];

export function formatTimeInZone(zone: string, is24h: boolean): string {
  try {
    const d = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour: is24h ? "2-digit" : "numeric",
      minute: "2-digit",
      hour12: !is24h,
    });
    return formatter.format(d);
  } catch {
    return is24h ? "12:00" : "12:00 PM";
  }
}

interface TimezoneSelectorProps {
  value: string;
  onChange: (timezone: string) => void;
}

export default function TimezoneSelector({ value, onChange }: TimezoneSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [is24h, setIs24h] = useState(true); // Default 24h toggle as shown in screenshot
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter groups based on search query
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return TIMEZONE_GROUPS;

    return TIMEZONE_GROUPS.map((g) => ({
      group: g.group,
      items: g.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.zone.toLowerCase().includes(q) ||
          g.group.toLowerCase().includes(q)
      ),
    })).filter((g) => g.items.length > 0);
  }, [search]);

  // Current selected label
  const currentLabel = useMemo(() => {
    for (const g of TIMEZONE_GROUPS) {
      const found = g.items.find((i) => i.zone === value);
      if (found) return found.label;
    }
    return value.replace(/_/g, " ");
  }, [value]);

  const currentTime = formatTimeInZone(value, is24h);

  return (
    <div className="relative font-sans mt-8 pt-6 border-t border-gray-100" ref={dropdownRef}>
      {/* Trigger Button Matching Screenshot */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-start gap-2 text-xs font-semibold text-gray-800 hover:text-[#0069ff] py-1 text-left transition-colors focus:outline-none group"
      >
        <Globe className="w-4 h-4 text-[#0069ff] shrink-0" />
        <span className="truncate">{currentLabel} ({currentTime})</span>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-gray-500 shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
        )}
      </button>

      {/* Dropdown Menu Designed Exactly Like Picture */}
      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-full sm:w-[340px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-fade-up">
          {/* 1. Rounded Blue-Outlined Search Box from Picture */}
          <div className="p-3.5 pb-2">
            <div className="border-2 border-[#0091ff] rounded-xl px-3 py-2 flex items-center gap-2 bg-white shadow-2xs">
              <Search className="w-4 h-4 text-gray-500 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs font-normal bg-transparent outline-none text-gray-800 placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* 2. Subheader Bar: "TIME ZONE" & am/pm <-> 24h Toggle Switch */}
          <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100 bg-white">
            <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">
              TIME ZONE
            </span>

            {/* am/pm 24h Toggle Switch from Screenshot */}
            <div className="flex items-center gap-1.5 text-xs select-none">
              <span className={`text-[11px] font-medium ${!is24h ? "text-[#0069ff] font-bold" : "text-gray-500"}`}>
                am/pm
              </span>
              <button
                type="button"
                onClick={() => setIs24h(!is24h)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  is24h ? "bg-[#0069ff]" : "bg-gray-300"
                }`}
                role="switch"
                aria-checked={is24h}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    is24h ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              <span className={`text-[11px] font-medium ${is24h ? "text-[#0069ff] font-bold" : "text-gray-500"}`}>
                24h
              </span>
            </div>
          </div>

          {/* 3. List of Timezones by Bold Categories */}
          <div className="max-h-64 overflow-y-auto text-xs">
            {filteredGroups.length === 0 ? (
              <div className="p-6 text-center text-gray-400">No time zone found</div>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.group} role="group" aria-label={group.group} className="pb-1">
                  {/* Category Header with BOLD Black Font as in Picture */}
                  <div className="px-4 pt-3 pb-1 text-xs font-bold text-gray-900 tracking-wide">
                    {group.group}
                  </div>

                  {/* Options inside category */}
                  <div>
                    {group.items.map((item) => {
                      const isSelected = item.zone === value;
                      const itemTime = formatTimeInZone(item.zone, is24h);

                      return (
                        <button
                          key={item.zone}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            onChange(item.zone);
                            setIsOpen(false);
                            setSearch("");
                          }}
                          className={`w-full px-4 py-2 text-left flex items-center justify-between gap-2 transition-colors ${
                            isSelected
                              ? "bg-[#e8f0fe] text-[#0069ff] font-medium"
                              : "text-gray-800 hover:bg-[#f0f4f9]"
                          }`}
                        >
                          <span className="truncate pr-2">{item.label}</span>
                          <span className="font-mono text-xs text-gray-900 shrink-0">
                            {itemTime}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
