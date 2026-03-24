import { useEffect, useState } from "react";
import { TraderDashboard, type TraderPage } from "./TraderDashboard.tsx";

function pageFromHash(): TraderPage {
  const h = window.location.hash.replace(/^#/, "");
  if (h === "/mint-redeem") return "mint-redeem";
  return "swap";
}

export function App() {
  const [page, setPage] = useState<TraderPage>(pageFromHash);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <div>
      <nav className="route-tabs">
        <a
          href="#/swap"
          className={`route-tab ${page === "swap" ? "active" : ""}`}
        >
          Swap
        </a>
        <a
          href="#/mint-redeem"
          className={`route-tab ${page === "mint-redeem" ? "active" : ""}`}
        >
          Mint + Redeem
        </a>
      </nav>
      <TraderDashboard page={page} />
    </div>
  );
}
