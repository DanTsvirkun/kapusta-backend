import { Router } from "express";
import Joi from "joi";
import { authorize } from "../../auth/auth.controller";
import tryCatchWrapper from "../../helpers/function-helpers/try-catch-wrapper";
import validate from "../../helpers/function-helpers/validate";
import { updateUserBalance, getUserInfo } from "./user.controller";

const userBalanceSchema = Joi.object({
  newBalance: Joi.number().required().min(1),
});

const router = Router();

router.patch(
  "/balance",
  tryCatchWrapper(authorize),
  validate(userBalanceSchema),
  tryCatchWrapper(updateUserBalance)
);
router.get("/", tryCatchWrapper(authorize), tryCatchWrapper(getUserInfo));

export default router;
