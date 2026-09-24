import ModuleBar from "@/components/shell/ModuleBar";

export const metadata = {
  title: "Site Screener",
  description: "Eleven-axis data center site screening with an AI-written investment memo. Enter any US address.",
};

export default function ModuleLayout({ children }) {
  return (
    <div className="app-site">
      <ModuleBar moduleKey="site" />
      {children}
    </div>
  );
}
