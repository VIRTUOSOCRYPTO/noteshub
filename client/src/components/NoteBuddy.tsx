import { useState, useEffect } from "react";
import { Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

// Array of tips the Note Buddy will show
const TIPS = [
  "Welcome to NotesHub! Share your notes with your college classmates.",
  "Did you know? You can filter notes by department and subject.",
  "Keep your notes organized by adding clear titles and subject information.",
  "Need help? Use the search feature to find exactly what you're looking for.",
  "Earn achievement badges by uploading notes and being active in the community.",
  "Report inappropriate content with the flag button on any note card.",
  "Your USN automatically determines your college, connecting you with peers.",
  "Want to stand out? Upload quality notes that help your colleagues.",
  "You can access your profile to see your achievements and contribution stats.",
  "Notes are only shared with students from your own college for privacy.",
];

export default function NoteBuddy() {
  const [visible, setVisible] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  // Show the buddy after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!dismissed) {
        setVisible(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [dismissed]);

  // Change the tip periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (visible) {
        setTipIndex((prev) => (prev + 1) % TIPS.length);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [visible]);

  const handleClose = () => {
    setVisible(false);
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-4 right-4 z-50 max-w-sm"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <Card className="border-2 border-primary/20 shadow-lg overflow-hidden">
            <div className="absolute top-2 right-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 rounded-full"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardContent className="p-4 pt-6">
              <div className="flex items-start gap-3">
                <div className="bg-gradient-to-br from-primary to-primary/60 p-2 rounded-full flex-shrink-0">
                  <Lightbulb className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">Note Buddy Says:</h4>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={tipIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm text-muted-foreground"
                    >
                      {TIPS[tipIndex]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}