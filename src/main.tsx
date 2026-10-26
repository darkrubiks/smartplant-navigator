import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";
import { translate, getLanguage } from "./lib/i18n";

document.documentElement.lang = getLanguage();

try {
  createRoot(document.getElementById("root")!).render(<RouterProvider router={getRouter()} />);
} catch (error: unknown) {
  console.error(error);
  const message = document.createElement("p");
  message.textContent = translate(
    "Unable to start SmartPlant Navigator. Check the application configuration and refresh.",
  );
  document.getElementById("root")!.replaceChildren(message);
}
