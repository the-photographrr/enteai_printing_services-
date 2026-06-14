import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card py-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono text-text-secondary">
        <span>&copy; {new Date().getFullYear()} ENTE.PrintLabs. All rights reserved.</span>
        <div className="flex gap-6">
          <Link href="/#catalog" className="hover:text-foreground transition-colors">Catalog</Link>
          <a href="mailto:hello@enteprintlabs.com" className="hover:text-foreground transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}
