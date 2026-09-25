import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  Copy,
  Gamepad2,
  Gift,
  Menu,
  ShieldCheck,
  Smartphone,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";

const PROMO_CODE = "A7454";

// 1xBet affiliate link — geo-detects language and currency automatically
const REGISTER_URL =
  "https://reffpa.com/L?tag=d_1675627m_1573c_A7454&site=1675627&ad=1573";

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
    } catch {
      const el = document.createElement("textarea");
      el.value = PROMO_CODE;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand("copy");
      } catch {
        // ignore
      }
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const features = [
    {
      icon: Trophy,
      title: "Sports Betting",
      description:
        "Bet on football, basketball, tennis and hundreds of other sports worldwide.",
    },
    {
      icon: Zap,
      title: "Live Betting",
      description:
        "Follow matches in real time and place bets while the action is happening.",
    },
    {
      icon: Gamepad2,
      title: "Casino",
      description:
        "Explore slots, table games and live dealer entertainment on the platform.",
    },
    {
      icon: Gift,
      title: "Promotions",
      description:
        "Claim welcome bonuses and enter the promo code during registration.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#05080f] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#05080f]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          {/* Logo */}
          <a href="#home" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0a5cff] font-black text-white">
              SB
            </div>
            <span className="text-xl font-black tracking-tight">
              SPORTS<span className="text-[#0a5cff]">BET</span>
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-7 md:flex">
            <a href="#sports" className="nav-link">
              Sports
            </a>
            <a href="#live" className="nav-link">
              Live
            </a>
            <a href="#casino" className="nav-link">
              Casino
            </a>
            <a href="#promotions" className="nav-link">
              Promotions
            </a>
          </nav>

          <div className="hidden md:block">
            <a
              href={REGISTER_URL}
              className="rounded-lg bg-[#0a5cff] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1e6dff]"
            >
              Register
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg border border-white/10 p-2 md:hidden"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="border-t border-white/10 bg-[#05080f] px-5 py-5 md:hidden">
            <nav className="flex flex-col gap-5">
              <a onClick={closeMenu} href="#sports">
                Sports
              </a>
              <a onClick={closeMenu} href="#live">
                Live
              </a>
              <a onClick={closeMenu} href="#casino">
                Casino
              </a>
              <a onClick={closeMenu} href="#promotions">
                Promotions
              </a>

              <a
                onClick={closeMenu}
                href={REGISTER_URL}
                className="rounded-lg bg-[#0a5cff] px-5 py-3 text-center font-bold text-white"
              >
                Register
              </a>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section id="home" className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-40 top-20 h-80 w-80 rounded-full bg-[#0a5cff]/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-40 top-20 h-80 w-80 rounded-full bg-[#0a5cff]/10 blur-3xl" />

          <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 lg:grid-cols-2 lg:px-8 lg:py-28">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#0a5cff]/20 bg-[#0a5cff]/10 px-3 py-1.5 text-xs font-semibold text-[#0a5cff]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0a5cff]" />
                Global Sports Betting
              </div>

              <h1 className="max-w-2xl text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl">
                Bet on the
                <span className="text-[#0a5cff]"> action.</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-white/60">
                Sports betting, live betting, casino and promotions — all in
                one place, available worldwide.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={REGISTER_URL}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0a5cff] px-6 py-3.5 font-bold text-white transition hover:bg-[#1e6dff]"
                >
                  Register Now
                  <ArrowRight size={18} />
                </a>
              </div>

              <p className="mt-5 text-xs text-white/35">
                18+ | Please gamble responsibly.
              </p>
            </div>

            {/* Hero visual */}
            <div className="relative">
              <div className="rounded-3xl border border-white/10 bg-[#0a0f18] p-4 shadow-2xl shadow-black/40">
                <div className="rounded-2xl border border-white/10 bg-[#0d1420] p-5">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white/40">LIVE</p>
                      <p className="font-bold">Football</p>
                    </div>
                    <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
                      ● LIVE
                    </span>
                  </div>

                  <div className="rounded-xl bg-[#070c14] p-5">
                    <div className="flex items-center justify-between text-sm">
                      <span>Manchester</span>
                      <span className="font-bold">2</span>
                    </div>
                    <div className="my-4 h-px bg-white/10" />
                    <div className="flex items-center justify-between text-sm">
                      <span>United</span>
                      <span className="font-bold">1</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {["1", "X", "2"].map((item, index) => (
                      <div
                        key={item}
                        className={`rounded-lg border p-3 text-center ${
                          index === 0
                            ? "border-[#0a5cff]/40 bg-[#0a5cff]/10 text-[#0a5cff]"
                            : "border-white/10 bg-white/[0.02]"
                        }`}
                      >
                        <p className="text-xs text-white/40">Odds</p>
                        <p className="mt-1 font-bold">
                          {index === 0 ? "1.82" : index === 1 ? "3.40" : "4.10"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Promotions */}
        <section
          id="promotions"
          className="border-y border-white/10 bg-[#070c14]"
        >
          <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-widest text-[#0a5cff]">
                Promotions
              </p>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                Get more from your account
              </h2>
              <p className="mt-4 text-white/50">
                Use the promo code below when registering to claim the
                welcome bonus.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {/* Promo code card */}
              <div className="rounded-2xl border border-[#0a5cff]/20 bg-[#0a5cff]/[0.05] p-7">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0a5cff]/10 text-[#0a5cff]">
                  <Gift size={22} />
                </div>

                <h3 className="mt-5 text-xl font-bold">Promo Code</h3>

                <p className="mt-2 text-sm leading-6 text-white/50">
                  Enter the promo code below during registration to claim the
                  available welcome bonus.
                </p>

                <div className="mt-6 flex items-center gap-3 rounded-xl border border-dashed border-[#0a5cff]/40 bg-black/30 p-4">
                  <span className="font-mono text-xl font-black tracking-[0.2em] text-white">
                    {PROMO_CODE}
                  </span>

                  <button
                    onClick={copyCode}
                    className="ml-auto flex items-center gap-1.5 rounded-lg bg-[#0a5cff] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#1e6dff] active:scale-95"
                  >
                    {copied ? (
                      <>
                        <Check size={14} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                <p className="mt-3 text-xs text-white/40">
                  Use this code during registration
                </p>
              </div>

              {/* Welcome card */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-7">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5">
                  <Trophy size={22} />
                </div>

                <h3 className="mt-5 text-xl font-bold">
                  Welcome Bonus
                </h3>

                <p className="mt-2 text-sm leading-6 text-white/50">
                  New-user promotions may be available. Eligibility and
                  wagering requirements apply.
                </p>

                <a
                  href={REGISTER_URL}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#0a5cff]"
                >
                  Register now
                  <ArrowRight size={16} />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* SEO content */}
        <section className="border-t border-white/10">
          <div className="mx-auto max-w-4xl px-5 py-16 lg:px-8">
            <h2 className="text-3xl font-black">
              How to Register with Promo Code A7454
            </h2>

            <p className="mt-6 leading-7 text-white/60">
              To complete your{" "}
              <strong className="text-white">registration</strong>, click the
              Register button on this page. Enter your phone number, choose
              your preferred currency, and enter the promo code{" "}
              <strong className="text-white">A7454</strong> in the promo code
              field to claim your welcome bonus.
            </p>

            <p className="mt-4 leading-7 text-white/60">
              The platform offers sports betting, live betting, casino games
              and promotions to users worldwide. Registration takes less than
              a minute and requires only your phone number.
            </p>

            <h3 className="mt-10 text-xl font-bold">
              Step-by-step registration
            </h3>

            <ol className="mt-6 space-y-4 text-white/60">
              <li className="flex gap-4">
                <span className="font-mono font-bold text-[#0a5cff]">01</span>
                <span>
                  Click the <strong className="text-white">Register</strong>{" "}
                  button on this page.
                </span>
              </li>
              <li className="flex gap-4">
                <span className="font-mono font-bold text-[#0a5cff]">02</span>
                <span>
                  Enter your phone number and select your currency.
                </span>
              </li>
              <li className="flex gap-4">
                <span className="font-mono font-bold text-[#0a5cff]">03</span>
                <span>
                  Enter the promo code{" "}
                  <strong className="text-white">A7454</strong> to unlock the
                  welcome bonus.
                </span>
              </li>
              <li className="flex gap-4">
                <span className="font-mono font-bold text-[#0a5cff]">04</span>
                <span>
                  Complete verification and start betting on sports, live
                  events or casino games.
                </span>
              </li>
            </ol>
          </div>
        </section>

        {/* Features */}
        <section id="sports" className="border-t border-white/10">
          <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-[#0a5cff]">
                Features
              </p>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                Everything in one place
              </h2>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="group rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:-translate-y-1 hover:border-[#0a5cff]/30"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0a5cff]/10 text-[#0a5cff]">
                      <Icon size={21} />
                    </div>
                    <h3 className="mt-5 font-bold">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/45">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Responsible gaming */}
        <section id="casino" className="border-y border-white/10 bg-[#070c14]">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-7 sm:p-10">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0a5cff]/10 text-[#0a5cff]">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Play responsibly</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">
                    Gambling involves financial risk. Set limits, only use
                    money you can afford to lose, and take breaks when needed.
                    This service is intended for adults aged 18 and above.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <div className="mx-auto max-w-3xl px-5 py-16">
            <div className="mb-8 text-center">
              <CircleHelp className="mx-auto text-[#0a5cff]" size={28} />
              <h2 className="mt-3 text-3xl font-black">Need help?</h2>
            </div>

            <details className="group border-b border-white/10 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                How do I register?
                <ChevronDown
                  className="transition group-open:rotate-180"
                  size={18}
                />
              </summary>
              <p className="mt-4 text-sm leading-6 text-white/45">
                Click the Register button at the top of the page, enter your
                phone number, select your currency, and enter the promo code
                A7454 to claim your welcome bonus.
              </p>
            </details>

            <details className="group border-b border-white/10 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                Where do I enter the promo code?
                <ChevronDown
                  className="transition group-open:rotate-180"
                  size={18}
                />
              </summary>
              <p className="mt-4 text-sm leading-6 text-white/45">
                Enter A7454 into the promo code field during registration. Use
                the copy button above for convenience.
              </p>
            </details>

            <details className="group border-b border-white/10 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                Can I bet while an event is live?
                <ChevronDown
                  className="transition group-open:rotate-180"
                  size={18}
                />
              </summary>
              <p className="mt-4 text-sm leading-6 text-white/45">
                Live betting is available for eligible sporting events.
              </p>
            </details>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#03060b]">
        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0a5cff] text-xs font-black text-white">
                  SB
                </div>
                <span className="font-black">
                  SPORTS<span className="text-[#0a5cff]">BET</span>
                </span>
              </div>
              <p className="mt-3 text-xs text-white/30">
                18+ | Gamble responsibly.
              </p>
            </div>

            <div className="flex flex-wrap gap-5 text-xs text-white/40">
              <a href="#home" className="hover:text-white">
                Home
              </a>
              <a href="#promotions" className="hover:text-white">
                Promotions
              </a>
              <a href="#casino" className="hover:text-white">
                Responsible Gaming
              </a>
              <a href="#" className="hover:text-white">
                Terms
              </a>
            </div>
          </div>

          <div className="mt-8 border-t border-white/5 pt-6 text-xs text-white/20">
            © {new Date().getFullYear()} SportsBet Guide. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Floating mobile CTA */}
      <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden">
        <a
          href={REGISTER_URL}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a5cff] px-5 py-3.5 font-bold text-white shadow-xl shadow-black/50 transition hover:bg-[#1e6dff]"
        >
          <Smartphone size={18} />
          Register Now
        </a>
      </div>
    </div>
  );
}

export default App;
