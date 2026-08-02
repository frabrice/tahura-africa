import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { FileText, Download, Plus } from 'lucide-react';

const staticReports = [
  { id: '1', title: 'Tourism Activity Summary', period: 'Current Period', type: 'monthly', status: 'available' as const },
  { id: '2', title: 'Attraction Performance Analysis', period: 'Current Period', type: 'quarterly', status: 'available' as const },
  { id: '3', title: 'Economic Impact Assessment', period: 'Current Year', type: 'annual', status: 'available' as const },
];

export function ReportsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-neutral-900">Reports & Exports</h1>
        <Button size="sm" onClick={() => {}}>
          <Plus className="w-4 h-4 mr-1.5" />
          Generate Report
        </Button>
      </div>

      <Card className="p-5 mb-8 bg-neutral-50">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-4 h-4 text-neutral-500" />
          <h3 className="text-sm font-medium text-neutral-900">Available Reports</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100">
              <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500">Report Title</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500">Period</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500">Type</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500">Status</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-neutral-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {staticReports.map(report => (
              <tr key={report.id} className="hover:bg-neutral-50">
                <td className="px-3 py-3 text-sm text-neutral-900">{report.title}</td>
                <td className="px-3 py-3 text-sm text-neutral-600">{report.period}</td>
                <td className="px-3 py-3">
                  <span className="inline-block px-2 py-1 text-xs bg-neutral-100 text-neutral-700 capitalize rounded">
                    {report.type}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className="inline-block px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded capitalize">
                    {report.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <button className="inline-flex items-center gap-1 text-xs font-medium text-neutral-900 hover:text-neutral-600 transition-colors">
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5 bg-emerald-50">
          <h3 className="text-sm font-medium text-neutral-900 mb-4">Generate Custom Report</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-neutral-600 mb-1.5">Report Type</label>
              <select className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400">
                <option>Tourism Activity Summary</option>
                <option>Attraction Performance Analysis</option>
                <option>Economic Impact Assessment</option>
                <option>Regional Development Overview</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-600 mb-1.5">Time Period</label>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" className="px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400" />
                <input type="date" className="px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-neutral-600 mb-1.5">Format</label>
              <select className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400">
                <option>PDF Document</option>
                <option>Excel Spreadsheet</option>
                <option>CSV Data</option>
              </select>
            </div>
            <button className="w-full px-4 py-2 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors">
              Generate Report
            </button>
          </div>
        </Card>

        <Card className="p-5 bg-sky-50">
          <h3 className="text-sm font-medium text-neutral-900 mb-4">Quick Export</h3>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Tourism Activity Data', sub: 'All booking and visitor records' },
              { label: 'Attraction Statistics', sub: 'Institution capacity and usage data' },
              { label: 'Economic Indicators', sub: 'Revenue and employment data' },
              { label: 'Regional Distribution', sub: 'Geographic activity breakdown' },
            ].map(item => (
              <div key={item.label} className="p-3 border border-neutral-200 bg-white rounded-xl hover:bg-neutral-50 cursor-pointer transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-neutral-900 mb-1">{item.label}</div>
                    <div className="text-xs text-neutral-500">{item.sub}</div>
                  </div>
                  <Download className="w-4 h-4 text-neutral-400" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5 mt-6 bg-teal-50">
        <h3 className="text-sm font-medium text-neutral-900 mb-3">Report Guidelines</h3>
        <div className="text-xs text-neutral-600 leading-relaxed space-y-2">
          <p>
            All reports are generated from live platform data and represent activity within the Tahura Africa ecosystem.
            Reports are intended for policy review, strategic planning, and regulatory oversight.
          </p>
          <p>
            Individual transaction details, personal information, and commercially sensitive data are excluded from all
            exported reports to maintain privacy and confidentiality standards.
          </p>
        </div>
      </Card>
    </div>
  );
}
