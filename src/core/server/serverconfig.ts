import fs from "fs";
import path from "path";



export const getPlatformInfo = () => {
  const isTermuxAndroid = process.platform === "android" || fs.existsSync("/data/data/com.termux"); // Renamed for clarity
  const isWindows = process.platform === "win32";
  const isLinux = process.platform === "linux" && !isTermuxAndroid; // Ensure Linux isn't also Termux
  return {
    isTermux: isTermuxAndroid, // Keep original name for compatibility if used elsewhere
    isWindows,
    isLinux,
    startScript: isWindows ? "start.bat" : "start.sh",
    platform: process.platform,
  };
};
