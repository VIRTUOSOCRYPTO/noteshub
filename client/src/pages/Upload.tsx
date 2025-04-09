import UploadForm from "@/components/notes/UploadForm";
import { usePageVisits } from "@/hooks/use-page-visits";

export default function Upload() {
  // Track page visit for App Explorer achievement
  usePageVisits('upload');
  
  return (
    <div className="container mx-auto px-4 py-8">
      <UploadForm />
    </div>
  );
}
