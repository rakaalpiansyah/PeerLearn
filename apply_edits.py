import os
import re
import docx
from PIL import Image
from docx.opc.constants import RELATIONSHIP_TYPE as RT

SRC = 'LAPORAN PERANCANGAN APLIKASI PEERLEARN KELOMPOK 5_ORIGINAL.docx'
DST = 'LAPORAN PERANCANGAN APLIKASI PEERLEARN KELOMPOK 5.docx'

d = docx.Document(SRC)
P = list(d.paragraphs)
T = d.tables
dele = set()

def st(i, text):
    p = P[i]
    runs = p.runs
    if runs:
        runs[0].text = text
        for r in runs[1:]:
            r._r.getparent().remove(r._r)
    else:
        p.text = text

def delete(*idx):
    for i in idx:
        dele.add(i)

def rng(a, b):
    return range(a, b + 1)

# ---------- COVER ----------
st(1, 'Platform Kolaborasi Belajar Gratis Berbasis Komunitas')

# ---------- BAB I ----------
st(25, 'Dalam kehidupan sehari-hari, mahasiswa dapat menghadapi berbagai kendala, seperti kesulitan memahami materi perkuliahan, keterbatasan biaya untuk mengikuti bimbingan belajar berbayar, serta kesulitan menemukan teman belajar yang sesuai dengan kebutuhan dan jadwalnya. Di sisi lain, terdapat mahasiswa yang menguasai materi atau keterampilan tertentu, seperti pemrograman, desain grafis, bahasa asing, dan metode belajar yang efektif, tetapi belum memiliki sarana yang memadai untuk membagikan pengetahuan tersebut kepada orang yang membutuhkannya.')
st(26, 'Permasalahan lainnya adalah kegiatan belajar bersama sering kali bergantung pada lingkaran pertemanan yang sudah ada. Mahasiswa yang tidak memiliki akses ke kelompok belajar yang sesuai, terutama yang memiliki keterbatasan anggaran, tetap membutuhkan kesempatan untuk belajar, berdiskusi, dan berkolaborasi. Tanpa wadah yang terorganisasi, kegiatan belajar bersama sulit direncanakan, ditemukan, dan dijaga keberlangsungannya.')
st(27, 'Permasalahan tersebut menunjukkan adanya peluang untuk membangun sebuah platform yang mempertemukan individu berdasarkan kebutuhan belajar, keterampilan, dan minat mereka. Platform ini diharapkan menjadi sarana berbagi pengetahuan, membentuk kelompok belajar, dan memperkuat hubungan sosial di lingkungan kampus tanpa mewajibkan pembayaran.')
st(28, 'Berdasarkan gagasan tersebut, kelompok mengusulkan PeerLearn, yaitu aplikasi berbasis digital yang menghubungkan mahasiswa dan masyarakat sekitar kampus melalui kolaborasi belajar gratis. Melalui aplikasi ini, pengguna dapat membuat dan mengikuti kelompok belajar, sesi diskusi, serta kegiatan berbagi pengetahuan.')
st(29, 'PeerLearn diharapkan dapat memperluas akses terhadap bantuan belajar, meningkatkan pemanfaatan pengetahuan dan keterampilan untuk kepentingan bersama, serta membangun budaya saling membantu di lingkungan kampus dan masyarakat. Permasalahan yang dijelaskan dalam laporan ini merupakan hipotesis awal yang selanjutnya perlu divalidasi melalui observasi dan wawancara calon pengguna. Gagasan ini sejalan dengan konsep pembelajaran sebaya (Topping, 1996) dan pembelajaran kooperatif (Slavin, 1996).')

# 1.2
st(34, 'Biaya untuk memperoleh bimbingan belajar dapat menjadi hambatan bagi sebagian mahasiswa.')
st(35, 'Pengetahuan dan keterampilan yang dimiliki mahasiswa belum tentu memiliki saluran yang mudah untuk dibagikan kepada orang lain yang membutuhkan.')
st(36, 'Kegiatan belajar bersama belum tentu mudah diorganisasi karena sulit menyepakati topik, jadwal, dan peran anggota.')

# 1.3
st(42, 'Bagaimana menghubungkan mahasiswa dan masyarakat sekitar kampus yang membutuhkan bantuan belajar dengan pihak yang bersedia berbagi pengetahuan dan keterampilan?')
st(43, 'Bagaimana menyediakan akses belajar dan kolaborasi yang gratis dan mudah dijangkau?')
st(45, 'Bagaimana membangun sistem yang membantu pengguna menilai kepercayaan dan memantau partisipasi dalam kegiatan belajar?')
st(46, 'Bagaimana merancang arsitektur aplikasi yang dapat mendukung layanan kolaborasi belajar PeerLearn?')

# 1.4
st(50, 'Merancang platform yang mempertemukan pengguna yang membutuhkan bantuan belajar dengan pihak yang bersedia berbagi pengetahuan.')
st(51, 'Menyediakan fitur kelompok belajar dan kolaborasi gratis yang dapat diakses seluruh pengguna.')
st(52, 'Mendorong pemanfaatan pengetahuan dan keterampilan mahasiswa untuk kepentingan bersama.')
st(54, 'Meningkatkan kepercayaan pengguna melalui profil, riwayat partisipasi, umpan balik, dan mekanisme pelaporan.')

# 1.5
st(59, 'Mempermudah pencarian teman belajar dan tutor sebaya.')
st(60, 'Memberikan kesempatan berbagi pengetahuan dan keterampilan kepada sesama pengguna.')
st(61, 'Memungkinkan mahasiswa belajar bersama tanpa harus mengeluarkan biaya.')
st(64, 'Mempermudah pencarian kegiatan belajar dengan cakupan lokal.')
st(65, 'Memberikan kesempatan berbagi pengetahuan dan keterampilan kepada komunitas.')

# ---------- BAB II ----------
st(75, 'Sebagai contoh, seorang mahasiswa menguasai desain grafis, tetapi membutuhkan bantuan memahami pemrograman. Mahasiswa lain menguasai pemrograman, tetapi ingin mempelajari dasar desain untuk kegiatan organisasinya. Keduanya dapat saling membantu dan belajar bersama dalam satu kelompok belajar tanpa transaksi apa pun.')
st(77, 'Di sisi lain, mahasiswa yang memahami materi tertentu dapat berperan sebagai tutor sebaya atau penyelenggara sesi belajar. Dengan demikian, pengetahuan yang sebelumnya hanya digunakan untuk kepentingan pribadi berpotensi memberikan manfaat bagi lebih banyak orang.')

# 2.2
st(82, 'Akses terhadap bantuan belajar dan teman belajar')
st(85, 'Hambatan biaya dalam memperoleh bantuan belajar')
st(87, 'Pada saat yang sama, mahasiswa yang memahami materi tertentu berpotensi memberikan manfaat yang lebih luas jika dapat menjangkau teman belajar secara lebih mudah.')
st(88, 'Kesulitan mengorganisasi kegiatan belajar bersama yang tepercaya')
st(89, 'Kegiatan belajar bersama membutuhkan kesepakatan mengenai topik, jadwal, peran anggota, dan tata tertib kegiatan. Tanpa mekanisme yang jelas, kegiatan dapat tidak berjalan sesuai rencana atau menimbulkan kesalahpahaman.')
st(90, 'Oleh karena itu, platform perlu menyediakan informasi kegiatan yang jelas, pengelolaan keanggotaan, pencatatan partisipasi, dan mekanisme pengaduan.')

# 2.3
st(98, 'Pengetahuan mahasiswa belum sepenuhnya terhubung dengan kebutuhan belajar pengguna lain.')
st(99, 'Sebagian pengguna mengalami hambatan biaya dalam memperoleh bantuan belajar.')
st(102, 'Belum tersedianya sarana terpadu yang mudah diakses untuk mempertemukan pengguna dalam kegiatan belajar dan kolaborasi gratis.')
st(104, 'Informasi kebutuhan belajar dan kegiatan belajar bersama tersebar di berbagai saluran.')
st(105, 'Pengguna kesulitan menemukan teman atau kelompok belajar yang sesuai.')
st(106, 'Tidak semua pengguna dapat membayar untuk memperoleh bantuan belajar.')
st(107, 'Kegiatan belajar bersama memerlukan jadwal dan pengelolaan anggota yang jelas.')

# 2.4
st(114, 'Mahasiswa yang menguasai materi atau keterampilan tertentu dan bersedia membagikannya, seperti pemrograman, desain grafis, bahasa asing, dan pengajaran.')
st(115, 'Mahasiswa dengan keterbatasan anggaran, yang membutuhkan alternatif kegiatan belajar gratis.')
delete(116)
st(117, 'Masyarakat sekitar kampus, yang ingin mengikuti kegiatan belajar atau membagikan keterampilan kepada mahasiswa.')

# 2.5
st(125, 'Apakah biaya pernah menjadi hambatan untuk memperoleh bantuan belajar?')
st(126, 'Pengetahuan atau keterampilan apa yang Anda miliki dan bersedia Anda bagikan?')
st(127, 'Apa kendala utama yang Anda alami saat mengikuti atau mengorganisasi kegiatan belajar bersama?')

# ---------- BAB III ----------
st(135, 'PeerLearn merupakan gagasan aplikasi yang mempertemukan mahasiswa dan masyarakat sekitar kampus berdasarkan kebutuhan belajar, keterampilan, dan minat mereka.')
st(136, 'Aplikasi ini berfokus pada satu bentuk interaksi, yaitu kolaborasi belajar gratis, tempat pengguna dapat membuat, menemukan, dan mengikuti kegiatan belajar bersama tanpa kewajiban pembayaran.')
st(137, 'PeerLearn berfungsi sebagai sarana membangun relasi sosial dan memperluas kesempatan belajar. Pengguna dapat berperan sebagai penyelenggara kegiatan, tutor sebaya, atau anggota kelompok belajar.')
st(138, 'Nama PeerLearn berasal dari konsep pembelajaran dan berbagi kemampuan antarsesama. Kata peer merepresentasikan hubungan antarrekan, sedangkan learn menggambarkan kegiatan belajar dan pengembangan kemampuan.')

# 3.2
st(142, 'Menjadi platform kolaborasi belajar berbasis komunitas yang mempermudah akses terhadap kesempatan belajar dan berbagi pengetahuan bagi mahasiswa dan masyarakat sekitar kampus.')
st(144, 'Menghubungkan pengguna yang membutuhkan bantuan belajar dengan pengguna yang bersedia berbagi pengetahuan.')
st(145, 'Menyediakan wadah kelompok belajar dan kolaborasi gratis yang mudah diakses.')
delete(147)

# 3.3
st(150, '3.3 Learn & Collaborate - Belajar dan Kolaborasi Gratis')
delete(*rng(151, 182))
st(183, 'Fitur utama ini menyediakan kesempatan untuk belajar dan bekerja sama tanpa kewajiban membayar.')
st(198, 'Poin kontribusi digunakan untuk mengapresiasi partisipasi dan bukan sebagai jaminan bahwa kualitas bantuan selalu baik.')

# 3.5
st(202, 'Keunggulan utama PeerLearn adalah fokusnya pada kolaborasi belajar yang gratis, terbuka, dan berbasis komunitas.')
st(203, 'Pertama, seluruh kegiatan dapat diikuti tanpa biaya sehingga hambatan finansial tidak menghalangi partisipasi. Kedua, pengguna dapat berperan sebagai anggota maupun penyelenggara sehingga pengetahuan mengalir dua arah. Ketiga, riwayat partisipasi dan umpan balik membantu pengguna membangun kepercayaan.')
st(204, 'Pendekatan tersebut memungkinkan pengguna dengan latar belakang finansial dan kemampuan yang berbeda untuk berpartisipasi sesuai kebutuhannya.')

# 3.6
st(208, 'Sebagai contoh, mahasiswa A membutuhkan bantuan memahami pemrograman dasar untuk tugas kuliahnya, tetapi tidak memiliki anggaran untuk mengikuti bimbingan belajar berbayar.')
st(209, 'Mahasiswa A mencari kegiatan belajar melalui PeerLearn dan menemukan grup belajar pemrograman yang dibuat oleh mahasiswa B. Setelah melihat topik, jadwal, dan kapasitas kegiatan, mahasiswa A bergabung dengan grup tersebut.')
st(210, 'Selama kegiatan berlangsung, mahasiswa B sebagai penyelenggara membimbing anggota, sedangkan anggota lain saling berdiskusi dan berbagi catatan. Setelah kegiatan selesai, mahasiswa A memberikan umpan balik dan partisipasinya tercatat pada profil.')
st(211, 'Pada kesempatan lain, mahasiswa A yang memiliki keterampilan desain grafis dapat membuat sesi berbagi tentang dasar desain bagi mahasiswa lain sehingga ia berperan sebagai penyelenggara.')
st(212, 'Skenario tersebut menggambarkan bagaimana satu pengguna dapat berpindah peran antara anggota dan penyelenggara sesuai kebutuhan dalam satu platform.')

# ---------- BAB IV ----------
st(223, 'Komponen tersebut dirancang agar seluruh fitur kolaborasi menggunakan pengelolaan pengguna dan data yang terintegrasi.')
st(225, 'Gambar 4.1 menunjukkan arsitektur berlapis PeerLearn, mulai dari pengguna, antarmuka, autentikasi, backend dengan empat modul layanan, hingga database dan penyimpanan berkas.')
st(228, 'Dashboard admin menggunakan autentikasi dan backend yang sama, dengan hak akses khusus untuk moderasi.')
st(233, 'Mahasiswa dapat membuat profil, mencari kegiatan belajar, membuat dan mengelola grup belajar, mengikuti sesi belajar, memberikan umpan balik, dan mengirim laporan.')
st(235, 'Masyarakat dapat mengikuti kegiatan belajar yang tersedia dan membagikan keterampilan melalui sesi berbagi sesuai ketentuan platform.')
st(237, 'Administrator bertugas memoderasi konten, menangani laporan pengguna, memeriksa aktivitas yang mencurigakan, dan menangani pelanggaran tata tertib sesuai kebijakan aplikasi.')

# 4.4
st(241, 'Gambar 4.2 meringkas alur kolaborasi belajar dari sisi anggota dan penyelenggara kegiatan; rinciannya diuraikan pada bagian A dan B.')
st(243, 'Gambar 4.2 Alur proses kolaborasi belajar PeerLearn')
st(244, 'Alur anggota kegiatan')
A = ['Pengguna mencari grup atau sesi belajar.',
     'Pengguna melihat topik, jadwal, dan kapasitas kegiatan.',
     'Pengguna mengajukan permintaan bergabung atau mendaftar.',
     'Penyelenggara menyetujui permintaan atau mengonfirmasi pendaftaran.',
     'Sistem mencatat keanggotaan pengguna.',
     'Anggota mengikuti kegiatan sesuai jadwal.',
     'Anggota memberikan umpan balik setelah kegiatan.',
     'Kontribusi yang terverifikasi dapat dicatat dalam profil.']
for k, t in zip(rng(245, 252), A): st(k, t)

st(253, 'Alur penyelenggara kegiatan')
B = ['Penyelenggara membuat kegiatan belajar beserta topik dan deskripsi.',
     'Penyelenggara menentukan jadwal dan kapasitas peserta.',
     'Sistem menampilkan kegiatan pada hasil pencarian.',
     'Penyelenggara mengelola permintaan dan keanggotaan peserta.',
     'Kegiatan belajar berlangsung.',
     'Penyelenggara mengevaluasi kegiatan berdasarkan umpan balik anggota.',
     'Sistem memperbarui riwayat kegiatan dan kontribusi penyelenggara.']
for k, t in zip(rng(254, 260), B): st(k, t)
delete(*rng(261, 268))

# 4.5 note
st(274, 'Untuk fitur kegiatan belajar, sistem perlu membedakan status kegiatan (dibuka, berlangsung, selesai, atau dibatalkan) dari status keanggotaan setiap pengguna (menunggu persetujuan, diterima, ditolak, atau keluar).')

# 4.6
st(277, 'Kepercayaan menjadi aspek penting karena PeerLearn mempertemukan pengguna untuk berinteraksi, berbagi pengetahuan, dan berkolaborasi dalam kegiatan belajar.')
st(284, 'Riwayat perubahan status kegiatan dan keanggotaan.')
st(286, 'Prosedur penanganan pelanggaran tata tertib dan penyalahgunaan platform.')

# ---------- BAB V ----------
st(299, 'Mahasiswa dapat menggunakan pengetahuan dan kemampuan yang dimiliki untuk membantu pengguna lain melalui sesi belajar dan berbagi.')
st(300, 'Akses belajar tanpa biaya')
st(301, 'Kolaborasi belajar gratis dapat membuka kesempatan memperoleh bantuan bagi pengguna yang memiliki keterbatasan anggaran.')
st(303, 'Interaksi melalui kegiatan belajar dan berbagi pengetahuan dapat memperluas jaringan sosial antara mahasiswa dan masyarakat sekitar kampus.')
st(305, 'Melalui peran sebagai penyelenggara maupun anggota kegiatan, mahasiswa dapat berlatih berkomunikasi, mengelola waktu, bertanggung jawab, dan membangun portofolio kontribusi.')
st(319, 'Membuat prototipe yang memuat profil pengguna, profil keahlian, fitur grup belajar, pencarian kegiatan, serta status kegiatan dan keanggotaan.')
st(321, 'Meminta calon pengguna mencoba skenario membuat, mencari, dan mengikuti kegiatan belajar, kemudian mengumpulkan masukan.')
st(328, 'Katalog topik dan keterampilan dengan kategori yang ditentukan.')
st(329, 'Pencatatan keanggotaan dan status kegiatan.')
delete(330)
st(332, 'Umpan balik, reputasi, dan pelaporan pengguna.')
st(333, 'Rekomendasi teman belajar berbasis kecerdasan buatan, sesi belajar daring terintegrasi, dan perluasan ke banyak wilayah ditempatkan sebagai pengembangan lanjutan. Prioritas tersebut membantu kelompok membuktikan manfaat inti aplikasi sebelum menambahkan kompleksitas teknis.')

# ---------- BAB VI ----------
st(338, 'Aplikasi ini berfokus pada kolaborasi belajar gratis. Fokus tersebut memungkinkan pengguna memperoleh bantuan sesuai kebutuhan dan kemampuannya, sekaligus memberikan kesempatan untuk berbagi pengetahuan dan mengembangkan keterampilan tanpa hambatan biaya.')
st(344, 'Selain itu, pengelolaan keamanan, privasi, reputasi, dan penanganan pelanggaran tata tertib harus diperhatikan sejak awal. Fitur tambahan seperti rekomendasi teman belajar perlu dikembangkan secara bertahap dengan mempertimbangkan kebutuhan operasional dan ketentuan yang berlaku.')

# Daftar pustaka: Botsman & Rogers tidak lagi dikutip
delete(369)

# ---------- TABLES ----------
def cell_set(cell, text):
    p = cell.paragraphs[0]; rs = p.runs
    rs[0].text = text
    for r in rs[1:]: r._r.getparent().remove(r._r)

# T0 fitur
t0 = T[0]
cell_set(t0.rows[2].cells[0], 'Profil keahlian')
cell_set(t0.rows[2].cells[1], 'Menampilkan topik yang dikuasai dan topik yang ingin dipelajari')
cell_set(t0.rows[5].cells[1], 'Membuat dan mengikuti kegiatan belajar bersama')
cell_set(t0.rows[6].cells[1], 'Menyaring kegiatan berdasarkan topik, jadwal, dan lokasi umum')
cell_set(t0.rows[7].cells[0], 'Status kegiatan')
cell_set(t0.rows[7].cells[1], 'Melacak pendaftaran, jadwal, dan status kegiatan belajar')
cell_set(t0.rows[8].cells[0], 'Umpan balik dan reputasi')
cell_set(t0.rows[8].cells[1], 'Memberikan informasi pengalaman dan kontribusi pengguna lain')
cell_set(t0.rows[9].cells[1], 'Menangani dugaan penyalahgunaan, perilaku tidak pantas, atau pelanggaran tata tertib')
r3, r4 = t0.rows[3]._tr, t0.rows[4]._tr
t0._tbl.remove(r3)
t0._tbl.remove(r4)

# T1 database
t1 = T[1]
cell_set(t1.rows[3].cells[1], 'ID pengguna, ID keterampilan, jenis (dikuasai atau ingin dipelajari)')
cell_set(t1.rows[9].cells[0], 'Feedback')
cell_set(t1.rows[9].cells[1], 'ID kegiatan, ID pemberi umpan balik, nilai, komentar')
rr = [t1.rows[4]._tr, t1.rows[5]._tr, t1.rows[6]._tr]
for x in rr: t1._tbl.remove(x)

# T3 indikator
t3 = T[3]
cell_set(t3.rows[3].cells[0], 'Partisipasi anggota')
cell_set(t3.rows[3].cells[1], 'Jumlah anggota yang bergabung dan menghadiri kegiatan belajar')
cell_set(t3.rows[7].cells[1], 'Penilaian terhadap kejelasan profil, informasi kegiatan, dan mekanisme pelaporan')
rr = [t3.rows[4]._tr, t3.rows[6]._tr]
for x in rr: t3._tbl.remove(x)

# ---------- DELETE PARAGRAPHS ----------
for i in sorted(dele):
    e = P[i]._p
    p_parent = e.getparent()
    if p_parent is not None:
        p_parent.remove(e)

# ---------- IMAGES ----------
newimg = {'image2.png': 'image2.png', 'image3.png': 'image3.png', 'image4.png': 'image4.png'}
for rel in d.part.rels.values():
    if rel.reltype == RT.IMAGE:
        n = str(rel.target_part.partname).split('/')[-1]
        if n in newimg:
            rel.target_part._blob = open(newimg[n], 'rb').read()

# resize shapes to the new aspect ratios
for sh in d.inline_shapes:
    rid = sh._inline.graphic.graphicData.pic.blipFill.blip.embed
    n = str(d.part.rels[rid].target_part.partname).split('/')[-1]
    if n in newimg:
        w, h = Image.open(newimg[n]).size
        sh.height = int(sh.width * h / w)

d.save(DST)
print('Successfully saved updated document to', DST)
