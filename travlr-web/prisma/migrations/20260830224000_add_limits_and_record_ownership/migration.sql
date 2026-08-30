-- Add creator metadata without invalidating existing memories or expenses.
ALTER TABLE "Memory" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Expense" ADD COLUMN "createdById" TEXT;

-- Durable shared rate-limit buckets. Expired rows are pruned opportunistically
-- by the application when a bucket is consumed.
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "limit" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "windowMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");
CREATE INDEX "Memory_tripId_createdAt_idx" ON "Memory"("tripId", "createdAt");
CREATE INDEX "Memory_createdById_idx" ON "Memory"("createdById");
CREATE INDEX "Expense_tripId_createdAt_idx" ON "Expense"("tripId", "createdAt");
CREATE INDEX "Expense_createdById_idx" ON "Expense"("createdById");
CREATE INDEX "Trip_userId_updatedAt_idx" ON "Trip"("userId", "updatedAt");
CREATE INDEX "Trip_updatedAt_idx" ON "Trip"("updatedAt");
CREATE INDEX "Day_tripId_date_idx" ON "Day"("tripId", "date");
CREATE INDEX "ItineraryItem_dayId_order_idx" ON "ItineraryItem"("dayId", "order");
CREATE INDEX "TripUser_userId_idx" ON "TripUser"("userId");
CREATE INDEX "City_tripId_idx" ON "City"("tripId");
CREATE INDEX "Place_cityId_idx" ON "Place"("cityId");

ALTER TABLE "Memory" ADD CONSTRAINT "Memory_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
