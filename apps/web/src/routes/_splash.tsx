import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SplashScreen } from "./_splash/-components/splash-screen";

const SplashLayout = () => {
  return (
    <div className="min-h-screen grid grid-cols-2">
      <SplashScreen />
      <Outlet />
    </div>
  );
};

export const Route = createFileRoute("/_splash")({
  component: SplashLayout,
});
