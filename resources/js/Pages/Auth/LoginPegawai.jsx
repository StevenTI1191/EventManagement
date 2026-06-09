import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import PegawaiLoginLayout from '@/Layouts/PegawaiLoginLayout';
import { Head, useForm } from '@inertiajs/react';

export default function LoginPegawai({ status }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <PegawaiLoginLayout>
            <Head title="Pegawai Login" />

            {status && (
                <div className="mb-4 text-sm font-medium text-green-600">{status}</div>
            )}

            <form onSubmit={submit} className="space-y-6">
                <div>
                    <InputLabel htmlFor="email" value="Email" className="font-medium text-gray-700" />
                    <TextInput
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={data.email}
                        className="mt-1 block w-full border-gray-300 focus:border-[#A50021] focus:ring-[#A50021] rounded-lg shadow-sm"
                        onChange={(e) => setData('email', e.target.value)}
                    />
                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="password" value="Password" className="font-medium text-gray-700" />
                    <TextInput
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={data.password}
                        className="mt-1 block w-full border-gray-300 focus:border-[#A50021] focus:ring-[#A50021] rounded-lg shadow-sm"
                        onChange={(e) => setData('password', e.target.value)}
                    />
                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div>
                    <PrimaryButton
                        className="w-full justify-center py-3 bg-[#A50021] hover:bg-[#80001a] text-white font-bold rounded-lg transition shadow-lg"
                        disabled={processing}
                    >
                        Sign in
                    </PrimaryButton>
                </div>
            </form>
        </PegawaiLoginLayout>
    );
}
