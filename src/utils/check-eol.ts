import { differenceInDays, parseISO } from "date-fns";

const DEFAULT_THRESHOLDS: [number, number] = [90, 180];

export interface RuntimeInfo {
    cycle: string;
    eol: string | boolean;
}

export interface EndOfLifeData {
    [key: string]: RuntimeInfo[];
}

export interface RuntimeColorResult {
    total: string;
    runtime: { value: string; color: string }[];
}

export interface Thresholds {
  [key: string]: [number, number];
}

export function getRuntimeColor(matchedRuntime: RuntimeInfo, threshold: [number, number]): "green" | "yellow" | "red" {
  if (typeof matchedRuntime.eol === "string") {
    const eolDate = parseISO(matchedRuntime.eol);
    const daysUntilEOL = differenceInDays(eolDate, new Date());
    if (daysUntilEOL <= threshold[0]) return "red";
    if (daysUntilEOL <= threshold[1]) return "yellow";
    return "green";
  }
  if (matchedRuntime.eol === false) return "green";
  if (matchedRuntime.eol === true) return "red";
  return "green";
}

function matchRuntime(runtime: string, endol: EndOfLifeData, versionMatch: RegExpMatchArray): RuntimeInfo | undefined {
  return endol[runtime]?.find(r => r.cycle === versionMatch[1]);
}

function matchJavaRuntime(runtime: string, endol: EndOfLifeData): { matchedRuntime: RuntimeInfo; threshold: string } {
  let threshold = "default";
  const redRuntime: RuntimeInfo = { cycle: "", eol: true };

  if (/corretto/i.exec(runtime) || /java/i.exec(runtime)) {
    threshold = "amazon-corretto"; // use amazon-corretto thresholds for both amazon-corretto and java runtimes, as they have the same EOL cycles
    const versionMatch = /-(\d+)/.exec(runtime);
    if (!versionMatch) {
      return { matchedRuntime: redRuntime, threshold };
    }
    return { matchedRuntime: matchRuntime("amazon-corretto", endol, versionMatch) || redRuntime, threshold };
  } else if (/spring-core/i.exec(runtime)) {
    threshold = "spring-framework";
    const versionMatch = /:(\d+\.\d+)/.exec(runtime);
    if (!versionMatch) {
      return { matchedRuntime: redRuntime, threshold };
    }
    return { matchedRuntime: matchRuntime("spring-framework", endol, versionMatch) || redRuntime, threshold };
  } else if (/spring-boot/i.exec(runtime)) {
    threshold = "spring-boot";
    const versionMatch = /:(\d+\.\d+)/.exec(runtime);
    if (!versionMatch) {
      return { matchedRuntime: redRuntime, threshold };
    }
    return { matchedRuntime: matchRuntime("spring-boot", endol, versionMatch) || redRuntime, threshold };
  }

  return { matchedRuntime: redRuntime, threshold };
}

function matchNodeRuntime(runtime: string, endol: EndOfLifeData): RuntimeInfo {
  const versionMatch = /(\d+)/.exec(runtime);
  if (!versionMatch) return { cycle: "", eol: true };
  return endol["nodejs"]?.find(r => r.cycle === versionMatch[1]) || { cycle: "", eol: true };
}

function matchGoRuntime(runtime: string, endol: EndOfLifeData): RuntimeInfo {
  const versionMatch = /^(\d+\.\d+)/.exec(runtime);
  if (!versionMatch) return { cycle: "", eol: true };
  return endol["go"]?.find(r => r.cycle === versionMatch[1]) || { cycle: "", eol: true };
}

export function checkRuntimesVsEol (
    languageArray: string[],
    runtimeArray: string[],
    endol: EndOfLifeData,
    thresholds: Thresholds
): RuntimeColorResult {
    const runtimeColors: { value: string; color: string }[] = [];
    let hasRed = false;
    let hasYellow = false;
    let thresholdKey = "default";

    // get the language
    const language = languageArray.length > 0 ? languageArray.map(l => (l ?? "unknown").toLowerCase()) : ["unknown"];

    if (!runtimeArray || runtimeArray.length === 0) {
      return {
        total: "red",
        runtime: [{ value: 'Unknown', color: 'grey' }]
      }
    }

    runtimeArray.forEach(runtime => {
      let matchedRuntime: RuntimeInfo;

      //------------ JAVA
      if (language.includes("java")) {
        const javaResult = matchJavaRuntime(runtime, endol);
        matchedRuntime = javaResult.matchedRuntime;
        thresholdKey = javaResult.threshold;
      //------------ NODE
      } else if (language.includes("node")) {
        const nodeRuntime = matchNodeRuntime(runtime, endol);
        matchedRuntime = nodeRuntime;
        thresholdKey = "nodejs";
        //------------ GO
      } else if (language.includes("go")) {
        const goRuntime = matchGoRuntime(runtime, endol);
        matchedRuntime = goRuntime;
        thresholdKey = "go";
      } else {
        // Handle unknown languages
        matchedRuntime = { cycle: "", eol: true }; // default to red for unknown languages 
        thresholdKey = "default";
      }

      const color = getRuntimeColor(matchedRuntime, thresholds[thresholdKey] || DEFAULT_THRESHOLDS);
      if (color === "red") hasRed = true;
      else if (color === "yellow") hasYellow = true;
      runtimeColors.push({ value: runtime, color });
    });

    let totalColor = "green";
    if (hasRed) {
      totalColor = "red";
    } else if (hasYellow) {
      totalColor = "yellow";
    }

    return {
      total: totalColor,
      runtime: runtimeColors
    };
}
