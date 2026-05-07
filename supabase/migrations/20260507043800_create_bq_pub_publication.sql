-- Create publication for BigQuery replication
-- Note: FOR ALL TABLES requires superuser, which is unavailable on hosted Supabase.
-- Tables are enumerated explicitly. Add/remove tables via ALTER PUBLICATION going forward.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'bq_pub') THEN
        CREATE PUBLICATION bq_pub FOR TABLE
            public.achievements,
            public.daily_action_summary,
            public.daily_dashboard_registration_by_prefecture_summary,
            public.daily_dashboard_registration_summary,
            public.events,
            public.mission_artifact_geolocations,
            public.mission_artifacts,
            public.missions,
            public.posting_activities,
            public.posting_shapes,
            public.private_users,
            public.public_user_profiles,
            public.user_levels,
            public.user_referral,
            public.weekly_event_count_by_prefecture_summary,
            public.weekly_event_count_summary,
            public.xp_transactions;
    END IF;
END $$;
