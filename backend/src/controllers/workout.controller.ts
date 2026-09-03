import { Request, Response } from "express";
import * as workoutService from "../services/workout.service";
import { sendSuccess } from "../utils/apiResponse";

// Express 5 types route params as `string | string[]` to account for
// patterns that can repeat a segment; for a plain `:id` segment it is
// always a single string at runtime. This narrows without an `any`.
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
  sendSuccess(res, workout);
}
