-- CreateTable
CREATE TABLE "AppCatalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserApp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "customName" TEXT,
    "customColor" TEXT,
    "totalMinutes" INTEGER NOT NULL DEFAULT 0,
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSession" (
    "id" TEXT NOT NULL,
    "userAppId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppCatalog_name_key" ON "AppCatalog"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserApp_userId_path_key" ON "UserApp"("userId", "path");

-- CreateIndex
CREATE UNIQUE INDEX "UserApp_userId_catalogId_key" ON "UserApp"("userId", "catalogId");

-- CreateIndex
CREATE INDEX "AppSession_userId_startTime_idx" ON "AppSession"("userId", "startTime");

-- CreateIndex
CREATE INDEX "AppSession_userAppId_endTime_idx" ON "AppSession"("userAppId", "endTime");

-- AddForeignKey
ALTER TABLE "UserApp" ADD CONSTRAINT "UserApp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserApp" ADD CONSTRAINT "UserApp_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "AppCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSession" ADD CONSTRAINT "AppSession_userAppId_fkey" FOREIGN KEY ("userAppId") REFERENCES "UserApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSession" ADD CONSTRAINT "AppSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
