const NavbarComponent = () => (
    <nav className="flex justify-between items-center bg-white shadow-md px-6 py-3">
        <div className="flex items-center space-x-3">
            <img src="/icon/logo_web.png" alt="VehiTrack Logo" className="h-14" /> 
        </div>
        <div className="flex space-x-8">
            <a href="#" className="text-gray-700 hover:text-blue-600 font-medium">Home</a>
            <a href="#" className="text-gray-700 hover:text-blue-600 font-medium">Lacak</a>
            <a href="#" className="text-gray-700 hover:text-blue-600 font-medium">Pengaturan</a>
            <a href="#" className="text-gray-700 hover:text-blue-600 font-medium">Notifikasi</a>
        </div>
        <div className="flex items-center space-x-2">
            <span className="text-gray-800 font-semibold">ADMIN12</span>
            <img src="/avatar.png" alt="User" className="w-10 h-10 rounded-full border" />
        </div>
    </nav>
);

export default NavbarComponent; // <-- Pastikan ada export ini
