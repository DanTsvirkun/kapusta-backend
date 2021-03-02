import { Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  originUrl: string;
  balance: number;
  transactions: ITransaction[];
}

export interface ITransaction {
  description: string;
  category: string;
  amount: number;
  date: string;
  _id?: string;
}

export interface ISession extends Document {
  uid: string;
}

export interface IJWTPayload {
  uid: string;
  sid: string;
}
