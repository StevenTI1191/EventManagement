import ManajemenLayout from '@/Layouts/ManajemenLayout';
import AppointmentShow from '@/Pages/Appointment/Show';

export default function Show(props) {
    return <AppointmentShow Layout={ManajemenLayout} {...props} />;
}
