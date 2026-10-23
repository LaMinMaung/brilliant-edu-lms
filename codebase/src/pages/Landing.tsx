import { ArrowRight, BookOpen, CheckCircle2, Layers } from "lucide-react";
import { Brand } from "../components/layout/Brand";
import { ButtonLink } from "../components/ui/Button";
import { CourseCard, CourseGrid } from "../components/courses/CourseCard";
import { EmptyState, Loading } from "../components/ui/States";
import { useAuth } from "../hooks/useAuth";
import { useLoader } from "../hooks/useLoader";
import { useSettings } from "../hooks/useSettings";
import { listCourses } from "../services/courses";

export default function Landing() {
  const { user } = useAuth();
  const { settings, siteName } = useSettings();
  const { data, loading } = useLoader(() => listCourses({ status: "published", perPage: 6, sort: "-created" }), []);
  const courses = data?.items || [];
  const tagline = settings?.tagline || "Learning, well organised.";
  const words = tagline.split(" ");
  const last = words.pop();

  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-5 sm:px-8">
        <Brand />
        <nav className="flex items-center gap-2" aria-label="Account">
          {user ? (
            <ButtonLink to="/app" size="sm">Go to dashboard</ButtonLink>
          ) : (
            <>
              <ButtonLink to="/login" variant="ghost" size="sm">Sign in</ButtonLink>
              {settings?.allow_registration !== false && <ButtonLink to="/register" size="sm">Create account</ButtonLink>}
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto grid max-w-[1200px] gap-12 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.25fr_1fr] lg:pt-20">
        <div className="animate-rise">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-3">{siteName} · Learning platform</p>
          <h1 className="mt-5 font-display text-[2.8rem] font-semibold leading-[1.04] tracking-tight sm:text-[4.2rem]">
            {words.join(" ")} <span className="marker">{last}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
            {settings?.description || "Structured courses, clear lessons and honest progress tracking, so every learner knows where they are and what comes next."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to={user ? "/app" : "/register"} icon={<ArrowRight className="size-4" />}>
              {user ? "Continue learning" : "Start learning"}
            </ButtonLink>
            <a href="#courses" className="inline-flex h-10 items-center rounded-md border border-rule-strong px-4 text-sm font-medium hover:bg-paper-2">
              Browse courses
            </a>
          </div>
        </div>
        <ol className="ruled relative self-start rounded-lg border border-rule bg-paper p-6 pl-12" aria-label="How it works">
          <span className="absolute inset-y-0 left-8 w-px bg-brick/30" aria-hidden />
          {[
            { icon: BookOpen, t: "Pick a course", d: "Browse the catalog by category and level." },
            { icon: Layers, t: "Work through sections", d: "Lessons, files and links in a clear sequence." },
            { icon: CheckCircle2, t: "Mark your progress", d: "Complete lessons and watch your course fill in." },
          ].map((s, i) => (
            <li key={s.t} className="relative py-3">
              <span className="absolute -left-9 top-3.5 font-mono text-xs text-ink-3">0{i + 1}</span>
              <p className="flex items-center gap-2 font-display text-lg font-semibold"><s.icon className="size-4 text-ink-2" aria-hidden /> {s.t}</p>
              <p className="mt-0.5 text-sm text-ink-2">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="courses" className="border-t border-rule bg-paper-2">
        <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-3">Catalog</p>
              <h2 className="mt-2 font-display text-3xl font-semibold">Recently published</h2>
            </div>
            {courses.length > 0 && <ButtonLink to={user ? "/learn/catalog" : "/login?next=/learn/catalog"} variant="secondary" size="sm">See full catalog</ButtonLink>}
          </div>
          {loading ? (
            <Loading label="Loading courses" />
          ) : courses.length ? (
            <CourseGrid>
              {courses.map((c) => (
                <CourseCard key={c.id} course={c} to={user ? `/learn/catalog/${c.id}` : `/login?next=/learn/catalog/${c.id}`} />
              ))}
            </CourseGrid>
          ) : (
            <EmptyState icon={<BookOpen className="size-5" />} title="Courses are on their way" message="No courses have been published yet. Check back soon." />
          )}
        </div>
      </section>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-ink-3 sm:px-8">
          <span>{settings?.footer_text || `© ${new Date().getFullYear()} ${siteName}`}</span>
          {settings?.support_email && <a href={`mailto:${settings.support_email}`} className="hover:text-ink">{settings.support_email}</a>}
        </div>
      </footer>
    </div>
  );
}
