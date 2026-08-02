import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, MapPin, Compass } from 'lucide-react';
import { Card } from '../components/Card';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center">
            <MapPin className="w-10 h-10 text-stone-400" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-stone-900 mb-2">404</h1>
        <p className="text-lg text-stone-600 mb-1">Page not found</p>
        <p className="text-sm text-stone-400 mb-8">
          The destination you're looking for doesn't exist on our map.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={() => navigate('/explore')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
          >
            <Compass className="w-4 h-4" />
            Explore Rwanda
          </button>
          <button
            onClick={() => navigate('/map')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            View Map
          </button>
        </div>
      </Card>
    </div>
  );
}
