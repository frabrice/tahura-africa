import {
  UserPlus,
  CalendarCheck,
  XCircle,
  Home,
  Trash2,
  DollarSign,
  Star,
  AlertTriangle,
  CreditCard,
  MessageCircle,
  Shield,
  Heart,
  Send,
  RotateCcw,
  Flag,
} from 'lucide-react';

export interface HelpArticle {
  slug: string;
  title: string;
  summary: string;
  icon: typeof UserPlus;
  accent: string;
  body: string[];
}

export const helpArticles: HelpArticle[] = [
  {
    slug: 'create-account',
    title: 'How to Create an Account',
    summary: 'Sign up to book experiences, save listings, and message hosts across Rwanda.',
    icon: UserPlus,
    accent: 'bg-orange-50 text-orange-600',
    body: [
      'Creating a Tahura account is quick and free. Tap the profile icon in the top right corner of any page, then select "Login" followed by "Sign Up." You will need a valid email address and a password with at least six characters.',
      'After filling in your name and email, tap "Create Account." You will be signed in immediately and can start exploring experiences, homestays, and attractions right away.',
      'We recommend completing your profile by adding a profile picture and a short bio. Hosts and guides appreciate knowing a bit about the travelers they will be welcoming. You can update your profile at any time from the Profile page.',
    ],
  },
  {
    slug: 'book-experience',
    title: 'How to Book an Experience',
    summary: 'Step-by-step guide to reserving your next adventure with a local guide or host.',
    icon: CalendarCheck,
    accent: 'bg-green-50 text-green-600',
    body: [
      'Browse experiences from the home page or use the search and filter options to find something that interests you. Tap on any listing card to open the full details page, where you can see photos, descriptions, pricing, and availability.',
      'When you are ready, tap the "Book Now" button. Choose your preferred date, the number of guests, and review the total price. If the host offers different session times, pick the one that works best for you.',
      'Confirm your booking by tapping "Confirm Booking." You will receive a confirmation with your booking reference number. The host or guide will also be notified and may reach out to share additional details about your upcoming experience.',
    ],
  },
  {
    slug: 'cancel-booking',
    title: 'How to Cancel a Booking',
    summary: 'Learn about the cancellation process and what to expect for refunds.',
    icon: XCircle,
    accent: 'bg-red-50 text-red-600',
    body: [
      'If your plans change, you can cancel a booking from the "Trips" section of your account. Find the booking you need to cancel and tap on it to open the details. Then use the cancel option to initiate the process.',
      'Cancellation policies vary by listing. Some hosts offer free cancellation up to 24 or 48 hours before the start time, while others may have stricter policies. The specific cancellation terms are always shown on the listing detail page before you book.',
      'Once cancelled, any eligible refund will be processed according to the host or institution cancellation policy. You will receive an email confirmation once the cancellation is complete.',
    ],
  },
  {
    slug: 'become-host',
    title: 'How to Become a Host or Guide',
    summary: 'Share your home or lead experiences by joining Tahura as a Host or Guide.',
    icon: Home,
    accent: 'bg-teal-50 text-teal-600',
    body: [
      'Tahura works with local Hosts (who welcome travelers into their home or space) and Guides (who lead tours and experiences) to offer authentic Rwandan experiences. Applying is self-service — no need to already know a Tahura partner.',
      'Visit the "Become a Local" page (linked in the footer of any page, or from your Profile), choose whether you\'re applying as a Host or a Guide, and fill out a short application: your contact details, a bit about yourself, and what you\'d bring to travelers.',
      'Our team reviews every application personally. You\'ll get an email as soon as a decision is made — if approved, a Host account is matched with a Tahura partner, and a Guide account joins our shared guide pool and can start being assigned to tours right away.',
    ],
  },
  {
    slug: 'delete-account',
    title: 'How to Delete Your Account',
    summary: 'Permanently remove your Tahura account and associated data.',
    icon: Trash2,
    accent: 'bg-neutral-100 text-neutral-600',
    body: [
      'If you wish to delete your account, please contact our support team by submitting a ticket through the Help & Support page. Select "General" as the category and mention that you would like your account removed.',
      'Our team will verify your identity and process the deletion within a few business days. Please note that account deletion is permanent and cannot be undone. Any active bookings should be cancelled before requesting deletion.',
      'Once your account is deleted, your personal information will be removed from our systems in accordance with our privacy policy.',
    ],
  },
  {
    slug: 'service-fees',
    title: 'Understanding Service Fees',
    summary: 'A breakdown of what fees apply and how pricing works on the platform.',
    icon: DollarSign,
    accent: 'bg-amber-50 text-amber-600',
    body: [
      'Tahura charges a small service fee on each booking to cover platform operations, payment processing, and customer support. This fee is clearly displayed during checkout before you confirm your booking.',
      'The listing price set by the host or institution is the base price per person. The service fee is calculated as a percentage of the booking total and is added at checkout. There are no hidden charges.',
      'Hosts and partners may also set their own pricing tiers for different group sizes or special sessions. All pricing details are visible on the listing page so you can plan your budget before booking.',
    ],
  },
  {
    slug: 'leave-review',
    title: 'How to Leave a Review',
    summary: 'Share your feedback after an experience to help other travelers.',
    icon: Star,
    accent: 'bg-yellow-50 text-yellow-600',
    body: [
      'After your booking date has passed, you will be able to leave a review from your "Trips" page. Open the completed booking and look for the "Leave a Review" option.',
      'Your review should include a star rating (1 to 5) and a written comment about your experience. Be honest and constructive. Reviews help other travelers make informed decisions and help hosts improve their offerings.',
      'Once submitted, your review will appear on the listing page. Please note that reviews cannot be edited after submission, so take a moment to ensure your feedback is accurate and fair.',
    ],
  },
  {
    slug: 'host-cancels',
    title: 'What to Do If a Host Cancels',
    summary: 'Your options and protections when a booking is cancelled by the host.',
    icon: AlertTriangle,
    accent: 'bg-orange-50 text-orange-600',
    body: [
      'In rare cases, a host or institution may need to cancel a booking. If this happens, you will be notified immediately via email and through your Tahura account notifications.',
      'When a host cancels, you are entitled to a full refund of the booking amount. The refund will be processed automatically and should appear in your account within a few business days.',
      'If you need help finding an alternative experience or have questions about the cancellation, contact our support team and we will assist you in finding a suitable replacement.',
    ],
  },
  {
    slug: 'payments',
    title: 'How Payments Work',
    summary: 'Understand the payment process from booking to completion.',
    icon: CreditCard,
    accent: 'bg-sky-50 text-sky-600',
    body: [
      'Tahura processes payments securely through the platform. When you confirm a booking, the payment is authorized and held until the experience is completed.',
      'Currently, payment details are arranged between you and the host or partner organization. Some experiences may require payment at the time of booking, while others collect payment on the day of the experience.',
      'All payment information is handled securely. If you encounter any payment issues, contact our support team with your booking reference number for assistance.',
    ],
  },
  {
    slug: 'contact-host',
    title: 'How to Contact Your Host',
    summary: 'Reach out to hosts before or after booking to ask questions.',
    icon: MessageCircle,
    accent: 'bg-green-50 text-green-600',
    body: [
      'You can message a host directly from the listing detail page by tapping the "Message" or "Contact Host" button. This opens a conversation thread where you can ask questions about the experience, logistics, or special requirements.',
      'After booking, you can also access your conversation from the "Messages" section of your account. Hosts typically respond within a few hours, though response times may vary.',
      'Please keep all communication within the Tahura platform for your safety and record-keeping. If a host is unresponsive, contact our support team for assistance.',
    ],
  },
  {
    slug: 'safety-tips',
    title: 'Safety Tips for Travelers',
    summary: 'Stay safe during your experiences with these important guidelines.',
    icon: Shield,
    accent: 'bg-emerald-50 text-emerald-600',
    body: [
      'Your safety is our priority. Before any experience, review the listing details carefully, including any physical requirements, health advisories, or equipment needs mentioned by the host.',
      'Always let someone know where you are going and when you expect to return. Keep your phone charged and have emergency contact numbers handy. Follow all safety instructions provided by your guide or host during the experience.',
      'If you ever feel unsafe during an experience, trust your instincts and remove yourself from the situation. Contact local authorities if needed, and report the incident to Tahura support so we can investigate and take appropriate action.',
    ],
  },
  {
    slug: 'save-listings',
    title: 'How to Save Listings',
    summary: 'Bookmark experiences and homestays you want to revisit later.',
    icon: Heart,
    accent: 'bg-rose-50 text-rose-600',
    body: [
      'When browsing listings, you will see a heart icon on each card. Tap it to save the listing to your personal collection. You need to be logged in to save listings.',
      'Access all your saved listings from the "Saved" section, available through the navigation menu. From there, you can review your saved items and book when you are ready.',
      'To remove a saved listing, simply tap the heart icon again on the listing card or from your Saved page. There is no limit to how many listings you can save.',
    ],
  },
  {
    slug: 'message-host',
    title: 'How to Message a Host',
    summary: 'Send and receive messages with hosts through the built-in messaging system.',
    icon: Send,
    accent: 'bg-sky-50 text-sky-600',
    body: [
      'Tahura has a built-in messaging system that lets you communicate directly with hosts and guides. To start a conversation, visit any listing detail page and use the messaging option.',
      'All your conversations are accessible from the "Messages" section in the navigation menu. You can send text messages and the host will be notified of new messages.',
      'Keep your conversations respectful and on-topic. If you have a dispute or concern about a host communication, you can flag the conversation or contact support for assistance.',
    ],
  },
  {
    slug: 'refund-policy',
    title: 'Refund Policy Explained',
    summary: 'How refunds are processed and what timelines to expect.',
    icon: RotateCcw,
    accent: 'bg-blue-50 text-blue-600',
    body: [
      'Refund eligibility depends on the cancellation policy set by the host or institution for each listing. Some listings offer flexible cancellation with full refunds, while others may have partial or no-refund policies.',
      'If you cancel within the free cancellation window (as specified on the listing), you will receive a full refund. Cancellations outside this window may result in partial refunds or no refund, depending on the specific policy.',
      'Refunds are typically processed within 5-10 business days. If you believe you are entitled to a refund that has not been processed, contact our support team with your booking reference for assistance.',
    ],
  },
  {
    slug: 'report-problem',
    title: 'How to Report a Problem',
    summary: 'Flag issues with listings, hosts, or your experience for review.',
    icon: Flag,
    accent: 'bg-red-50 text-red-600',
    body: [
      'If you encounter a problem with a listing, host, or another user, you can report it directly through the platform. Look for the flag or report option on listing pages and user profiles.',
      'When reporting, provide as much detail as possible about the issue. Include dates, booking references, and a clear description of what happened. This helps our team investigate quickly.',
      'Our operations team reviews all reports and takes appropriate action, which may include contacting the parties involved, issuing warnings, or removing listings. You will be notified of the outcome of your report.',
    ],
  },
];
