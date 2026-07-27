import ManajemenLayout from '@/Layouts/ManajemenLayout';
import PipelineBoard from '@/Pages/Pipeline/Board';

export default function Board({ kolom, canEdit }) {
    return (
        <PipelineBoard
            Layout={ManajemenLayout}
            kolom={kolom}
            canEdit={canEdit}
            routes={{ updateStatus: 'manajemen.pipeline.update-status', penawaran: 'manajemen.pipeline.penawaran', batal: 'manajemen.pipeline.batal', detail: 'manajemen.event.show', setujuiPenawaran: 'manajemen.penawaran.setujui', tolakPenawaran: 'manajemen.penawaran.tolak' }}
        />
    );
}
