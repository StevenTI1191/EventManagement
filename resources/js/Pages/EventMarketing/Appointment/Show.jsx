import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import AppointmentShow from '@/Pages/Appointment/Show';

export default function Show(props) {
    return <AppointmentShow Layout={EventMarketingLayout} {...props} />;
}
