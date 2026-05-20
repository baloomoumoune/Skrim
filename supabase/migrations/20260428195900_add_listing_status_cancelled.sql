-- The cancel_my_listing RPC needs a distinct terminal status for
-- user-initiated cancellations (separate from launch close and cron expiry).
ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'cancelled';
