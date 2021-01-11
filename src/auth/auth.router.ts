import { Router } from "express";
import Joi from "joi";
import mongoose from "mongoose";
import tryCatchWrapper from "../helpers/function-helpers/try-catch-wrapper";
import {
  register,
  login,
  googleAuth,
  googleRedirect,
  refreshTokens,
  logout,
  authorize,
} from "./auth.controller";
import validate from "../helpers/function-helpers/validate";

const signUpInSchema = Joi.object({
  email: Joi.string().required(),
  password: Joi.string().required(),
});

const refreshTokensSchema = Joi.object({
  sid: Joi.string()
    .custom((value, helpers) => {
      const isValidObjectId = mongoose.Types.ObjectId.isValid(value);
      if (!isValidObjectId) {
        return helpers.message({
          custom: "Invalid 'sid'. Must be a MongoDB ObjectId",
        });
      }
      return value;
    })
    .required(),
});

const router = Router();

router.post("/register", validate(signUpInSchema), tryCatchWrapper(register));
router.post("/login", validate(signUpInSchema), tryCatchWrapper(login));
router.post("/logout", tryCatchWrapper(authorize), tryCatchWrapper(logout));
router.post(
  "/refresh",
  validate(refreshTokensSchema),
  tryCatchWrapper(refreshTokens)
);
router.get("/google", tryCatchWrapper(googleAuth));
router.get("/google-redirect", tryCatchWrapper(googleRedirect));

export default router;
