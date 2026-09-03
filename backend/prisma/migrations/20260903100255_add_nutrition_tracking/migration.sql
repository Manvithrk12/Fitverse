-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateTable
CREATE TABLE "NutritionEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "foodName" TEXT NOT NULL,
    "mealType" "MealType" NOT NULL,
    "servingSize" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "proteinGrams" DECIMAL(65,30),
    "carbohydratesGrams" DECIMAL(65,30),
    "fatGrams" DECIMAL(65,30),
    "consumedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NutritionEntry_userId_idx" ON "NutritionEntry"("userId");

-- CreateIndex
CREATE INDEX "NutritionEntry_userId_consumedAt_idx" ON "NutritionEntry"("userId", "consumedAt");

-- AddForeignKey
ALTER TABLE "NutritionEntry" ADD CONSTRAINT "NutritionEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
