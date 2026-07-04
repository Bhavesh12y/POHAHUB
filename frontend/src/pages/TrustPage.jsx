import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { absoluteUrl } from '../config/seo.js';

const pages = {
  trust: {
    title: 'Trust and Safety | Doozles',
    heading: 'Trust and Safety',
    description:
      'Learn how Doozles supports browser-based play, private rooms, basic privacy practices, and safe casual gaming.',
    sections: [
      {
        title: 'Browser-Based Play',
        body:
          'Doozles games run in the browser, so players can create and join rooms without installing an app.',
      },
      {
        title: 'Private Rooms',
        body:
          'Multiplayer sessions use room links or room codes so friends can join the same match quickly.',
      },
      {
        title: 'Basic Data Use',
        body:
          'The app may use display names, room codes, browser storage, analytics, and gameplay events to operate rooms and improve reliability.',
      },
      {
        title: 'Casual Play',
        body:
          'Doozles is designed for entertainment and should not be used for gambling, wagers, harassment, or disruptive behavior.',
      },
    ],
  },
  'privacy-policy': {
    title: 'Privacy Policy | Doozles',
    heading: 'Privacy Policy',
    description:
      'Read how Doozles handles basic gameplay data, browser storage, analytics, and advertising disclosures.',
    sections: [
      {
        title: 'Information We Use',
        body:
          'Doozles lets players create and join private game rooms. The app may use a display name, room code, browser storage, device information, and gameplay events to run the multiplayer experience.',
      },
      {
        title: 'Local Storage',
        body:
          'We may store your display name in your browser so you do not need to type it again every time you join a room. You can clear this from your browser settings.',
      },
      {
        title: 'Analytics',
        body:
          'We use privacy-conscious analytics (including Google Analytics 4) to understand aggregate usage, page views, game starts, and errors. These signals help improve reliability and performance.',
      },
      {
        title: 'Advertising and Cookies',
        body:
          'Third-party vendors, including Google, use cookies to serve ads based on a user\'s prior visits to this website or other websites. Google\'s use of advertising cookies enables it and its partners to serve ads to our users based on their visit to our sites and/or other sites on the Internet.',
      },
      {
        title: 'Opting Out',
        body:
          'Users may opt out of personalized advertising by visiting Google\'s Ads Settings. You can also opt out of some third-party vendors\' uses of cookies for personalized advertising by visiting www.aboutads.info.',
      },
    ],
  },
  terms: {
    title: 'Terms and Conditions | Doozles',
    heading: 'Terms and Conditions',
    description:
      'Review the basic terms for using Doozles multiplayer rooms and browser games.',
    sections: [
      {
        title: 'Use of the Service',
        body:
          'Doozles is provided for casual browser-based gameplay. Do not use the platform for abuse, harassment, spam, cheating, or activity that disrupts other players.',
      },
      {
        title: 'Rooms and Gameplay',
        body:
          'Game rooms are temporary and may close when players disconnect. Scores and room states are not guaranteed to persist.',
      },
      {
        title: 'Intellectual Property',
        body:
          'The unique visual notebook designs, logos, and custom code are the property of Doozles. Do not scrape or republish our web assets without permission.',
      },
      {
        title: 'Availability',
        body:
          'The service may change, pause, or become unavailable while features are improved or maintained. We are not liable for any interruptions in gameplay.',
      },
    ],
  },
  contact: {
    title: 'Contact Doozles',
    heading: 'Contact',
    description:
      'Contact Doozles for feedback, bug reports, privacy questions, and partnership requests.',
    sections: [
      {
        title: 'Support',
        body:
          'For bugs, feedback, or account-free gameplay questions, please email us directly at support@doozles.xyz. We aim to respond within 48 hours.',
      },
      {
        title: 'Creator Contact',
        body:
          'Doozles is actively developed by Bhavesh Gupta. For direct queries, partnership requests, or technical discussions, you can reach out via Instagram: https://www.instagram.com/bhavesh12z',
      },
    ],
  },
  about: {
    title: 'About Doozles',
    heading: 'About Doozles',
    description:
      'Doozles is a browser-based multiplayer gaming hub for quick private matches with friends.',
    sections: [
      {
        title: 'What Doozles Is',
        body:
          'Doozles is a lightweight multiplayer arcade where players can create private rooms and play quick games with friends from a browser, entirely free of app installations.',
      },
      {
        title: 'Current Games',
        body:
          'The platform currently includes games such as Tic Tac Toe, Connect 4, Ludo, Scribble, Tambola, Snake and Ladder, Rock Paper Scissor, Block Blaster, and 2048.',
      },
      {
        title: 'Product Direction',
        body:
          'The goal is to keep room creation instant while continually expanding our catalog of notebook-style arcade games.',
      },
    ],
  },
};

export default function TrustPage({ page }) {
  const content = pages[page] || pages.about;
  const canonicalPath = page === 'terms' ? '/terms' : `/${page}`;

  return (
    <>
      <Helmet>
        <title>{content.title}</title>
        <meta name="description" content={content.description} />
        <link rel="canonical" href={absoluteUrl(canonicalPath)} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Doozles" />
        <meta property="og:title" content={content.title} />
        <meta property="og:description" content={content.description} />
        <meta property="og:url" content={absoluteUrl(canonicalPath)} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={content.title} />
        <meta name="twitter:description" content={content.description} />
      </Helmet>

      <article className="max-w-4xl mx-auto px-5 py-12 sm:py-16">
        <header className="mb-8">
          <p className="inline-block bg-[#facc15] border-[3px] border-black shadow-[4px_4px_0px_#000] px-4 py-2 mb-5 -rotate-1 text-sm font-black uppercase tracking-widest">
            Doozles
          </p>
          <h1 className="text-[clamp(2.25rem,6vw,4rem)] font-black uppercase leading-none tracking-normal">
            {content.heading}
          </h1>
          <p className="mt-5 text-lg font-bold text-gray-800 leading-relaxed">
            {content.description}
          </p>
        </header>

        <div className="paper-panel bg-white p-6 sm:p-8 space-y-6">
          {content.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-black uppercase mb-2">{section.title}</h2>
              <p className="font-bold text-gray-800 leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center bg-[#7dd3fc] text-black border-[4px] border-black px-6 py-3 font-black uppercase tracking-widest shadow-[5px_5px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all"
          >
            Back to Hub
          </Link>
        </div>
      </article>
    </>
  );
}