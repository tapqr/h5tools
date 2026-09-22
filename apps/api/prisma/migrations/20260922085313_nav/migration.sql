-- CreateTable
CREATE TABLE "nav_categories" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nav_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nav_links" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "icon" TEXT,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "lastClickedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nav_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nav_categories_userId_sortOrder_idx" ON "nav_categories"("userId", "sortOrder");

-- CreateIndex
CREATE INDEX "nav_links_categoryId_sortOrder_idx" ON "nav_links"("categoryId", "sortOrder");

-- AddForeignKey
ALTER TABLE "nav_categories" ADD CONSTRAINT "nav_categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nav_links" ADD CONSTRAINT "nav_links_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "nav_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
