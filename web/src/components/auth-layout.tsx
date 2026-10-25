import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

const HIGHLIGHTS = [
  "Submit a project once and track every review decision.",
  "Clear status history — pending, approved, or rejected.",
  "Mentors review every submission from a single queue.",
];

export function AuthLayout({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:24px_24px]"
        />
        <div className="relative">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <span className="grid size-8 place-items-center rounded-md bg-primary-foreground/15 text-xs font-bold">
              PR
            </span>
            Project Review
          </Link>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight">
            From submission to sign-off, without the email chase.
          </h2>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-primary-foreground/85">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-primary-foreground/60">
          Built with Next.js, Express, PostgreSQL and Prisma.
        </p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                PR
              </span>
              Project Review
            </Link>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <div className="mt-6 text-sm text-muted-foreground">{footer}</div>
        </div>
      </main>
    </div>
  );
}
