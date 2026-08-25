import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatBot from "@/components/ChatBot";
import { Bot, Home, Search, FileText, HelpCircle } from "lucide-react";

const CAPABILITIES = [
  { icon: Search, title: "Property Search", desc: "Find homes by budget, location, BHK, or type" },
  { icon: Home, title: "Verified Listings", desc: "Ask about our internally verified properties" },
  { icon: FileText, title: "Documentation", desc: "Understand the documents needed to buy or sell" },
  { icon: HelpCircle, title: "General Support", desc: "Zero brokerage explained, platform FAQs" },
];

export default function ChatPage() {
  return (
    <div className="min-h-screen flex flex-col bg-vs-bg">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10 flex flex-col gap-8">
        {/* Page header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-vs-gold/10 mb-4">
            <Bot size={28} className="text-vs-gold" />
          </div>
          <h1 className="text-3xl font-display font-bold text-vs-text-primary">VisitSarva Assistant</h1>
          <p className="text-vs-text-secondary mt-2 max-w-xl mx-auto">
            Your AI-powered guide for property search, verified listings, and all things VisitSarva.
          </p>
        </div>

        {/* Capabilities */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CAPABILITIES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-4 flex flex-col gap-2">
              <div className="w-9 h-9 rounded-xl bg-vs-gold/10 flex items-center justify-center">
                <Icon size={18} className="text-vs-gold" />
              </div>
              <div className="font-semibold text-sm text-vs-text-primary">{title}</div>
              <div className="text-xs text-vs-text-secondary leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>

        {/* Chat window — full page */}
        <div
          className="flex-1 flex flex-col rounded-2xl border border-vs-border overflow-hidden shadow-md bg-vs-bg"
          style={{ minHeight: 520 }}
        >
          {/* Chat header */}
          <div className="bg-vs-gold px-5 py-4 flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <div className="text-white font-semibold leading-tight">VisitSarva Assistant</div>
              <div className="text-white/70 text-xs">Property search · FAQs · Support</div>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/70 text-xs">Online</span>
            </div>
          </div>

          {/* Chat bot in full-page mode */}
          <div className="flex-1 flex flex-col min-h-0">
            <ChatBot fullPage />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
