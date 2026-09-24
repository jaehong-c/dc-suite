import ModuleBar from "@/components/shell/ModuleBar";

export const metadata = {
  title: "Lease Comparator",
  description: "Side-by-side economics for publicly disclosed data center leases: $/kW/month, TCV, yield on cost, NPV, and effective counterparty credit.",
};

export default function ModuleLayout({ children }) {
  return (
    <div className="app-lease">
      <ModuleBar moduleKey="lease" />
      <main className="lease-main">{children}</main>
    </div>
  );
}
