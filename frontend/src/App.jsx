import { BrowserRouter } from "react-router";
import { AppProviders } from "./app/providers.jsx";
import { AppRoutes } from "./app/routes.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </BrowserRouter>
  );
}
