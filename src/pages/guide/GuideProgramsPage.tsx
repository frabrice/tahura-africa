import { BookOpen, Clock, Users, DollarSign } from 'lucide-react';
import { useGuidePrograms, getGuideContext, ProgramRecord } from '../../lib/useGuideData';

function ProgramCard({ program }: { program: ProgramRecord }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
      <div className="relative h-44 bg-teal-50">
        {program.images?.[0] ? (
          <img src={program.images[0]} alt={program.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-teal-300" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${program.active ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>
            {program.active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-sm font-semibold text-neutral-900 mb-2 line-clamp-1">{program.title}</h3>
        {program.description && (
          <p className="text-xs text-neutral-500 line-clamp-2 mb-4">{program.description}</p>
        )}

        <div className="grid grid-cols-3 gap-2 text-xs text-neutral-600 mb-4">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-neutral-400" />
            {program.duration_hours}h
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-neutral-400" />
            Max {program.max_participants}
          </div>
          <div className="flex items-center gap-1 font-semibold text-neutral-900">
            <DollarSign className="w-3 h-3 text-neutral-400" />
            ${program.price_per_person}
          </div>
        </div>

        {program.what_included?.length > 0 && (
          <div>
            <p className="text-xs text-neutral-400 mb-1.5">What's included</p>
            <div className="flex flex-wrap gap-1">
              {program.what_included.slice(0, 3).map((item, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full">{item}</span>
              ))}
              {program.what_included.length > 3 && (
                <span className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded-full">+{program.what_included.length - 3} more</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function GuideProgramsPage() {
  const ctx = getGuideContext();
  const { programs, loading } = useGuidePrograms(ctx?.id);

  const activeCount = programs.filter(p => p.active).length;

  return (
    <div className="px-4 md:px-8 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">My Programs</h1>
        <p className="text-sm text-neutral-500 mt-1">Programs you are assigned to guide</p>
      </div>

      {!loading && programs.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-neutral-200 rounded-2xl p-4">
            <p className="text-2xl font-bold text-neutral-900">{programs.length}</p>
            <p className="text-xs text-neutral-500 mt-0.5">Total Programs</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
            <p className="text-2xl font-bold text-emerald-700">{activeCount}</p>
            <p className="text-xs text-emerald-600 mt-0.5">Active</p>
          </div>
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4">
            <p className="text-2xl font-bold text-neutral-700">{programs.length - activeCount}</p>
            <p className="text-xs text-neutral-500 mt-0.5">Inactive</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin mx-auto" />
        </div>
      ) : programs.length === 0 ? (
        <div className="py-20 text-center bg-white border border-neutral-200 rounded-2xl">
          <BookOpen className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-neutral-500">No programs assigned yet</p>
          <p className="text-xs text-neutral-400 mt-1">Ask your institution administrator to assign you to a program</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {programs.map(p => <ProgramCard key={p.id} program={p} />)}
        </div>
      )}
    </div>
  );
}
