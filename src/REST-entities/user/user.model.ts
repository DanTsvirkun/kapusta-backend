import mongoose, { Schema } from "mongoose";
import { IUser } from "../../helpers/typescript-helpers/interfaces";

const userSchema = new Schema({
  email: String,
  passwordHash: String,
  originUrl: String,
  balance: Number,
  transactions: [
    {
      description: String,
      category: String,
      amount: Number,
      date: String,
    },
  ],
});

export default mongoose.model<IUser>("User", userSchema);
