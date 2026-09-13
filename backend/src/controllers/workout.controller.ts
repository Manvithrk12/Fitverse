import { Request, Response } from "express";
import * as workoutService from "../services/workout.service";
import * as gamificationService from "../services/gamification.service";
import { sendSuccess } from "../utils/apiResponse";

function paramId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? id[0] : id;
}

export async function listWorkouts(req: Request, res: Response): Promise<void> {
  const workouts = await workoutService.listMyWorkouts(req.user!.id);
  sendSuccess(res, workouts);
}

export async function createWorkout(req: Request, res: Response): Promise<void> {
  const workout = await workoutService.createMyWorkout(req.user!.id, req.body);
  sendSuccess(res, workout, 201);
}

export async function getWorkout(req: Request, res: Response): Promise<void> {
  const workout = await workoutService.getMyWorkout(req.user!.id, paramId(req));
  sendSuccess(res, workout);
}

export async function updateWorkout(req: Request, res: Response): Promise<void> {
  const workout = await workoutService.updateMyWorkout(req.user!.id, paramId(req), req.body);
  sendSuccess(res, workout);
}

export async function deleteWorkout(req: Request, res: Response): Promise<void> {
  await workoutService.deleteMyWorkout(req.user!.id, paramId(req));
  sendSuccess(res, { deleted: true });
}

export async function completeWorkout(req: Request, res: Response): Promise<void> {
  const workout = await workoutService.completeMyWorkout(req.user!.id, paramId(req));
  // Idempotent regardless of whether this call caused a fresh PLANNED ->
  // COMPLETED transition or hit the already-completed no-op path in
  // workout.repository.ts — awardXp's own (userId, eventType, workoutId)
  // uniqueness guarantees XP is only ever granted once per workout, so no
  // change to workout.service.ts/repository.ts was needed to detect that.
  //
  // Note: this is a separate DB transaction from the workout update above,
  // not one combined transaction spanning both — if awarding XP fails here,
  // the workout has already been marked completed. Acceptable trade-off to
  // avoid coupling the Workout and Gamification repositories together.
  const xp = await gamificationService.awardWorkoutCompletedXp(req.user!.id, workout.id);
  sendSuccess(res, { ...workout, xpAwarded: xp.xpAwarded });
}
