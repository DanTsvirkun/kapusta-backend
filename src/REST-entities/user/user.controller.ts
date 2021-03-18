import { Request, Response } from "express";
import { IUser } from "../../helpers/typescript-helpers/interfaces";

export const updateUserBalance = async (req: Request, res: Response) => {
  const user = req.user;
  const { newBalance } = req.body;
  (user as IUser).balance = newBalance;
  await user?.save();
  return res.status(200).send({ newBalance });
};

export const getUserInfo = (req: Request, res: Response) => {
  const user = req.user;
  return res.status(200).send({
    email: user?.email,
    balance: user?.balance,
    transactions: user?.transactions,
  });
};
