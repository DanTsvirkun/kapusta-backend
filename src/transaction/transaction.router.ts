import { Router } from "express";
import Joi from "joi";
import validate from "../helpers/function-helpers/validate";
import tryCatchWrapper from "../helpers/function-helpers/try-catch-wrapper";
import { authorize } from "./../auth/auth.controller";
import { addIncome } from "./transaction.controller";

const addIncomeSchema = Joi.object({
  description: Joi.string().required(),
  amount: Joi.number().required().min(1),
  date: Joi.string()
    .custom((value, helpers) => {
      const dateRegex = /^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/;
      const isValidDate = dateRegex.test(value);
      if (!isValidDate) {
        return helpers.message({
          custom: "Invalid 'date'. Please, use YYYY-MM-DD string format",
        });
      }
      return value;
    })
    .required(),
});

const router = Router();

router.post(
  "/income",
  tryCatchWrapper(authorize),
  validate(addIncomeSchema),
  tryCatchWrapper(addIncome)
);

export default router;
