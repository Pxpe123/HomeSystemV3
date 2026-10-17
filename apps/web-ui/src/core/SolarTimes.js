/** NOAA solar geometry, apparent horizon -0.833 degrees; no fixed sunrise/sunset.
 * Reference: https://gml.noaa.gov/grad/solcalc/calcdetails.html
 * Local clock hours are converted with the location timezone, including DST.
 */
export function solarTimes(
  date = new Date(),
  { latitude = 53.4084, longitude = -2.9916, timeZone = "Europe/London" } = {},
) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const midnight = Date.parse(`${day}T00:00:00Z`);
  const rad = Math.PI / 180,
    deg = (value) => value / rad;
  const sin = (value) => Math.sin(value * rad),
    cos = (value) => Math.cos(value * rad);
  function geometry(minutes) {
    const t =
      (midnight / 86400000 + 2440587.5 + minutes / 1440 - 2451545) / 36525;
    const meanLongitude =
      (((280.46646 + t * (36000.76983 + t * 0.0003032)) % 360) + 360) % 360;
    const anomaly = 357.52911 + t * (35999.05029 - 0.0001537 * t);
    const eccentricity = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
    const centre =
      sin(anomaly) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
      sin(2 * anomaly) * (0.019993 - 0.000101 * t) +
      sin(3 * anomaly) * 0.000289;
    const omega = 125.04 - 1934.136 * t;
    const apparentLongitude =
      meanLongitude + centre - 0.00569 - 0.00478 * sin(omega);
    const obliquity =
      23 +
      (26 + (21.448 - t * (46.815 + t * (0.00059 - 0.001813 * t))) / 60) / 60 +
      0.00256 * cos(omega);
    const declination = deg(Math.asin(sin(obliquity) * sin(apparentLongitude)));
    const y = Math.tan((obliquity * rad) / 2) ** 2;
    const equation =
      4 *
      deg(
        y * sin(2 * meanLongitude) -
          2 * eccentricity * sin(anomaly) +
          4 * eccentricity * y * sin(anomaly) * cos(2 * meanLongitude) -
          0.5 * y * y * sin(4 * meanLongitude) -
          1.25 * eccentricity * eccentricity * sin(2 * anomaly),
      );
    return { declination, equation };
  }
  function event(rising) {
    let minutes = rising ? 360 : 1080;
    for (let pass = 0; pass < 3; pass++) {
      const { declination, equation } = geometry(minutes);
      const hourCosine =
        (cos(90.833) - sin(latitude) * sin(declination)) /
        (cos(latitude) * cos(declination));
      if (hourCosine < -1 || hourCosine > 1) return null;
      const hourAngle = deg(Math.acos(hourCosine));
      minutes = 720 - 4 * longitude - equation + (rising ? -4 : 4) * hourAngle;
    }
    const instant = new Date(midnight + minutes * 60000);
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(instant)
        .map((part) => [part.type, part.value]),
    );
    return (
      Math.round(
        (Number(parts.hour) * 3600 +
          Number(parts.minute) * 60 +
          Number(parts.second)) /
          60,
      ) / 60
    );
  }
  return {
    sunrise: event(true),
    sunset: event(false),
    date: day,
    timeZone,
    source: "Calculated for Liverpool",
  };
}
