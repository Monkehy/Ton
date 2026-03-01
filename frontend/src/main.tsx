import React from "react";
import ReactDOM from "react-dom/client";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { ErrorBoundary } from "./ErrorBoundary";
import { LocaleProvider } from "./i18n/LocaleContext";
import App from "./App";
import "./styles/global.css";

const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <TonConnectUIProvider manifestUrl={manifestUrl}>
        <LocaleProvider>
          <App />
        </LocaleProvider>
      </TonConnectUIProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
