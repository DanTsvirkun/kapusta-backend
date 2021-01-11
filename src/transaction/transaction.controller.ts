import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { Categories } from "../helpers/typescript-helpers/enums";

export const addIncome = async (req: Request, res: Response) => {
  const user = req.user;
  const { description, amount, date } = req.body;
  const transactionId = uuid();
  const transaction = {
    description,
    amount,
    date,
    category: Categories.INCOME,
    id: transactionId,
  };
  user?.transactions.push(transaction);
  await user?.save();
  return res.status(201).send(transaction);
};
