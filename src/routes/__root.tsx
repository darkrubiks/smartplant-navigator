import { useLanguage } from "@/hooks/use-language";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
} from "@tanstack/react-router";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LanguageMetadata } from "@/components/LanguageMetadata";
import { Toaster } from "sonner";

function NotFoundComponent() {
  const { language, t } = useLanguage();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <LanguageMetadata />
        <div className="mb-6 flex justify-center">
          <LanguageSwitcher />
        </div>
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("Page not found")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("This address does not exist. Return to the main map.")}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-[var(--mb-blue)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--mb-blue-dark)]"
          >
            {t("Go to map")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const { language, t } = useLanguage();
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <LanguageMetadata />
        <div className="mb-6 flex justify-center">
          <LanguageSwitcher />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("Something went wrong")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("The page could not be loaded. Try again or return to the map.")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-[var(--mb-blue)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--mb-blue-dark)]"
          >
            {t("Try again")}
          </button>
          <a
            href={`${import.meta.env.BASE_URL}#/`}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            {t("Go to map")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#1a68c7" },
      { property: "og:title", content: "Mercedes SmartPlant Navigator" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { language, t } = useLanguage();
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <HeadContent />
      <LanguageMetadata />
      <Outlet />
      <Toaster
        position="top-center"
        richColors
        containerAriaLabel={t("Notifications")}
        toastOptions={{ closeButtonAriaLabel: t("Close") }}
      />
    </QueryClientProvider>
  );
}
