import { existsSync, readdirSync, mkdirSync, copyFileSync } from "node:fs";
import path from "node:path";
import {
  root,
  local as localRoot,
  localBuildConfig,
  run,
} from "./deployment-tools.mjs";

const local = localBuildConfig();
const android = local.android || {};
const sdk =
  process.env.ANDROID_SDK_ROOT ||
  android.sdk ||
  path.join(process.env.LOCALAPPDATA || "", "Android/Sdk");
const qt = process.env.HOMESYSTEM_QT_ANDROID || android.qt;
const host = process.env.QT_HOST_PATH || android.hostQt;
const javaRoot = path.join(localRoot, "tools/java17");
const bundledJava = existsSync(javaRoot)
  ? readdirSync(javaRoot).find((name) => name.startsWith("jdk-17"))
  : null;
const java =
  android.java ||
  (bundledJava ? path.join(javaRoot, bundledJava) : process.env.JAVA_HOME);
const ndk = path.join(sdk, "ndk/27.2.12479018");
const cmake = local.cmake || "cmake";
const ninja = local.ninja;
const requirements = [
  [
    "Qt 6.10 ARM64 WebView",
    qt && path.join(qt, "lib/cmake/Qt6WebView/Qt6WebViewConfig.cmake"),
  ],
  [
    "matching desktop Qt host tools",
    host && path.join(host, "bin/qmlcachegen.exe"),
  ],
  ["JDK 17", java && path.join(java, "bin/javac.exe")],
  ["Android SDK API 36", path.join(sdk, "platforms/android-36/android.jar")],
  ["Android build tools 36", path.join(sdk, "build-tools/36.0.0/aapt2.exe")],
  ["NDK r27c", path.join(ndk, "build/cmake/android.toolchain.cmake")],
  ["ADB platform tools", path.join(sdk, "platform-tools/adb.exe")],
];
for (const [label, file] of requirements) {
  if (!file || !existsSync(file))
    throw new Error(
      `Missing ${label}. See apps/display-client/README.md and configure build.local.json.`,
    );
  console.log(`Ready: ${label}`);
}
const env = {
  ...process.env,
  JAVA_HOME: java,
  ANDROID_SDK_ROOT: sdk,
  ANDROID_HOME: sdk,
  GRADLE_USER_HOME: path.join(localRoot, "cache/gradle"),
};
run(path.join(java, "bin/java.exe"), ["-version"], env);
if (process.argv.includes("--check")) process.exit(0);
const build = path.join(localRoot, "build/display-client/android-arm64-debug");
const output = path.join(
  localRoot,
  "packages/display-client/android-arm64-debug",
);
mkdirSync(output, { recursive: true });
const args = [
  "-S",
  path.join(root, "apps/display-client"),
  "-B",
  build,
  "-G",
  "Ninja",
  "-DCMAKE_BUILD_TYPE=Debug",
  `-DCMAKE_TOOLCHAIN_FILE=${qt}/lib/cmake/Qt6/qt.toolchain.cmake`,
  `-DQT_HOST_PATH=${host}`,
  `-DANDROID_SDK_ROOT=${sdk}`,
  `-DANDROID_NDK_ROOT=${ndk}`,
  `-DCMAKE_ANDROID_NDK=${ndk}`,
  "-DANDROID_ABI=arm64-v8a",
  "-DANDROID_PLATFORM=android-28",
];
if (ninja) args.push(`-DCMAKE_MAKE_PROGRAM=${ninja}`);
run(cmake, args, env);
run(cmake, ["--build", build, "--target", "apk", "--parallel", "4"], env);
const apk = path.join(
  build,
  "android-build/build/outputs/apk/debug/android-build-debug.apk",
);
if (!existsSync(apk))
  throw new Error(`Android build finished without expected APK: ${apk}`);
copyFileSync(apk, path.join(output, "HomeSystem-debug.apk"));
console.log(
  `Android test APK ready: ${output}. Debug signing only; no device was modified.`,
);
