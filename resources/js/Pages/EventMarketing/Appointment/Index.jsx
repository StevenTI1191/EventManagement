import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import AppointmentIndex from '@/Pages/Appointment/Index';

export default function Index(props) {
    return <AppointmentIndex Layout={EventMarketingLayout} {...props} />;
}
