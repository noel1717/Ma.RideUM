document.addEventListener('DOMContentLoaded', function () {
    const detailModal = new bootstrap.Modal(document.getElementById('detailModal'));
    const btnDetailList = document.querySelectorAll('.btnDetail');
    const modalJudul = document.getElementById('modal-judul-produk');
    const modalDeskripsi = document.getElementById('modal-deskripsi-produk');
    const modalGambar = document.getElementById('modal-gambar-produk');
    const modalBiayaPerjalanan = document.getElementById('modal-biaya-perjalanan');
    const modalTotalPembayaran = document.getElementById('modal-total-pembayaran');
    const bookingForm = document.getElementById('bookingForm');
    const namaPembeliInput = document.getElementById('namaPembeli');
    const alamatLengkapInput = document.getElementById('alamatLengkap');
    const lokasiGoogleMapsInput = document.getElementById('lokasiGoogleMaps');
    const shareLocBtn = document.getElementById('shareLocBtn');
    const geolocationError = document.getElementById('geolocationError');
    const tanggalBookingInput = document.getElementById('tanggalBooking');
    const pilihanJamBerangkatContainer = document.getElementById('pilihanJamBerangkatContainer');
    const pilihanJamPulangContainer = document.getElementById('pilihanJamPulangContainer');
    const stokStatusSpan = document.getElementById('stokStatus');
    const pesanSekarangBtn = document.getElementById('pesanSekarangBtn');
    const requiredFields = [namaPembeliInput, alamatLengkapInput, lokasiGoogleMapsInput, tanggalBookingInput];

    // Data konstan
    const STOCK_DATA = {
        "Rute Merjosari": { "05:00": 15, "05:15": 15, "05:30": 15 },
        "Rute Suhat": { "05:00": 15, "05:15": 15, "05:30": 15 },
        "Rute Dinoyo": { "05:00": 15, "05:15": 15, "05:30": 15 },
        "Rute Siguragura": { "05:00": 15, "05:15": 15, "05:30": 15 },
        "Rute Ijen": { "05:00": 15, "05:15": 15, "05:30": 15 },
        "Rute Galunggung": { "05:00": 15, "05:15": 15, "05:30": 15 }
    };

    const TARIF = {
        JARAK_MIN_M: 500,
        HARGA_MIN: 5000,
        JARAK_NORMAL_M: 5000, // 5 km
        TARIF_NORMAL_PER_M: 7.5,
        TARIF_DISKON_PER_M: 6
    };

    let currentCardData = {};
    let userLocation = null;
    let activeCard = null;

    flatpickr(tanggalBookingInput, {
        dateFormat: "d-m-Y",
        minDate: "today",
        allowInput: false
    });

    // Menampilkan modal dan mengatur data kartu
    btnDetailList.forEach(btn => {
        btn.addEventListener('click', function () {
            if (activeCard) {
                activeCard.classList.remove('card-active');
            }

            const card = this.closest('.card');
            activeCard = card;
            activeCard.classList.add('card-active');

            currentCardData = {
                title: card.querySelector('.card-title').innerText,
                description: card.querySelector('.deskripsi-tersembunyi').innerText,
                image: card.getAttribute('data-gambar'),
                destinationLat: parseFloat(card.getAttribute('data-destination-lat')),
                destinationLon: parseFloat(card.getAttribute('data-destination-lon'))
            };

            modalJudul.innerText = currentCardData.title;
            modalDeskripsi.innerText = currentCardData.description;
            modalGambar.src = currentCardData.image;

            bookingForm.reset();
            resetModalStatus();
        });
    });

    // Reset status modal saat ditutup
    document.getElementById('detailModal').addEventListener('hidden.bs.modal', function () {
        if (activeCard) {
            activeCard.classList.remove('card-active');
            activeCard = null;
        }
    });

    function resetModalStatus() {
        modalBiayaPerjalanan.innerText = 'Menunggu lokasi...';
        modalTotalPembayaran.innerText = 'Menunggu lokasi...';
        stokStatusSpan.innerText = 'Pilih tanggal dan jam';
        stokStatusSpan.classList.remove('text-success', 'text-danger');
        stokStatusSpan.classList.add('text-warning');
        pesanSekarangBtn.disabled = true;
        userLocation = null;
        geolocationError.classList.add('d-none');
        document.querySelectorAll('.is-invalid-label').forEach(label => label.classList.remove('is-invalid-label'));
        document.querySelectorAll('input, select, textarea').forEach(el => el.classList.remove('is-invalid'));
    }

    // Geolocation
    shareLocBtn.addEventListener('click', function () {
        if (!navigator.geolocation) {
            geolocationError.classList.remove('d-none');
            geolocationError.innerText = 'Geolocation tidak didukung oleh browser ini.';
            return;
        }

        geolocationError.classList.add('d-none');
        shareLocBtn.innerText = 'Mengambil lokasi...';
        shareLocBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude: lat, longitude: lon } = position.coords;
                userLocation = { lat, lon };
                lokasiGoogleMapsInput.value = `https://www.google.com/maps?q=${lat},${lon}`;
                calculateDistanceAndPrice();
                shareLocBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-geo-alt-fill me-2" viewBox="0 0 16 16"><path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>Lokasi Berhasil Diambil';
                shareLocBtn.classList.remove('btn-outline-primary');
                shareLocBtn.classList.add('btn-success');
                shareLocBtn.disabled = false;
                checkFormValidityAndStock();
                validateField(lokasiGoogleMapsInput);
            },
            error => {
                geolocationError.classList.remove('d-none');
                geolocationError.innerText = 'Gagal mendapatkan lokasi. Mohon izinkan akses lokasi.';
                shareLocBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-geo-alt-fill me-2" viewBox="0 0 16 16"><path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>Bagikan Lokasi Sekarang';
                shareLocBtn.classList.remove('btn-success');
                shareLocBtn.classList.add('btn-outline-primary');
                shareLocBtn.disabled = false;
                userLocation = null;
                checkFormValidityAndStock();
            }
        );
    });

    // Menangani input manual tautan Google Maps
    lokasiGoogleMapsInput.addEventListener('input', () => {
        const url = lokasiGoogleMapsInput.value;
        const match = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (match) {
            userLocation = { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
            calculateDistanceAndPrice();
            validateField(lokasiGoogleMapsInput);
        } else {
            modalBiayaPerjalanan.innerText = 'Tautan tidak valid';
            modalTotalPembayaran.innerText = 'Tautan tidak valid';
            userLocation = null;
            validateField(lokasiGoogleMapsInput);
        }
        checkFormValidityAndStock();
    });

    // Fungsi untuk menghitung jarak dan harga
    function calculateDistanceAndPrice() {
        if (!userLocation || isNaN(currentCardData.destinationLat)) return;

        const R = 6371; // Radius Bumi dalam km
        const dLat = deg2rad(currentCardData.destinationLat - userLocation.lat);
        const dLon = deg2rad(currentCardData.destinationLon - userLocation.lon);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(userLocation.lat)) * Math.cos(deg2rad(currentCardData.destinationLat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceM = R * c * 1000;

        let oneWayPrice;
        if (distanceM <= TARIF.JARAK_MIN_M) {
            oneWayPrice = TARIF.HARGA_MIN;
        } else if (distanceM <= TARIF.JARAK_NORMAL_M) {
            const sisaJarakM = distanceM - TARIF.JARAK_MIN_M;
            oneWayPrice = TARIF.HARGA_MIN + (sisaJarakM * TARIF.TARIF_NORMAL_PER_M);
        } else {
            const jarakNormal = TARIF.JARAK_NORMAL_M - TARIF.JARAK_MIN_M;
            const jarakDiskon = distanceM - TARIF.JARAK_NORMAL_M;
            oneWayPrice = TARIF.HARGA_MIN + (jarakNormal * TARIF.TARIF_NORMAL_PER_M) + (jarakDiskon * TARIF.TARIF_DISKON_PER_M);
        }

        oneWayPrice = Math.round(oneWayPrice / 100) * 100;
        const totalPrice = oneWayPrice * 2;

        modalBiayaPerjalanan.innerText = `Rp. ${formatRupiah(oneWayPrice)}`;
        modalTotalPembayaran.innerText = `Rp. ${formatRupiah(totalPrice)}`;
    }

    function deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    function formatRupiah(number) {
        return new Intl.NumberFormat('id-ID').format(number);
    }

    // Event listener untuk validasi form dan update stok
    requiredFields.forEach(field => {
        field.addEventListener('input', () => {
            validateField(field);
            checkFormValidityAndStock();
        });
    });

    tanggalBookingInput.addEventListener('change', checkFormValidityAndStock);
    pilihanJamBerangkatContainer.addEventListener('change', checkFormValidityAndStock);
    pilihanJamPulangContainer.addEventListener('change', checkFormValidityAndStock);

    // Fungsi validasi real-time
    function validateField(field) {
        const label = document.querySelector(`label[for="${field.id}"]`);
        if (field.value.trim() === '') {
            field.classList.add('is-invalid');
            if (label) label.classList.add('is-invalid-label');
            return false;
        } else {
            field.classList.remove('is-invalid');
            if (label) label.classList.remove('is-invalid-label');
            return true;
        }
    }

    // Fungsi utama untuk mengecek validitas formulir dan stok
    function checkFormValidityAndStock() {
        const selectedDate = tanggalBookingInput.value;
        const selectedTimeBerangkat = bookingForm.querySelector('input[name="waktuBerangkat"]:checked')?.value;
        const selectedRute = currentCardData.title;
        const isFormValid = requiredFields.every(field => field.value.trim() !== '') &&
                           bookingForm.querySelector('input[name="waktuBerangkat"]:checked') &&
                           bookingForm.querySelector('input[name="waktuPulang"]:checked');

        let hasStock = false;
        if (selectedDate && selectedTimeBerangkat && selectedRute) {
            if (STOCK_DATA[selectedRute] && STOCK_DATA[selectedRute][selectedTimeBerangkat] && STOCK_DATA[selectedRute][selectedTimeBerangkat] > 0) {
                const remainingStock = STOCK_DATA[selectedRute][selectedTimeBerangkat];
                stokStatusSpan.classList.remove('text-warning', 'text-danger');
                stokStatusSpan.innerText = `Tersedia (${remainingStock} kursi)`;
                stokStatusSpan.classList.add('text-success');
                hasStock = true;
            } else {
                stokStatusSpan.innerText = 'Tidak Tersedia';
                stokStatusSpan.classList.remove('text-warning', 'text-success');
                stokStatusSpan.classList.add('text-danger');
            }
        } else {
            stokStatusSpan.innerText = 'Pilih tanggal dan jam';
            stokStatusSpan.classList.remove('text-success', 'text-danger');
            stokStatusSpan.classList.add('text-warning');
        }

        pesanSekarangBtn.disabled = !(isFormValid && hasStock);
    }

    // Mengirim formulir pemesanan ke WhatsApp
    pesanSekarangBtn.addEventListener('click', function (e) {
        e.preventDefault();

        // Validasi terakhir sebelum pengiriman
        let finalCheckIsValid = requiredFields.every(validateField);
        if (!bookingForm.querySelector('input[name="waktuBerangkat"]:checked')) {
            alert('Silakan pilih jam berangkat.');
            finalCheckIsValid = false;
        }
        if (!bookingForm.querySelector('input[name="waktuPulang"]:checked')) {
            alert('Silakan pilih jam pulang.');
            finalCheckIsValid = false;
        }
        if (!finalCheckIsValid) {
            return;
        }

        const namaPembeli = namaPembeliInput.value;
        const alamatLengkap = alamatLengkapInput.value;
        const lokasiGoogleMaps = lokasiGoogleMapsInput.value;
        const tanggalBooking = tanggalBookingInput.value;
        const waktuBerangkat = bookingForm.querySelector('input[name="waktuBerangkat"]:checked').value;
        const waktuPulang = bookingForm.querySelector('input[name="waktuPulang"]:checked').value;
        const biayaPerjalananText = modalBiayaPerjalanan.innerText;
        const totalPembayaranText = modalTotalPembayaran.innerText;

        const message = `
Halo MaRide! Saya ingin memesan layanan antar-jemput.

Berikut detail pesanan saya:

*Nama:* ${namaPembeli}
*Rute:* ${currentCardData.title}
*Alamat Lengkap:* ${alamatLengkap}
*Titik Lokasi (Google Maps):* ${lokasiGoogleMaps}
*Tanggal Booking:* ${tanggalBooking}
*Jam Berangkat:* ${waktuBerangkat}
*Jam Pulang:* ${waktuPulang}

*Biaya Perjalanan (Satu Arah):* ${biayaPerjalananText}
*Total Pembayaran (Antar + Jemput):* ${totalPembayaranText}

Mohon konfirmasi ketersediaan dan detail selanjutnya. Terima kasih!
        `.trim();

        const whatsappUrl = `https://wa.me/6289515750507?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        
        detailModal.hide();
    });
});