import mongoose from "mongoose";
import supertest, { Response } from "supertest";
import { Application } from "express";
import { IUser, ITransaction } from "../helpers/typescript-helpers/interfaces";
import Server from "../server/server";
import UserModel from "../REST-entities/user/user.model";
import SessionModel from "../REST-entities/session/session.model";
import { Categories } from "./../helpers/typescript-helpers/enums";

describe("Transaction router test suite", () => {
  let app: Application;
  let response: Response;
  let secondResponse: Response;
  let updatedUser: IUser | null;
  let createdTransaction: ITransaction | undefined;
  let accessToken: string;
  let secondAccessToken: string;

  beforeAll(async () => {
    app = new Server().startForTesting();
    const url = `mongodb://127.0.0.1/transaction`;
    await mongoose.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    });
    await supertest(app)
      .post("/auth/register")
      .send({ email: "test@email.com", password: "qwerty123" });
    await supertest(app)
      .post("/auth/register")
      .send({ email: "testt@email.com", password: "qwerty123" });
    response = await supertest(app)
      .post("/auth/login")
      .send({ email: "test@email.com", password: "qwerty123" });
    secondResponse = await supertest(app)
      .post("/auth/login")
      .send({ email: "testt@email.com", password: "qwerty123" });
    accessToken = response.body.accessToken;
    secondAccessToken = secondResponse.body.accessToken;
  });

  afterAll(async () => {
    await UserModel.deleteOne({ email: "test@email.com" });
    await UserModel.deleteOne({ email: "testt@email.com" });
    await SessionModel.deleteOne({ _id: response.body.sid });
    await SessionModel.deleteOne({ _id: secondResponse.body.sid });
    await mongoose.connection.close();
  });

  describe("POST /transaction", () => {
    let response: Response;

    const validReqBody = {
      description: "Test",
      amount: 1,
      date: "2020-12-31",
    };

    const invalidReqBody = {
      description: "Test",
      amount: 0,
      date: "2020-12-31",
    };

    context("With validReqBody", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/transaction/income")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(validReqBody);
        updatedUser = await UserModel.findOne({
          email: "test@email.com",
        });
        createdTransaction = updatedUser?.transactions[0];
      });

      it("Should return a 201 status code", () => {
        expect(response.status).toBe(201);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          description: validReqBody.description,
          category: Categories.INCOME,
          amount: validReqBody.amount,
          date: validReqBody.date,
          id: response.body.id,
        });
      });

      it("Should create a valid transaction id", () => {
        expect(response.body.id).toBeTruthy();
      });

      it("Should create a transaction in DB", () => {
        expect(createdTransaction).toBeTruthy();
      });
    });

    context("With invalidReqBody ('amount' is below 1)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/transaction/income")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(invalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'amount' must be greater than or equal to 1", () => {
        expect(response.body.message).toBe(
          '"amount" must be greater than or equal to 1'
        );
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/transaction/income")
          .send(invalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that token wasn't provided", () => {
        expect(response.body.message).toBe("No token provided");
      });
    });

    context("With invalid 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/transaction/income")
          .set("Authorization", `Bearer qwerty123`)
          .send(invalidReqBody);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });
  });
});
