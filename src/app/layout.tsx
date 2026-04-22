import './globals.css';
import { bootOnce } from '@/lib/bootstrap';
import { cookies } from 'next/headers';

bootOnce();
import type { ReactNode } from 'react';
import { getDict, normalizeLocale } from '@/lib/i18n';
import { DictProvider } from './_components/DictProvider';
import { TabNav } from '@/components/shared/TabNav';
import { LangSwitcher } from '@/components/shared/LangSwitcher';

export const metadata = { title: 'AIKit — Studio Dispatch', description: 'Friends-only AI kit on DashScope' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const c = await cookies();
  const locale = normalizeLocale(c.get('locale')?.value);
  const dict = getDict(locale);
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  return (
    <html lang={locale}>
      <body>
        <DictProvider dict={dict} locale={locale}>
          {/* 顶部 marquee ticker */}
          <div className="border-b border-ink bg-ink text-paper overflow-hidden py-1.5">
            <div className="marquee-track">
              {Array.from({ length: 2 }).map((_, k) => (
                <div key={k} className="flex items-center gap-8 px-4 font-mono text-[0.68rem] uppercase tracking-[0.3em]">
                  <span>◆ AIKIT STUDIO DISPATCH</span>
                  <span>VOL. I · ISSUE 01</span>
                  <span>DASHSCOPE WIRE</span>
                  <span className="text-vermilion">● LIVE</span>
                  <span>FRIENDS · ONLY</span>
                  <span>◆ QWEN / WAN / KLING</span>
                  <span>{today}</span>
                  <span>NO PAYWALL · NO TRACK</span>
                  <span>◆ HAND-BOUND IN SHANGHAI</span>
                  <span>VOL. I · ISSUE 01</span>
                </div>
              ))}
            </div>
          </div>

          {/* Masthead */}
          <header className="border-b-2 border-ink">
            <div className="container py-6">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-baseline gap-4">
                  <div className="eyebrow hidden sm:block">EST. 2026 · № 01</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="eyebrow hidden md:inline">{today}</span>
                  <LangSwitcher />
                </div>
              </div>

              <div className="mt-2 flex items-end justify-between gap-6 flex-wrap">
                <h1 className="display text-[clamp(3.5rem,10vw,7.5rem)] leading-[0.82] font-black tracking-tight">
                  AI<span className="display-wonk text-vermilion italic">·</span>Kit
                </h1>
                <p className="max-w-sm text-sm text-ink-soft leading-relaxed italic display hidden md:block">
                  A hand-bound dispatch of generative tools — conversation, stills, moving image — served without ceremony, for friends.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-rule">
                <TabNav />
              </div>
            </div>
          </header>

          {/* 主体双栏：侧边 column-folio + 内容 */}
          <main className="container py-10">
            <div className="grid grid-cols-[auto,1fr] gap-6 md:gap-10">
              <aside className="hidden md:flex flex-col items-center pt-2 gap-6">
                <div className="vertical-label">DISPATCH ROOM</div>
                <div className="w-px flex-1 bg-rule" />
                <div className="mono text-[0.62rem] tracking-widest text-ink-soft">§ 01</div>
              </aside>
              <div className="min-w-0 fade-up">{children}</div>
            </div>
          </main>

          {/* Footer colophon */}
          <footer className="border-t border-ink mt-16">
            <div className="container py-8 grid gap-6 md:grid-cols-3 text-sm">
              <div>
                <div className="eyebrow mb-2">Colophon</div>
                <p className="text-ink-soft leading-relaxed">
                  Set in <span className="display italic">Fraunces</span>, Instrument Sans &amp; JetBrains Mono.
                  Printed on warm paper, pressed in Next.js.
                </p>
              </div>
              <div>
                <div className="eyebrow mb-2">Imprint</div>
                <p className="text-ink-soft leading-relaxed">
                  Powered by DashScope — Qwen for words, Wan for stills, Kling for motion.
                </p>
              </div>
              <div className="text-right">
                <div className="eyebrow mb-2">FIN</div>
                <p className="display italic text-2xl">—&nbsp;30&nbsp;—</p>
              </div>
            </div>
          </footer>
        </DictProvider>
      </body>
    </html>
  );
}
