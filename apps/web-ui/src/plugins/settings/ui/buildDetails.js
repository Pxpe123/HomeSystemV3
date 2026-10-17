export function compareBuilds(web, server) {
  const complete = (build) =>
    build?.version &&
    build.buildId &&
    /^[a-f0-9]{40}$/i.test(build.commit || "") &&
    Number.isFinite(Date.parse(build.builtAtUtc)) &&
    !build.buildId.startsWith("local.");
  if (!complete(web) || !complete(server))
    return "Build metadata unavailable or local — not verified";
  return ["version", "buildId", "commit", "builtAtUtc"].every(
    (key) => web[key] === server[key],
  )
    ? "Matching deployment — WebUI and server build verified"
    : "Different builds — reload the display; if unchanged, check deployment";
}

export function formatBuildTime(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return "time unavailable";
  return `${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "medium", timeZone: "Europe/London" }).format(new Date(value))} (Europe/London)`;
}
