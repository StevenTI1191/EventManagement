import FinanceLayout from '@/Layouts/FinanceLayout';
import PipelineBoard from '@/Pages/Pipeline/Board';

// Finance hanya melihat pipeline — kartu tidak bisa digeser (canEdit selalu false).
export default function Board({ kolom, canEdit }) {
    return (
        <PipelineBoard
            Layout={FinanceLayout}
            kolom={kolom}
            canEdit={canEdit}
            routes={{}}
        />
    );
}
