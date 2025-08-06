"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageHeader } from "../../src/components/PageHeader";
import CreateTradeSetupForm from "../../src/components/CreateTradeSetupForm";

export default function CreateTradeSetupPage() {
  const router = useRouter();

  // Set up navigation state to ensure back button goes to social forum
  useEffect(() => {
    // Store the previous page in session storage
    const previousPage = sessionStorage.getItem('previousPage');
    if (!previousPage || !previousPage.includes('/social-forum')) {
      sessionStorage.setItem('previousPage', '/social-forum');
    }

    // Clean up function
    return () => {
      // This will run when navigating away from this page
      const currentPreviousPage = sessionStorage.getItem('previousPage');
      if (currentPreviousPage === '/social-forum') {
        sessionStorage.removeItem('previousPage');
      }
    };
  }, []);

  // Function to handle back button click
  const handleBack = () => {
    router.push('/social-forum');
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <PageHeader
        title="Share Trade Setup"
        showBackButton={true}
        onBackClick={handleBack}
      />
      <CreateTradeSetupForm />
    </div>
  );
}
