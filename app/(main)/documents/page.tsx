import React from "react";

export default function ProductOverview() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="bg-linear-to-r from-blue-600 to-blue-700 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">DevCart</h1>
          <p className="text-xl text-blue-100">
            Digital Marketplace Platform
          </p>
          <p className="text-blue-100 mt-2">
            A Modern Full-Stack Solution for Digital Product Commerce
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Executive Summary */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-4 text-gray-800">
            Executive Summary
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            DevCart is a professional-grade digital marketplace platform built
            for creators and entrepreneurs selling downloadable digital
            products. From UI kits and design templates to premium fonts and
            icon libraries, DevCart provides a complete, secure ecosystem for
            digital commerce with instant delivery capabilities. Featuring OAuth
            authentication, Stripe payment integration, and sophisticated file
            management, DevCart empowers both sellers and buyers with a
            seamless, secure shopping experience.
          </p>
        </section>

        {/* Core Value Proposition */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">
            Core Value Proposition
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Sellers */}
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h3 className="text-xl font-bold mb-4 text-blue-600">
                For Sellers
              </h3>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  <div>
                    <strong>Intuitive Studio Dashboard</strong> – Create, manage,
                    and publish product listings without technical expertise
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  <div>
                    <strong>Secure File Distribution</strong> – Maintain control
                    over digital assets with private, encrypted file storage
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  <div>
                    <strong>Transaction Transparency</strong> – Track all sales
                    and revenue in real-time
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  <div>
                    <strong>Global Reach</strong> – Publish products instantly
                    to a searchable marketplace
                  </div>
                </li>
              </ul>
            </div>

            {/* Buyers */}
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <h3 className="text-xl font-bold mb-4 text-green-600">
                For Buyers
              </h3>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="text-green-600 font-bold">•</span>
                  <div>
                    <strong>Instant Access</strong> – Purchase and download
                    products instantly
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-green-600 font-bold">•</span>
                  <div>
                    <strong>Safe Transactions</strong> – Purchase history and
                    re-download capabilities
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-green-600 font-bold">•</span>
                  <div>
                    <strong>Smart Discovery</strong> – Browse with filtering,
                    search, and recommendations
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-green-600 font-bold">•</span>
                  <div>
                    <strong>Flexible Shopping</strong> – Cart management with
                    secure Stripe checkout
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">
            Technical Architecture
          </h2>
          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-4 font-bold bg-gray-50">Framework</td>
                  <td className="py-3 px-4">
                    Next.js 16 (App Router, Server Actions)
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-bold bg-gray-50">Language</td>
                  <td className="py-3 px-4">TypeScript 5.x</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-bold bg-gray-50">Database</td>
                  <td className="py-3 px-4">PostgreSQL + Prisma 7 ORM</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-bold bg-gray-50">
                    Authentication
                  </td>
                  <td className="py-3 px-4">NextAuth v5 (GitHub & Google)</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-bold bg-gray-50">
                    File Storage
                  </td>
                  <td className="py-3 px-4">Cloudflare R2 (S3-compatible)</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-bold bg-gray-50">Payments</td>
                  <td className="py-3 px-4">Stripe (webhook-based)</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-bold bg-gray-50">Styling</td>
                  <td className="py-3 px-4">Tailwind CSS v4 + Framer Motion</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-bold bg-gray-50">Monitoring</td>
                  <td className="py-3 px-4">
                    Sentry (client, server, edge)
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold bg-gray-50">
                    Rate Limiting
                  </td>
                  <td className="py-3 px-4">Upstash Redis (20 req/min)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h4 className="font-bold text-lg mb-3">Secure Upload Architecture</h4>
            <p className="text-gray-700">
              Direct-to-R2 presigned URL flow eliminates server bottlenecks.
              Clients receive temporary credentials and upload images/files
              directly to storage, with keys persisted to database upon
              completion.
            </p>
          </div>
        </section>

        {/* Key Features */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">
            Key Features
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              "Multi-Image Product Showcase",
              "Secure File Management",
              "Server-Side Cart Persistence",
              "Real-Time Purchase Tracking",
              "Mobile-Responsive Design",
              "Advanced Error Monitoring",
              "Scalable Rate Limiting",
              "Rich UI Components",
            ].map((feature, idx) => (
              <div key={idx} className="flex gap-3 p-3 bg-gray-50 rounded">
                <span className="text-blue-600 text-xl">✓</span>
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </section>

        {/* User Experience */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">
            User Experience Highlights
          </h2>

          <div className="space-y-6">
            <div className="border-l-4 border-blue-600 pl-6">
              <h4 className="font-bold text-lg mb-2">Buyer Journey</h4>
              <p className="text-gray-700">
                Browse marketplace → Filter by category/price → View detailed
                product → Add to cart → Secure checkout via Stripe → Instant
                download access
              </p>
            </div>

            <div className="border-l-4 border-green-600 pl-6">
              <h4 className="font-bold text-lg mb-2">Seller Workflow</h4>
              <p className="text-gray-700">
                Sign in via OAuth → Access studio dashboard → Create new
                product → Upload cover images → Attach downloadable file → Set
                pricing → Publish → Monitor sales
              </p>
            </div>

            <div className="border-l-4 border-red-600 pl-6">
              <h4 className="font-bold text-lg mb-2">Security Measures</h4>
              <ul className="text-gray-700 space-y-1">
                <li>• Ownership verification on all file downloads</li>
                <li>• Private storage bucket isolation from public assets</li>
                <li>• Authenticated API routes with session-based access</li>
                <li>• Rate-limited endpoints preventing resource exhaustion</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Business Model */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">
            Business Model
          </h2>
          <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
            <p className="text-gray-700 mb-4">
              DevCart operates as a multi-vendor marketplace with transactional
              revenue model:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li>• Per-transaction fees on digital product sales</li>
              <li>• Scalable economics – No per-product costs, unlimited inventory</li>
              <li>• Global currency support via Stripe integration</li>
              <li>• Seller analytics – Order tracking, revenue insights</li>
            </ul>
          </div>
        </section>

        {/* Competitive Advantages */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">
            Competitive Advantages
          </h2>
          <div className="space-y-4">
            {[
              {
                title: "Production-Ready",
                desc: "Enterprise-grade architecture with Sentry monitoring and rate limiting",
              },
              {
                title: "Creator-First",
                desc: "Intuitive dashboard designed for non-technical sellers",
              },
              {
                title: "Security First",
                desc: "Military-grade file encryption and ownership verification",
              },
              {
                title: "Performance Optimized",
                desc: "Direct-to-cloud uploads and edge function support",
              },
              {
                title: "Modern Tech Stack",
                desc: "React 19, Next.js 16, TypeScript for maintainability",
              },
            ].map((adv, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-md bg-blue-600 text-white">
                    {idx + 1}
                  </div>
                </div>
                <div>
                  <p className="font-bold text-gray-800">{adv.title}</p>
                  <p className="text-gray-600">{adv.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <section className="border-t-2 border-gray-200 pt-8 mt-12">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-sm text-gray-500">
                <strong>Status:</strong> Production-ready
              </p>
              <p className="text-sm text-gray-500">
                <strong>Version:</strong> 1.0
              </p>
              <p className="text-sm text-gray-500">
                <strong>License:</strong> Available in repository LICENSE file
              </p>
            </div>
          </div>
          <p className="text-center text-gray-600 text-sm">
            DevCart © {new Date().getFullYear()} — Complete Solution for Digital
            Product Commerce
          </p>
        </section>
      </main>
    </div>
  );
}
