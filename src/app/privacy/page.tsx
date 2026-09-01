import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Shield, Mail } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Schoolari",
  description: "Learn how Schoolari collects, uses, protects, and handles your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Header / Navigation */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/login" className="flex items-center">
            <Image
              src="/images/Schoolari_logo.png"
              alt="Schoolari"
              width={140}
              height={38}
              className="h-8 w-auto object-contain"
              priority
            />
          </Link>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/terms" className="text-slate-600 hover:text-violet-600 transition-colors">
              Terms & Conditions
            </Link>
            <Link href="/sms-terms" className="text-slate-600 hover:text-violet-600 transition-colors">
              SMS Terms
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 lg:p-14 shadow-sm space-y-10">
          
          {/* Header Banner */}
          <div className="border-b border-slate-100 pb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-bold uppercase tracking-wider mb-4">
              <Shield className="w-3.5 h-3.5" /> Legal Document
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Schoolari Privacy Policy
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Last Updated: August 2026 • Operated by Dormoney
            </p>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mt-4">
              This Privacy Policy explains how Schoolari, operated by Dormoney (&ldquo;Schoolari,&rdquo; &ldquo;Dormoney,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), collects, uses, maintains, protects, and discloses information in connection with Schoolari and its related Services.
            </p>
            <p className="text-xs font-semibold text-slate-500 mt-2">
              By using Schoolari, you acknowledge that you have reviewed this Privacy Policy.
            </p>
          </div>

          {/* Policy Sections */}
          <div className="space-y-8 text-sm sm:text-base text-slate-700 leading-relaxed">
            
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">1. Information We Collect</h2>
              <p>Depending on how you use Schoolari, we may collect information including:</p>
              
              <div className="space-y-3 pl-2">
                <h3 className="font-semibold text-slate-900 text-sm">Account Information</h3>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 text-sm">
                  <li>Name;</li>
                  <li>Email address;</li>
                  <li>Username;</li>
                  <li>Password credentials;</li>
                  <li>Age or date of birth;</li>
                  <li>Grade level;</li>
                  <li>School information;</li>
                  <li>Parent or guardian information; and</li>
                  <li>Account preferences.</li>
                </ul>

                <h3 className="font-semibold text-slate-900 text-sm pt-2">Student Information</h3>
                <p className="text-xs text-slate-500">Depending on the features used, users may voluntarily provide:</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 text-sm">
                  <li>Academic information;</li>
                  <li>Activities and extracurricular information;</li>
                  <li>Leadership experiences;</li>
                  <li>Career interests;</li>
                  <li>College interests;</li>
                  <li>Scholarship information;</li>
                  <li>Application information;</li>
                  <li>Deadlines;</li>
                  <li>Goals;</li>
                  <li>Achievements;</li>
                  <li>Resume information;</li>
                  <li>Essay responses;</li>
                  <li>Application materials;</li>
                  <li>Documents; and</li>
                  <li>Other information users choose to place in their Schoolari account.</li>
                </ul>

                <h3 className="font-semibold text-slate-900 text-sm pt-2">Parent Information</h3>
                <p className="text-sm text-slate-600">
                  Parents or guardians may provide information about themselves and their students, including information necessary to establish and manage family accounts.
                </p>

                <h3 className="font-semibold text-slate-900 text-sm pt-2">Payment Information</h3>
                <p className="text-sm text-slate-600">
                  If you purchase paid Services, payment information may be collected and processed by third-party payment processors. Schoolari may receive transaction information but does not necessarily receive or store complete payment-card information.
                </p>

                <h3 className="font-semibold text-slate-900 text-sm pt-2">Technical Information</h3>
                <p className="text-xs text-slate-500">We may automatically collect certain information about use of the Services, such as:</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 text-sm">
                  <li>IP address;</li>
                  <li>Browser type;</li>
                  <li>Device type;</li>
                  <li>Operating system;</li>
                  <li>General usage information;</li>
                  <li>Pages or features accessed;</li>
                  <li>Approximate timestamps; and</li>
                  <li>Technical information necessary to operate, secure, and improve the Services.</li>
                </ul>

                <h3 className="font-semibold text-slate-900 text-sm pt-2">Communications</h3>
                <p className="text-sm text-slate-600">
                  If you contact us at <a href="mailto:students@dormoney.com" className="text-violet-600 font-semibold underline">students@dormoney.com</a>, we may retain the contents of your communication and information necessary to respond to your request.
                </p>
              </div>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">2. How We Use Information</h2>
              <p>We may use information to:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 text-sm">
                <li>Create and maintain accounts;</li>
                <li>Provide the Services;</li>
                <li>Personalize the user experience;</li>
                <li>Provide student and parent dashboards;</li>
                <li>Provide AI-powered features;</li>
                <li>Provide essay coaching;</li>
                <li>Provide resume assistance;</li>
                <li>Provide college and scholarship tools;</li>
                <li>Organize documents and tasks;</li>
                <li>Provide customer support;</li>
                <li>Process payments;</li>
                <li>Communicate with users;</li>
                <li>Maintain security;</li>
                <li>Prevent fraud and abuse;</li>
                <li>Troubleshoot problems;</li>
                <li>Analyze and improve the Services;</li>
                <li>Develop new features;</li>
                <li>Comply with legal obligations; and</li>
                <li>Enforce our Terms.</li>
              </ul>
              <p className="text-xs text-slate-500 italic">
                We will not use personal data for purposes materially inconsistent with those disclosed in this Privacy Policy without obtaining any consent required by applicable law.
              </p>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">3. AI Features and Personal Information</h2>
              <p>Schoolari may use AI technologies to provide certain features.</p>
              <p>Information submitted to an AI-powered feature may be processed as necessary to provide that feature. Users should not submit highly sensitive information into an AI feature unless the feature specifically requests or requires it.</p>
              <p>Schoolari does not guarantee that AI-generated content is accurate or appropriate for a particular purpose. AI processing does not transfer responsibility for the user&apos;s final work to Schoolari.</p>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">4. Essay Information</h2>
              <p>Students may provide essay prompts, responses, drafts, and other information to Schoolari. Schoolari&apos;s Essay Coach is designed to help students develop their own writing.</p>
              <p>Where the Essay Coach is designed to organize student-provided responses into a draft, Schoolari may process those responses to provide that functionality. Users should understand that essay information may contain personal experiences and other personal information and should exercise appropriate judgment when deciding what to submit.</p>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">5. Resume Information</h2>
              <p>Users may provide education, employment, extracurricular, leadership, skills, achievements, contact information, and other information for resume creation. Schoolari processes this information to provide resume-related Services.</p>
              <p>Users are responsible for ensuring that all information they provide is accurate and appropriate.</p>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">6. Sharing Information</h2>
              <p>We may share information with:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 text-sm">
                <li>Service providers that help operate Schoolari;</li>
                <li>Technology and hosting providers;</li>
                <li>Payment processors;</li>
                <li>AI and technology providers used to provide requested functionality;</li>
                <li>Analytics, security, and fraud-prevention providers;</li>
                <li>Professional advisers where appropriate;</li>
                <li>Governmental authorities when legally required; and</li>
                <li>Successors in connection with a merger, acquisition, reorganization, sale, financing, or other business transaction.</li>
              </ul>
              <p className="font-semibold text-slate-900">
                We do not sell personal information in exchange for monetary payment unless disclosed and permitted under applicable law.
              </p>
              <p className="text-xs text-slate-500">
                We limit service-provider access to information to what is reasonably necessary for the services they provide.
              </p>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">7. School and Educational Use</h2>
              <p>If Schoolari is provided through a school or educational organization, the information practices applicable to that relationship may differ based on the agreement with the school and applicable law.</p>
              <p>Where applicable, Schoolari will process student information in accordance with contractual obligations and applicable federal and state privacy requirements.</p>
            </section>

            {/* Section 8 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">8. Children&apos;s Privacy (COPPA Compliance)</h2>
              <p>Schoolari is primarily intended for high-school students and their families. We recognize the importance of protecting children&apos;s information.</p>
              <p>If Schoolari collects personal information from a child under 13 in circumstances covered by the Children&apos;s Online Privacy Protection Act (&ldquo;COPPA&rdquo;), Schoolari will comply with applicable COPPA requirements, including applicable parental notice and verifiable parental-consent requirements.</p>
              <p>Parents may have rights concerning their child&apos;s information, including rights to review or request deletion of information, as provided by applicable law. If you believe a child under 13 has provided personal information to Schoolari without appropriate authorization, please contact: <a href="mailto:students@dormoney.com" className="text-violet-600 font-semibold underline">students@dormoney.com</a>.</p>
            </section>

            {/* Section 9 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">9. Delaware Privacy Rights</h2>
              <p>Where applicable, Schoolari will comply with the Delaware Personal Data Privacy Act (&ldquo;DPDPA&rdquo;) and other applicable privacy laws.</p>
              <p>The DPDPA requires covered controllers to limit collection to data that is adequate, relevant, and reasonably necessary for disclosed purposes and requires reasonable administrative, technical, and physical security practices. It also contains additional protections concerning sensitive data and children&apos;s information.</p>
              <p>Depending on applicability and available exemptions, Delaware residents may have rights concerning their personal data, which may include rights to:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 text-sm">
                <li>Confirm whether personal data is being processed;</li>
                <li>Access personal data;</li>
                <li>Correct inaccuracies;</li>
                <li>Delete personal data;</li>
                <li>Obtain a copy of personal data in a portable format;</li>
                <li>Obtain information about certain processing activities; and</li>
                <li>Appeal certain decisions concerning privacy requests.</li>
              </ul>
              <p>To submit a privacy request, contact: <a href="mailto:students@dormoney.com" className="text-violet-600 font-semibold underline">students@dormoney.com</a>. We may need to verify your identity before completing a privacy request.</p>
            </section>

            {/* Section 10 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">10. Federal Privacy Rights</h2>
              <p>Schoolari will comply with applicable federal privacy laws, including COPPA where applicable. Nothing in this Privacy Policy is intended to limit rights provided by applicable federal law.</p>
            </section>

            {/* Section 11 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">11. Data Retention</h2>
              <p>We retain personal information for as long as reasonably necessary to provide the Services, maintain accounts, comply with legal obligations, resolve disputes, enforce agreements, maintain security, and fulfill legitimate business purposes. Retention periods may vary depending on the type of information and the purpose for which it was collected. When information is no longer reasonably necessary, we may delete, de-identify, or otherwise dispose of it in accordance with applicable law and our data-retention practices.</p>
            </section>

            {/* Section 12 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">12. Data Security</h2>
              <p>We maintain reasonable administrative, technical, and organizational safeguards designed to protect personal information from unauthorized access, disclosure, alteration, or destruction. However, no system, network, database, or transmission over the internet can be guaranteed to be completely secure.</p>
            </section>

            {/* Section 13 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">13. Cookies and Similar Technologies</h2>
              <p>Schoolari may use cookies, pixels, local storage, analytics technologies, and similar technologies to: maintain sessions, remember preferences, understand usage, improve functionality, maintain security, and analyze performance. Users may be able to control certain cookies through their browser or device settings. Disabling certain technologies may affect the functionality of Schoolari.</p>
            </section>

            {/* Section 14 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">14. Third-Party Services</h2>
              <p>Schoolari may use third-party services to operate portions of the platform. Third-party providers may process information according to their own privacy policies and contractual obligations. Schoolari is not responsible for the independent privacy practices of third parties.</p>
            </section>

            {/* Section 15 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">15. Data Transfers and Processing</h2>
              <p>Information may be processed or stored in the United States and potentially other locations where Schoolari, Dormoney, or service providers operate. By using Schoolari, you acknowledge that information may be processed in jurisdictions that may have different privacy laws than your state or country of residence, subject to applicable legal requirements.</p>
            </section>

            {/* Section 16 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">16. User Choices</h2>
              <p>Depending on applicable law and the functionality available, users may be able to: access account information, update account information, request deletion, request correction, manage certain communications, cancel an account, and submit privacy requests. Requests may be submitted to: <a href="mailto:students@dormoney.com" className="text-violet-600 font-semibold underline">students@dormoney.com</a>.</p>
            </section>

            {/* Section 17 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">17. Parent Requests</h2>
              <p>Parents or legal guardians may contact Schoolari concerning information associated with their child. Schoolari may require reasonable verification of parental identity and authority before providing access to or deleting information.</p>
            </section>

            {/* Section 18 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">18. Do Not Track</h2>
              <p>Schoolari may not respond to every browser-based &ldquo;Do Not Track&rdquo; signal because there is currently no universally accepted technical standard governing such signals.</p>
            </section>

            {/* Section 19 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">19. Data Breaches</h2>
              <p>If Schoolari experiences a security incident involving personal information, Schoolari will take reasonable steps to investigate, contain, mitigate, and respond to the incident and provide notices where required by applicable law.</p>
            </section>

            {/* Section 20 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">20. Changes to This Privacy Policy</h2>
              <p>We may update this Privacy Policy periodically. When changes are made, the updated version will be posted through Schoolari and the effective date will be updated. Where legally required, we will provide additional notice or obtain consent.</p>
            </section>

            {/* Section 21 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">21. Contact and Privacy Requests</h2>
              <p>All privacy questions, requests, complaints, notices, and correspondence must be submitted exclusively by email to:</p>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 inline-block font-mono text-sm text-violet-700 font-semibold">
                <a href="mailto:students@dormoney.com" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" /> students@dormoney.com
                </a>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                No physical mailing address or telephone contact method is designated by this Privacy Policy.
              </p>
            </section>

            {/* Section 22 */}
            <section className="space-y-3 border-t border-slate-100 pt-6">
              <h2 className="text-xl font-bold text-slate-900">22. Acceptance</h2>
              <p>By creating or using a Schoolari account, you acknowledge that you have read and understood this Privacy Policy. Your continued use of Schoolari after an updated Privacy Policy becomes effective constitutes acknowledgment of the updated policy to the extent permitted by law.</p>
              <p className="font-semibold text-slate-800 pt-2">
                Schoolari and Dormoney are committed to providing useful educational technology while respecting the privacy, security, and autonomy of students and families.
              </p>
            </section>

          </div>

          {/* Footer Navigation */}
          <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© 2026 Schoolari. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="hover:text-violet-600 transition-colors">Terms of Service</Link>
              <span>•</span>
              <Link href="/sms-terms" className="hover:text-violet-600 transition-colors">SMS Terms</Link>
              <span>•</span>
              <Link href="/login" className="hover:text-violet-600 transition-colors">Sign In</Link>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
