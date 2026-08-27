import Link from "next/link";
import { GraduationCap, ArrowLeft, FileText, Mail } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Schoolari",
  description: "Review the Terms & Conditions and User Agreement governing your use of the Schoolari platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Header / Navigation */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-sm shadow-violet-200">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">Schoolari</span>
          </Link>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/privacy" className="text-slate-600 hover:text-violet-600 transition-colors">
              Privacy Policy
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
              <FileText className="w-3.5 h-3.5" /> Legal Document
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Schoolari Terms &amp; Conditions and User Agreement
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Last Updated: August 2026 • Operated by Dormoney
            </p>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mt-4">
              These Terms &amp; Conditions and User Agreement (&ldquo;Terms,&rdquo; &ldquo;Agreement,&rdquo; or &ldquo;Terms of Service&rdquo;) govern your access to and use of Schoolari, including the Schoolari website, application, platform, dashboard, tools, content, artificial intelligence (&ldquo;AI&rdquo;) features, coaching features, document storage, resume tools, essay tools, scholarship and college search tools, and any other services offered through Schoolari (collectively, the &ldquo;Services&rdquo;).
            </p>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mt-3">
              Schoolari is operated by Dormoney (&ldquo;Dormoney,&rdquo; &ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). Schoolari and Dormoney are collectively referred to in these Terms as the &ldquo;Company.&rdquo;
            </p>
            <p className="text-xs font-bold text-slate-700 mt-3 p-3 bg-violet-50/70 border border-violet-100 rounded-xl">
              By creating an account, accessing, or using Schoolari, you acknowledge that you have read, understood, and agree to be legally bound by these Terms and our Privacy Policy. If you do not agree, you may not use the Services.
            </p>
          </div>

          {/* Terms Sections */}
          <div className="space-y-8 text-sm sm:text-base text-slate-700 leading-relaxed">
            
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">1. Eligibility</h2>
              <p>Schoolari is designed primarily for high-school students, parents, guardians, families, educators, and other individuals involved in education and post-secondary planning.</p>
              <p>You must provide accurate information when creating an account and must keep your account information current.</p>
              <p>If you are under the age of 18, you represent that you have permission from your parent or legal guardian to use Schoolari and that your parent or legal guardian has reviewed and accepted these Terms where required by applicable law.</p>
              <p>Schoolari does not knowingly permit the collection of personal information from children under 13 except as permitted by applicable law and with any required parental consent. If we learn that we have collected personal information from a child under 13 without legally required consent, we may delete that information and terminate the applicable account.</p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">2. Account Registration and Security</h2>
              <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity occurring through your account.</p>
              <p>You agree not to:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 text-sm">
                <li>Share your password with unauthorized individuals;</li>
                <li>Allow another person to use your account;</li>
                <li>Impersonate another person;</li>
                <li>Provide false or misleading information;</li>
                <li>Create an account for another person without authorization; or</li>
                <li>Attempt to gain unauthorized access to another user&apos;s account.</li>
              </ul>
              <p>You must notify Schoolari promptly if you believe your account has been compromised.</p>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">3. Parent and Student Accounts</h2>
              <p>Schoolari may allow parents or guardians to create accounts and connect to a student&apos;s account.</p>
              <p>Parents and guardians are responsible for ensuring that they have the appropriate authority to provide information about a student and to consent to any applicable processing of the student&apos;s information.</p>
              <p>Schoolari does not determine legal custody, guardianship, parental rights, or educational decision-making authority.</p>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">4. Schoolari Services</h2>
              <p>Schoolari may provide tools and features including, but not limited to:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 text-sm">
                <li>Student planning and organization;</li>
                <li>Task and deadline tracking;</li>
                <li>College research;</li>
                <li>Scholarship searches and matching;</li>
                <li>Application tracking;</li>
                <li>Document storage;</li>
                <li>Essay development and coaching;</li>
                <li>Resume development;</li>
                <li>Career exploration;</li>
                <li>Financial aid and scholarship resources;</li>
                <li>Interview preparation;</li>
                <li>Networking and professional development;</li>
                <li>AI-powered tools;</li>
                <li>Educational resources; and</li>
                <li>Coaching or guidance features.</li>
              </ul>
              <p className="text-xs text-slate-500">
                Features may vary by subscription level and may be changed, added, suspended, or discontinued at any time.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">5. AI-Powered Features</h2>
              <p>Schoolari may use artificial intelligence to provide certain Services.</p>
              <p>AI-generated or AI-assisted content may be inaccurate, incomplete, outdated, inappropriate, or unsuitable for your particular circumstances.</p>
              <p>AI output should be treated as assistance and not as professional, legal, financial, admissions, employment, educational, or other expert advice.</p>
              <p>You are solely responsible for reviewing, verifying, editing, and approving any AI-assisted or AI-generated content before using, submitting, publishing, or sharing it.</p>
              
              <div className="space-y-3 pl-2 pt-2">
                <h3 className="font-semibold text-slate-900 text-sm">Essay Coach</h3>
                <p className="text-sm text-slate-600">
                  Schoolari&apos;s Essay Coach is intended to assist students with developing their own ideas and writing. Schoolari does not guarantee that an essay will be accepted by any college, university, scholarship provider, employer, or other organization. Students are solely responsible for the final essay they submit. Schoolari does not guarantee that AI-assisted content will comply with any particular institution&apos;s academic-integrity, AI-use, admissions, scholarship, or application policies. Users are responsible for understanding and complying with the policies of the institutions or organizations to which they submit work.
                </p>

                <h3 className="font-semibold text-slate-900 text-sm pt-2">Resume Builder</h3>
                <p className="text-sm text-slate-600">
                  Schoolari&apos;s Resume Builder is intended to assist users in organizing and developing resume content. Users are solely responsible for ensuring that all information contained in a resume is accurate, truthful, complete, and appropriate for its intended use. Schoolari does not guarantee employment, interviews, admissions, internships, scholarships, or other outcomes resulting from use of the Resume Builder.
                </p>

                <h3 className="font-semibold text-slate-900 text-sm pt-2">AI User Acknowledgment</h3>
                <p className="text-xs text-slate-500">By using any Schoolari AI feature, you acknowledge and agree that:</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 text-sm">
                  <li>AI output may contain errors;</li>
                  <li>You are responsible for reviewing and verifying all AI-assisted content;</li>
                  <li>You are responsible for the final product or work you create;</li>
                  <li>You will not represent AI-generated content as independently created work where doing so would violate applicable rules or policies;</li>
                  <li>You will comply with applicable academic, institutional, employment, scholarship, admissions, and other requirements concerning AI use; and</li>
                  <li>Schoolari and Dormoney are not responsible for decisions made based upon AI-generated or AI-assisted content.</li>
                </ul>
              </div>
              <p className="text-xs text-slate-600 italic pt-2">
                To the fullest extent permitted by law, you agree to release and hold harmless Schoolari, Dormoney, and their respective owners, officers, directors, employees, contractors, affiliates, agents, representatives, successors, and assigns from claims arising from your use of or reliance upon AI-generated or AI-assisted content.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">6. User Content</h2>
              <p>You retain ownership of the original content you submit to Schoolari, including essays, resume information, documents, responses, personal information, and other materials (&ldquo;User Content&rdquo;), subject to the rights necessary for Schoolari to provide the Services.</p>
              <p>You grant Schoolari and Dormoney a limited, non-exclusive, worldwide, royalty-free license to host, store, reproduce, process, transmit, display, and otherwise use your User Content solely as reasonably necessary to provide, maintain, secure, improve, and operate the Services, subject to our Privacy Policy.</p>
              <p>You represent that you have the right to submit the User Content and that your User Content does not knowingly violate the rights of another person.</p>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">7. Accuracy of User Information</h2>
              <p>You are responsible for the accuracy of information you enter into Schoolari.</p>
              <p>Schoolari may rely on information provided by users and does not independently verify all information submitted to the platform. You are responsible for verifying deadlines, eligibility requirements, application requirements, scholarship requirements, admissions requirements, resume information, and other important information before relying upon or acting on it.</p>
            </section>

            {/* Section 8 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">8. Scholarships, Colleges, Careers and Opportunities</h2>
              <p>Schoolari may provide information about colleges, universities, scholarships, internships, employment opportunities, programs, organizations, and other opportunities.</p>
              <p>Listing or displaying an opportunity does not constitute an endorsement, guarantee, recommendation, or representation that the opportunity is legitimate, available, appropriate, or suitable for you. Information may change without notice.</p>
              <p>You are responsible for independently confirming requirements, deadlines, eligibility, terms, and other information directly with the relevant organization. Schoolari does not guarantee that a user will receive a scholarship, admission, employment, internship, financial aid, award, or other opportunity.</p>
            </section>

            {/* Section 9 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">9. Educational and Coaching Disclaimer</h2>
              <p>Schoolari is an organizational, educational, informational, and coaching platform.</p>
              <p>Schoolari does not provide legal, financial, medical, psychological, mental-health, tax, or other professional advice. Schoolari does not guarantee educational, admissions, scholarship, employment, financial, or career outcomes. Users should seek qualified professional advice when appropriate.</p>
            </section>

            {/* Section 10 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">10. Payments, Subscriptions and Upgrades</h2>
              <p>Certain Schoolari Services may require payment. By purchasing a subscription or paid Service, you authorize the applicable payment method to be charged according to the pricing and billing terms presented at the time of purchase.</p>
              <p>Paid features may remain locked until the applicable subscription or payment is activated. Subscription terms, pricing, renewal periods, cancellation procedures, and refund policies will be disclosed at or before purchase.</p>
              <p>Schoolari may change pricing for future billing periods with appropriate notice where required by law.</p>
            </section>

            {/* Section 11 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">11. Cancellation and Termination</h2>
              <p>You may stop using Schoolari at any time.</p>
              <p>Schoolari may suspend or terminate an account if we reasonably believe that the user has:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 text-sm">
                <li>Violated these Terms;</li>
                <li>Violated applicable law;</li>
                <li>Misused the Services;</li>
                <li>Attempted to compromise the security of the Services;</li>
                <li>Engaged in fraudulent or deceptive activity; or</li>
                <li>Created risk or potential liability for Schoolari, Dormoney, other users, or third parties.</li>
              </ul>
              <p>Upon termination, your right to use the Services may immediately end.</p>
              <p className="text-xs text-slate-500">
                Certain provisions of these Terms will survive termination, including provisions concerning intellectual property, disclaimers, limitations of liability, indemnification, dispute resolution, and governing law.
              </p>
            </section>

            {/* Section 12 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">12. Intellectual Property</h2>
              <p>The Schoolari platform, software, design, branding, trademarks, logos, graphics, text, interfaces, features, technology, and original content are owned by or licensed to Schoolari and/or Dormoney and are protected by applicable intellectual-property laws.</p>
              <p>Except as expressly permitted by these Terms, you may not copy, reproduce, distribute, modify, sell, lease, sublicense, reverse engineer, create derivative works from, or commercially exploit any portion of the Services without written authorization.</p>
            </section>

            {/* Section 13 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">13. Prohibited Conduct</h2>
              <p>You agree not to use Schoolari to: violate any law; infringe another person&apos;s rights; submit false or fraudulent information; impersonate another person; interfere with the Services; introduce malware or malicious code; attempt unauthorized access; scrape or harvest data without authorization; circumvent security measures; abuse AI features; use Schoolari to generate unlawful or harmful content; or use the Services for any purpose prohibited by these Terms.</p>
            </section>

            {/* Section 14 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">14. Privacy</h2>
              <p>Your use of Schoolari is also governed by the <Link href="/privacy" className="text-violet-600 font-semibold underline">Schoolari Privacy Policy</Link>, which is incorporated into these Terms by reference.</p>
            </section>

            {/* Section 15 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">15. Security</h2>
              <p>Schoolari and Dormoney use reasonable administrative, technical, and organizational measures designed to protect information maintained through the Services. However, no online service can guarantee absolute security. You acknowledge that transmission and storage of information through the internet involves inherent risks.</p>
            </section>

            {/* Section 16 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">16. Third-Party Services and Links</h2>
              <p>Schoolari may contain links to or integrations with third-party websites, applications, services, payment processors, educational resources, AI providers, or other third parties. Schoolari and Dormoney are not responsible for third-party services, content, policies, security, availability, or practices. Your use of third-party services may be governed by separate terms and privacy policies.</p>
            </section>

            {/* Section 17 */}
            <section className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">17. Disclaimer of Warranties</h2>
              <p className="text-xs uppercase leading-relaxed text-slate-700">
                TO THE FULLEST EXTENT PERMITTED BY LAW, THE SERVICES ARE PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE.&rdquo;
              </p>
              <p className="text-xs uppercase leading-relaxed text-slate-700">
                SCHOOLARI AND DORMONEY DISCLAIM ALL WARRANTIES, EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, ACCURACY, AVAILABILITY, SECURITY, AND RELIABILITY.
              </p>
              <p className="text-xs uppercase leading-relaxed text-slate-700">
                SCHOOLARI AND DORMONEY DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, COMPLETE, ACCURATE, OR THAT ANY PARTICULAR RESULT WILL BE ACHIEVED.
              </p>
            </section>

            {/* Section 18 */}
            <section className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">18. Limitation of Liability</h2>
              <p className="text-xs uppercase leading-relaxed text-slate-700">
                TO THE FULLEST EXTENT PERMITTED BY LAW, SCHOOLARI, DORMONEY, AND THEIR RESPECTIVE OWNERS, OFFICERS, DIRECTORS, EMPLOYEES, CONTRACTORS, AFFILIATES, AGENTS, REPRESENTATIVES, SUCCESSORS, AND ASSIGNS SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, PUNITIVE, OR OTHER SIMILAR DAMAGES ARISING OUT OF OR RELATING TO YOUR USE OF OR INABILITY TO USE THE SERVICES.
              </p>
              <p className="text-xs uppercase leading-relaxed text-slate-700">
                THIS INCLUDES, WITHOUT LIMITATION, CLAIMS RELATING TO AI-GENERATED OR AI-ASSISTED CONTENT, ESSAYS, RESUMES, APPLICATIONS, SCHOLARSHIP MATERIALS, COLLEGE APPLICATIONS, EMPLOYMENT MATERIALS, MISSED DEADLINES, INACCURATE INFORMATION, ADMISSIONS DECISIONS, SCHOLARSHIP DECISIONS, EMPLOYMENT DECISIONS, OR OTHER OUTCOMES.
              </p>
              <p className="text-xs uppercase leading-relaxed text-slate-700">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE TOTAL LIABILITY OF SCHOOLARI AND DORMONEY ARISING OUT OF OR RELATING TO THE SERVICES SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO SCHOOLARI FOR THE SERVICES DURING THE SIX MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM OR (B) ONE HUNDRED DOLLARS ($100).
              </p>
              <p className="text-xs text-slate-500">
                Nothing in these Terms excludes or limits liability that cannot legally be excluded or limited under applicable law.
              </p>
            </section>

            {/* Section 19 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">19. Indemnification</h2>
              <p>To the fullest extent permitted by law, you agree to defend, indemnify, and hold harmless Schoolari, Dormoney, and their respective owners, officers, directors, employees, contractors, affiliates, agents, representatives, successors, and assigns from and against claims, liabilities, damages, losses, costs, expenses, and reasonable attorneys&apos; fees arising out of or relating to:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 text-sm">
                <li>Your use or misuse of the Services;</li>
                <li>Your User Content;</li>
                <li>Your violation of these Terms;</li>
                <li>Your violation of another person&apos;s rights;</li>
                <li>Your violation of applicable law; or</li>
                <li>Your use of or reliance on AI-generated or AI-assisted content.</li>
              </ul>
            </section>

            {/* Section 20 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">20. Dispute Resolution</h2>
              <p>Before filing a legal claim, you agree to contact Schoolari at <a href="mailto:students@dormoney.com" className="text-violet-600 font-semibold underline">students@dormoney.com</a> and provide a reasonable opportunity to resolve the dispute informally.</p>
              <p>To the extent permitted by law, any dispute that cannot be resolved informally shall be resolved through binding arbitration on an individual basis rather than through a class action. Nothing in this section prevents a party from seeking temporary or injunctive relief where permitted by law.</p>
            </section>

            {/* Section 21 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">21. Class Action Waiver</h2>
              <p>To the fullest extent permitted by law, you and Schoolari/Dormoney agree that each may bring claims against the other only in an individual capacity and not as a plaintiff or class member in any purported class, collective, representative, or consolidated proceeding.</p>
              <p>If this waiver is found unenforceable, the arbitration provision may be severed or treated as otherwise required by applicable law.</p>
            </section>

            {/* Section 22 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">22. Governing Law</h2>
              <p>These Terms and your use of the Services shall be governed by the laws of the State of Delaware, without regard to conflict-of-law principles, except to the extent federal law or another mandatory law applies. Any dispute not subject to arbitration shall be brought in a court of competent jurisdiction in accordance with applicable law.</p>
              <p>Delaware law recognizes electronic records and electronic signatures and generally provides that electronic contracts and signatures may not be denied legal effect solely because they are electronic.</p>
            </section>

            {/* Section 23 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">23. Changes to These Terms</h2>
              <p>Schoolari and Dormoney may modify these Terms from time to time. Updated Terms will be posted through the Services and will include an updated effective date. Your continued use of Schoolari after the effective date of updated Terms constitutes acceptance of the updated Terms to the extent permitted by law.</p>
            </section>

            {/* Section 24 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">24. Severability</h2>
              <p>If any provision of these Terms is determined to be invalid or unenforceable, the remaining provisions shall remain in full force and effect to the fullest extent permitted by law.</p>
            </section>

            {/* Section 25 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">25. Entire Agreement</h2>
              <p>These Terms, together with the Privacy Policy and any additional terms presented for specific Services, constitute the entire agreement between you and Schoolari/Dormoney concerning your use of the Services.</p>
            </section>

            {/* Section 26 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">26. No Waiver</h2>
              <p>A failure by Schoolari or Dormoney to enforce any provision of these Terms does not constitute a waiver of the right to enforce that provision later.</p>
            </section>

            {/* Section 27 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">27. Contact</h2>
              <p>All questions, notices, requests, complaints, privacy requests, and other correspondence concerning Schoolari or these Terms must be sent exclusively by email to:</p>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 inline-block font-mono text-sm text-violet-700 font-semibold">
                <a href="mailto:students@dormoney.com" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" /> students@dormoney.com
                </a>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                No other contact method is designated by these Terms.
              </p>
            </section>

            {/* Section 28 */}
            <section className="space-y-3 border-t border-slate-100 pt-6">
              <h2 className="text-xl font-bold text-slate-900">28. Acceptance</h2>
              <p>By creating an account, clicking &ldquo;I Agree,&rdquo; checking an acceptance box, purchasing a subscription, or otherwise using Schoolari, you acknowledge that you have read, understood, and agreed to these Terms and the Schoolari Privacy Policy.</p>
              <p className="font-extrabold text-slate-900 pt-2 tracking-wide uppercase text-sm">
                BY USING SCHOOLARI, YOU ACKNOWLEDGE THAT YOU ACCEPT THESE TERMS.
              </p>
            </section>

          </div>

          {/* Footer Navigation */}
          <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© 2026 Schoolari. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-violet-600 transition-colors">Privacy Policy</Link>
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
