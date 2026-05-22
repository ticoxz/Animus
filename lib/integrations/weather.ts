export async function getWeather(input: {
  city: string;
  country?: string;
}): Promise<string> {
  const location = input.country
    ? `${input.city},${input.country}`
    : input.city;

  const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return "No pude obtener el clima ahora.";

  const data = (await res.json()) as {
    current_condition: Array<{
      temp_C: string;
      FeelsLikeC: string;
      weatherDesc: Array<{ value: string }>;
      humidity: string;
    }>;
    nearest_area: Array<{
      areaName: Array<{ value: string }>;
      country: Array<{ value: string }>;
    }>;
  };

  const c = data.current_condition[0];
  const area = data.nearest_area[0];

  return (
    `Clima en <b>${area.areaName[0].value}</b> (${area.country[0].value}):\n` +
    `${c.weatherDesc[0].value}, ${c.temp_C}°C (sensación ${c.FeelsLikeC}°C), humedad ${c.humidity}%`
  );
}
