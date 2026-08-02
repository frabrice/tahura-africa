import { ManageInstitutionsTab } from './manage/ManageInstitutionsTab';

export function AttractionsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-neutral-900">Attractions</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Create and manage parks, museums &amp; sites — their programs, entry fees, and the guides who serve them.
        </p>
      </div>
      <ManageInstitutionsTab drillInstitutionId={null} onClearDrill={() => {}} />
    </div>
  );
}

export default AttractionsPage;
