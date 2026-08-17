import { NextRequest, NextResponse } from 'next/server';

const COUNTRY_CURRENCIES: Record<string, string> = {
  GH: 'GHS', NG: 'NGN', KE: 'KES', ZA: 'ZAR', UG: 'UGX', TZ: 'TZS', RW: 'RWF',
  ET: 'ETB', EG: 'EGP', MA: 'MAD', DZ: 'DZD', TN: 'TND', CI: 'XOF', SN: 'XOF',
  CM: 'XAF', ZM: 'ZMW', ZW: 'USD', BW: 'BWP', NA: 'NAD', MU: 'MUR', MW: 'MWK',
  AO: 'AOA', MZ: 'MZN', GM: 'GMD', SL: 'SLE', LR: 'LRD',
  US: 'USD', CA: 'CAD', MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP',
  PE: 'PEN', GB: 'GBP', CH: 'CHF', NO: 'NOK', SE: 'SEK', DK: 'DKK', PL: 'PLN',
  CZ: 'CZK', HU: 'HUF', RO: 'RON', TR: 'TRY', UA: 'UAH',
  FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR', IE: 'EUR',
  PT: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR', SK: 'EUR', SI: 'EUR', HR: 'EUR',
  IN: 'INR', PK: 'PKR', BD: 'BDT', LK: 'LKR', NP: 'NPR', CN: 'CNY', JP: 'JPY',
  KR: 'KRW', SG: 'SGD', MY: 'MYR', ID: 'IDR', PH: 'PHP', TH: 'THB', VN: 'VND',
  AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', IL: 'ILS', AU: 'AUD', NZ: 'NZD',
};

const TIMEZONE_COUNTRIES: Record<string, string> = {
  'Africa/Accra': 'GH',
  'Africa/Lagos': 'NG',
  'Africa/Nairobi': 'KE',
  'Africa/Johannesburg': 'ZA',
  'Africa/Kampala': 'UG',
  'Africa/Dar_es_Salaam': 'TZ',
  'Africa/Kigali': 'RW',
  'Africa/Cairo': 'EG',
  'Europe/London': 'GB',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Asia/Kolkata': 'IN',
  'Asia/Dubai': 'AE',
  'Asia/Singapore': 'SG',
  'Asia/Tokyo': 'JP',
  'Australia/Sydney': 'AU',
  'Pacific/Auckland': 'NZ',
};

function countryFromLocale(locale: string | null) {
  if (!locale) return null;
  try {
    return new Intl.Locale(locale.split(',')[0]).region?.toUpperCase() || null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const edgeCountry =
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-country-code');
  const timezone = request.nextUrl.searchParams.get('timezone');
  const locale = request.nextUrl.searchParams.get('locale') || request.headers.get('accept-language');
  const country = (edgeCountry || (timezone ? TIMEZONE_COUNTRIES[timezone] : null) || countryFromLocale(locale) || 'US').toUpperCase();
  const currency = COUNTRY_CURRENCIES[country] || 'USD';

  if (currency === 'USD') {
    return NextResponse.json({ country, currency: 'USD', rate: 1, updatedAt: null });
  }

  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`Rate provider returned ${response.status}`);

    const data = await response.json() as {
      result?: string;
      rates?: Record<string, number>;
      time_last_update_utc?: string;
    };
    const rate = data.rates?.[currency];
    if (data.result !== 'success' || !rate) throw new Error(`No rate available for ${currency}`);

    return NextResponse.json({ country, currency, rate, updatedAt: data.time_last_update_utc || null });
  } catch {
    return NextResponse.json({ country: 'US', currency: 'USD', rate: 1, updatedAt: null });
  }
}
