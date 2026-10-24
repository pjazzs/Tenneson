import { useEffect, useState } from "react";

export default function InstallTennesonButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    const checkStandalone = () => {
      setIsInstalled(
        window.matchMedia("(display-mode: standalone)").matches ||
          window.navigator.standalone === true,
      );
    };

    checkStandalone();
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) {
      window.alert(
        "Android: open this website in Chrome, tap the three-dot menu, then choose Install app or Add to Home screen. iPhone: open this website in Safari, tap Share, then Add to Home Screen.",
      );
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  if (isInstalled) return null;

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={handleInstall}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold text-white shadow-lg backdrop-blur-md transition hover:bg-white/20"
      >
        <span aria-hidden="true">⬇</span>
        Install Tenneson App
      </button>
      <p className="mt-3 max-w-xl text-sm text-white/70">
        Add Tenneson to your phone's home screen for quick access to the student
        and admin portals.
      </p>
    </div>
  );
}
