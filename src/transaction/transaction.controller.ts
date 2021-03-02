import { Request, Response } from "express";
import { totalmem } from "os";
import { Categories } from "../helpers/typescript-helpers/enums";
import { IUser } from "../helpers/typescript-helpers/interfaces";
import UserModel from "../REST-entities/user/user.model";
import months from "./months";

export const addIncome = async (req: Request, res: Response) => {
  const user = req.user;
  const { description, amount, date, category } = req.body;
  const transaction = {
    description,
    amount,
    date,
    category,
  };
  user?.transactions.push(transaction);
  (user as IUser).balance += amount;
  await user?.save();
  return res.status(201).send({
    newBalance: user?.balance,
    transaction: user?.transactions[user?.transactions.length - 1],
  });
};

export const addExpense = async (req: Request, res: Response) => {
  const user = req.user;
  const { description, amount, date, category } = req.body;
  const transactionObj = {
    description,
    amount,
    date,
    category,
  };
  user?.transactions.push(transactionObj);
  (user as IUser).balance -= amount;
  await user?.save();
  return res.status(201).send({
    newBalance: user?.balance,
    transaction: user?.transactions[user?.transactions.length - 1],
  });
};

export const deleteTransaction = async (req: Request, res: Response) => {
  const user = req.user;
  const { transactionId } = req.params;
  const transaction = user?.transactions.find(
    (transaction) => transaction._id?.toString() === transactionId
  );
  if (!transaction) {
    return res.status(404).send({ message: "Transaction not found" });
  }
  if (
    transaction?.category !== Categories.SALARY &&
    transaction?.category !== Categories.ADDITIONAL_INCOME
  ) {
    (user as IUser).balance += transaction.amount;
  } else {
    (user as IUser).balance -= transaction.amount;
  }
  await UserModel.findOneAndUpdate(
    { _id: req.user?._id },
    {
      $pull: { transactions: { _id: transactionId } },
      $set: { balance: user?.balance },
    }
  );
  res.status(200).send({ newBalance: user?.balance });
};

export const getIncomeStats = async (req: Request, res: Response) => {
  const user = req.user;
  let monthsStats: { [key: string]: number | "N/A" } = {};
  const incomes = user?.transactions.filter((transaction) => {
    if (
      transaction.category === Categories.SALARY ||
      transaction.category === Categories.ADDITIONAL_INCOME
    ) {
      return true;
    }
    return false;
  });
  for (let i = 1; i <= 12; i++) {
    let total: number = 0;
    const monthName = months[i - 1];
    const transactions = incomes?.filter((transaction) => {
      if (
        Number(transaction.date.split("-")[1]) === i &&
        Number(transaction.date.split("-")[0]) === new Date().getFullYear()
      ) {
        return true;
      }
      return false;
    });
    if (!transactions?.length) {
      monthsStats[monthName] = "N/A";
      continue;
    }
    for (const transaction of transactions) {
      total += transaction.amount;
    }
    monthsStats[monthName] = total;
  }
  return res.status(200).send({ incomes, monthsStats });
};

export const getExpenseStats = async (req: Request, res: Response) => {
  const user = req.user;
  let monthsStats: { [key: string]: number | "N/A" } = {};
  const expenses = user?.transactions.filter((transaction) => {
    if (
      transaction.category !== Categories.SALARY &&
      transaction.category !== Categories.ADDITIONAL_INCOME
    ) {
      return true;
    }
    return false;
  });
  for (let i = 1; i <= 12; i++) {
    let total: number = 0;
    const monthName = months[i - 1];
    const transactions = expenses?.filter((transaction) => {
      if (
        Number(transaction.date.split("-")[1]) === i &&
        Number(transaction.date.split("-")[0]) === new Date().getFullYear()
      ) {
        return true;
      }
      return false;
    });
    if (!transactions?.length) {
      monthsStats[monthName] = "N/A";
      continue;
    }
    for (const transaction of transactions) {
      total += transaction.amount;
    }
    monthsStats[monthName] = total;
  }
  return res.status(200).send({ expenses, monthsStats });
};

export const getIncomeCategories = (req: Request, res: Response) => {
  const categories: string[] = [];
  for (const category of Object.values(Categories)) {
    if (
      category === Categories.SALARY ||
      category === Categories.ADDITIONAL_INCOME
    ) {
      categories.push(category);
    }
  }
  res.status(200).send(categories);
};

export const getExpenseCategories = (req: Request, res: Response) => {
  const categories: string[] = [];
  for (const category of Object.values(Categories)) {
    if (
      category !== Categories.SALARY &&
      category !== Categories.ADDITIONAL_INCOME
    ) {
      categories.push(category);
    }
  }
  res.status(200).send(categories);
};

export const getTransactionsDataForPeriod = (req: Request, res: Response) => {
  const user = req.user;
  const { date } = req.query;
  let incomesData: { [key: string]: { [key: string]: number } } = {};
  let expensesData: { [key: string]: { [key: string]: number } } = {};
  let incomeTotal = 0;
  let expenseTotal = 0;
  const incomes = user?.transactions.filter((transaction) => {
    if (
      transaction.category === Categories.SALARY ||
      transaction.category === Categories.ADDITIONAL_INCOME
    ) {
      return true;
    }
    return false;
  });
  if (incomes) {
    const incomesFromPeriod = incomes.filter((income) => {
      if (date === income.date.substring(0, 7)) {
        return true;
      }
      return false;
    });
    if (incomesFromPeriod) {
      for (let i = 0; i < incomesFromPeriod.length; i++) {
        const category = incomesFromPeriod[i].category;
        const description = incomesFromPeriod[i].description;
        if (!incomesData[category]) {
          incomesData[category] = {
            total: incomesFromPeriod[i].amount,
            [description]: incomesFromPeriod[i].amount,
          };
          incomeTotal += incomesFromPeriod[i].amount;
          continue;
        }
        if (incomesData[category] && !incomesData[category][description]) {
          incomesData[category].total += incomesFromPeriod[i].amount;
          incomesData[category][description] = incomesFromPeriod[i].amount;
          incomeTotal += incomesFromPeriod[i].amount;
          continue;
        }
        if (incomesData[category] && incomesData[category][description]) {
          incomesData[category].total += incomesFromPeriod[i].amount;
          incomesData[category][description] += incomesFromPeriod[i].amount;
          incomeTotal += incomesFromPeriod[i].amount;
        }
      }
    }
  }
  const expenses = user?.transactions.filter((transaction) => {
    if (
      transaction.category !== Categories.SALARY &&
      transaction.category !== Categories.ADDITIONAL_INCOME
    ) {
      return true;
    }
    return false;
  });
  if (expenses) {
    const expensesFromPeriod = expenses.filter((expense) => {
      if (date === expense.date.substring(0, 7)) {
        return true;
      }
      return false;
    });
    if (expensesFromPeriod) {
      for (let i = 0; i < expensesFromPeriod.length; i++) {
        const category = expensesFromPeriod[i].category;
        const description = expensesFromPeriod[i].description;
        if (!expensesData[category]) {
          expensesData[category] = {
            total: expensesFromPeriod[i].amount,
            [description]: expensesFromPeriod[i].amount,
          };
          expenseTotal += expensesFromPeriod[i].amount;
          continue;
        }
        if (expensesData[category] && !expensesData[category][description]) {
          expensesData[category].total += expensesFromPeriod[i].amount;
          expensesData[category][description] = expensesFromPeriod[i].amount;
          expenseTotal += expensesFromPeriod[i].amount;
          continue;
        }
        if (expensesData[category] && expensesData[category][description]) {
          expensesData[category].total += expensesFromPeriod[i].amount;
          expensesData[category][description] += expensesFromPeriod[i].amount;
          expenseTotal += expensesFromPeriod[i].amount;
        }
      }
    }
  }
  return res.status(200).send({
    incomes: { incomeTotal, incomesData },
    expenses: { expenseTotal, expensesData },
  });
};
