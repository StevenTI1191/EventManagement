import ManajemenLayout from '@/Layouts/ManajemenLayout';
import KlienShow from '@/Pages/Klien/Show';

export default function Show(props) {
    return <KlienShow Layout={ManajemenLayout} {...props} />;
}
