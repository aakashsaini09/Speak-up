import HomePage from "@/components/HomePage";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <div className="font-serif">
      <div>
        <Navbar/>
        <HomePage/>
      </div>
    </div>
  );
}
