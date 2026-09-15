// DITHAR — bundled offline city dataset for manual location selection.
//
// Step 4 of the global hybrid prayer-time architecture. Deliberately
// offline/bundled — no network call, no API key, works with no
// connectivity — matching this project's existing "no external service"
// philosophy (e.g. the Hijri calendar via Intl's built-in ICU data
// instead of a geocoding API). Coverage is only as good as this list; it
// is not a claim of global completeness, just a reasonable set of major
// world cities to search/select from, weighted toward the
// countries already mapped in countryCalculationMethod.ts plus a few
// deliberately-unmapped examples (e.g. Brazil, Russia) so a user outside
// every mapped country can still pick a city and correctly fall through
// to the Muslim World League default there.
//
// Coordinates are city-center approximations (a few hundred meters to a
// couple of kilometers off a specific address), which is more than
// sufficient for prayer-time calculation — Fajr/Isha angle-based times
// shift by only fractions of a minute per kilometer at these latitudes.
// Timezones are the real IANA identifiers, verified against the standard
// tzdb naming (canonical zones, not deprecated aliases).
export interface CityRecord {
  /** Stable id — never reused/repurposed once shipped, since a saved
   *  manual selection stores this id's snapshot fields directly (see
   *  locationSettings.ts), but a stable id still matters for the
   *  search/list UI's React keys and for de-duplication. */
  id: string;
  nameAr: string;
  nameEn: string;
  /** ISO 3166-1 alpha-2 country code — the SAME code space
   *  countryCalculationMethod.ts's table keys on. */
  countryCode: string;
  countryNameAr: string;
  countryNameEn: string;
  latitude: number;
  longitude: number;
  /** IANA timezone identifier. */
  timezone: string;
}

export const CITIES: readonly CityRecord[] = [
  // Gulf / Middle East
  { id: "kuwait-city", nameAr: "الكويت", nameEn: "Kuwait City", countryCode: "KW", countryNameAr: "الكويت", countryNameEn: "Kuwait", latitude: 29.3759, longitude: 47.9774, timezone: "Asia/Kuwait" },
  { id: "riyadh", nameAr: "الرياض", nameEn: "Riyadh", countryCode: "SA", countryNameAr: "السعودية", countryNameEn: "Saudi Arabia", latitude: 24.7136, longitude: 46.6753, timezone: "Asia/Riyadh" },
  { id: "jeddah", nameAr: "جدة", nameEn: "Jeddah", countryCode: "SA", countryNameAr: "السعودية", countryNameEn: "Saudi Arabia", latitude: 21.4858, longitude: 39.1925, timezone: "Asia/Riyadh" },
  { id: "mecca", nameAr: "مكة المكرمة", nameEn: "Mecca", countryCode: "SA", countryNameAr: "السعودية", countryNameEn: "Saudi Arabia", latitude: 21.3891, longitude: 39.8579, timezone: "Asia/Riyadh" },
  { id: "medina", nameAr: "المدينة المنورة", nameEn: "Medina", countryCode: "SA", countryNameAr: "السعودية", countryNameEn: "Saudi Arabia", latitude: 24.5247, longitude: 39.5692, timezone: "Asia/Riyadh" },
  { id: "dubai", nameAr: "دبي", nameEn: "Dubai", countryCode: "AE", countryNameAr: "الإمارات", countryNameEn: "United Arab Emirates", latitude: 25.2048, longitude: 55.2708, timezone: "Asia/Dubai" },
  { id: "abu-dhabi", nameAr: "أبوظبي", nameEn: "Abu Dhabi", countryCode: "AE", countryNameAr: "الإمارات", countryNameEn: "United Arab Emirates", latitude: 24.4539, longitude: 54.3773, timezone: "Asia/Dubai" },
  { id: "doha", nameAr: "الدوحة", nameEn: "Doha", countryCode: "QA", countryNameAr: "قطر", countryNameEn: "Qatar", latitude: 25.2854, longitude: 51.5310, timezone: "Asia/Qatar" },
  { id: "manama", nameAr: "المنامة", nameEn: "Manama", countryCode: "BH", countryNameAr: "البحرين", countryNameEn: "Bahrain", latitude: 26.2285, longitude: 50.5860, timezone: "Asia/Bahrain" },
  { id: "muscat", nameAr: "مسقط", nameEn: "Muscat", countryCode: "OM", countryNameAr: "عُمان", countryNameEn: "Oman", latitude: 23.5880, longitude: 58.3829, timezone: "Asia/Muscat" },
  { id: "amman", nameAr: "عمّان", nameEn: "Amman", countryCode: "JO", countryNameAr: "الأردن", countryNameEn: "Jordan", latitude: 31.9454, longitude: 35.9284, timezone: "Asia/Amman" },
  { id: "beirut", nameAr: "بيروت", nameEn: "Beirut", countryCode: "LB", countryNameAr: "لبنان", countryNameEn: "Lebanon", latitude: 33.8938, longitude: 35.5018, timezone: "Asia/Beirut" },
  { id: "baghdad", nameAr: "بغداد", nameEn: "Baghdad", countryCode: "IQ", countryNameAr: "العراق", countryNameEn: "Iraq", latitude: 33.3152, longitude: 44.3661, timezone: "Asia/Baghdad" },
  { id: "damascus", nameAr: "دمشق", nameEn: "Damascus", countryCode: "SY", countryNameAr: "سوريا", countryNameEn: "Syria", latitude: 33.5138, longitude: 36.2765, timezone: "Asia/Damascus" },
  { id: "sanaa", nameAr: "صنعاء", nameEn: "Sana'a", countryCode: "YE", countryNameAr: "اليمن", countryNameEn: "Yemen", latitude: 15.3694, longitude: 44.1910, timezone: "Asia/Aden" },

  // North Africa
  { id: "cairo", nameAr: "القاهرة", nameEn: "Cairo", countryCode: "EG", countryNameAr: "مصر", countryNameEn: "Egypt", latitude: 30.0444, longitude: 31.2357, timezone: "Africa/Cairo" },
  { id: "alexandria", nameAr: "الإسكندرية", nameEn: "Alexandria", countryCode: "EG", countryNameAr: "مصر", countryNameEn: "Egypt", latitude: 31.2001, longitude: 29.9187, timezone: "Africa/Cairo" },
  { id: "casablanca", nameAr: "الدار البيضاء", nameEn: "Casablanca", countryCode: "MA", countryNameAr: "المغرب", countryNameEn: "Morocco", latitude: 33.5731, longitude: -7.5898, timezone: "Africa/Casablanca" },
  { id: "rabat", nameAr: "الرباط", nameEn: "Rabat", countryCode: "MA", countryNameAr: "المغرب", countryNameEn: "Morocco", latitude: 34.0209, longitude: -6.8416, timezone: "Africa/Casablanca" },
  { id: "tunis", nameAr: "تونس", nameEn: "Tunis", countryCode: "TN", countryNameAr: "تونس", countryNameEn: "Tunisia", latitude: 36.8065, longitude: 10.1815, timezone: "Africa/Tunis" },
  { id: "algiers", nameAr: "الجزائر", nameEn: "Algiers", countryCode: "DZ", countryNameAr: "الجزائر", countryNameEn: "Algeria", latitude: 36.7538, longitude: 3.0588, timezone: "Africa/Algiers" },
  { id: "tripoli-ly", nameAr: "طرابلس", nameEn: "Tripoli", countryCode: "LY", countryNameAr: "ليبيا", countryNameEn: "Libya", latitude: 32.8872, longitude: 13.1913, timezone: "Africa/Tripoli" },
  { id: "khartoum", nameAr: "الخرطوم", nameEn: "Khartoum", countryCode: "SD", countryNameAr: "السودان", countryNameEn: "Sudan", latitude: 15.5007, longitude: 32.5599, timezone: "Africa/Khartoum" },

  // Turkey
  { id: "istanbul", nameAr: "إسطنبول", nameEn: "Istanbul", countryCode: "TR", countryNameAr: "تركيا", countryNameEn: "Turkey", latitude: 41.0082, longitude: 28.9784, timezone: "Europe/Istanbul" },
  { id: "ankara", nameAr: "أنقرة", nameEn: "Ankara", countryCode: "TR", countryNameAr: "تركيا", countryNameEn: "Turkey", latitude: 39.9334, longitude: 32.8597, timezone: "Europe/Istanbul" },

  // South Asia
  { id: "karachi", nameAr: "كراتشي", nameEn: "Karachi", countryCode: "PK", countryNameAr: "باكستان", countryNameEn: "Pakistan", latitude: 24.8607, longitude: 67.0011, timezone: "Asia/Karachi" },
  { id: "lahore", nameAr: "لاهور", nameEn: "Lahore", countryCode: "PK", countryNameAr: "باكستان", countryNameEn: "Pakistan", latitude: 31.5497, longitude: 74.3436, timezone: "Asia/Karachi" },
  { id: "islamabad", nameAr: "إسلام آباد", nameEn: "Islamabad", countryCode: "PK", countryNameAr: "باكستان", countryNameEn: "Pakistan", latitude: 33.6844, longitude: 73.0479, timezone: "Asia/Karachi" },
  { id: "delhi", nameAr: "دلهي", nameEn: "Delhi", countryCode: "IN", countryNameAr: "الهند", countryNameEn: "India", latitude: 28.6139, longitude: 77.2090, timezone: "Asia/Kolkata" },
  { id: "mumbai", nameAr: "مومباي", nameEn: "Mumbai", countryCode: "IN", countryNameAr: "الهند", countryNameEn: "India", latitude: 19.0760, longitude: 72.8777, timezone: "Asia/Kolkata" },
  { id: "dhaka", nameAr: "دكا", nameEn: "Dhaka", countryCode: "BD", countryNameAr: "بنغلاديش", countryNameEn: "Bangladesh", latitude: 23.8103, longitude: 90.4125, timezone: "Asia/Dhaka" },
  { id: "kabul", nameAr: "كابل", nameEn: "Kabul", countryCode: "AF", countryNameAr: "أفغانستان", countryNameEn: "Afghanistan", latitude: 34.5553, longitude: 69.2075, timezone: "Asia/Kabul" },

  // Southeast Asia
  { id: "kuala-lumpur", nameAr: "كوالالمبور", nameEn: "Kuala Lumpur", countryCode: "MY", countryNameAr: "ماليزيا", countryNameEn: "Malaysia", latitude: 3.1390, longitude: 101.6869, timezone: "Asia/Kuala_Lumpur" },
  { id: "jakarta", nameAr: "جاكرتا", nameEn: "Jakarta", countryCode: "ID", countryNameAr: "إندونيسيا", countryNameEn: "Indonesia", latitude: -6.2088, longitude: 106.8456, timezone: "Asia/Jakarta" },
  { id: "singapore", nameAr: "سنغافورة", nameEn: "Singapore", countryCode: "SG", countryNameAr: "سنغافورة", countryNameEn: "Singapore", latitude: 1.3521, longitude: 103.8198, timezone: "Asia/Singapore" },
  { id: "bandar-seri-begawan", nameAr: "بندر سري بكاوان", nameEn: "Bandar Seri Begawan", countryCode: "BN", countryNameAr: "بروناي", countryNameEn: "Brunei", latitude: 4.9031, longitude: 114.9398, timezone: "Asia/Brunei" },

  // Europe
  { id: "london", nameAr: "لندن", nameEn: "London", countryCode: "GB", countryNameAr: "المملكة المتحدة", countryNameEn: "United Kingdom", latitude: 51.5072, longitude: -0.1276, timezone: "Europe/London" },
  { id: "paris", nameAr: "باريس", nameEn: "Paris", countryCode: "FR", countryNameAr: "فرنسا", countryNameEn: "France", latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris" },
  { id: "berlin", nameAr: "برلين", nameEn: "Berlin", countryCode: "DE", countryNameAr: "ألمانيا", countryNameEn: "Germany", latitude: 52.5200, longitude: 13.4050, timezone: "Europe/Berlin" },
  { id: "amsterdam", nameAr: "أمستردام", nameEn: "Amsterdam", countryCode: "NL", countryNameAr: "هولندا", countryNameEn: "Netherlands", latitude: 52.3676, longitude: 4.9041, timezone: "Europe/Amsterdam" },
  { id: "reykjavik", nameAr: "ريكيافيك", nameEn: "Reykjavik", countryCode: "IS", countryNameAr: "آيسلندا", countryNameEn: "Iceland", latitude: 64.1466, longitude: -21.9426, timezone: "Atlantic/Reykjavik" },

  // North America
  { id: "new-york", nameAr: "نيويورك", nameEn: "New York", countryCode: "US", countryNameAr: "الولايات المتحدة", countryNameEn: "United States", latitude: 40.7128, longitude: -74.0060, timezone: "America/New_York" },
  { id: "los-angeles", nameAr: "لوس أنجلوس", nameEn: "Los Angeles", countryCode: "US", countryNameAr: "الولايات المتحدة", countryNameEn: "United States", latitude: 34.0522, longitude: -118.2437, timezone: "America/Los_Angeles" },
  { id: "chicago", nameAr: "شيكاغو", nameEn: "Chicago", countryCode: "US", countryNameAr: "الولايات المتحدة", countryNameEn: "United States", latitude: 41.8781, longitude: -87.6298, timezone: "America/Chicago" },
  { id: "toronto", nameAr: "تورونتو", nameEn: "Toronto", countryCode: "CA", countryNameAr: "كندا", countryNameEn: "Canada", latitude: 43.6532, longitude: -79.3832, timezone: "America/Toronto" },
  { id: "montreal", nameAr: "مونتريال", nameEn: "Montreal", countryCode: "CA", countryNameAr: "كندا", countryNameEn: "Canada", latitude: 45.5019, longitude: -73.5674, timezone: "America/Toronto" },

  // Sub-Saharan Africa
  { id: "lagos", nameAr: "لاغوس", nameEn: "Lagos", countryCode: "NG", countryNameAr: "نيجيريا", countryNameEn: "Nigeria", latitude: 6.5244, longitude: 3.3792, timezone: "Africa/Lagos" },
  { id: "nairobi", nameAr: "نيروبي", nameEn: "Nairobi", countryCode: "KE", countryNameAr: "كينيا", countryNameEn: "Kenya", latitude: -1.2921, longitude: 36.8219, timezone: "Africa/Nairobi" },
  { id: "johannesburg", nameAr: "جوهانسبرغ", nameEn: "Johannesburg", countryCode: "ZA", countryNameAr: "جنوب أفريقيا", countryNameEn: "South Africa", latitude: -26.2041, longitude: 28.0473, timezone: "Africa/Johannesburg" },

  // Australia
  { id: "sydney", nameAr: "سيدني", nameEn: "Sydney", countryCode: "AU", countryNameAr: "أستراليا", countryNameEn: "Australia", latitude: -33.8688, longitude: 151.2093, timezone: "Australia/Sydney" },

  // Deliberately-unmapped-country examples (see countryCalculationMethod.ts)
  // — exercise the Muslim World League fallback for manual selection too.
  { id: "sao-paulo", nameAr: "ساو باولو", nameEn: "São Paulo", countryCode: "BR", countryNameAr: "البرازيل", countryNameEn: "Brazil", latitude: -23.5505, longitude: -46.6333, timezone: "America/Sao_Paulo" },
  { id: "moscow", nameAr: "موسكو", nameEn: "Moscow", countryCode: "RU", countryNameAr: "روسيا", countryNameEn: "Russia", latitude: 55.7558, longitude: 37.6173, timezone: "Europe/Moscow" },
];

const countryNamesByCode = new Map<string, { ar: string; en: string }>();
for (const city of CITIES) {
  if (!countryNamesByCode.has(city.countryCode)) {
    countryNamesByCode.set(city.countryCode, { ar: city.countryNameAr, en: city.countryNameEn });
  }
}

// Looks up the bundled localized country name for an ISO 3166-1 alpha-2
// code, from this same CITIES dataset's own countryNameAr/countryNameEn
// fields (the one place those names already live — see
// PrayerTimesPanel.tsx, which pairs this with an ActiveLocationRecord's
// own cityNameAr/cityNameEn to build a "City, Country" display label).
// `undefined` for a code this bundle has no city for — the caller must
// fall back to something else (e.g. coordinates), never to a hardcoded
// country name.
export function getCountryName(countryCode: string, language: "ar" | "en"): string | undefined {
  return countryNamesByCode.get(countryCode)?.[language];
}
