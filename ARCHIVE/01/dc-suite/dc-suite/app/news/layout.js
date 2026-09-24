import ModuleBar from "@/components/shell/ModuleBar";
import "./wire.css";

export const metadata = {
  title: "DC Wire",
  description: "Data center news grouped by topic: deals, power and grid, technology, policy, markets and Asia Pacific.",
};

export default function ModuleLayout({ children }) {
  return (
    <div className="app-news">
      <ModuleBar moduleKey="news" />
      {children}
    </div>
  );
}
