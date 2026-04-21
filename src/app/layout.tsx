import './globals.css';
import { bootOnce } from '@/lib/bootstrap';
import { cookies } from 'next/headers';

bootOnce();
import type { ReactNode } from 'react';
import { getDict, normalizeLocale } from '@/lib/i18n';
import { DictProvider } from './_components/DictProvider';
import { TabNav } from '@/components/shared/TabNav';
import { LangSwitcher } from '@/components/shared/LangSwitcher';

export const metadata = { title: 'AIKit', description: 'Friends-only AI kit on DashScope' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const c = await cookies();
  const locale = normalizeLocale(c.get('locale')?.value);
  const dict = getDict(locale);
  return (
    <html lang={locale}>
      <body>
        <DictProvider dict={dict} locale={locale}>
          <header className="flex items-center justify-between px-6 py-3 border-b">
            <div className="flex items-center gap-6">
              <span className="text-lg font-semibold">AIKit</span>
              <TabNav />
            </div>
            <LangSwitcher />
          </header>
          <main className="container py-6">{children}</main>
        </DictProvider>
      </body>
    </html>
  );
}
