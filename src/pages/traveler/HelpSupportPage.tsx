import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Ticket, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { helpArticles } from '../../data/helpArticles';

export function HelpSupportPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = searchQuery.trim()
    ? helpArticles.filter(
        a =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.summary.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : helpArticles;

  function handleContactClick() {
    if (isAuthenticated) {
      window.dispatchEvent(new CustomEvent('open-support-chat'));
    } else {
      navigate('/traveler/login');
    }
  }

  return (
    <div className="min-h-screen">
      <div className="relative bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 py-10 md:py-14">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="How can we help you?"
                className="w-full pl-12 pr-4 py-3.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-neutral-400 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all text-sm"
              />
            </div>
            <button
              onClick={handleContactClick}
              className="px-6 py-3.5 bg-white text-neutral-900 font-medium rounded-xl hover:bg-neutral-100 transition-colors text-sm flex items-center justify-center gap-2 whitespace-nowrap"
            >
              Contact Us
              <ArrowRight className="w-4 h-4" />
            </button>
            {isAuthenticated && (
              <button
                onClick={() => navigate('/my-tickets')}
                className="px-6 py-3.5 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-colors text-sm flex items-center justify-center gap-2 backdrop-blur-sm border border-white/10 whitespace-nowrap"
              >
                <Ticket className="w-4 h-4" />
                My Tickets
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        {searchQuery.trim() && (
          <div className="mb-6">
            <p className="text-sm text-neutral-500">
              {filtered.length} {filtered.length === 1 ? 'result' : 'results'} for "{searchQuery}"
            </p>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-neutral-900 mb-1">No articles found</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Try a different search term or contact us directly.
            </p>
            <button
              onClick={handleContactClick}
              className="px-4 py-2 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Contact Support
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(article => {
              const Icon = article.icon;
              return (
                <button
                  key={article.slug}
                  onClick={() => navigate(`/help-support/${article.slug}`)}
                  className="group w-full text-left flex items-center gap-4 p-4 md:p-5 bg-white border border-neutral-200 rounded-xl hover:border-neutral-300 hover:shadow-md transition-all"
                >
                  <div className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg ${article.accent}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-neutral-900 group-hover:text-neutral-700 transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-xs text-neutral-500 leading-relaxed mt-0.5 truncate">
                      {article.summary}
                    </p>
                  </div>
                  <ChevronRight className="flex-shrink-0 w-4 h-4 text-neutral-400 group-hover:text-neutral-700 group-hover:translate-x-0.5 transition-all" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-neutral-50 border-t border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h2 className="text-lg font-bold text-neutral-900 mb-2">Still need help?</h2>
          <p className="text-sm text-neutral-500 mb-6 max-w-md mx-auto">
            {isAuthenticated
              ? "Can't find what you're looking for? Submit a support ticket and our team will get back to you."
              : "Log in to submit a support ticket and our team will help you out."}
          </p>
          <button
            onClick={handleContactClick}
            className="px-6 py-3 bg-neutral-900 text-white font-medium rounded-lg hover:bg-neutral-800 transition-colors text-sm"
          >
            {isAuthenticated ? 'Submit a Ticket' : 'Log In to Get Help'}
          </button>
        </div>
      </div>

    </div>
  );
}
