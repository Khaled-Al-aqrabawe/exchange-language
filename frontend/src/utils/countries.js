// ISO 3166-1 alpha-2 codes for the countries in constants.js COUNTRIES.
const CODES = {
  Afghanistan: 'af', Albania: 'al', Algeria: 'dz', Andorra: 'ad', Angola: 'ao', Argentina: 'ar', Armenia: 'am',
  Australia: 'au', Austria: 'at', Azerbaijan: 'az', Bahrain: 'bh', Bangladesh: 'bd', Belarus: 'by', Belgium: 'be',
  Belize: 'bz', Benin: 'bj', Bhutan: 'bt', Bolivia: 'bo', 'Bosnia and Herzegovina': 'ba', Botswana: 'bw', Brazil: 'br',
  Brunei: 'bn', Bulgaria: 'bg', 'Burkina Faso': 'bf', Burundi: 'bi', Cambodia: 'kh', Cameroon: 'cm', Canada: 'ca',
  Chad: 'td', Chile: 'cl', China: 'cn', Colombia: 'co', Comoros: 'km', 'Costa Rica': 'cr', Croatia: 'hr', Cuba: 'cu',
  Cyprus: 'cy', 'Czech Republic': 'cz', Denmark: 'dk', Djibouti: 'dj', 'Dominican Republic': 'do', Ecuador: 'ec',
  Egypt: 'eg', 'El Salvador': 'sv', Estonia: 'ee', Ethiopia: 'et', Fiji: 'fj', Finland: 'fi', France: 'fr', Gabon: 'ga',
  Gambia: 'gm', Georgia: 'ge', Germany: 'de', Ghana: 'gh', Greece: 'gr', Guatemala: 'gt', Guinea: 'gn', Haiti: 'ht',
  Honduras: 'hn', Hungary: 'hu', Iceland: 'is', India: 'in', Indonesia: 'id', Iran: 'ir', Iraq: 'iq', Ireland: 'ie',
  Israel: 'il', Italy: 'it', 'Ivory Coast': 'ci', Jamaica: 'jm', Japan: 'jp', Jordan: 'jo', Kazakhstan: 'kz', Kenya: 'ke',
  Kuwait: 'kw', Kyrgyzstan: 'kg', Laos: 'la', Latvia: 'lv', Lebanon: 'lb', Lesotho: 'ls', Liberia: 'lr', Libya: 'ly',
  Liechtenstein: 'li', Lithuania: 'lt', Luxembourg: 'lu', Madagascar: 'mg', Malawi: 'mw', Malaysia: 'my',
  Maldives: 'mv', Mali: 'ml', Malta: 'mt', Mauritania: 'mr', Mauritius: 'mu', Mexico: 'mx', Moldova: 'md', Monaco: 'mc',
  Mongolia: 'mn', Montenegro: 'me', Morocco: 'ma', Mozambique: 'mz', Myanmar: 'mm', Namibia: 'na', Nepal: 'np',
  Netherlands: 'nl', 'New Zealand': 'nz', Nicaragua: 'ni', Niger: 'ne', Nigeria: 'ng', 'North Macedonia': 'mk',
  Norway: 'no', Oman: 'om', Pakistan: 'pk', Palestine: 'ps', Panama: 'pa', 'Papua New Guinea': 'pg', Paraguay: 'py',
  Peru: 'pe', Philippines: 'ph', Poland: 'pl', Portugal: 'pt', Qatar: 'qa', Romania: 'ro', Russia: 'ru', Rwanda: 'rw',
  'Saudi Arabia': 'sa', Senegal: 'sn', Serbia: 'rs', Singapore: 'sg', Slovakia: 'sk', Slovenia: 'si', Somalia: 'so',
  'South Africa': 'za', 'South Korea': 'kr', 'South Sudan': 'ss', Spain: 'es', 'Sri Lanka': 'lk', Sudan: 'sd', Sweden: 'se',
  Switzerland: 'ch', Syria: 'sy', Taiwan: 'tw', Tajikistan: 'tj', Tanzania: 'tz', Thailand: 'th', Togo: 'tg',
  Tunisia: 'tn', Turkey: 'tr', Turkmenistan: 'tm', Uganda: 'ug', Ukraine: 'ua', 'United Arab Emirates': 'ae',
  'United Kingdom': 'gb', 'United States': 'us', Uruguay: 'uy', Uzbekistan: 'uz', Venezuela: 've', Vietnam: 'vn',
  Yemen: 'ye', Zambia: 'zm', Zimbabwe: 'zw',
}

// Flag image URL for a country name, or null when unknown. (Images are used instead of flag
// emoji because Windows does not draw flag emoji.)
export function flagUrl(country) {
  const code = CODES[country]
  return code ? `https://flagcdn.com/w40/${code}.png` : null
}
