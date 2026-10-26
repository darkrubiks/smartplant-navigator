import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import { supabase } from "./integrations/supabase/client";
import "./styles.css";

// Finish PKCE before starting the hash router: OAuth uses the query string.
async function start() {
  await supabase.auth.getSession();
  createRoot(document.getElementById("root")!).render(<RouterProvider router={getRouter()} />);
}

start().catch((error: unknown) => {
  console.error(error);
  const message = document.createElement("p");
  message.textContent =
    "Unable to start SmartPlant Navigator. Check the application configuration and refresh.";
  document.getElementById("root")!.replaceChildren(message);
});
