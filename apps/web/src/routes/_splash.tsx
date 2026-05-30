import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SplashScreen } from "./_splash/-components/splash-screen";

const SplashLayout = () => {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* decorative panel — vfx only, hidden on mobile */}
      <div className="hidden lg:block">
        <SplashScreen />
      </div>
      <Outlet />
    </div>
  );
};

export const Route = createFileRoute("/_splash")({
  component: SplashLayout,
});
