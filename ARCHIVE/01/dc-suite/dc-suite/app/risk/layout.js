import ModuleBar from "@/components/shell/ModuleBar";

export const metadata = {
  title: "Risk Register",
  description: "Lifecycle risk register and leadership dashboard for data center development projects.",
};

export default function ModuleLayout({ children }) {
  return (
    <div className="app-risk">
      <ModuleBar moduleKey="risk" />
      {children}
    </div>
  );
}
