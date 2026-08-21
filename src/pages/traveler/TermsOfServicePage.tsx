import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSEO } from '../../lib/useSEO';

export function TermsOfServicePage() {
  const navigate = useNavigate();

  useSEO({
    title: 'Terms of Service',
    description: 'The terms governing your use of the Tahura Africa platform.',
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

      <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-neutral-500 mb-10">Last updated: March 13, 2026</p>

      <div className="space-y-10 text-neutral-700 leading-relaxed text-[15px]">
        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Tahura Africa platform ("Platform"), including our website, mobile applications, and related services, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Platform. These Terms constitute a legally binding agreement between you and Tahura Africa Ltd ("Tahura," "we," "us," or "our").
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">2. Eligibility</h2>
          <p className="mb-3">
            You must be at least 18 years old and capable of forming a binding contract to use the Platform. By creating an account, you represent and warrant that:
          </p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>You are at least 18 years of age</li>
            <li>All registration information you submit is truthful and accurate</li>
            <li>You will maintain the accuracy of such information</li>
            <li>Your use of the Platform does not violate any applicable law or regulation</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">3. Account Registration</h2>
          <p>
            To access certain features, you must create an account using a valid email address and password. You are responsible for safeguarding your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account. Tahura reserves the right to suspend or terminate accounts that violate these Terms or are used for fraudulent purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">4. Platform Services</h2>
          <p className="mb-3">
            Tahura provides a tourism marketplace connecting travelers with local experiences, homestays, attractions, and cultural programs across Rwanda. Our services include but are not limited to:
          </p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Browsing and discovering local experiences, homestays, and attractions</li>
            <li>Booking and managing reservations with hosts, guides, and institutions</li>
            <li>Communicating with service providers through the Platform messaging system</li>
            <li>Leaving reviews and feedback about experiences</li>
            <li>Saving and organizing travel plans</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">5. Bookings and Payments</h2>
          <p className="mb-3">
            When you make a booking through the Platform, you enter into a direct agreement with the relevant host, guide, or institution. Tahura acts as an intermediary to facilitate these transactions. All prices are displayed in the local currency and include applicable fees unless stated otherwise.
          </p>
          <p>
            Payment is processed at the time of booking. Tahura may hold funds until the experience, stay, or visit is confirmed. Payment processing is handled by our third-party payment providers, and your use of payment services is subject to their respective terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">6. Cancellation and Refunds</h2>
          <p className="mb-3">
            Cancellation policies vary by listing and are set by individual hosts, guides, and institutions. The applicable cancellation policy is displayed on each listing before you complete a booking. Generally:
          </p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Cancellations made more than 48 hours before the scheduled start time may be eligible for a full refund</li>
            <li>Cancellations made within 24-48 hours may receive a partial refund</li>
            <li>Cancellations made less than 24 hours before the scheduled start time are generally non-refundable</li>
            <li>No-shows are not eligible for refunds</li>
          </ul>
          <p className="mt-3">
            Refunds are processed to the original payment method within 5-10 business days. For more details, visit our <a href="/help-support/refund-policy" className="text-amber-600 hover:text-amber-700 underline underline-offset-2">Refund Policy</a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">7. User Conduct</h2>
          <p className="mb-3">You agree not to:</p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Use the Platform for any unlawful purpose or in violation of any applicable laws</li>
            <li>Post or transmit false, misleading, defamatory, or offensive content</li>
            <li>Impersonate any person or entity, or misrepresent your affiliation</li>
            <li>Interfere with or disrupt the Platform's infrastructure or other users' enjoyment</li>
            <li>Attempt to gain unauthorized access to other accounts or systems</li>
            <li>Use automated means to scrape, collect, or harvest data from the Platform</li>
            <li>Circumvent any content filtering or security measures</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">8. Content and Reviews</h2>
          <p className="mb-3">
            Users may submit reviews, photos, and other content ("User Content") through the Platform. By submitting User Content, you grant Tahura a non-exclusive, worldwide, royalty-free license to use, reproduce, modify, and display such content in connection with the Platform's operation and promotion.
          </p>
          <p>
            Reviews must be honest and based on genuine experiences. We reserve the right to remove reviews that are fraudulent, contain inappropriate content, or violate these Terms. Content flagged by users or moderators will be reviewed by our team and may be removed at our sole discretion.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">9. Intellectual Property</h2>
          <p>
            The Platform and its original content (excluding User Content), features, and functionality are owned by Tahura Africa Ltd and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. Our trademarks, logos, and service marks may not be used without our prior written consent.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">10. Safety and Responsibility</h2>
          <p className="mb-3">
            While Tahura strives to maintain quality and safety standards across all listed experiences and stays, we do not own, operate, or control the services offered by hosts, guides, or institutions. You acknowledge that:
          </p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Participation in activities is at your own risk</li>
            <li>You should review safety information before participating in any experience</li>
            <li>You are responsible for obtaining appropriate travel insurance</li>
            <li>You should comply with all local laws and customs at your destination</li>
          </ul>
          <p className="mt-3">
            For safety tips and guidelines, visit our <a href="/help-support/safety-tips" className="text-amber-600 hover:text-amber-700 underline underline-offset-2">Safety Information</a> page.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">11. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Tahura shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or in connection with your use of the Platform, including but not limited to loss of profits, data, or goodwill. Our total liability for any claims arising under these Terms shall not exceed the amount you paid to Tahura in the twelve months preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">12. Privacy</h2>
          <p>
            Your use of the Platform is also governed by our <a href="/privacy-policy" className="text-amber-600 hover:text-amber-700 underline underline-offset-2">Privacy Policy</a>, which describes how we collect, use, and protect your personal information. By using the Platform, you consent to the practices described in the Privacy Policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">13. Modifications to Terms</h2>
          <p>
            Tahura reserves the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms on the Platform and updating the "Last updated" date. Your continued use of the Platform after such changes constitutes your acceptance of the revised Terms. We encourage you to review these Terms periodically.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">14. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the Republic of Rwanda, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be resolved through the courts of Rwanda, and you consent to the jurisdiction of such courts.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">15. Contact Us</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <div className="mt-3 bg-neutral-50 border border-neutral-200 rounded-lg p-5 space-y-1.5 text-sm">
            <p className="font-medium text-neutral-900">Tahura Africa Ltd</p>
            <p>Email: legal@tahura.africa</p>
            <p>Phone: +250 788 123 456</p>
            <p>Address: Kigali, Rwanda</p>
          </div>
        </section>
      </div>
    </div>
  );
}
