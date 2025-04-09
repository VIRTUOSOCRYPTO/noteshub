import { useState } from 'react';
import { 
  Share2,
  Copy,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  CheckCircle
} from "lucide-react";
import { FaWhatsapp, FaTelegram, FaReddit } from "react-icons/fa";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { showToast } from '@/components/ui/toast-container';
import { type Note } from '@shared/schema';

interface ShareOptionsProps {
  note: Note;
  compact?: boolean;
}

export default function ShareOptions({ note, compact = false }: ShareOptionsProps) {
  const [copied, setCopied] = useState(false);
  
  // Create the share URL
  const shareUrl = `${window.location.origin}/notes/${note.id}`;
  const shareTitle = `Check out these ${note.subject} notes from ${note.department}`;
  const shareText = `${note.title} - Shared via College Note Share`;
  
  // Handle copy to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      showToast('Link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      showToast(`Failed to copy: ${err}`, 'error');
    });
  };
  
  // Check if device is mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  // Share links for various platforms
  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}`,
    whatsapp: isMobile 
      ? `whatsapp://send?text=${encodeURIComponent(`${shareTitle} ${shareUrl}`)}` 
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(`${shareTitle} ${shareUrl}`)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
    reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}`,
    email: `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`
  };
  
  // Handle share click
  const handleShare = (platform: keyof typeof shareLinks) => {
    window.open(shareLinks[platform], '_blank');
  };
  
  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            title="Share"
            className="text-muted-foreground hover:text-primary"
          >
            {copied ? <CheckCircle className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={copyToClipboard} className="cursor-pointer">
            <Copy className="h-4 w-4 mr-2" />
            Copy link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleShare('whatsapp')} className="cursor-pointer">
            <FaWhatsapp className="h-4 w-4 mr-2" />
            WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleShare('telegram')} className="cursor-pointer">
            <FaTelegram className="h-4 w-4 mr-2" />
            Telegram
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleShare('facebook')} className="cursor-pointer">
            <Facebook className="h-4 w-4 mr-2" />
            Facebook
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center" title="Share">
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={copyToClipboard} className="cursor-pointer">
          <Copy className="h-4 w-4 mr-2" />
          Copy link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare('facebook')} className="cursor-pointer">
          <Facebook className="h-4 w-4 mr-2" />
          Share on Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare('twitter')} className="cursor-pointer">
          <Twitter className="h-4 w-4 mr-2" />
          Share on Twitter
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare('linkedin')} className="cursor-pointer">
          <Linkedin className="h-4 w-4 mr-2" />
          Share on LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare('whatsapp')} className="cursor-pointer">
          <FaWhatsapp className="h-4 w-4 mr-2" />
          Share on WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare('telegram')} className="cursor-pointer">
          <FaTelegram className="h-4 w-4 mr-2" />
          Share on Telegram
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare('reddit')} className="cursor-pointer">
          <FaReddit className="h-4 w-4 mr-2" />
          Share on Reddit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare('email')} className="cursor-pointer">
          <Mail className="h-4 w-4 mr-2" />
          Share via Email
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}