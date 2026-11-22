// Shared by the server and browser: Vietnamese text without accents or case differences.
export function normalizeText(value){
 return String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/\s+/gu,' ').trim();
}
export function matchesSearch(values,query){
 const haystack=normalizeText(Array.isArray(values)?values.flat(Infinity).join(' '):values);
 return normalizeText(query).split(' ').filter(Boolean).every(word=>haystack.includes(word));
}
