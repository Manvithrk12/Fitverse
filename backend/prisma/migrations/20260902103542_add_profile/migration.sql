-- CreateEnum
CREATE TYPE "FitnessGoal" AS ENUM ('MUSCLE_GAIN', 'FAT_LOSS', 'WEIGHT_MAINTENANCE', 'STRENGTH', 'ENDURANCE', 'GENERAL_FITNESS');

-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE', 'EXTREMELY_ACTIVE');

-- CreateEnum
CREATE TYPE "DietaryPreference" AS ENUM ('NONE', 'VEGETARIAN', 'VEGAN', 'PESCATARIAN', 'KETO', 'PALEO', 'GLUTEN_FREE', 'HALAL', 'KOSHER');

-- CreateEnum
CREATE TYPE "WorkoutType" AS ENUM ('STRENGTH_TRAINING', 'CARDIO', 'HIIT', 'YOGA', 'PILATES', 'CROSSFIT', 'CALISTHENICS', 'MIXED');

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "age" INTEGER,
    "heightCm" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "targetWeightKg" DOUBLE PRECISION,
    "fitnessGoal" "FitnessGoal",
    "activityLevel" "ActivityLevel",
    "workoutFrequency" INTEGER,
    "availableEquipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dietaryPreference" "DietaryPreference",
    "preferredWorkoutType" "WorkoutType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
