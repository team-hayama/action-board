import Link from "next/link";

export function SiteLinks() {
  return (
    <div className="px-6 py-4 bg-emerald-50/80 backdrop-blur-xs border-t border-emerald-100">
      <div className="max-w-6xl mx-auto">
        <h3 className="text-sm font-medium text-gray-700 mb-3">リンク</h3>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/opinions"
            className="px-3 py-1 rounded-full text-sm transition-colors bg-white text-gray-700 hover:bg-gray-50 border border-emerald-200"
          >
            意見投稿
          </Link>
          <a
            href="https://www.town.hayama.lg.jp/gikai/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 rounded-full text-sm transition-colors bg-white text-gray-700 hover:bg-gray-50 border border-emerald-200"
          >
            葉山町議会 ↗
          </a>
        </div>
      </div>
    </div>
  );
}
