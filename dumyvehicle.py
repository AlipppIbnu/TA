import csv
import uuid
import random
from datetime import datetime, timedelta

# --- Konfigurasi ---
JUMLAH_KENDARAAN = 100
DATA_PER_KENDARAAN = 100
# ID pengguna spesifik yang akan digunakan untuk semua kendaraan
USER_ID_STATIS = "dfba8674-979e-41af-917e-49af3bd28343"

# Set ke False untuk menghindari error foreign key jika geofence ID acak tidak ada di database Anda
ASSIGN_RANDOM_GEOFENCE = False 

# --- Data Sampel ---
PEMBUAT_MODEL = {
    "Honda": ["Brio", "Jazz", "CR-V", "Civic"],
    "Toyota": ["Avanza", "Innova", "Fortuner", "Yaris"],
    "Suzuki": ["Ertiga", "XL7", "Ignis"],
    "Mitsubishi": ["Pajero Sport", "Xpander", "Triton"]
}

def generate_vehicles_csv(start_id=1):
    """Membuat file vehicles.csv dengan data kendaraan acak."""
    headers = [
        "vehicle_id", "user_id", "gps_id", "license_plate", "name",
        "make", "model", "year", "sim_card_number", "relay_status",
        "update_at", "geofence_id", "relay_command_status"
    ]
    
    vehicles = []
    print(f"Membuat data untuk vehicles.csv mulai dari ID {start_id}...")
    for i in range(start_id, start_id + JUMLAH_KENDARAAN):
        make = random.choice(list(PEMBUAT_MODEL.keys()))
        model = random.choice(PEMBUAT_MODEL[make])
        
        vehicle = {
            "vehicle_id": i,
            "user_id": USER_ID_STATIS, # Menggunakan user_id statis
            "gps_id": str(uuid.uuid4()),
            "license_plate": f"D {random.randint(1000, 9999)} {''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=2))}",
            "name": f"Mobil {i}",
            "make": make,
            "model": model,
            "year": random.randint(2018, 2024),
            "sim_card_number": f"08{random.randint(1000000000, 9999999999)}",
            "relay_status": "ON",
            "update_at": datetime.now().isoformat() + "Z",
            "geofence_id": random.randint(100, 200) if ASSIGN_RANDOM_GEOFENCE else None,
            "relay_command_status": "success"
        }
        vehicles.append(vehicle)
        
    # Menggunakan 'w' untuk menimpa file setiap kali dijalankan
    with open('vehicles.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(vehicles)
        
    print(f"Berhasil membuat vehicles.csv dengan {len(vehicles)} data.")
    return vehicles

def generate_vehicle_datas_csv(vehicles):
    """Membuat file vehicle_datas.csv berdasarkan data kendaraan yang ada."""
    headers = [
        "latitude", "longitude", "speed", "rpm", "fuel_level",
        "ignition_status", "battery_level", "satellites_used",
        "timestamp", "gps_id", "distance_from_last"
    ]
    
    all_vehicle_data = []
    print("\nMembuat data untuk vehicle_datas.csv...")
    
    start_time = datetime.now() - timedelta(days=1)

    for vehicle in vehicles:
        # Titik awal acak di sekitar Bandung
        lat = -6.9175 + random.uniform(-0.1, 0.1)
        lon = 107.6191 + random.uniform(-0.1, 0.1)
        
        current_time = start_time
        
        for _ in range(DATA_PER_KENDARAAN):
            # Simulasikan pergerakan kecil
            lat += random.uniform(-0.0005, 0.0005)
            lon += random.uniform(-0.0005, 0.0005)
            current_time += timedelta(seconds=random.randint(5, 15))

            data_point = {
                "latitude": f"{lat:.5f}",
                "longitude": f"{lon:.5f}",
                "speed": random.randint(0, 100),
                "rpm": None,
                "fuel_level": None,
                "ignition_status": None,
                "battery_level": f"{random.uniform(12.1, 13.5):.1f}",
                "satellites_used": random.randint(5, 12),
                "timestamp": current_time.isoformat() + "Z",
                "gps_id": vehicle["gps_id"],
                "distance_from_last": None
            }
            all_vehicle_data.append(data_point)

    # Menggunakan 'w' untuk menimpa file setiap kali dijalankan
    with open('vehicle_datas.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(all_vehicle_data)
        
    print(f"Berhasil membuat vehicle_datas.csv dengan {len(all_vehicle_data)} data.")

if __name__ == "__main__":
    # Meminta input ID awal dari pengguna
    while True:
        try:
            start_id_input = input("Masukkan ID awal untuk kendaraan (tekan Enter untuk default 1): ")
            if not start_id_input:
                start_id = 1
                break
            start_id = int(start_id_input)
            break
        except ValueError:
            print("Input tidak valid. Harap masukkan sebuah angka.")

    # Langkah 1: Buat data kendaraan dan simpan ke dalam variabel
    list_of_vehicles = generate_vehicles_csv(start_id)
    
    # Langkah 2: Gunakan data kendaraan untuk membuat data telemetri
    generate_vehicle_datas_csv(list_of_vehicles)
    
    print("\nProses selesai.")