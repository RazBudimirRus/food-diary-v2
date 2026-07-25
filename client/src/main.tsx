import "./index.css";
import App from "./App";
import { createRoot } from "react-dom/client";
import { reportError } from "@/lib/errorReporter";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Глобальный обработчик необработанных JS ошибок
window.onerror = (message, source, lineno, colno, error) => {
  void reportError({
    message: String(message),
    stack: error?.stack ?? null,
    url: source ?? window.location.href,
    extra: { lineno, colno },
  });
};

// Необработанные Promise rejections
window.onunhandledrejection = (event: PromiseRejectionEvent) => {
  const err = event.reason;
  void reportError({
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : null,
    url: window.location.href,
    extra: { type: "unhandledrejection" },
  });
};

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
