import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSEO } from '../../lib/useSEO';

export function PrivacyPolicyPage() {
  const navigate = useNavigate();

  useSEO({
    title: 'Privacy Policy',
    description: 'How Tahura Africa collects, uses, and protects your personal information.',
  });

  return (
    <div className="px-4 md:px-6 py-8 md:py-14 max-w-3xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-900 mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </button>

      <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-neutral-500 mb-10">Last updated: March 13, 2026</p>

      <div className="space-y-10 text-neutral-700 leading-relaxed text-[15px]">
        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">1. Introduction</h2>
          <p>
            Tahura Africa Ltd ("Tahura," "we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our website, mobile applications, and related services (collectively, the "Platform"). By using the Platform, you agree to the practices described in this policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">2. Information We Collect</h2>

          <h3 className="text-base font-medium text-neutral-800 mt-5 mb-2">2.1 Information You Provide</h3>
          <ul className="list-disc pl-6 space-y-1.5">
            <li><span className="font-medium">Account information:</span> name, email address, phone number, and password when you create an account</li>
            <li><span className="font-medium">Profile information:</span> profile photo, bio, travel preferences, and language preferences</li>
            <li><span className="font-medium">Booking information:</span> dates, number of guests, special requests, and payment details</li>
            <li><span className="font-medium">Communications:</span> messages you send to hosts, guides, and institutions through our messaging system</li>
            <li><span className="font-medium">Reviews and content:</span> reviews, ratings, photos, and other content you submit</li>
            <li><span className="font-medium">Support inquiries:</span> information provided when you contact our support team</li>
          </ul>

          <h3 className="text-base font-medium text-neutral-800 mt-5 mb-2">2.2 Information Collected Automatically</h3>
          <ul className="list-disc pl-6 space-y-1.5">
            <li><span className="font-medium">Device information:</span> browser type, operating system, device identifiers, and screen resolution</li>
            <li><span className="font-medium">Usage data:</span> pages visited, features used, search queries, and interaction patterns</li>
            <li><span className="font-medium">Location data:</span> approximate location based on IP address; precise location only with your explicit consent</li>
            <li><span className="font-medium">Cookies and similar technologies:</span> session cookies, preference cookies, and analytics trackers</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">3. How We Use Your Information</h2>
          <p className="mb-3">We use the information we collect to:</p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Provide, maintain, and improve the Platform and our services</li>
            <li>Process bookings, payments, and refunds</li>
            <li>Facilitate communication between travelers and service providers</li>
            <li>Personalize your experience and show relevant content and recommendations</li>
            <li>Send booking confirmations, updates, and reminders</li>
            <li>Respond to your support requests and inquiries</li>
            <li>Detect, prevent, and address fraud, security issues, and technical problems</li>
            <li>Comply with legal obligations and enforce our <a href="/terms-of-service" className="text-amber-600 hover:text-amber-700 underline underline-offset-2">Terms of Service</a></li>
            <li>Analyze usage patterns to improve Platform performance and features</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">4. Information Sharing</h2>
          <p className="mb-3">We do not sell your personal information. We may share your information in the following circumstances:</p>

          <h3 className="text-base font-medium text-neutral-800 mt-5 mb-2">4.1 With Service Providers</h3>
          <p>
            When you make a booking, relevant information (such as your name, contact details, and booking preferences) is shared with the host, guide, or institution to facilitate the service. Only the information necessary to complete the booking is shared.
          </p>

          <h3 className="text-base font-medium text-neutral-800 mt-5 mb-2">4.2 With Third-Party Partners</h3>
          <p>
            We work with trusted third-party service providers for payment processing, analytics, email delivery, and cloud hosting. These partners are contractually bound to protect your data and may only use it to perform services on our behalf.
          </p>

          <h3 className="text-base font-medium text-neutral-800 mt-5 mb-2">4.3 For Legal Purposes</h3>
          <p>
            We may disclose your information if required by law, regulation, legal process, or governmental request, or when we believe disclosure is necessary to protect the rights, property, or safety of Tahura, our users, or others.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">5. Data Security</h2>
          <p className="mb-3">
            We implement industry-standard security measures to protect your personal information, including:
          </p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Encryption of data in transit using TLS/SSL protocols</li>
            <li>Encryption of sensitive data at rest</li>
            <li>Regular security assessments and vulnerability testing</li>
            <li>Access controls limiting employee access to personal data on a need-to-know basis</li>
            <li>Secure authentication with hashed passwords</li>
          </ul>
          <p className="mt-3">
            While we strive to protect your information, no method of transmission or storage is completely secure. We cannot guarantee absolute security of your data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">6. Data Retention</h2>
          <p>
            We retain your personal information for as long as your account is active or as needed to provide services. If you close your account, we will delete or anonymize your personal data within 90 days, except where retention is required by law, necessary to resolve disputes, or needed to enforce our agreements. Anonymized data that cannot be used to identify you may be retained indefinitely for analytics and service improvement.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">7. Your Rights and Choices</h2>
          <p className="mb-3">Depending on your location, you may have the following rights regarding your personal data:</p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li><span className="font-medium">Access:</span> request a copy of the personal information we hold about you</li>
            <li><span className="font-medium">Correction:</span> request correction of inaccurate or incomplete data</li>
            <li><span className="font-medium">Deletion:</span> request deletion of your personal data, subject to legal obligations</li>
            <li><span className="font-medium">Portability:</span> request your data in a structured, machine-readable format</li>
            <li><span className="font-medium">Objection:</span> object to certain processing of your data</li>
            <li><span className="font-medium">Withdrawal of consent:</span> withdraw previously given consent at any time</li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, contact us at privacy@tahura.africa. We will respond to your request within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">8. Cookies and Tracking</h2>
          <p className="mb-3">We use cookies and similar technologies for the following purposes:</p>
          <div className="overflow-hidden rounded-lg border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-neutral-900">Type</th>
                  <th className="text-left px-4 py-2.5 font-medium text-neutral-900">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                <tr>
                  <td className="px-4 py-2.5 font-medium text-neutral-800">Essential</td>
                  <td className="px-4 py-2.5">Required for core functionality like authentication and security</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-neutral-800">Functional</td>
                  <td className="px-4 py-2.5">Remember your preferences and settings</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-neutral-800">Analytics</td>
                  <td className="px-4 py-2.5">Understand how users interact with the Platform</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3">
            You can manage cookie preferences through your browser settings. Disabling certain cookies may affect Platform functionality.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">9. Children's Privacy</h2>
          <p>
            The Platform is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child under 18, we will take steps to delete such information promptly. If you believe a child has provided us with personal data, please contact us at privacy@tahura.africa.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">10. International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. When we transfer data internationally, we implement appropriate safeguards to ensure your data receives an equivalent level of protection, including standard contractual clauses and data processing agreements with our service providers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on the Platform and updating the "Last updated" date. For significant changes, we may also send you an email notification. Your continued use of the Platform after changes take effect constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">12. Contact Us</h2>
          <p>
            If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
          </p>
          <div className="mt-3 bg-neutral-50 border border-neutral-200 rounded-lg p-5 space-y-1.5 text-sm">
            <p className="font-medium text-neutral-900">Tahura Africa Ltd - Privacy Team</p>
            <p>Email: privacy@tahura.africa</p>
            <p>Phone: +250 788 123 456</p>
            <p>Address: Kigali, Rwanda</p>
          </div>
        </section>
      </div>
    </div>
  );
}
