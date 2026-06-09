import { Link } from '@inertiajs/react';

export default function PegawaiLoginLayout({ children }) {
    return (
        <div className="flex min-h-screen bg-white">
            {/* --- SISI KIRI: AREA FORM --- */}
            <div className="flex flex-col justify-center flex-1 px-8 py-12 sm:px-12 lg:flex-none lg:w-1/2">
                <div className="w-full max-w-sm mx-auto">
                    {/* Header Tulisan */}
                    <div className="mb-6 text-left">
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Welcome back</h2>
                        <p className="mt-2 text-sm text-gray-500">Welcome back! Please enter your details.</p>
                    </div>

                    {/* Logo Laksamana Muda */}
                    <div className="mb-9">
                            <img
                                src="/images/LaksamanaLogo.png"
                                className="w-[320px] h-auto"
                                alt="Laksamana Muda Logo"
                            />
                    </div>

                    {/* Form Login (dikirim dari Login.jsx) */}
                    <div className="mt-6">
                        {children}
                    </div>
                </div>
            </div>

            {/* --- SISI KANAN: GAMBAR KONSER (SPLIT SCREEN) --- */}
            <div className="relative flex-1 hidden w-0 lg:block">
                <img
                    className="absolute inset-0 object-cover w-full h-full"
                    src="/images/Bg_Event.jpg"
                    alt="Event Laksamana Muda"
                />
                {/* Overlay tipis agar gambar lebih menyatu (opsional) */}
                <div className="absolute inset-0 bg-black/5"></div>
            </div>
        </div>
    );
}
