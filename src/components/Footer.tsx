import { Mail, MapPin, Phone, Instagram, Facebook, Twitter, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-200 mt-12 md:mt-20">
      <div className="max-w-[1920px] mx-auto px-6 md:px-10 pt-12 md:pt-16 pb-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 md:gap-12 mb-12 md:mb-14">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <div className="flex items-center mb-5">
              <Logo height={40} />
            </div>
            <p className="text-sm text-neutral-500 leading-relaxed mb-6 max-w-xs">
              Authentic experiences, cultural heritage, and sustainable travel across Rwanda and East Africa.
            </p>
            <div className="flex items-center gap-2.5">
              {[
                { icon: Facebook, label: 'Facebook', hover: 'hover:bg-blue-600 hover:text-white hover:border-blue-600' },
                { icon: Instagram, label: 'Instagram', hover: 'hover:bg-pink-500 hover:text-white hover:border-pink-500' },
                { icon: Twitter,  label: 'Twitter',  hover: 'hover:bg-sky-500 hover:text-white hover:border-sky-500' },
              ].map(({ icon: Icon, label, hover }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className={`w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-500 ${hover} flex items-center justify-center transition-all duration-200`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Discover */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400 mb-4">Discover</p>
            <ul className="space-y-3">
              {[
                { label: 'Experiences', to: '/' },
                { label: 'Homestays',   to: '/' },
                { label: 'Attractions', to: '/' },
                { label: 'Explore Map', to: '/map' },
              ].map(({ label, to }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors duration-150 inline-flex items-center gap-1 group"
                  >
                    {label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Join Us */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400 mb-4">Join Us</p>
            <ul className="space-y-3">
              {[
                { label: 'Become a Local', to: '/become-a-local' },
              ].map(({ label, to }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors duration-150 inline-flex items-center gap-1 group"
                  >
                    {label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400 mb-4">Support</p>
            <ul className="space-y-3">
              {[
                { label: 'Help Center',   to: '/help-support' },
                { label: 'Safety Info',   to: '/help-support/safety-tips' },
                { label: 'Cancellation',  to: '/help-support/cancel-booking' },
                { label: 'Refund Policy', to: '/help-support/refund-policy' },
              ].map(({ label, to }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors duration-150 inline-flex items-center gap-1 group"
                  >
                    {label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400 mb-4">Contact</p>
            <ul className="space-y-3">
              <li className="flex items-center gap-2.5">
                <Mail className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                <span className="text-sm text-neutral-500">info@tahura.africa</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                <span className="text-sm text-neutral-500">+250 788 123 456</span>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                <span className="text-sm text-neutral-500">Kigali, Rwanda</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-neutral-100 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-neutral-400 tracking-wide">© 2026 Tahura Africa. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy-policy"   className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
