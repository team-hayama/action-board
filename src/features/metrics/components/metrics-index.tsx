import { Separator } from "@/components/ui/separator";
import {
  fetchAchievementData,
  fetchSupporterData,
} from "@/features/metrics/loaders/metrics-loaders";
import type { AchievementData } from "@/features/metrics/types/metrics-types";
import { getTikTokStatsSummary } from "@/features/tiktok-stats/loaders/tiktok-stats-loaders";
import { getYouTubeStatsSummary } from "@/features/youtube-stats/loaders/youtube-stats-loaders";
import { formatUpdateTime } from "@/lib/utils/metrics-formatter";
import { AchievementMetric } from "./achievement-metric";
import { MetricsLayout } from "./metrics-layout";
import { SupporterMetric } from "./supporter-metric";
import { VideoMetric } from "./video-metric";

export { MetricsErrorBoundary } from "./metrics-error-boundary";
export { MetricsWithSuspense } from "./metrics-with-suspense";

/**
 * メトリクス表示コンポーネント
 *
 * チームはやまの活動状況を表示するメインコンポーネント
 * 以下のデータを統合して表示：
 * 1. サポーター数（外部API）
 * 2. アクション達成数（Supabase、今年のデータのみ）
 * 3. YouTube + TikTok動画再生数（Supabase、今年のデータのみ）
 */
export async function Metrics() {
  // 今年の1月1日以降のデータのみ取得
  const thisYear = new Date().getFullYear();
  const startOfYear = new Date(`${thisYear}-01-01`);

  // サポーター数とアクション数を取得
  let supporterData = null;
  let achievementData: AchievementData | null = null;
  try {
    [supporterData, achievementData] = await Promise.all([
      fetchSupporterData(),
      fetchAchievementData(startOfYear),
    ]);
  } catch (error) {
    console.error("Failed to fetch metrics data:", error);
  }
  let combinedVideoStats = {
    totalVideos: 0,
    totalViews: 0,
    dailyViewsIncrease: 0,
    dailyVideosIncrease: 0,
  };
  try {
    const [youtubeStats, tiktokStats] = await Promise.all([
      getYouTubeStatsSummary(startOfYear),
      getTikTokStatsSummary(startOfYear),
    ]);
    combinedVideoStats = {
      totalVideos: youtubeStats.totalVideos + tiktokStats.totalVideos,
      totalViews: youtubeStats.totalViews + tiktokStats.totalViews,
      dailyViewsIncrease:
        (youtubeStats.dailyViewsIncrease ?? 0) +
        (tiktokStats.dailyViewsIncrease ?? 0),
      dailyVideosIncrease:
        (youtubeStats.dailyVideosIncrease ?? 0) +
        (tiktokStats.dailyVideosIncrease ?? 0),
    };
  } catch (error) {
    console.error("Failed to fetch video stats:", error);
  }

  const fallbackSupporterCount =
    Number(process.env.FALLBACK_SUPPORTER_COUNT) || 0;
  const fallbackSupporterIncrease =
    Number(process.env.FALLBACK_SUPPORTER_INCREASE) || 0;

  const lastUpdated = supporterData?.updatedAt
    ? formatUpdateTime(supporterData.updatedAt)
    : process.env.FALLBACK_UPDATE_DATE || "2025.07.03 02:20";

  return (
    <MetricsLayout title="チームはやまの活動状況🚀" lastUpdated={lastUpdated}>
      {/* サポーター数 */}
      <SupporterMetric
        data={supporterData}
        fallbackCount={fallbackSupporterCount}
        fallbackIncrease={fallbackSupporterIncrease}
      />

      {/* 水平セパレーター */}
      <Separator orientation="horizontal" className="my-4" />

      {/* アクション達成数（今年のデータのみ） */}
      <AchievementMetric data={achievementData} startDate={startOfYear} />

      {/* 水平セパレーター */}
      <Separator orientation="horizontal" className="my-4" />

      {/* 動画統計（YouTube + TikTok） */}
      <VideoMetric
        totalViews={combinedVideoStats.totalViews}
        totalVideos={combinedVideoStats.totalVideos}
        dailyViewsIncrease={combinedVideoStats.dailyViewsIncrease}
        dailyVideosIncrease={combinedVideoStats.dailyVideosIncrease}
        startDate={startOfYear}
      />
    </MetricsLayout>
  );
}
