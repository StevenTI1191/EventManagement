import ManajemenLayout from '@/Layouts/ManajemenLayout';
import AppointmentIndex from '@/Pages/Appointment/Index';

export default function Index(props) {
    return <AppointmentIndex Layout={ManajemenLayout} {...props} />;
}
