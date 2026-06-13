/**
 * Enstrüman ekranı paleti. Sayfa teması (koyu/açık) ne olursa olsun SABİT:
 * gerçek bir osiloskop gibi koyu ekran + parlak neon iz. Renkler tokens.css'teki
 * sinyal anlamlarıyla eşleşir (giriş/örnek/sistem/kanal).
 */
export const VIZ = {
  screen: '#04050f', // --scope-bg
  trail: 'rgba(4, 5, 15, 0.22)', // fosfor kalıntısı (persistence)
  green: '#39ff85', // giriş / iz        (--color-x)
  blue: '#7b8cff', // örnekler           (--color-y)
  orange: '#ff8c42', // sistem / S&H      (--color-h)
  pink: '#ff4f9a', // kanal / gürültü     (--color-marker)
  grid: 'rgba(57, 255, 133, 0.07)',
  gridStrong: 'rgba(57, 255, 133, 0.14)',
  axis: 'rgba(123, 140, 255, 0.18)',
  dim: 'rgba(122, 130, 166, 0.4)',
} as const;

/** Box-Muller ile standart normal örnek (gürültü saçılımı için). */
export function gaussian(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
