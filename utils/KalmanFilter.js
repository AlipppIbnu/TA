// utils/KalmanFilter.js
export default class KalmanFilter {
    constructor(options = {}) {
      // Proses noise - seberapa banyak kita mengharapkan posisi kita berubah antara pembaruan
      this.Q = options.Q || 0.01;
      
      // Pengukuran noise - seberapa banyak kita mempercayai pengukuran GPS kita
      this.R = options.R || 4.0;
      
      // Estimasi status (posisi dan kecepatan)
      this.x = 0;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;
      
      // Kovarians kesalahan estimasi - mewakili kepercayaan kita terhadap status saat ini
      this.P_00 = 1;  // varians x
      this.P_01 = 0;  // kovarians x,y
      this.P_10 = 0;  // kovarians y,x
      this.P_11 = 1;  // varians y
      
      // Penanda pembaruan pertama
      this.firstUpdate = true;
    }
    
    // Proses pengukuran GPS baru
    filter(lat, lng, deltaTime = 1) {
      // Validasi input
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        console.warn('Koordinat tidak valid yang diberikan ke filter Kalman:', lat, lng);
        return { latitude: lat, longitude: lng }; // Mengembalikan nilai yang tidak difilter
      }
      
      // Pastikan deltaTime bernilai positif
      if (deltaTime <= 0) deltaTime = 0.1;
      
      if (this.firstUpdate) {
        this.x = lat;
        this.y = lng;
        this.firstUpdate = false;
        return { latitude: lat, longitude: lng };
      }
      
      // Langkah prediksi - proyeksikan status ke depan
      const x_pred = this.x + this.vx * deltaTime;
      const y_pred = this.y + this.vy * deltaTime;
      
      // Perbarui matriks kovarians kesalahan - proyeksikan ketidakpastian ke depan
      const P_00_pred = this.P_00 + deltaTime * this.Q;
      const P_11_pred = this.P_11 + deltaTime * this.Q;
      
      // Hitung Kalman gain - menentukan seberapa banyak kita harus mempercayai pengukuran vs prediksi
      const K_0 = P_00_pred / (P_00_pred + this.R);
      const K_1 = P_11_pred / (P_11_pred + this.R);
      
      // Perbarui estimasi status dengan pengukuran
      this.x = x_pred + K_0 * (lat - x_pred);
      this.y = y_pred + K_1 * (lng - y_pred);
      
      // Perbarui estimasi kecepatan (dengan batas kecil untuk menghindari nilai ekstrem)
      this.vx = Math.max(-1, Math.min(1, (this.x - x_pred) / deltaTime));
      this.vy = Math.max(-1, Math.min(1, (this.y - y_pred) / deltaTime));
      
      // Perbarui kovarians kesalahan
      this.P_00 = (1 - K_0) * P_00_pred;
      this.P_11 = (1 - K_1) * P_11_pred;
      
      return { latitude: this.x, longitude: this.y };
    }
    
    // Reset filter
    reset() {
      this.x = 0;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;
      this.P_00 = 1;
      this.P_01 = 0;
      this.P_10 = 0;
      this.P_11 = 1;
      this.firstUpdate = true;
    }
}
