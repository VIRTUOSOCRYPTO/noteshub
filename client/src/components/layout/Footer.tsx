import { School, BookOpen, Mail } from "lucide-react";
import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center mb-3">
              <School className="h-5 w-5 mr-2 text-primary" />
              <span className="font-medium text-lg">NotesHub</span>
            </div>
            <p className="text-sm text-gray-400">
              A platform for students to share educational resources, collaborate, and access high-quality notes from peers.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium mb-3 text-lg">Quick Links</h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/">
                  <div className="flex items-center text-sm hover:text-primary transition-colors cursor-pointer">
                    <BookOpen className="h-4 w-4 mr-2" />
                    <span>Home</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link href="/find">
                  <div className="flex items-center text-sm hover:text-primary transition-colors cursor-pointer">
                    <BookOpen className="h-4 w-4 mr-2" />
                    <span>Find Notes</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link href="/upload">
                  <div className="flex items-center text-sm hover:text-primary transition-colors cursor-pointer">
                    <BookOpen className="h-4 w-4 mr-2" />
                    <span>Upload Notes</span>
                  </div>
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium mb-3 text-lg">Contact</h3>
            <div className="space-y-2">
              <a 
                href="mailto:tortoor8@gmail.com" 
                className="flex items-center text-sm text-gray-400 hover:text-primary transition-colors"
              >
                <Mail className="h-4 w-4 mr-2" />
                <span>tortoor8@gmail.com</span>
              </a>
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t border-gray-700 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} NotesHub. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
