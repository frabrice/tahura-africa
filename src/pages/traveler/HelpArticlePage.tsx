import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { helpArticles } from '../../data/helpArticles';

export function HelpArticlePage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  const article = helpArticles.find(a => a.slug === slug);

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-lg font-bold text-neutral-900 mb-2">Article Not Found</h1>
        <p className="text-sm text-neutral-500 mb-6">The help article you are looking for does not exist.</p>
        <button
          onClick={() => navigate('/help-support')}
          className="px-4 py-2 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
        >
          Back to Help & Support
        </button>
      </div>
    );
  }

  const Icon = article.icon;
  const currentIndex = helpArticles.findIndex(a => a.slug === slug);
  const related = helpArticles
    .filter((_, i) => i !== currentIndex)
    .slice(0, 3);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
      <button
        onClick={() => navigate('/help-support')}
        className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Help & Support
      </button>

      <div className="mb-8">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${article.accent} mb-4`}>
          <Icon className="w-6 h-6" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">
          {article.title}
        </h1>
        <p className="text-neutral-500 mt-2 text-sm">{article.summary}</p>
      </div>

      <div className="space-y-5 mb-12">
        {article.body.map((paragraph, i) => (
          <p key={i} className="text-[15px] leading-relaxed text-neutral-700">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="border-t border-neutral-200 pt-8">
        <h2 className="text-sm font-semibold text-neutral-900 mb-4">Related Articles</h2>
        <div className="space-y-3">
          {related.map(r => (
            <button
              key={r.slug}
              onClick={() => navigate(`/help-support/${r.slug}`)}
              className="w-full flex items-center justify-between p-4 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors text-left group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${r.accent} flex items-center justify-center`}>
                  <r.icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-neutral-900 truncate">
                  {r.title}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
