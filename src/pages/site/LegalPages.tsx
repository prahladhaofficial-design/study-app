import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BRAND } from '../../config/brand'
import { SiteLayout } from './SiteLayout'

// Bump when any policy text changes.
const UPDATED = '13 October 2026'
const PAYMENTS = 'Dodo Payments'

function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    document.title = `${title} · ${BRAND.name}`
    window.scrollTo(0, 0)
  }, [title])
  return (
    <SiteLayout>
      <article className="legal mx-auto max-w-3xl px-4 py-14">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-faint">Last updated {UPDATED}</p>
        <div className="mt-8 flex flex-col gap-4 leading-relaxed text-dim">{children}</div>
      </article>
    </SiteLayout>
  )
}

function H({ children }: { children: ReactNode }) {
  return <h2 className="mt-6 text-lg font-semibold text-ink">{children}</h2>
}

function Ul({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

const Mail = () => (
  <a href={`mailto:${BRAND.supportEmail}`} className="text-accent underline">
    {BRAND.supportEmail}
  </a>
)

export function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms cover your use of {BRAND.name} (the "service"), a study app available on the web and in our desktop and mobile apps. The service is run by {BRAND.owner}, based in {BRAND.region} ("we", "us"). By
        creating an account or using the service you agree to these terms.
      </p>

      <H>Your account</H>
      <Ul
        items={[
          'You need an account to use the service. Keep your password private; you are responsible for activity on your account.',
          'If you are under 18, use the service only with the consent of a parent or guardian.',
          'Give accurate information. The name you show on leaderboards must not impersonate anyone or be offensive.',
        ]}
      />

      <H>Free trial and plans</H>
      <Ul
        items={[
          `New accounts get a ${BRAND.trialDays}-day free trial with every feature. No payment details are needed to start it.`,
          'After the trial you need a paid plan to keep using the app. Plans are monthly, yearly (both renew automatically until cancelled) or a one-time lifetime purchase.',
          'Prices are shown on our website and at checkout. Taxes may be added depending on where you live.',
          'If we change the price of a renewing plan, we will tell you before it applies, and you can cancel before your next renewal.',
        ]}
      />

      <H>Payments</H>
      <p>
        Payments are handled by our payment partner, {PAYMENTS}, which acts as the merchant of record for your purchase. Its own terms apply to the payment itself. We never see or store your full card or bank details.
      </p>

      <H>Cancelling</H>
      <p>
        You can cancel a monthly or yearly plan at any time. You keep access until the end of the period you have already paid for, and you will not be charged again. Refunds are covered in our{' '}
        <Link to="/refunds" className="text-accent underline">
          refund policy
        </Link>
        .
      </p>

      <H>Your content</H>
      <p>
        Your study sessions, notes, flashcards, images and other content remain yours. You give us permission to store and process them only so we can run the service for you, for example to back them up and sync them between your
        devices. If you join the study arena, your display name, country and focus time are shown to other users.
      </p>

      <H>Acceptable use</H>
      <Ul
        items={[
          'Do not break the law, upload content you have no right to share, or upload anything harmful or abusive.',
          'Do not try to access other people’s data, disrupt the service, or manipulate leaderboards with fake sessions.',
          'Do not copy, resell or reverse engineer the service.',
        ]}
      />
      <p>We may suspend or close accounts that break these rules.</p>

      <H>Availability and changes</H>
      <p>
        We work to keep the service running and your data safe, but we cannot promise it will always be available or error free. We may add, change or remove features. If we make a change that significantly reduces what a paid
        plan includes, we will tell you and you may ask for a refund for the unused part of your plan.
      </p>

      <H>Liability</H>
      <p>
        The service is provided "as is". To the extent the law allows, we are not liable for indirect or consequential losses, and our total liability to you is limited to the amount you paid us in the 12 months before the claim.
        Nothing in these terms limits rights you have under consumer protection law.
      </p>

      <H>Ending your account</H>
      <p>
        You can stop using the service at any time and ask us to delete your account by writing to <Mail />.
      </p>

      <H>Law</H>
      <p>These terms are governed by the laws of India. Courts in {BRAND.region.replace(', India', '')} have jurisdiction over any dispute.</p>

      <H>Contact</H>
      <p>
        Questions about these terms: <Mail />.
      </p>
    </LegalPage>
  )
}

export function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This policy explains what {BRAND.name} collects, why, and the choices you have. {BRAND.name} is run by {BRAND.owner}, based in {BRAND.region}. We collect only what the app needs to work.
      </p>

      <H>What we collect</H>
      <Ul
        items={[
          <>
            <b className="text-ink">Account details:</b> your email address, and your name and profile picture if you sign in with Google.
          </>,
          <>
            <b className="text-ink">Study data you create:</b> focus sessions, subjects, notes, flashcards, tasks, goals, projects, sketches, and photos you add to Moments. All of it is backed up to our cloud database so it appears on every device you sign in on. Only you can see it.
          </>,
          <>
            <b className="text-ink">Arena profile:</b> the display name and country you choose if you join the leaderboard. You can change them or hide yourself at any time.
          </>,
          <>
            <b className="text-ink">Plan status:</b> which plan you have and when it renews. Payment details are collected by {PAYMENTS}, not by us.
          </>,
          <>
            <b className="text-ink">Basic technical data:</b> information our hosting providers log automatically, such as IP address and browser type, used for security and fixing problems.
          </>,
        ]}
      />

      <H>How we use it</H>
      <Ul
        items={[
          'To run the app: save your study data, back it up and sync it between your devices.',
          'To manage your trial and subscription.',
          'To show leaderboards, only if you join the arena.',
          'To reply when you contact us and to send important account or billing messages.',
        ]}
      />
      <p>We do not sell your data, and we do not show ads.</p>

      <H>Where it is stored</H>
      <p>Your data is saved on your device first so the app works offline, then backed up to our cloud database. We use these providers to run the service:</p>
      <Ul
        items={[
          'Supabase, for sign-in and the cloud database',
          'Vercel, to host the website',
          'Google, if you choose to sign in with Google',
          `${PAYMENTS}, to process payments`,
        ]}
      />
      <p>Some of these providers may store data outside India. They are bound to protect it and use it only to provide their service to us.</p>

      <H>Cookies and local storage</H>
      <p>We use your browser’s storage to keep you signed in, remember settings such as theme and sounds, and hold your study data offline. We do not use advertising or tracking cookies.</p>

      <H>Your choices</H>
      <Ul
        items={[
          'See and edit your study data in the app at any time.',
          'Ask us to remove you from the arena leaderboards at any time.',
          <>
            Ask for a copy of your data, a correction, or deletion of your account and data by writing to <Mail />. We act on requests within 30 days.
          </>,
        ]}
      />

      <H>How long we keep it</H>
      <p>We keep your data while your account is open. When you delete your account we remove your data from our database within 30 days, apart from records we must keep by law, such as payment records.</p>

      <H>Children</H>
      <p>Users under 18 should use the service with the consent of a parent or guardian. If you believe a child has given us data without consent, contact us and we will delete it.</p>

      <H>Changes</H>
      <p>If we change this policy in a meaningful way, we will tell you in the app or by email before the change applies.</p>

      <H>Contact</H>
      <p>
        Privacy questions or requests: <Mail />.
      </p>
    </LegalPage>
  )
}

export function RefundPage() {
  return (
    <LegalPage title="Refund and Cancellation Policy">
      <p>
        Every account starts with a {BRAND.trialDays}-day free trial, so you can try all of {BRAND.name} before paying. If a purchase still does not work out, here is how refunds and cancellations work.
      </p>

      <H>Cancelling a subscription</H>
      <Ul
        items={[
          'You can cancel a monthly or yearly plan at any time from your account, or by writing to us.',
          'After cancelling you keep access until the end of the period you already paid for. You will not be charged again.',
        ]}
      />

      <H>Refunds</H>
      <Ul
        items={[
          'Monthly and yearly plans: if you ask within 7 days of a payment, we refund that payment in full.',
          'Lifetime plan: if you ask within 14 days of purchase, we refund it in full.',
          'Duplicate charges, or charges after you cancelled, are always refunded in full.',
          'After these windows, payments are not refundable, except where the law requires a refund or where we have significantly reduced what your plan includes.',
        ]}
      />

      <H>How to ask for a refund</H>
      <p>
        Write to <Mail /> from the email on your account, with the date of the payment. We reply within 2 business days. Approved refunds go back to your original payment method through {PAYMENTS}, and usually arrive within 5 to 10
        business days, depending on your bank.
      </p>

      <H>Contact</H>
      <p>
        Questions about a payment: <Mail />.
      </p>
    </LegalPage>
  )
}
