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
      sonarMetrics: null,
      ecs: {
        cidev:   { version: "2.0.0" },
        staging: { version: "0.1.100" },
        live:    { version: "0.1.99" }
      },
      versions: [
        { version: "0.1.99", lang: "ts",  runtime: "node 18" },
        { version: "0.1.100", lang: "js",  runtime: "node 20" },
        { version: "2.0.0", lang: "tsx", runtime: "node 24" }
      ]
    });

    const result = await fetchDocument("some-service", {}, {});

    expect(result).not.toBeNull();

    // --- versions sorted descending ---
    expect(result!.versions.map(v => v.version))
      .toEqual(["2.0.0", "0.1.100", "0.1.99"]);

    // --- runtimeData added using mocked fn ---
    expect(result!.versions[0].runtimeData).toBe("MOCK_RUNTIME_DATA");

    // --- deployments based on ecs versions ---
    expect(result!.versions[0].deployments).toEqual(["CI-Dev"]);
    expect(result!.versions[1].deployments).toEqual(["Staging"]);
    expect(result!.versions[2].deployments).toEqual(["Live"]);

    // --- sonarMetrics normalized ---
    expect(result!.sonarMetrics).toBeNull();
  });

  test("gracefully handles non-semver versioning", async () => {
    mockCollection.findOne.mockResolvedValue({
      _id: "123",
      name: "some-service",
      gitInfo: { lang: "node" },
      sonarMetrics: {},
      versions: [
        { version: "ecs-service-1.0.99", lang: "ts",  runtime: "node 18" },
        { version: "ecs-service-1.1.0", lang: "ts",  runtime: "node 24" },
      ]
    });

    const result = await fetchDocument("some-service", {}, {});

    expect(result).not.toBeNull();

    // --- versions sorted descending ---
    expect(result!.versions.map(v => v.version))
      .toEqual(["ecs-service-1.1.0", "ecs-service-1.0.99"]);

    // --- sonarMetrics normalized ---
    expect(result!.sonarMetrics).toBeNull();
  });

  test("keeps sonarMetrics when non-empty", async () => {
    mockCollection.findOne.mockResolvedValue({
      _id: "123",
      name: "some-service",
      gitInfo: { lang: "node" },
      sonarMetrics: { bugs: 10, new_bugs: 2 },
      ecs: {},
      versions: []
    });

    const result = await fetchDocument("some-service", {}, {});
    expect(result!.sonarMetrics).toEqual({ overall: { bugs: 10 }, newCode: { bugs: 2 } });
  });
});
