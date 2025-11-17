import { differenceInDays, parseISO } from "date-fns";

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

export function checkRuntimesVsEol (
    languageArray: string[],
    runtimeArray: string[],
    endol: EndOfLifeData,
    thresholds: Thresholds
): RuntimeColorResult {
    const today = new Date();
    const runtimeColors: { value: string; color: string }[] = [];
    let hasRed = false;
    let hasYellow = false;
    let threshold : string = "default";

    // get the language
    const language = languageArray.length > 0 ? languageArray.map(l => (l ?? "unknown").toLowerCase()) : ["unknown"];

    if (!runtimeArray || runtimeArray.length === 0) {
      return {
        total: "red",
        runtime: [{ value: 'Unknown', color: 'red' }]
      }
    }

    runtimeArray.forEach(runtime => {
      let matchedRuntime: RuntimeInfo | undefined;
      const redRuntime: RuntimeInfo = { cycle: "", eol: true };
      let color = "green"; // default

      //------------ JAVA
      if (language.includes("java")) {
        if (runtime.match(/corretto/i)) {
          threshold = "amazon-corretto";
          const versionMatch = runtime.match(/\-(\d+)/);
          if (versionMatch) {
              matchedRuntime = endol["amazon-corretto"]?.find(r => r.cycle === versionMatch[1]);
          }
          matchedRuntime = matchedRuntime || redRuntime;
        } else if (runtime.match(/spring-core/i)) {
          threshold = "spring-framework";
          const versionMatch = runtime.match(/:(\d+\.\d+)/);
          if (versionMatch) {
            matchedRuntime = endol["spring-framework"]?.find(r => r.cycle === versionMatch[1]);
          }
          matchedRuntime = matchedRuntime || redRuntime;
        } else if (runtime.match(/spring-boot/i)) {
          threshold = "spring-boot";
          const versionMatch = runtime.match(/:(\d+\.\d+)/);
          if (versionMatch) {
            matchedRuntime = endol["spring-boot"]?.find(r => r.cycle === versionMatch[1]);
          }
          matchedRuntime = matchedRuntime || redRuntime;
        }
      //------------ NODE
      } else if (language.includes("node")) {
        threshold = "nodejs";
        const versionMatch = runtime.match(/(\d+)/);
        if (versionMatch) {
          matchedRuntime = endol["nodejs"]?.find(r => r.cycle === versionMatch[1]);
        }
        matchedRuntime = matchedRuntime || redRuntime;
        //------------ GO
      } else if (language.includes("go")) {
        threshold = "go";
        const versionMatch = runtime.match(/(\d+\.\d+)/);
        if (versionMatch) {
          matchedRuntime = endol["go"]?.find(r => r.cycle === versionMatch[1]);
        }
        matchedRuntime = matchedRuntime || redRuntime;
      }

      if (matchedRuntime) {
          if (typeof matchedRuntime.eol === "string") {

              const eolDate = parseISO(matchedRuntime.eol);
              const daysUntilEOL = differenceInDays(eolDate, today);
              const runtimeThreshold: [number, number] = thresholds[threshold] || [90, 180];

              if (daysUntilEOL <= runtimeThreshold[0]) {
                  color = "red";
                  hasRed = true;
              } else if (daysUntilEOL <= runtimeThreshold[1]) {
                  color = "yellow";
                  hasYellow = true;
              }
          } else if (matchedRuntime.eol === false) {
              color = "green";
          } else if (matchedRuntime.eol === true) {
              color = "red";
              hasRed = true;
          }
      } else { color = "none"; }

      runtimeColors.push({ value: runtime, color });
    });

    let totalColor = "green";
    if (hasRed) {
        totalColor = "red";
    } else if (hasYellow) {
        totalColor = "yellow";
    }
    // console.log(`------------------- matchedRuntime: ${JSON.stringify({total: totalColor, runtime: runtimeColors}, null, 2)}`);

    return {
        total: totalColor,
        runtime: runtimeColors
    };
}
