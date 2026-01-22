import { checkRuntimesVsEol, EndOfLifeData, Thresholds } from "../src/utils/check-eol";

describe("checkRuntimesVsEol()", () => {
    beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-01-01"));
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    const thresholds: Thresholds = {
        nodejs: [30, 90],
        go: [60, 120],
        "amazon-corretto": [90, 180],
    };

    const eolData: EndOfLifeData = {
        nodejs: [
            { cycle: "18", eol: "2026-02-15" }, // ~45 days away
            { cycle: "16", eol: "true" }
        ],
        go: [
            { cycle: "1.20", eol: "2026-12-31" }, // ~1 year away
            { cycle: "1.19", eol: "false"}
        ],
        "amazon-corretto": [
            { cycle: "21", eol: "2026-08-25" }, // eol a few months away
            { cycle: "18", eol: "2025-01-01" }  // eol expired
        ],
        "spring-boot": [
            { cycle: "4.0", eol: "2026-12-31" },
            { cycle: "3.5", eol: "2026-06-30"},
        ]
    };

    it("returns red when runtime array is empty", () => {
        const result = checkRuntimesVsEol(
            ["node"],
            [], // empty runtime array
            eolData,
            thresholds
        );

        expect(result).toEqual({
            total: "red",
            runtime: [{ value: "Unknown", color: "red" }]
        });
    });

    it("returns yellow if runtime is matched, within EOL but below max threshold", () => {
        const result = checkRuntimesVsEol(
            ["node"],
            ["node-18"],
            eolData,
            thresholds
        );

        expect(result).toEqual({
            total: "yellow",
            runtime: [{ value: "node-18", color: "yellow" }]
        });
    });

    it("returns green if runtime is matched, within EOL and outside of thresholds", () => {
        const result = checkRuntimesVsEol(
            ["go"],
            ["1.20"],
            eolData,
            thresholds
        );

        expect(result).toEqual({
            total: "green",
            runtime: [{ value: "1.20", color: "green" }]
        });
    });

    it("returns green if runtime is matched and EOL is 'true'", () => {
        const result = checkRuntimesVsEol(
            ["go"],
            ["1.19"],
            eolData,
            thresholds
        );

        expect(result).toEqual({
            total: "green",
            runtime: [{ value: "1.19", color: "green" }]
        });
    });

    it("sets total color to red if any runtime is red, even if others are green", () => {
        const result = checkRuntimesVsEol(
            ["java"],
            ["amazon-corretto-21", "amazon-corretto-18"],
            eolData,
            thresholds
        );

        expect(result).toEqual({
            total: "red",
            runtime: [
                { value: "amazon-corretto-21", color: "green" },
                { value: "amazon-corretto-18", color: "red" }
            ]
        });
    });

    it("sets total color to yellow if any runtime is yellow", () => {
        const result = checkRuntimesVsEol(
            ["java"],
            ["amazon-corretto-21", "spring-boot-starter:3.5.9"], // spring-boot has no threshold set, so will use defaults
            eolData,
            thresholds
        );

        expect(result).toEqual({
            total: "yellow",
            runtime: [
                { value: "amazon-corretto-21", color: "green" },
                { value: "spring-boot-starter:3.5.9", color: "yellow" }
            ]
        });
    });

    it("sets total color to green if all runtimes are green", () => {
        const result = checkRuntimesVsEol(
            ["java"],
            ["amazon-corretto-21", "spring-boot-starter:4.0.1"], // spring-boot has no threshold set, so will use defaults
            eolData,
            thresholds
        );

        expect(result).toEqual({
            total: "green",
            runtime: [
                { value: "amazon-corretto-21", color: "green" },
                { value: "spring-boot-starter:4.0.1", color: "green" }
            ]
        });
    });
});
