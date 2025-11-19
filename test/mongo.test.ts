import { fetchDocument } from "../src/mongo/mongo";
import * as dbModule from "../src/mongo/db";
import * as config from "../src/config";

// Mock the check-eol utility
jest.mock("../src/utils/check-eol", () => ({
  checkRuntimesVsEol: jest.fn().mockReturnValue("MOCK_RUNTIME_DATA")
}));

describe("fetchDocument()", () => {
  const mockCollection = {
    findOne: jest.fn()
  };

  const mockDb = {
    collection: jest.fn().mockReturnValue(mockCollection),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(dbModule, "getDb").mockReturnValue(mockDb as any);

    // ---- Mock config ----
    (config as any).MONGO_COLLECTION_PROJECTS = "projects";
  });

  test("returns null when no document found", async () => {
    mockCollection.findOne.mockResolvedValue(null);

    const result = await fetchDocument("ServiceA", {}, {});
    expect(result).toBeNull();
  });

  test("processes a document correctly", async () => {
    mockCollection.findOne.mockResolvedValue({
      _id: "123",
      name: "some-service",
      gitInfo: { lang: "node" },
      sonarMetrics: {},
      ecs: {
        cidev:   { version: "1.0.0" },
        staging: { version: "2.0.0" },
        live:    { version: "3.0.0" }
      },
      versions: [
        { version: "1.0.0", lang: "js",  runtime: "node 16" },
        { version: "2.0.0", lang: "ts",  runtime: "node 18" },
        { version: "3.0.0", lang: "tsx", runtime: "node 20" }
      ]
    });

    const result = await fetchDocument("some-service", {}, {});

    expect(result).not.toBeNull();

    // --- versions sorted descending ---
    expect(result!.versions.map(v => v.version))
      .toEqual(["3.0.0", "2.0.0", "1.0.0"]);

    // --- runtimeData added using mocked fn ---
    expect(result!.versions[0].runtimeData).toBe("MOCK_RUNTIME_DATA");

    // --- deployments based on ecs versions ---
    expect(result!.versions[0].deployments).toEqual(["Live"]);
    expect(result!.versions[1].deployments).toEqual(["Staging"]);
    expect(result!.versions[2].deployments).toEqual(["CI-Dev"]);

    // --- sonarMetrics normalized ---
    expect(result!.sonarMetrics).toBeNull();
  });

  test("keeps sonarMetrics when non-empty", async () => {
    mockCollection.findOne.mockResolvedValue({
      _id: "123",
      name: "some-service",
      gitInfo: { lang: "node" },
      sonarMetrics: { bugs: 10 },
      ecs: {},
      versions: []
    });

    const result = await fetchDocument("some-service", {}, {});
    expect(result!.sonarMetrics).toEqual({ bugs: 10 });
  });
});
