"use client";

import { useRouter } from "next/navigation";
import ResearchDemographicForm from "./ResearchDemographicForm";

export default function ResearchScreening({ currentUser }: { currentUser: string | null }) {
  const router = useRouter();

  const handleSuccess = () => {
    // This runs as soon as the form saves the entryId to localStorage
    router.push('/assessment/epds');
  };

  return (
    <section>
       <ResearchDemographicForm
         currentUser={currentUser}
         onSuccess={handleSuccess}
       />
    </section>
  );
}