# Tasarım: Fourier & Spectrum + Analog AM/FM modülleri (Ch 2 & Ch 3)

**Tarih:** 2026-06-13
**Durum:** Onaylandı (brainstorming) → implementasyon planı bekliyor
**Kaynak:** Proakis & Salehi, *Communication Systems Engineering* — `slides/Book.pdf`, Bölüm 2 & 3
**İlgili:** `docs/book-reference.md` (modül ↔ bölüm haritası), `CLAUDE.md` (DSP & UI zorunlu kuralları)

---

## 1. Amaç ve kapsam

Platforma kitabın **Bölüm 2 (Frequency Domain Analysis of Signals and Systems)** ve
**Bölüm 3 (Analog Signal Transmission and Reception)** karşılığı **iki yeni tam modül**
(iki ayrı sayfa) eklenir:

| Sayfa | Route | Nav etiketi | Sayfa başlığı (tam) | Bölüm |
|---|---|---|---|---|
| 1 | `/fourier` | **Fourier & Spectrum** | *Frequency Domain Analysis of Signals and Systems* | Ch 2 |
| 2 | `/analog` | **Analog AM/FM** | *Analog Signal Transmission and Reception* | Ch 3 |

Her modül **4 panel** (comprehensive derinlik) + kontroller + TheoryBox/Formula taşır;
mevcut modül desenini (sampling/modulation/infotheory) izler.

### Onaylanan kararlar
- **İki tam ve eşit modül** (her biri kendi nav girişi + landing kartı). Ch3 kitap
  haritasında "kapsam dışı/arka plan" notlu olsa da kullanıcı tam-eşit işlem istedi.
- **Comprehensive derinlik:** her modülde 4 panel.
- **Paylaşılan FFT motoru:** tek bir DFT/FFT çekirdeği iki modülün (ve ileride
  sampling/baseband'in) altında. Platformda şu an gerçek FFT yok — yalnızca
  `src/lib/dsp/spectrum.ts` analitik çizgi-spektrumu üretiyor.
- **Paralel inşa:** ortak DSP önce (sıralı), iki modül sonra ayrı git worktree'lerinde
  paralel, entegrasyon en sonda tek elden.

---

## 2. Mimari ve paylaşılan temel

### 2.1 Yaklaşım kararı (paylaşılan vs modül-özel DSP)
- **(A) Seçildi — paylaşılan DSP çekirdeği:** Tek `src/lib/dsp/fft.ts` (radix-2
  Cooley-Tukey + N≠2ᵏ için O(N²) DFT yedeği) iki modülde de kullanılır. Tekrarsız,
  testlenebilir, ileride yeniden kullanılır. CLAUDE.md kuralıyla birebir (DSP saf
  fonksiyon, UI'dan ayrık, testli).
- (B) Reddedildi — her modül kendi DSP'si: FFT iki kez yazılır, tutarsızlık + bakım yükü.

### 2.2 Paylaşılan DSP API'leri (Faz 0 — önce, master'da)

`src/lib/dsp/fft.ts`
```ts
export interface Complex { re: number; im: number }
/** İleri DFT: N=2ᵏ ise radix-2 FFT, değilse O(N²) DFT. */
export function fft(x: number[] | Complex[]): Complex[]
export function ifft(X: Complex[]): Complex[]
/** Tek-taraflı/çift-taraflı genlik ve faz spektrumu, fftshift'li ([-fs/2, fs/2)). */
export function spectrum(x: number[], fs: number): { freq: number[]; mag: number[]; phase: number[] }
```

`src/lib/dsp/window.ts`
```ts
export type WindowType = 'rect' | 'hann' | 'hamming'
export function window(type: WindowType, N: number): number[]
```

`src/lib/dsp/signals.ts` (mevcut dosyaya ekleme — periyodik üreteçler)
```ts
export type Periodic = 'square' | 'triangle' | 'sawtooth' | 'pulse'
/** Periyodik dalga formunun t anındaki değeri (temel frekans f0, opsiyonel doluluk). */
export function periodicWave(kind: Periodic, f0: number, t: number, duty?: number): number
```

> Not: mevcut `Tone[]` modeli (sinüs toplamı) ve `spectrum.ts` (analitik çizgiler) korunur;
> FFT bunların yanına gelir, yerini almaz.

---

## 3. Modül A — Fourier & Spectrum (`/fourier`, Ch 2)

Bölüm yapısı (kitap): 2.1 Fourier Serisi · 2.2 Fourier Dönüşümü (2.2.2 Özellikler s.36,
2.2.3 Periyodik s.39) · 2.3 Güç ve Enerji s.40 · 2.4 Örnekleme s.45 · 2.5 Bantgeçiren s.49.

### Paneller

**Panel 1 — Fourier Serisi Sentezleyici** *(§2.1; §2.2.3 s.39)*
- Kontroller: dalga seç (square/triangle/sawtooth/pulse), harmonik sayısı N (1–50),
  temel frekans f₀, (pulse için) doluluk oranı.
- Görsel: kısmi toplam ideal dalganın üzerine biner; süreksizlikte **Gibbs** taşması
  (≈%9). Yanında çizgi spektrumu (cₙ vs n).
- Formül: `x(t)=Σ cₙ e^{j2πnf₀t}`; kare dalga → yalnız tek harmonikler, genlik `(4/π)(1/n)`.

**Panel 2 — DFT/FFT Spektrum Analizörü** *(§2.2 s.35)*
- Kontroller: sinyali tonlardan/dalgadan kur, pencere (rect/Hann/Hamming), N nokta.
- Görsel: **genlik |X(f)|** ve **faz ∠X(f)** spektrumu; pencereyle spektral sızıntı.
- Formül: `X[k]=Σₙ x[n] e^{-j2πkn/N}`. Platformun ilk gerçek FFT'sini buraya bağlar.

**Panel 3 — LTI Süzgeç H(f)** *(§2.2.2 konvolüsyon, s.36)*
- Kontroller: süzgeç tipi (ideal LPF/HPF/BPF veya RC), kesim frekansı/frekansları.
- Görsel: giriş spektrumu × |H(f)| = çıkış spektrumu; ayrıca zaman alanı giriş/çıkış.
- Formül: `Y(f)=H(f)X(f)`; konvolüsyon ↔ çarpım, `y=h∗x`.

**Panel 4 — FT Çiftleri & Özellikler** *(§2.2.2 s.36)*
- Çiftler: `rect↔sinc`, `üçgen↔sinc²`, `gauss↔gauss`.
- Canlı özellikler (kaydıraçla): zaman-kayması t₀ → faz rampası; ölçekleme a →
  ters genişlik; ×cos(2πf_c t) → ±f_c kayma.
- Formül: `rect(t/τ)↔τ·sinc(fτ)`, `x(t−t₀)↔X(f)e^{−j2πft₀}`, `x(at)↔(1/|a|)X(f/a)`.

### DSP — `src/lib/dsp/fourier.ts`
```ts
import type { SpectralLine } from './spectrum'
import type { Periodic } from './signals'
/** Analitik Fourier-serisi katsayıları cₙ. Proakis §2.1 */
export function seriesCoeffs(kind: Periodic, f0: number, N: number, duty?: number): SpectralLine[]
/** N harmonikli kısmi toplam (Gibbs gösterir). */
export function seriesPartialSum(kind: Periodic, f0: number, N: number, t: number): number
export type FilterType = 'lpf' | 'hpf' | 'bpf' | 'rc'
/** Süzgeç frekans yanıtı |H(f)|. */
export function transferMag(type: FilterType, f: number, fc: number, fc2?: number): number
/** Bilinen dönüşüm çifti örnekleri (Panel 4). */
export function ftPair(kind: 'rect' | 'tri' | 'gauss', param: number): { time: { t: number[]; x: number[] }; freq: { f: number[]; mag: number[] } }
```

---

## 4. Modül B — Analog AM/FM (`/analog`, Ch 3)

Bölüm yapısı (kitap): 3.1 Giriş s.70 · 3.2 AM s.71 (3.2.1 DSB-SC s.71, 3.2.2 Konvansiyonel
s.78, 3.2.3 SSB s.81, 3.2.4 VSB s.85, 3.2.5 Modülatör/Demodülatör s.88) · 3.3 Açı
Modülasyonu s.96 (3.3.1 FM/PM gösterimi s.97, 3.3.2 Spektral özellikler s.101, 3.3.3
Modülatör/Demodülatör s.107).

### Paneller

**Panel 1 — AM Modülatör** *(§3.2.1–3.2.3)*
- Kontroller: mesaj tonu f_m (veya çok-tonlu), taşıyıcı f_c & A_c, mod:
  **DSB-SC / Konvansiyonel / SSB (USB/LSB)**, mod-indeksi *a*.
- Görsel: zaman dalgası + zarf eğrisi; *a>1*'de **aşırı-modülasyon** uyarısı; spektrum
  (konvansiyonelde taşıyıcı çizgisi + yan bantlar; DSB-SC'de taşıyıcı yok; SSB'de tek yan bant).
- Formüller (Book.pdf'ten doğrulandı):
  - DSB-SC: `u(t)=m(t)cos2πf_c t` *(§3.2.1, s.71)*
  - Konvansiyonel: `u(t)=A_c[1+a·mₙ(t)]cos2πf_c t`, zarf `A_c[1+a mₙ(t)]` *(§3.2.2, s.78)*
  - SSB: tek yan bant, BW = W *(§3.2.3, s.81)*

**Panel 2 — FM / PM Modülatör** *(§3.3.1–3.3.2)*
- Kontroller: mesaj f_m, mod-indeksi β (FM) veya k_p (PM), taşıyıcı f_c.
- Görsel: sabit zarflı dalga; **anlık frekans** f_i(t); **Bessel** yan bantları Jₙ(β);
  **Carson** bant-genişliği imleci.
- Formüller (doğrulandı):
  - FM: `u(t)=A_c cos(2πf_c t + 2πk_f∫m dτ)`, `f_i=f_c+k_f m(t)` *(§3.3.1, s.97)*
  - Ton-FM spektrumu: `u(t)=A_c Σₙ Jₙ(β) cos2π(f_c+nf_m)t` *(§3.3.2, s.101)*
  - Carson: `B_c = 2(β+1)f_m` *(§3.3.2, s.103 — kitapta birebir)*

**Panel 3 — Güç & Verim** *(§3.2.1–3.2.2)*
- Görsel: taşıyıcı vs yan-bant güç dağılımı (çubuk) + modülasyon verimi η readout.
- Formüller (doğrulandı): taşıyıcı gücü `A_c²/2`, ton yan-bant gücü `A_c²a²/2`;
  ton verimi `η = a²/(2+a²)`, a=1 → **%33**; DSB-SC → η=%100 (taşıyıcı yok).

**Panel 4 — Demodülasyon** *(§3.2.5 s.88; §3.3.3 s.107)*
- Kontroller: AM için **zarf dedektörü** (konvansiyonel) / **eşevreli** (DSB-SC);
  FM için **diskriminatör**.
- Görsel: geri-kazanılan mesaj vs orijinal; *a>1*'de zarf dedektör bozulması; eşevreli
  faz hatasında zayıflama.
- Formül: zarf ∝ `A_c[1+a mₙ(t)]`; eşevreli: `LPF{u(t)·cos2πf_c t} ∝ ½ m(t)`.

### DSP — `src/lib/dsp/analog.ts`
```ts
import type { Tone } from './signals'
export type AmMode = 'dsb' | 'conventional' | 'ssb-usb' | 'ssb-lsb'
/** AM modüle sinyal u(t). Proakis §3.2 */
export function amSignal(mode: AmMode, msg: Tone[], fc: number, Ac: number, a: number, t: number): number
/** Konvansiyonel AM zarfı = Ac[1 + a mₙ(t)]. */
export function amEnvelope(msg: Tone[], Ac: number, a: number, t: number): number
/** Modülasyon verimi η = a²Pmn/(1+a²Pmn). Proakis §3.2.2 */
export function amEfficiency(a: number, Pmn: number): number
export type AngleMode = 'fm' | 'pm'
/** Açı-modüle sinyal. Proakis §3.3.1 */
export function angleSignal(mode: AngleMode, msg: Tone[], fc: number, Ac: number, k: number, t: number): number
/** Anlık frekans f_i(t)=f_c+k_f m(t) (FM). */
export function instantFreq(msg: Tone[], fc: number, kf: number, t: number): number
/** Birinci tür Bessel fonksiyonu Jₙ(β) — ton-FM çizgileri. Proakis §3.3.2 */
export function besselJ(n: number, beta: number): number
/** Carson bant-genişliği B=2(β+1)f_m. */
export function carsonBandwidth(beta: number, fm: number): number
```

---

## 5. Entegrasyon (Faz 2 — tek elden)

- **`src/App.tsx`:** 2 route (`/fourier`, `/analog`) + 2 NAV girişi. Nav sırası kitap
  akışına göre: **Fourier → Analog → Sampling → Modulation → Baseband → Information
  Theory → End-to-End** (Ch2/Ch3 temel olduğu için başta).
- **i18n:** Her track kendi anahtarlarını ayrı fragmana yazar: `src/i18n/fourier.ts`,
  `src/i18n/analog.ts` (her biri `Record<string,string>`). `src/i18n/index.ts` birleştirir:
  `const dict = { ...en, ...fourier, ...analog }`. en.ts'e (ve birbirine) dokunulmaz.
- **Landing `src/pages/landing/modules.config.ts`:** 2 yeni `LANDING_MODULES` kartı
  (`chapter: 'CH 2'`/`'CH 3'`, `status: 'live'`, `route`). `BentoArea` ve `VizKind`
  tipleri yeni değerlerle genişler. Her track kendi landing viz bileşenini getirir:
  `FourierViz` (harmonik birikimi), `AmFmViz` (modüle dalga).

---

## 6. Test planı (Vitest — DSP'nin kalbi)

| Dosya | Kapsam |
|---|---|
| `tests/.../fft.test.ts` | DFT bilinen dönüşümlerle; FFT==DFT eşitliği; Parseval; ifft(fft(x))≈x |
| `tests/.../fourier.test.ts` | kare/üçgen FS katsayıları; rect↔sinc çifti; Gibbs taşma oranı |
| `tests/.../analog.test.ts` | AM zarfı; `amEfficiency(1, 0.5)=1/3`; Bessel Jₙ değerleri (Tablo 3.1); `carsonBandwidth` |
| `tests/pages/*` | her modül için hafif render smoke testi |

Tüm DSP testleri saf fonksiyon (UI'sız). `npm test` + `npm run build` (tsc --noEmit + vite)
+ `npm run lint` entegrasyon kapısı.

---

## 7. Paralel worktree akışı

| Faz | İş | Dosyalar | Nerede |
|---|---|---|---|
| **0** | Paylaşılan FFT temeli | `dsp/fft.ts`, `dsp/window.ts`, `dsp/signals.ts`(+), testleri | master (önce, sıralı) |
| **1a** | Fourier modülü | `dsp/fourier.ts`, `modules/fourier/*`, `landing/viz/FourierViz.tsx`, `i18n/fourier.ts` | worktree `wt-fourier` |
| **1b** | Analog modülü | `dsp/analog.ts`, `modules/analog/*`, `landing/viz/AmFmViz.tsx`, `i18n/analog.ts` | worktree `wt-analog` |
| **2** | Entegrasyon + doğrulama | `App.tsx`, `i18n/index.ts`, `modules.config.ts` + build/test/lint | master |

Faz-1 ajanları **yalnız kendi** `modules/<x>/`, `dsp/<x>.ts`, `i18n/<x>.ts`,
`landing/viz/<x>.tsx` dosyalarına dokunur → paylaşılan dosyada çakışma sıfır. Ortak
dokunma noktaları (App.tsx, i18n/index.ts, modules.config.ts) yalnız Faz 2'de düzenlenir.

---

## 8. Dosya manifesti

**Yeni — paylaşılan (Faz 0):** `src/lib/dsp/fft.ts`, `src/lib/dsp/window.ts`
**Değişen — paylaşılan (Faz 0):** `src/lib/dsp/signals.ts` (periyodik üreteçler)
**Yeni — Fourier (Faz 1a):** `src/lib/dsp/fourier.ts`, `src/modules/fourier/FourierModule.tsx`,
`.../model.ts`, `.../panels.tsx`, `.../fourier.css`, `src/pages/landing/viz/FourierViz.tsx`,
`src/i18n/fourier.ts`
**Yeni — Analog (Faz 1b):** `src/lib/dsp/analog.ts`, `src/modules/analog/AnalogModule.tsx`,
`.../model.ts`, `.../panels.tsx`, `.../analog.css`, `src/pages/landing/viz/AmFmViz.tsx`,
`src/i18n/analog.ts`
**Değişen — entegrasyon (Faz 2):** `src/App.tsx`, `src/i18n/index.ts`,
`src/pages/landing/modules.config.ts`
**Yeni — testler:** `tests/.../fft.test.ts`, `fourier.test.ts`, `analog.test.ts`,
`tests/pages/fourier`, `tests/pages/analog` smoke testleri

---

## 9. Kapsam dışı (YAGNI)

- VSB-AM (§3.2.4) tam implementasyonu — Panel 1'de seçenek olarak *opsiyonel*; ilk
  sürümde DSB-SC/Konvansiyonel/SSB yeterli.
- Süperheterodin alıcı, PLL, radyo/TV yayını detayları (§3.4–3.5).
- Bantgeçiren süreç / Hilbert dönüşümü görselleştirmesi (§2.5) — ileri.
- Gürültü etkisi (Ch5) — bu modüllerin dışında.

---

## 10. Açık notlar / riskler

- **Landing numaralandırma:** mevcut kartlar 01–05 numaralı. Fourier/Analog kitap
  sırasında erken; ya 00/01 olarak öne alınır ya da 06/07 olarak eklenir. Küçük UX
  kararı, entegrasyon fazında netleşir (öneri: kitap sırasına göre yeniden numaralama).
- **Bessel Jₙ(β):** seri açılımı veya Tablo 3.1 değerleriyle; test referansı kitap Tablo 3.1.
- **FFT performansı:** N≤4096 etkileşimli kullanımda yeterli; radix-2 yol ana hat,
  DFT yalnız yedek.
- Tüm formüller koda `// Proakis §x.y, s.N` yorumuyla işlenir (CLAUDE.md zorunlu kuralı).
