"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/src/components/PageHeader";
import TradeSetupDetail from "@/src/components/TradeSetupDetail";

export default function TradeSetupDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  // Function to handle back button click
  const handleBack = () => {
    router.push('/social-forum');
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <PageHeader
        title="Trade Setup Details"
        backUrl="/social-forum"
        onBackClick={handleBack}
      />
      <TradeSetupDetail id={params.id} />
    </div>
  );
}
