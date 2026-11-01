# DIAMIS

**Demo online:** https://mahdihbb1.github.io/diamis/

Demo statis tiga halaman untuk DIAMIS, alat bantu diagnosis miskonsepsi matematika. Situs membaca penjelasan tertulis siswa, memisahkan kualitas jawaban dari kualitas penalaran, lalu menunjukkan kasus yang perlu ditinjau guru.

Repo ini hanya berisi situs demo yang siap disajikan. Dokumen riset, notebook, data mentah, dan halaman arsip tidak disertakan.

## Menjalankan

Dari folder repo:

```powershell
python -m http.server 8080
```

Buka `http://127.0.0.1:8080/` di browser. Hentikan server dengan `Ctrl+C`.

Membuka `index.html` langsung dari disk juga bisa, tetapi server lokal membuat perilaku font, unduhan CSV, dan tautan relatif lebih dekat dengan kondisi demo.

## Halaman

| Berkas | Isi |
|---|---|
| `index.html` | Beranda: dua respons -3, matriks 2 × 3, demo kartu, alur kerja, hasil |
| `simulasi-ai.html` | Simulasi evaluasi AI: unggah CSV/JSON atau muat sampel, grafik distribusi, sorotan bukti, uji penjelasan, dan skor ilustratif |
| `tentang.html` | Metode, matriks dan audit label, metrik LOQO V0–V3, penamaan MAP@3/top-1, penyaring selektif, batasan, lisensi, persona, glosarium, sumber |

## Yang bisa dicoba

- **Demo kartu** di Beranda: klik tiga kartu untuk melihat diagnosis dan bukti.
- **Simulasi AI**: unggah CSV/JSON atau muat 20 respons sampel; lihat distribusi kelas, label miskonsepsi, sorotan bukti, dan uji penjelasan langsung.
- **Skor ilustratif** di simulator adalah aturan kata kunci, bukan keluaran model notebook.
- **Navigasi mobile** memakai tombol Menu dengan `aria-expanded`.

## Data dan klaim

- 20 baris di `assets/js/data.js` (16 baris dasar + 4 baris batch tambahan) adalah **contoh sintetis**. Bukan baris mentah MIME, bukan data siswa Indonesia, dan tidak memuat nama atau ID asli.
- Angka matriks (14.802 / 403 / 5.265 / 227 / 9.457 / 6.542) berasal dari data MIME penuh berjumlah 36.696 respons. Angka itu tidak dihitung ulang dari 20 baris sintetis. Sel **227** adalah baris berlabel Correct dengan status pilihan salah; makalah membacanya sebagai temuan audit label, bukan bukti 227 siswa bernalar benar.
- Skor seperti 0,87 dan 0,91 adalah **skor ilustratif yang belum dikalibrasi**, bukan probabilitas.
- Data MIME berlisensi CC BY-NC 4.0. Repo ini tidak memuat baris mentah MIME.
- Persona di halaman Tentang adalah asumsi berbasis literatur, bukan hasil wawancara.
- Hasil deteksi terbaru: V2 + kalibrasi pada LOQO 15 soal mencapai akurasi **71,4%** dan macro-F1 **0,695**. V0 pada protokol yang sama adalah 44,4% dan macro-F1 **0,425** (Tabel 4.6); Tabel 4.1 melaporkan baseline prediksi gabungan 0,424.
- V2 dan V3 memakai status kunci jawaban sebagai fitur. Notebook menurunkannya dari prefiks `True_`/`False_`, bukan dari label 3 kelas; di produksi status itu harus dihitung dari kunci guru. Audit data menemukan **227 baris berlabel Correct dengan status pilihan salah**, **797 baris duplikat**, dan **57 kelompok teks identik berlabel berbeda**.
- Metrik **MAP@3 0,9105** dan top-1 **0,8365** (Hit@3 **0,990**) adalah hasil penamaan IndoDistilBERT pada pembagian acak, bukan akurasi deteksi. Angka ini berasal dari 10.000 terjemahan mesin, satu lipatan, bukan validasi siswa Indonesia. LinearSVC 0,904/0,835, DistilBERT Inggris 0,913/0,843, regresi logistik 65 kelas 0,912/0,834; himpunan ujinya berbeda.
- Pada soal baru, penamaan hanya mencapai akurasi **0,023** terhadap batas atas struktural **0,298**, sehingga penamaan diposisikan untuk soal yang sudah dikenal.
- Penyaring selektif V2 sebelum kalibrasi pada ambang 0,90 melayani **23,4%** penjelasan dengan akurasi **82,7%** dan macro-F1 **0,804**. Model akhir memakai ambang 0,80, tetapi cakupan dan akurasi tepatnya belum dicetak.

## Struktur berkas

```text
index.html
simulasi-ai.html
tentang.html
README.md
assets/
  css/style.css
  css/style-v2.css
  js/app.js
  js/app-simple.js
  js/data.js
  fonts/*.woff2
```

Font Fraunces dan IBM Plex disimpan lokal agar demo bisa dibuka offline. Tidak ada CDN, analytics, cookie, atau permintaan jaringan pihak ketiga. `assets/favicon.svg` adalah placeholder inisial D, bukan logo final.

## Pemeriksaan sebelum demo

1. Jalankan server lokal, buka tiga halaman, dan pastikan tidak ada error di konsol.
2. Cek matriks 2 × 3 dan pastikan 227 disebut sebagai temuan audit label.
3. Cek angka 71,4% dan 0,695 di Beranda dan Tentang, serta label MAP@3 0,9105 sebagai metrik penamaan pada soal dikenal.
4. Cek tabel penyaring selektif dan angka penamaan soal baru 0,023/0,298 di halaman Metode.
5. Di simulator, muat sampel 20 baris (KPI `20 / 11 / 3 / 0,83`), uji unggah CSV/JSON, dan cek grafik serta inspector.
6. Uji lebar 360, 768, dan 1366 piksel. Tidak boleh ada gulir horizontal.
7. Uji keyboard: Tab, Enter, dan Escape pada menu mobile.

## Batas versi ini

Belum ada akun, unggahan kelas, backend, model nyata, atau data siswa. Mode Pilot tidak termasuk demo ini. Situs ini simulasi untuk juri, bukan pilot dan bukan klaim peningkatan hasil belajar.
