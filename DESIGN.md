# Pedoman Desain & Identitas Visual: LSM Paguyuban Pizza Sandy Shores (PPS)

Dokumen ini adalah acuan arah desain (*Design Direction*) resmi proyek PPS.

Dial: ENERGY 2 / RHYTHM 2 / MOTION 2

## 1. Identitas & Karakter Desain
* **Konsep Inti:** **Syndicate Noir / Tactical Dossier**, memadukan nuansa gurun Sandy Shores (Mojave Matte Sand di mode terang) dan arsip organisasi FiveM/GTA V Roleplay (IME City) yang rapi, modern, dan berwibawa.
* **Karakter:** Bersih, presisi, taktil secara halus, terstruktur seperti portal lembaga kemasyarakatan resmi. **Tidak lagi menggunakan gaya Neo-Brutalism** (tanpa bayangan blok keras 90 derajat `shadow-[4px_4px_0px_#000]`, tanpa garis tepi hitam tebal `border-2/3 border-black`, dan tanpa efek geser X/Y kaku).
* **Prinsip Permukaan & Elevasi:**
  * **Garis Tepi Presisi:** `border` (`1px`) atau `border-[1.5px]` dengan warna halus (`border-black/15` atau `border-black/20` di mode terang, `dark:border-white/10` atau `dark:border-white/15` di mode gelap).
  * **Elevasi Ambient:** Mayoritas kartu duduk rata atau memakai bayangan halus (`shadow-sm` / `shadow-[0_4px_20px_-2px_rgba(15,23,42,0.08)]`). Elevasi lebih dalam hanya dipakai untuk modal, popover, dan tombol mengambang.
  * **Radius Konsisten:** `rounded-xl` (12px-20px) dan `rounded-2xl` (24px) untuk kartu dan modal, `rounded-lg` untuk kontrol ringkas, `rounded-full` khusus untuk avatar, tombol ikon melingkar, dan badge status fungsional.
  * **Interaksi Halus:** Hover mengangkat tipis (`hover:-translate-y-0.5`), klik menekan tipis (`active:translate-y-0.5` atau `active:scale-[0.98]`), serta indikator fokus keyboard yang jelas (`focus-visible:ring-2 focus-visible:ring-[#FACC15]`).

## 2. Palet Warna Resmi
* **Kuning PPS (Aksen Utama):** `#FACC15` (Hover: `#EAB308`)
* **Merah PPS (Aksen Komando / Sekunder):** `#DC2626` (Hover: `#B91C1C`)
* **Kanvas Mode Terang:** `#ECE8DF` (Mojave Matte Sand anti-silau), Kartu `#FFFFFF`, Input `#F6F4ED`
* **Kanvas Mode Gelap:** `#07080E` (Deep Carbon Slate), Kartu `#0B0D14` / `#121622`, Input `#141724`
* **Teks Utama:** `#111827` (terang) / `#F8FAFC` (gelap); Teks Sekunder: `#374151` / `#94A3B8`

## 3. Tipografi
* **Judul Utama & Navigasi:** `Space Grotesk` (tebal, tegas, mudah dipindai).
* **Teks Konten:** `Plus Jakarta Sans` (bersih, kontras tinggi, nyaman dibaca di layar panjang).
* **Kode Tiket / ID KTP / Nominal / Data Teknis:** `JetBrains Mono` (`font-mono`) untuk nuansa berkas administrasi resmi.

## 4. Copywriting & Konteks Komunitas
* Berakar kuat pada komunitas Sandy Shores, GTA V IME Roleplay, warga UMKM, dan kegiatan sosial.
* Menggunakan bahasa Indonesia yang lugas, terstruktur, dan berwibawa tanpa hiperbola marketing generik.
