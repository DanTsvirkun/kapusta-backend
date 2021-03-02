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
  let secondCreatedTransaction: ITransaction | undefined;
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

  describe("POST /transaction/income", () => {
    let response: Response;

    const validReqBody = {
      description: "Test",
      amount: 1,
      date: "2021-12-31",
      category: Categories.SALARY,
    };

    const invalidReqBody = {
      description: "Test",
      amount: 0,
      date: "2021-12-31",
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

      afterAll(async () => {
        await supertest(app)
          .post("/transaction/income")
          .set("Authorization", `Bearer ${accessToken}`)
          .send({
            description: "Test",
            amount: 1,
            date: "2021-11-31",
            category: Categories.SALARY,
          });
        await supertest(app)
          .post("/transaction/income")
          .set("Authorization", `Bearer ${accessToken}`)
          .send({
            description: "Test",
            amount: 1,
            date: "2021-11-30",
            category: Categories.SALARY,
          });
        await supertest(app)
          .post("/transaction/income")
          .set("Authorization", `Bearer ${accessToken}`)
          .send({
            description: "Test",
            amount: 1,
            date: "2021-08-31",
            category: Categories.SALARY,
          });
      });

      it("Should return a 201 status code", () => {
        expect(response.status).toBe(201);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          newBalance: 1,
          transaction: {
            description: validReqBody.description,
            category: Categories.SALARY,
            amount: validReqBody.amount,
            date: validReqBody.date,
            _id: response.body.transaction._id,
          },
        });
      });

      it("Should create a valid transaction id", () => {
        expect(response.body.transaction._id).toBeTruthy();
      });

      it("Should create a transaction in DB", () => {
        expect(createdTransaction).toBeTruthy();
      });

      it("Should update user's balance", () => {
        expect(updatedUser?.balance).toBe(1);
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
          .send(validReqBody);
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
          .send(validReqBody);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });
  });

  describe("POST /transaction/expense", () => {
    let response: Response;

    const validReqBody = {
      description: "Test",
      amount: 1,
      date: "2021-12-31",
      category: Categories.UTILITIES,
    };

    const invalidReqBody = {
      description: "Test",
      amount: 1,
      date: "2021-12-31",
      category: "qwerty123",
    };

    context("With validReqBody", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/transaction/expense")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(validReqBody);
        updatedUser = await UserModel.findOne({
          email: "test@email.com",
        });
        secondCreatedTransaction = updatedUser?.transactions[1];
      });

      it("Should return a 201 status code", () => {
        expect(response.status).toBe(201);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          newBalance: 3,
          transaction: {
            description: validReqBody.description,
            category: Categories.UTILITIES,
            amount: validReqBody.amount,
            date: validReqBody.date,
            _id: response.body.transaction._id,
          },
        });
      });

      it("Should create a valid transaction id", () => {
        expect(response.body.transaction._id).toBeTruthy();
      });

      it("Should create a transaction in DB", () => {
        expect(secondCreatedTransaction).toBeTruthy();
      });

      it("Should update user's balance", () => {
        expect(updatedUser?.balance).toBe(3);
      });
    });

    context("With invalidReqBody ('category' is invalid)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/transaction/expense")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(invalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'category' is invalid", () => {
        expect(response.body.message).toBe(
          '"category" must be one of [Алкоголь, Образование, Развлечения, Всё для дома, Здоровье, Прочее, Продукты, Спорт и хобби, Техника, Транспорт, Коммуналка и связь]'
        );
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/transaction/expense")
          .send(validReqBody);
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
          .post("/transaction/expense")
          .set("Authorization", `Bearer qwerty123`)
          .send(validReqBody);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });
  });

  describe("GET /transaction/income", () => {
    let response: Response;

    context("Valid request", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .get(`/transaction/income`)
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          incomes: [
            {
              description: "Test",
              amount: 1,
              date: "2021-12-31",
              category: Categories.SALARY,
              _id: (updatedUser as IUser).transactions[0]._id?.toString(),
            },
            {
              description: "Test",
              amount: 1,
              date: "2021-11-31",
              category: Categories.SALARY,
              _id: (updatedUser as IUser).transactions[1]._id?.toString(),
            },
            {
              description: "Test",
              amount: 1,
              date: "2021-11-30",
              category: Categories.SALARY,
              _id: (updatedUser as IUser).transactions[2]._id?.toString(),
            },
            {
              description: "Test",
              amount: 1,
              date: "2021-08-31",
              category: Categories.SALARY,
              _id: (updatedUser as IUser).transactions[3]._id?.toString(),
            },
          ],
          monthsStats: {
            Август: 1,
            Апрель: "N/A",
            Декабрь: 1,
            Июль: "N/A",
            Июнь: "N/A",
            Май: "N/A",
            Март: "N/A",
            Ноябрь: 2,
            Октябрь: "N/A",
            Сентябрь: "N/A",
            Февраль: "N/A",
            Январь: "N/A",
          },
        });
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).get(`/transaction/income`);
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
          .get(`/transaction/income`)
          .set("Authorization", `Bearer qwerty123`);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });
  });

  describe("GET /transaction/expense", () => {
    let response: Response;

    context("Valid request", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .get(`/transaction/expense`)
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          expenses: [
            {
              description: "Test",
              amount: 1,
              date: "2021-12-31",
              category: Categories.UTILITIES,
              _id: (updatedUser as IUser).transactions[4]._id?.toString(),
            },
          ],
          monthsStats: {
            Август: "N/A",
            Апрель: "N/A",
            Декабрь: 1,
            Июль: "N/A",
            Июнь: "N/A",
            Май: "N/A",
            Март: "N/A",
            Ноябрь: "N/A",
            Октябрь: "N/A",
            Сентябрь: "N/A",
            Февраль: "N/A",
            Январь: "N/A",
          },
        });
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).get(`/transaction/expense`);
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
          .get(`/transaction/expense`)
          .set("Authorization", `Bearer qwerty123`);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });
  });

  describe("DELETE /transaction/{transactionId}", () => {
    let response: Response;
    let deletedTransaction: ITransaction | undefined;

    context("Valid request", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .delete(`/transaction/${(createdTransaction as ITransaction)._id}`)
          .set("Authorization", `Bearer ${accessToken}`);
        updatedUser = await UserModel.findOne({
          email: "test@email.com",
        });
        deletedTransaction = updatedUser?.transactions[4];
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          newBalance: 2,
        });
      });

      it("Should delete a transaction from DB", () => {
        expect(deletedTransaction).toBeFalsy();
      });

      it("Should update user's balance", () => {
        expect(updatedUser?.balance).toBe(2);
      });
    });

    context("With invalid 'transactionId'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .delete(`/transaction/qwerty123`)
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'transactionId' is invalid", () => {
        expect(response.body.message).toBe(
          "Invalid 'transactionId'. Must be a MongoDB ObjectId"
        );
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).delete(
          `/transaction/${(createdTransaction as ITransaction)._id}`
        );
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
          .delete(`/transaction/${(createdTransaction as ITransaction)._id}`)
          .set("Authorization", `Bearer qwerty123`);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });

    context("With another account", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .delete(
            `/transaction/${(secondCreatedTransaction as ITransaction)._id}`
          )
          .set("Authorization", `Bearer ${secondAccessToken}`);
      });

      it("Should return a 404 status code", () => {
        expect(response.status).toBe(404);
      });

      it("Should say that transaction wasn't found", () => {
        expect(response.body.message).toBe("Transaction not found");
      });
    });
  });

  describe("GET /transaction/income-categories", () => {
    let response: Response;

    context("Valid request", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .get(`/transaction/income-categories`)
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual(["З/П", "Доп. доход"]);
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).get(`/transaction/income-categories`);
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
          .get(`/transaction/income-categories`)
          .set("Authorization", `Bearer qwerty123`);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });
  });

  describe("GET /transaction/expense-categories", () => {
    let response: Response;

    context("Valid request", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .get(`/transaction/expense-categories`)
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual([
          "Продукты",
          "Алкоголь",
          "Развлечения",
          "Здоровье",
          "Транспорт",
          "Всё для дома",
          "Техника",
          "Коммуналка и связь",
          "Спорт и хобби",
          "Образование",
          "Прочее",
        ]);
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).get(`/transaction/expense-categories`);
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
          .get(`/transaction/expense-categories`)
          .set("Authorization", `Bearer qwerty123`);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });
  });

  describe("GET /transaction/period-data?date={date}", () => {
    let response: Response;

    context("Valid request", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .get(`/transaction/period-data?date=2021-12`)
          .set("Authorization", `Bearer ${accessToken}`);
        updatedUser = await UserModel.findOne({
          email: "test@email.com",
        }).lean();
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          incomes: {
            incomeTotal: 0,
            incomesData: {},
          },
          expenses: {
            expenseTotal: 1,
            expensesData: {
              [Categories.UTILITIES]: { total: 1, Test: 1 },
            },
          },
        });
      });
    });

    context("Valid request", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .get(`/transaction/period-data?date=2016-12`)
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          expenses: {
            expenseTotal: 0,
            expensesData: {},
          },
          incomes: {
            incomeTotal: 0,
            incomesData: {},
          },
        });
      });
    });

    context("Invalid request (invalid query parameter)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .get(`/transaction/period-data?datte=2016-12`)
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should return an expected result", () => {
        expect(response.body.message).toEqual('"date" is required');
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).get(
          `/transaction/period-data?date=2021-12`
        );
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
          .get(`/transaction/period-data?date=2021-12`)
          .set("Authorization", `Bearer qwerty123`);
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
