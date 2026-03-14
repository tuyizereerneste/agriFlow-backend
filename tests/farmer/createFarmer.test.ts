import request from "supertest";
import express from "express";
import router from "../../src/router/routes";
import connectDB  from "../../src/config/db";
import { prisma } from "../../src/config/db";

describe("POST /farmer/create-farmer", () => {
  let app: express.Application;

  beforeAll(async () => {
    // Connect to the test database
    await connectDB();

    // Set up Express app
    app = express();
    app.use(express.json());
    app.use("/api", router);
  });

  afterAll(async () => {
    // Clean up: Delete all test data and disconnect
    await prisma.farmer.deleteMany({});
    await prisma.$disconnect();
  });

  it("should create a farmer and return 201", async () => {
    const response = await request(app)
      .post("/api/farmer/create-farmer")
      .set("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5YjQxNjBhNWI1MmZkNDViNTg1ZjhmZSIsInR5cGUiOiJ1c2VyIiwicm9sZSI6IkFkbWluIiwiaWF0IjoxNzczNDA5ODMyLCJleHAiOjE3NzM0OTI2MzJ9.fTDYidRQroZEAkJxeIoALXQRapvPwUcUEEeNTOs-lFo") // Replace with a valid test token
      .send({
        farmer: {
          names: "Test Farmer",
          phones: ["1234567890"],
          dob: "1990-01-01",
          gender: "Male",
        },
        location: {
          province: "Test Province",
          district: "Test District",
          sector: "Test Sector",
          cell: "Test Cell",
          village: "Test Village",
        },
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("message", "Farmer created successfully");
    expect(response.body.farmer).toHaveProperty("farmerNumber");
  });

  it("should return 401 if not authenticated", async () => {
    const response = await request(app)
      .post("/api/farmer/create-farmer")
      .send({ farmer: { names: "Test Farmer" } });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error", "Unauthorized");
  });

  it("should return 400 if farmer data is missing", async () => {
    const response = await request(app)
      .post("/api/farmer/create-farmer")
      .set("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5YjQxNjBhNWI1MmZkNDViNTg1ZjhmZSIsInR5cGUiOiJ1c2VyIiwicm9sZSI6IkFkbWluIiwiaWF0IjoxNzczNDA5ODMyLCJleHAiOjE3NzM0OTI2MzJ9.fTDYidRQroZEAkJxeIoALXQRapvPwUcUEEeNTOs-lFo")
      .send({ location: { province: "Test Province" } });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error", "Farmer data is missing");
  });
});
