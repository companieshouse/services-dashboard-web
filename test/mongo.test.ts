import { fetchDocument, fetchStats, getNotice, normaliseSonarMetrics, sortVersions } from "../src/mongo/mongo";
import * as dbModule from "../src/mongo/db";
import * as config from "../src/config";

// Mock the check-eol utility
jest.mock("../src/utils/check-eol", () => ({
  checkRuntimesVsEol: jest.fn().mockReturnValue("MOCK_RUNTIME_DATA")
}));

describe("stats()", () => {
  const mockCollection = {
    aggregate: jest.fn()
  };

  const mockDb = {
    collection: jest.fn().mockReturnValue(mockCollection),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(dbModule, "getDb").mockReturnValue(mockDb as any);
    jest.spyOn(dbModule, "getSession").mockReturnValue(undefined as any);

    // ---- Mock config ----
    (config as any).MONGO_COLLECTION_PROJECTS = "projects";
  });

  test("returns stats grouped by scrum team correctly", async () => {
    const mockStats = [
      {
        _id: "teamA",
        servicesCount: 2,
        services: [
          {
            name: "service-a",
            serviceArea: "area1",
            critical: 1, high: 2, medium: 3, low: 4,
            vulnerabilities: 10, components: 50,
            policyViolationsTotal: 5, policyViolationsFail: 2, policyViolationsWarn: 3,
            missingDeployedSbom: false,
          },
          {
            name: "service-b",
            serviceArea: "area2",
            critical: 0, high: 1, medium: 2, low: 3,
            vulnerabilities: 6, components: 30,
            policyViolationsTotal: 2, policyViolationsFail: 1, policyViolationsWarn: 1,
            missingDeployedSbom: true,
          },
        ],
        totalCritical: 1, totalHigh: 3, totalMedium: 5, totalLow: 7,
        totalVulnerabilities: 16,
        totalPolicyViolationsTotal: 7, totalPolicyViolationsFail: 3, totalPolicyViolationsWarn: 4,
        totalMissingDeployedSbom: 1,
      },
      {
        _id: "teamB",
        servicesCount: 1,
        services: [
          {
            name: "service-c",
            serviceArea: "area1",
            critical: 5, high: 10, medium: 15, low: 20,
            vulnerabilities: 50, components: 100,
            policyViolationsTotal: 10, policyViolationsFail: 5, policyViolationsWarn: 5,
            missingDeployedSbom: false,
          },
        ],
        totalCritical: 5, totalHigh: 10, totalMedium: 15, totalLow: 20,
        totalVulnerabilities: 50,
        totalPolicyViolationsTotal: 10, totalPolicyViolationsFail: 5, totalPolicyViolationsWarn: 5,
        totalMissingDeployedSbom: 0,
      },
    ];

    mockCollection.aggregate.mockReturnValue({
      toArray: jest.fn().mockResolvedValue(mockStats)
    });

    const result = await fetchStats();

    expect(result).toHaveLength(2);

    const platform = result![0];
    expect(platform._id).toBe("teamA");
    expect(platform.servicesCount).toBe(2);
    expect(platform.services).toHaveLength(2);
    expect(platform.services[0]).toMatchObject({ name: "service-a", serviceArea: "area1", critical: 1, high: 2, medium: 3, low: 4, missingDeployedSbom: false });
    expect(platform.services[1]).toMatchObject({ name: "service-b", serviceArea: "area2", critical: 0, policyViolationsTotal: 2, missingDeployedSbom: true });
    expect(platform.totalCritical).toBe(1);
    expect(platform.totalHigh).toBe(3);
    expect(platform.totalVulnerabilities).toBe(16);
    expect(platform.totalPolicyViolationsFail).toBe(3);
    expect(platform.totalMissingDeployedSbom).toBe(1);

    const filing = result![1];
    expect(filing._id).toBe("teamB");
    expect(filing.servicesCount).toBe(1);
    expect(filing.services[0]).toMatchObject({ name: "service-c", serviceArea: "area1", critical: 5, policyViolationsTotal: 10, missingDeployedSbom: false });
    expect(filing.totalCritical).toBe(5);
    expect(filing.totalVulnerabilities).toBe(50);
    expect(filing.totalPolicyViolationsWarn).toBe(5);
    expect(filing.totalMissingDeployedSbom).toBe(0);
  });
});

describe("notices()", () => {
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
    (config as any).MONGO_COLLECTION_NOTICES = "notices";
  });

  test("returns null when no notice found", async () => {
    mockCollection.findOne.mockResolvedValue(null);

    const result = await getNotice();
    expect(result).toBeNull();
  });

  test("returns notice when found", async () => {
    const mockNotice = { _id: "notice123", message: "This is a notice" };
    mockCollection.findOne.mockResolvedValue(mockNotice);

    const result = await getNotice();
    expect(result).toEqual(mockNotice);
  });
});

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
        rebel1:   { version: "2.0.0" },
        phoenix:   { version: "2.0.0" },
        staging: { version: "0.1.100" },
        live:    { version: "0.1.99" }
      },
      versions: [
        { version: "0.1.99", lang: "ts",  runtime: "node 18", metrics: { critical: 10, high: 20, medium: 30, low: 40, vulnerabilities: 50, components: 60, policyViolationsTotal: 70, policyViolationsFail: 80, policyViolationsWarn: 90 } },
        { version: "0.1.100", lang: "js",  runtime: "node 20", metrics: { critical: 10, high: 20, medium: 30, low: 40, vulnerabilities: 50, components: 60, policyViolationsTotal: 70, policyViolationsFail: 80, policyViolationsWarn: 90 } },
        { version: "2.0.0", lang: "tsx", runtime: "node 24", metrics: { critical: 10, high: 20, medium: 30, low: 40, vulnerabilities: 50, components: 60, policyViolationsTotal: 70, policyViolationsFail: 80, policyViolationsWarn: 90 } }
      ]
    });

    const result = await fetchDocument("some-service", {}, {});

    expect(result).not.toBeNull();

    // --- versions sorted descending ---
    expect(result!.versions.map(v => v.version))
      .toEqual(["2.0.0", "0.1.100", "0.1.99"]);

    // DepTrack metrics should be preserved
    expect(result!.versions[0].metrics).toEqual({ critical: 10, high: 20, medium: 30, low: 40, vulnerabilities: 50, components: 60, policyViolationsTotal: 70, policyViolationsFail: 80, policyViolationsWarn: 90 });
    expect(result!.versions[1].metrics).toEqual({ critical: 10, high: 20, medium: 30, low: 40, vulnerabilities: 50, components: 60, policyViolationsTotal: 70, policyViolationsFail: 80, policyViolationsWarn: 90 });
    expect(result!.versions[2].metrics).toEqual({ critical: 10, high: 20, medium: 30, low: 40, vulnerabilities: 50, components: 60, policyViolationsTotal: 70, policyViolationsFail: 80, policyViolationsWarn: 90 });

    // --- runtimeData added using mocked fn ---
    expect(result!.versions[0].runtimeData).toBe("MOCK_RUNTIME_DATA");

    // --- deployments based on ecs versions ---
    expect(result!.versions[0].deployments).toEqual(["CI-Dev", "Rebel1", "Phoenix"]);
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

  describe('normaliseSonarMetrics', () => {
    it('handles overall stats', () => {
      const sonarMetrics = {
        bugs: 10,
        vulnerabilities: 5,
        code_smells: 20,
        coverage: 85.5,
      };
      expect(normaliseSonarMetrics(sonarMetrics)).toEqual(
        { overall: { bugs: 10, vulnerabilities: 5, code_smells: 20, coverage: 85.5 }, 
          newCode: {} 
        }
      );
    });
    it('handles newCode stats', () => {
      const sonarMetrics = {
        new_bugs: 10,
        new_vulnerabilities: 5,
        new_code_smells: 20,
        new_coverage: 85.5,
      };
      expect(normaliseSonarMetrics(sonarMetrics)).toEqual(
        { overall: {}, 
          newCode: { bugs: 10, vulnerabilities: 5, code_smells: 20, coverage: 85.5 } 
        }
      );
    });
    it('handles both stats together', () => {
      const sonarMetrics = {
        bugs: 1,
        new_bugs: 2,
        vulnerabilities: 1,
        new_vulnerabilities: 2,
        code_smells: 1,
        new_code_smells: 2,
        coverage: 1,
        new_coverage: 2,
      };
      expect(normaliseSonarMetrics(sonarMetrics)).toEqual(
        { overall: { bugs: 1, vulnerabilities: 1, code_smells: 1, coverage: 1 }, 
          newCode: { bugs: 2, vulnerabilities: 2, code_smells: 2, coverage: 2 } 
        }
      );
    });
  });

  describe('sortVersions', () => {
    it('returns a correctly sorted list', () => {
      const versions = [
        { version: "0.1.100" },
        { version: "0.1.99" },
      ];
    
      expect(sortVersions(versions)).toEqual(
        [
          { version: "0.1.99" },
          { version: "0.1.100" },]
      );
    });

    it('handles non-semver versions correctly', () => {
      const versions = [
        { version: "ecs-service-1.0.99" },
        { version: "ecs-service-1.1.0" },
      ];
    
      expect(sortVersions(versions)).toEqual(
        [
          { version: "ecs-service-1.0.99" },
          { version: "ecs-service-1.1.0" },]
      );
    });
  });
});
