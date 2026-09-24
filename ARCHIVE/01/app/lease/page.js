import library from "@/data/lease/deals.json";
import Comparator from "@/components/lease/Comparator";

export default function Home() {
  return <Comparator library={library} />;
}