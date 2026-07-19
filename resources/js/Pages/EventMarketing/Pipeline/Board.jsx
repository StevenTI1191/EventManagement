import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import PipelineBoard from '@/Pages/Pipeline/Board';

export default function Board({ kolom, canEdit }) {
    return (
        <PipelineBoard
            Layout={EventMarketingLayout}
            kolom={kolom}
            canEdit={canEdit}
            routes={{ updateStatus: 'em.pipeline.update-status', penawaran: 'em.pipeline.penawaran', batal: 'em.pipeline.batal', detail: 'em.event.show' }}
        />
    );
}
