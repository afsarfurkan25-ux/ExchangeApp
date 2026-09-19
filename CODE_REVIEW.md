# ExchangeApp — Kod İnceleme Raporu

**Tarih:** 23 Şubat 2026  
**İncelenen dosya sayısı:** 20+  
**Tespit edilen sorun sayısı:** 17

---

## 🔴 KRİTİK SORUNLAR

### 1. Şifreler Düz Metin Olarak Saklanıyor

**Dosya:** `src/context/ExchangeContext.tsx` — Satır 40

```typescript
// MEVCUT (SORUNLU):
{ id: '...', name: 'Admin User', username: 'admin', password: '1234', role: 'Admin', status: 'Aktif' }
```

**Sorun:** Şifreler hash'lenmeden (bcrypt, argon2 vb.) düz metin olarak hem kodda hem veritabanında saklanıyor. `authenticateUser()` fonksiyonu da düz metin karşılaştırması yapıyor (satır 377).

**Öneri:** Supabase Auth kullanarak kimlik doğrulamayı tamamen dış servise bırakın veya minimum olarak şifreleri hash'leyerek saklayın.

---

### 2. `BottomBar.tsx` — Yüzde İşareti Yanlış Yerde

**Dosya:** `src/components/Display/BottomBar.tsx` — Satır 66, 101

```diff
// Satır 66 — HAS değişim gösterimi
- %{hasChange}
+ {hasChange}%

// Satır 101 — ONS değişim gösterimi
- %{onsChange}
+ {onsChange}%
```

**Sorun:** Yüzde işareti değerin önünde gösteriliyor (`%2.56`). Doğrusu `2.56%` olmalı.

---

## 🟡 ORTA SEVİYE SORUNLAR

### 3. `Ticker.tsx` — `text` Prop'u Tanımlanıyor Ama Kullanılmıyor

**Dosya:** `src/components/Display/Ticker.tsx` — Satır 3-7

```diff
// MEVCUT (SORUNLU):
  interface TickerProps {
-   text: string;
  }
- const Ticker: React.FC<TickerProps> = () => {
+ const Ticker: React.FC = () => {
```

Ayrıca `src/components/Display/BottomBar.tsx` satır 108'deki çağrıyı da güncelleyin:

```diff
- <Ticker text={scrollingText} />
+ <Ticker />
```

---

### 4. `RateTable.tsx` — `previousRates` Dependency Eksik

**Dosya:** `src/components/Display/RateTable.tsx` — Satır 42-77

```typescript
// MEVCUT (SORUNLU):
useEffect(() => {
    // ...previousRates kullanılıyor ama dependency'de yok
}, [rates]); // ← previousRates eksik!
```

**Sorun:** `useEffect` içinde `previousRates` state'i okunuyor ama dependency array'de yok. Stale closure sorununa yol açabilir.

**Öneri:** `previousRates`'i bir `useRef` ile takip edin:

```typescript
// ÖNERİLEN ÇÖZÜM:
const previousRatesRef = useRef<{ [key: string]: { buy: string; sell: string } }>({});

useEffect(() => {
    if (isFirstRender.current) {
        isFirstRender.current = false;
        const initial: { [key: string]: { buy: string; sell: string } } = {};
        rates.forEach(rate => {
            initial[rate.name] = { buy: rate.buy, sell: rate.sell };
        });
        previousRatesRef.current = initial;
        return;
    }

    const newFlashStates: { [key: string]: { buy?: 'up' | 'down'; sell?: 'up' | 'down' } } = {};

    rates.forEach(rate => {
        const prev = previousRatesRef.current[rate.name];
        if (prev) {
            if (rate.buy !== prev.buy) {
                newFlashStates[rate.name] = { ...newFlashStates[rate.name], buy: parseFloat(rate.buy) > parseFloat(prev.buy) ? 'up' : 'down' };
            }
            if (rate.sell !== prev.sell) {
                newFlashStates[rate.name] = { ...newFlashStates[rate.name], sell: parseFloat(rate.sell) > parseFloat(prev.sell) ? 'up' : 'down' };
            }
        }
    });

    setFlashStates(newFlashStates);

    const newPrevious: { [key: string]: { buy: string; sell: string } } = {};
    rates.forEach(rate => {
        newPrevious[rate.name] = { buy: rate.buy, sell: rate.sell };
    });
    previousRatesRef.current = newPrevious;

    const timer = setTimeout(() => setFlashStates({}), 1500);
    return () => clearTimeout(timer);
}, [rates]);
```

Ayrıca yukarıda `useState` olarak tanımlanan `previousRates` satırını kaldırın:

```diff
- const [previousRates, setPreviousRates] = useState<{ [key: string]: { buy: string; sell: string } }>({});
```

---

### 5. `App.tsx` — Duplicate Import

**Dosya:** `src/App.tsx` — Satır 2, 13

```diff
- import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
  ...
- import { Navigate } from 'react-router-dom';
+ import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
```

---

### 6. `Dashboard.tsx` — Dead Code Bloğu (Yorum İçinde Eski Fonksiyonlar)

**Dosya:** `src/components/Admin/Dashboard.tsx` — Satır 589-619

Aşağıdaki yorum bloğunun tamamını silin:

```typescript
// SİLİNECEK BLOK (satır 589-619):
/* 
// MÜŞTERİ TALEBİ ÜZERİNE DÜZENLEME KAPATILDI (PINNED)
const handleMemberChange = (index: number, field: keyof Member, value: string) => {
    const newMembers = [...localMembers];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setLocalMembers(newMembers);
};

const handleAddMember = () => {
    const newMember: Member = {
        id: Date.now(),
        name: '',
        username: '',
        password: '',
        role: 'Üye',
        status: 'Aktif'
    };
    setLocalMembers([...localMembers, newMember]);
};

const handleDeleteMember = (index: number) => {
    if (localMembers[index].role === 'Admin') {
        alert('Admin kullanıcısı silinemez!');
        return;
    }
    if (window.confirm('Bu üyeyi silmek istediğinize emin misiniz?')) {
        const newMembers = localMembers.filter((_, i) => i !== index);
        setLocalMembers(newMembers);
    }
};
*/
```

---

### 7. Dashboard.tsx & UserPanel.tsx — Monolitik Bileşenler

**Dosyalar:**  
- `src/components/Admin/Dashboard.tsx` — 1917 satır, 102 KB  
- `src/components/User/UserPanel.tsx` — 1400 satır, 89 KB

**Sorun:** Tek dosyada tüm panel mantığı. Bakımı çok zor.

**Öneri — Dashboard.tsx için bölme planı:**

```
src/components/Admin/
├── Dashboard.tsx          ← Ana layout + routing (200 satır)
├── AdminHome.tsx           ← Canlı piyasa verisi
├── RateManagement.tsx      ← Fiyat yönetimi
├── MemberManagement.tsx    ← Üye yönetimi
├── HistoryView.tsx         ← Geçmiş tablosu
├── AdminSidebar.tsx        ← Yan menü
└── adminStyles.ts          ← Ortak stil tanımları
```

**Öneri — UserPanel.tsx için bölme planı:**

```
src/components/User/
├── UserPanel.tsx           ← Ana layout (200 satır)
├── UserRateEditor.tsx      ← Kullanıcı fiyat düzenleme
├── UserTickerEditor.tsx    ← Alt bant düzenleme
├── UserSettings.tsx        ← Ayarlar
└── userStyles.ts           ← Ortak stiller
```

---

### 8. `handleTickerChange` ve `handleTickerItemChange` Çakışması

**Dosya:** `src/components/Admin/Dashboard.tsx` — Satır 504, 582

**Sorun:** İki fonksiyon neredeyse aynı işi yapıyor:
- `handleTickerChange` (satır 504): Otomatik hesaplama yapan versiyon
- `handleTickerItemChange` (satır 582): Basit güncelleme yapan versiyon

**Öneri:** `handleTickerItemChange` fonksiyonunu (satır 582-586) silin ve tüm referanslarını `handleTickerChange` ile değiştirin.

```typescript
// SİLİNECEK (satır 582-586):
const handleTickerItemChange = (index: number, field: keyof TickerItem, value: any) => {
    const newItems = [...localTickerItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setLocalTickerItems(newItems);
};
```

---

### 9. `InfoCarousel.tsx` — SVG Gradient ID Çakışması

**Dosya:** `src/components/Display/InfoCarousel.tsx` — Satır 133

```diff
- <linearGradient id={`chartGrad-${isUp}`} x1="0" y1="0" x2="0" y2="1">
+ <linearGradient id={`chartGrad-${currentSlide}-${isUp}`} x1="0" y1="0" x2="0" y2="1">
```

Ayrıca satır 178'deki referansı da güncelleyin:

```diff
- <path d={fillD} fill={`url(#chartGrad-${isUp})`} />
+ <path d={fillD} fill={`url(#chartGrad-${currentSlide}-${isUp})`} />
```

**Not:** `renderChart` fonksiyonuna `currentSlide` parametresini eklemeniz gerekecek.

---

### 10. `ExchangeContext.tsx` — Realtime Aşırı Yükleme

**Dosya:** `src/context/ExchangeContext.tsx` — Satır 142-150

```typescript
// MEVCUT (SORUNLU):
const channel = supabase.channel('schema-db-changes')
    .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (_payload) => {
            fetchInitialData(); // HER değişiklikte TÜM verileri yeniden çekiyor
        }
    )
    .subscribe();
```

**Öneri:** Tablo bazlı filtreleme yapın veya en azından payload'daki tablo bilgisini kontrol edin:

```typescript
// ÖNERİLEN ÇÖZÜM:
const channel = supabase.channel('schema-db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' },
        () => fetchSettings())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rates' },
        () => fetchRates())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ticker_items' },
        () => fetchTickerItems())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'members' },
        () => fetchMembers())
    .subscribe();
```

Bu durumda `fetchInitialData()` fonksiyonunu `fetchSettings()`, `fetchRates()`, `fetchTickerItems()`, `fetchMembers()` olarak bölmeniz gerekir.

---

## 🔵 SİLİNECEK DOSYALAR

### 11. `src/layouts/Layout.tsx` — SİL

Hiçbir yerde import edilmiyor. Dosyayı tamamen silin.

---

### 12. `src/components/Display/InfoCard.tsx` — SİL

Hiçbir yerde import edilmiyor. Dosyayı tamamen silin.

---

### 13. `src/services/marketApi.ts` — SİL

`getCurrencyRates`, `getGoldRates`, `getSilverRates` fonksiyonları hiçbir yerde çağrılmıyor. Tüm API çağrıları `ExchangeContext.tsx` ve `Dashboard.tsx` içinde doğrudan `fetch()` ile yapılıyor.

**İki seçenek:**
- **A)** Dosyayı silin.
- **B)** Fetch çağrılarını bu dosyada merkezileştirin (daha iyi mimari).

---

### 14. `src/App.css` — SİL

Vite varsayılan şablon dosyası. Projede hiçbir yerde import edilmiyor. `.logo`, `.card`, `.read-the-docs` sınıfları kullanılmıyor.

---

## 🧹 TEMİZLİK

### 15. `index.css` — Tailwind Direktiflerini Kaldır

**Dosya:** `src/index.css` — Satır 3-5

```diff
  @import url('https://fonts.googleapis.com/css2?family=...');

- @tailwind base;
- @tailwind components;
- @tailwind utilities;
```

Proje boyunca hiçbir Tailwind sınıfı kullanılmıyor. Tüm stil inline yazılmış.

**Ek olarak şu dosyaları da silebilirsiniz:**
- `tailwind.config.js`
- `postcss.config.js`

**Ve `package.json`'dan şu devDependencies'leri kaldırabilirsiniz:**
- `tailwindcss`
- `@tailwindcss/postcss`
- `autoprefixer`
- `postcss`

---

### 16. `Dashboard.tsx` — Duplicate `spin` Keyframe

**Dosya:** `src/components/Admin/Dashboard.tsx` — Satır 166

```diff
// SİLİNECEK SATIR (zaten index.css'de tanımlı):
- <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
```

---

## 📊 ÖZET TABLO

| # | Dosya | Sorun | Aksiyon | Seviye |
|---|-------|-------|---------|--------|
| 1 | `ExchangeContext.tsx` | Düz metin şifre | Hash'le veya Supabase Auth | 🔴 |
| 2 | `BottomBar.tsx:66,101` | `%` yanlış yerde | `%{val}` → `{val}%` | 🔴 |
| 3 | `Ticker.tsx` | Unused prop | `text` prop'u kaldır | 🟡 |
| 4 | `RateTable.tsx` | Missing dep | `useRef` kullan | 🟡 |
| 5 | `App.tsx:2,13` | Duplicate import | Birleştir | 🟡 |
| 6 | `Dashboard.tsx:589-619` | Dead code | Yorum bloğunu sil | 🟡 |
| 7 | `Dashboard.tsx / UserPanel.tsx` | Monolitik | Bileşenlere böl | 🟡 |
| 8 | `Dashboard.tsx:504,582` | Çift fonksiyon | Birini sil | 🟡 |
| 9 | `InfoCarousel.tsx:133` | SVG ID çakışması | Benzersiz ID | 🟡 |
| 10 | `ExchangeContext.tsx:142` | Aşırı fetch | Tablo bazlı filtre | 🟡 |
| 11 | `layouts/Layout.tsx` | Kullanılmıyor | **SİL** | 🔵 |
| 12 | `Display/InfoCard.tsx` | Kullanılmıyor | **SİL** | 🔵 |
| 13 | `services/marketApi.ts` | Kullanılmıyor | **SİL** | 🔵 |
| 14 | `App.css` | Kullanılmıyor | **SİL** | 🔵 |
| 15 | `index.css:3-5` | Gereksiz Tailwind | Direktifleri kaldır | 🔵 |
| 16 | `Dashboard.tsx:166` | Duplicate keyframe | Inline style'ı sil | 🔵 |
| 17 | `ExchangeContext.tsx:142` | Wildcard realtime | Tablo bazlı dinle | 🟡 |
