import { Router } from "express";
import mongoose from "mongoose";
import Joi from "joi";
import validate from "../helpers/function-helpers/validate";
import tryCatchWrapper from "../helpers/function-helpers/try-catch-wrapper";
import { authorize } from "./../auth/auth.controller";
import {
  addIncome,
  addExpense,
  deleteTransaction,
  getIncomeStats,
  getExpenseStats,
  getIncomeCategories,
  getExpenseCategories,
  getTransactionsDataForPeriod,
} from "./transaction.controller";
import { Categories } from "./../helpers/typescript-helpers/enums";

const addIncomeSchema = Joi.object({
  description: Joi.string().required(),
  amount: Joi.number().required().min(1),
  date: Joi.string()
    .custom((value, helpers) => {
      const dateRegex = /[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])/;
      const isValidDate = dateRegex.test(value);
      if (!isValidDate) {
        return helpers.message({
          custom: "Invalid 'date'. Please, use YYYY-MM-DD string format",
        });
      }
      return value;
    })
    .required(),
  category: Joi.string()
    .required()
    .valid(Categories.SALARY, Categories.ADDITIONAL_INCOME),
});

const addExpenseSchema = Joi.object({
  description: Joi.string().required(),
  amount: Joi.number().required().min(1),
  date: Joi.string()
    .custom((value, helpers) => {
      const dateRegex = /[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])/;
      const isValidDate = dateRegex.test(value);
      if (!isValidDate) {
        return helpers.message({
          custom: "Invalid 'date'. Please, use YYYY-MM-DD string format",
        });
      }
      return value;
    })
    .required(),
  category: Joi.string()
    .required()
    .valid(
      Categories.ALCOHOL,
      Categories.EDUCATION,
      Categories.ENTERTAINMENT,
      Categories.FOR_HOME,
      Categories.HEALTH,
      Categories.OTHER,
      Categories.PRODUCTS,
      Categories.SPORT_AND_HOBBY,
      Categories.TECHNICS,
      Categories.TRANSPORT,
      Categories.UTILITIES
    ),
});

const deleteTransactionSchema = Joi.object({
  transactionId: Joi.string()
    .custom((value, helpers) => {
      const isValidObjectId = mongoose.Types.ObjectId.isValid(value);
      if (!isValidObjectId) {
        return helpers.message({
          custom: "Invalid 'transactionId'. Must be a MongoDB ObjectId",
        });
      }
      return value;
    })
    .required(),
});

const periodSchema = Joi.object({
  date: Joi.string()
    .custom((value, helpers) => {
      const dateRegex = /^\d{4}\-(0[1-9]|1[012])$/;
      const isValidDate = dateRegex.test(value);
      if (!isValidDate) {
        return helpers.message({
          custom: "Invalid 'date'. Please, use YYYY-MM string format",
        });
      }
      return value;
    })
    .required(),
});

const router = Router();

router
  .route("/income")
  .post(
    tryCatchWrapper(authorize),
    validate(addIncomeSchema),
    tryCatchWrapper(addIncome)
  )
  .get(tryCatchWrapper(authorize), tryCatchWrapper(getIncomeStats));
router
  .route("/expense")
  .post(
    tryCatchWrapper(authorize),
    validate(addExpenseSchema),
    tryCatchWrapper(addExpense)
  )
  .get(tryCatchWrapper(authorize), tryCatchWrapper(getExpenseStats));
router.delete(
  "/:transactionId",
  tryCatchWrapper(authorize),
  validate(deleteTransactionSchema, "params"),
  tryCatchWrapper(deleteTransaction)
);
router.get(
  "/income-categories",
  tryCatchWrapper(authorize),
  tryCatchWrapper(getIncomeCategories)
);
router.get(
  "/expense-categories",
  tryCatchWrapper(authorize),
  tryCatchWrapper(getExpenseCategories)
);
router.get(
  "/period-data",
  tryCatchWrapper(authorize),
  validate(periodSchema, "query"),
  tryCatchWrapper(getTransactionsDataForPeriod)
);

export default router;
